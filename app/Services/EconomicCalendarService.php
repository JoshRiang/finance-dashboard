<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use SimpleXMLElement;

class EconomicCalendarService
{
    /**
     * Free, key-less economic calendar feeds (Forex Factory, XML).
     *
     * @var array<int, string>
     */
    private const FEEDS = [
        'https://nfs.faireconomy.media/ff_calendar_thisweek.xml',
    ];

    private const CACHE_KEY = 'economic-calendar.upcoming';

    private const CACHE_TTL_MINUTES = 60;

    /**
     * Shorter TTL when the fetch failed, so a rate-limited source is not hammered.
     */
    private const FAILURE_CACHE_TTL_MINUTES = 5;

    /**
     * Impacts worth surfacing on a dashboard.
     *
     * @var array<int, string>
     */
    private const IMPACTS = ['High', 'Medium'];

    /**
     * Get the upcoming high/medium impact events.
     *
     * @return array<int, array{date: string, time: string, datetime: string|null, title: string, country: string, impact: string, forecast: string, previous: string, url: string, timestamp: int}>
     */
    public function upcoming(int $limit = 12): array
    {
        $cached = Cache::get(self::CACHE_KEY);

        if (! is_array($cached)) {
            $cached = $this->build();

            Cache::put(
                self::CACHE_KEY,
                $cached,
                now()->addMinutes($cached === [] ? self::FAILURE_CACHE_TTL_MINUTES : self::CACHE_TTL_MINUTES),
            );
        }

        return array_slice($cached, 0, $limit);
    }

    /**
     * Fetch both calendar weeks in parallel and normalize the events.
     *
     * @return array<int, array{date: string, time: string, datetime: string|null, title: string, country: string, impact: string, forecast: string, previous: string, url: string, timestamp: int}>
     */
    private function build(): array
    {
        $responses = Http::pool(function (Pool $pool): array {
            $requests = [];

            foreach (self::FEEDS as $index => $url) {
                $requests[$index] = $pool->as((string) $index)
                    ->timeout(20)
                    ->retry(3, 500, throw: false)
                    ->withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
                    ->accept('application/xml,text/xml,*/*')
                    ->get($url);
            }

            return $requests;
        });

        $events = [];

        foreach (self::FEEDS as $index => $url) {
            $response = $responses[(string) $index] ?? null;

            if (! $response instanceof Response || ! $response->successful()) {
                Log::warning('Economic calendar request failed.', [
                    'feed' => $url,
                    'status' => $response instanceof Response ? $response->status() : 'connection error',
                ]);

                continue;
            }

            foreach ($this->parse($response->body()) as $event) {
                $events[] = $event;
            }
        }

        $events = $this->filterAndSort($events);

        return $events;
    }

    /**
     * Parse a calendar XML document into normalized events.
     *
     * Forex Factory exports every time in GMT/UTC, so the date and time are
     * combined as a UTC instant. The frontend renders it in the visitor's zone.
     *
     * @return array<int, array{date: string, time: string, datetime: string|null, title: string, country: string, impact: string, forecast: string, previous: string, url: string, timestamp: int}>
     */
    private function parse(string $body): array
    {
        $xml = simplexml_load_string($body, SimpleXMLElement::class, LIBXML_NOCDATA);

        if ($xml === false || ! isset($xml->event)) {
            return [];
        }

        $events = [];

        foreach ($xml->event as $node) {
            $title = trim((string) $node->title);
            $impact = trim((string) $node->impact);

            if ($title === '' || ! in_array($impact, self::IMPACTS, true)) {
                continue;
            }

            $date = $this->parseDate(trim((string) $node->date));

            if ($date === null) {
                continue;
            }

            [$time, $minutes, $isTimed] = $this->parseTime(trim((string) $node->time));

            $instant = $isTimed ? $date->addMinutes($minutes) : null;

            $events[] = [
                'date' => $date->toDateString(),
                'time' => $time,
                'datetime' => $instant?->toIso8601String(),
                'title' => $title,
                'country' => trim((string) $node->country),
                'impact' => $impact,
                'forecast' => trim((string) $node->forecast),
                'previous' => trim((string) $node->previous),
                'url' => trim((string) $node->url),
                'timestamp' => ($instant ?? $date)->getTimestamp(),
            ];
        }

        return $events;
    }

    private function parseDate(string $value): ?CarbonImmutable
    {
        $date = CarbonImmutable::createFromFormat('!m-d-Y', $value, 'UTC');

        return $date === false ? null : $date;
    }

    /**
     * Normalize a Forex Factory time ("9:45pm", "All Day", ...) into a label,
     * a minutes offset, and whether the event has a fixed time.
     *
     * @return array{0: string, 1: int, 2: bool}
     */
    private function parseTime(string $value): array
    {
        if (preg_match('/^(\d{1,2}):(\d{2})\s*(am|pm)$/i', $value, $matches) === 1) {
            $hour = (int) $matches[1] % 12;

            if (strtolower($matches[3]) === 'pm') {
                $hour += 12;
            }

            $minutes = (int) $matches[2];

            return [sprintf('%02d:%02d', $hour, $minutes), $hour * 60 + $minutes, true];
        }

        return [$value === '' ? 'All Day' : $value, 0, false];
    }

    /**
     * Keep only today's and future events, ordered chronologically.
     *
     * @param  array<int, array{date: string, time: string, datetime: string|null, title: string, country: string, impact: string, forecast: string, previous: string, url: string, timestamp: int}>  $events
     * @return array<int, array{date: string, time: string, datetime: string|null, title: string, country: string, impact: string, forecast: string, previous: string, url: string, timestamp: int}>
     */
    private function filterAndSort(array $events): array
    {
        $today = CarbonImmutable::today('UTC')->toDateString();

        $unique = [];

        foreach ($events as $event) {
            $unique[$event['url'].'|'.$event['timestamp']] = $event;
        }

        $events = array_values(array_filter(
            $unique,
            static fn (array $event): bool => $event['date'] >= $today,
        ));

        usort($events, static fn (array $a, array $b): int => $a['timestamp'] <=> $b['timestamp']);

        return $events;
    }
}
