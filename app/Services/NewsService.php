<?php

namespace App\Services;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use SimpleXMLElement;

class NewsService
{
    /**
     * Free, key-less RSS feeds from Indonesian outlets.
     *
     * @var array<string, string>
     */
    private const DOMESTIC_FEEDS = [
        'Antara News' => 'https://www.antaranews.com/rss/terkini.xml',
        'CNN Indonesia' => 'https://www.cnnindonesia.com/rss',
        'Tempo' => 'https://rss.tempo.co/nasional',
        'CNBC Indonesia' => 'https://www.cnbcindonesia.com/rss',
        'Republika' => 'https://www.republika.co.id/rss',
        'Katadata' => 'https://katadata.co.id/rss',
    ];

    /**
     * Free, key-less RSS/Atom feeds from international outlets.
     *
     * @var array<string, string>
     */
    private const INTERNATIONAL_FEEDS = [
        'BBC' => 'https://feeds.bbci.co.uk/news/world/rss.xml',
        'BBC Tech' => 'https://feeds.bbci.co.uk/news/technology/rss.xml',
        'Al Jazeera' => 'https://www.aljazeera.com/xml/rss/all.xml',
        'The Guardian' => 'https://www.theguardian.com/world/rss',
        'Guardian Tech' => 'https://www.theguardian.com/uk/technology/rss',
        'NYT' => 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
        'NYT Tech' => 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
        'CNBC World' => 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362',
        'TechCrunch' => 'https://techcrunch.com/feed/',
        'The Verge' => 'https://www.theverge.com/rss/index.xml',
        'Ars Technica' => 'https://feeds.arstechnica.com/arstechnica/index',
        'Engadget' => 'https://www.engadget.com/rss.xml',
        'Wired' => 'https://www.wired.com/feed/rss',
        'Hacker News' => 'https://hnrss.org/frontpage',
        'DW' => 'https://rss.dw.com/rdf/rss-en-all',
        'CNA' => 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml',
    ];

    public const SCOPE_DOMESTIC = 'domestic';

    public const SCOPE_INTERNATIONAL = 'international';

    private const CACHE_KEY = 'news.headlines';

    private const CACHE_TTL_MINUTES = 10;

    /**
     * Shorter TTL when the fetch failed, so unreachable sources are not hammered.
     */
    private const FAILURE_CACHE_TTL_MINUTES = 2;

    private const MAX_ARTICLES = 300;

    /**
     * How many of the newest articles to keep from each source, so that a
     * prolific source cannot crowd out the others.
     */
    private const MAX_PER_SOURCE = 25;

    /**
     * Get the latest headlines, optionally filtered by scope.
     *
     * @return array<int, array{id: string, title: string, excerpt: string, content: string, image: string|null, url: string, source: string, scope: string, published_at: int}>
     */
    public function all(?string $scope = null): array
    {
        $articles = $this->cached();

        if ($scope === null) {
            return $articles;
        }

        return array_values(array_filter(
            $articles,
            static fn (array $article): bool => $article['scope'] === $scope,
        ));
    }

    /**
     * Count the articles per scope, used for the filter tabs.
     *
     * @return array{all: int, domestic: int, international: int}
     */
    public function counts(): array
    {
        $articles = $this->cached();

        $domestic = count(array_filter(
            $articles,
            static fn (array $article): bool => $article['scope'] === self::SCOPE_DOMESTIC,
        ));

        return [
            'all' => count($articles),
            'domestic' => $domestic,
            'international' => count($articles) - $domestic,
        ];
    }

    /**
     * Find a single article by its encoded identifier.
     *
     * @return array{id: string, title: string, excerpt: string, content: string, image: string|null, url: string, source: string, scope: string, published_at: int}|null
     */
    public function find(string $id): ?array
    {
        foreach ($this->cached() as $article) {
            if ($article['id'] === $id) {
                return $article;
            }
        }

        return null;
    }

    /**
     * Encode an article URL into a URL-safe identifier.
     */
    public function idFor(string $url): string
    {
        return rtrim(strtr(base64_encode($url), '+/', '-_'), '=');
    }

    /**
     * @return array<int, array{id: string, title: string, excerpt: string, content: string, image: string|null, url: string, source: string, scope: string, published_at: int}>
     */
    private function cached(): array
    {
        $cached = Cache::get(self::CACHE_KEY);

        if (is_array($cached)) {
            return $cached;
        }

        $articles = $this->build();

        Cache::put(
            self::CACHE_KEY,
            $articles,
            now()->addMinutes($articles === [] ? self::FAILURE_CACHE_TTL_MINUTES : self::CACHE_TTL_MINUTES),
        );

        return $articles;
    }

    /**
     * Fetch every feed in parallel, then merge and sort the articles.
     *
     * @return array<int, array{id: string, title: string, excerpt: string, content: string, image: string|null, url: string, source: string, scope: string, published_at: int}>
     */
    private function build(): array
    {
        $articles = [];

        foreach ($this->fetchFeeds() as $source => [$body, $scope]) {
            $parsed = $this->parse($body, $source, $scope);

            usort($parsed, static fn (array $a, array $b): int => $b['published_at'] <=> $a['published_at']);

            foreach (array_slice($parsed, 0, self::MAX_PER_SOURCE) as $article) {
                $articles[$article['url']] = $article;
            }
        }

        $articles = array_values($articles);

        usort($articles, static fn (array $a, array $b): int => $b['published_at'] <=> $a['published_at']);

        return array_slice($articles, 0, self::MAX_ARTICLES);
    }

    /**
     * Request all feeds concurrently and return the successful bodies.
     *
     * @return array<string, array{0: string, 1: string}>
     */
    private function fetchFeeds(): array
    {
        $feeds = $this->feedList();

        $responses = Http::pool(function (Pool $pool) use ($feeds): array {
            $requests = [];

            foreach ($feeds as $source => [$url, $scope]) {
                $requests[$source] = $pool->as($source)
                    ->timeout(20)
                    ->retry(2, 300, throw: false)
                    ->withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
                    ->get($url);
            }

            return $requests;
        });

        $bodies = [];

        foreach ($feeds as $source => [$url, $scope]) {
            $response = $responses[$source] ?? null;

            if ($response instanceof Response && $response->successful()) {
                $bodies[$source] = [$response->body(), $scope];

                continue;
            }

            Log::warning('News feed request failed.', [
                'feed' => $url,
                'status' => $response instanceof Response ? $response->status() : 'connection error',
            ]);
        }

        return $bodies;
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    private function feedList(): array
    {
        $feeds = [];

        foreach (self::DOMESTIC_FEEDS as $source => $url) {
            $feeds[$source] = [$url, self::SCOPE_DOMESTIC];
        }

        foreach (self::INTERNATIONAL_FEEDS as $source => $url) {
            $feeds[$source] = [$url, self::SCOPE_INTERNATIONAL];
        }

        return $feeds;
    }

    /**
     * Parse an RSS 2.0, RSS 1.0 (RDF), or Atom document into articles.
     *
     * @return array<int, array{id: string, title: string, excerpt: string, content: string, image: string|null, url: string, source: string, scope: string, published_at: int}>
     */
    private function parse(string $body, string $source, string $scope): array
    {
        $xml = simplexml_load_string($body, SimpleXMLElement::class, LIBXML_NOCDATA);

        if ($xml === false) {
            Log::warning('News feed could not be parsed.', ['source' => $source]);

            return [];
        }

        $items = $xml->channel->item ?? $xml->entry ?? $xml->item ?? null;

        if ($items === null) {
            Log::warning('News feed had no items.', ['source' => $source]);

            return [];
        }

        $articles = [];

        foreach ($items as $item) {
            $url = $this->itemUrl($item);
            $title = $this->text((string) $item->title);

            if ($url === '' || $title === '') {
                continue;
            }

            $description = (string) ($item->description ?? $item->summary ?? $item->content ?? '');

            $articles[] = [
                'id' => $this->idFor($url),
                'title' => $title,
                'excerpt' => Str::limit($this->text($description), 180),
                'content' => $this->contentFor($item, $description),
                'image' => $this->imageFor($item),
                'url' => $url,
                'source' => $source,
                'scope' => $scope,
                'published_at' => $this->timestampFor($this->itemDate($item)),
            ];
        }

        return $articles;
    }

    /**
     * Resolve the article link across RSS, RDF, and Atom shapes.
     */
    private function itemUrl(SimpleXMLElement $item): string
    {
        $plain = trim((string) $item->link);

        if ($plain !== '') {
            return $plain;
        }

        foreach ($item->link as $link) {
            $rel = (string) ($link['rel'] ?? 'alternate');
            $href = trim((string) ($link['href'] ?? ''));

            if ($href !== '' && ($rel === 'alternate' || $rel === '')) {
                return $href;
            }
        }

        return '';
    }

    /**
     * Resolve the publication date across RSS, RDF, and Atom shapes.
     */
    private function itemDate(SimpleXMLElement $item): string
    {
        foreach (['pubDate', 'published', 'updated'] as $field) {
            $value = trim((string) ($item->{$field} ?? ''));

            if ($value !== '') {
                return $value;
            }
        }

        $dc = $item->children('http://purl.org/dc/elements/1.1/');
        $value = trim((string) ($dc->date ?? ''));

        return $value !== '' ? $value : '';
    }

    /**
     * Extract the longest available body for an article.
     */
    private function contentFor(SimpleXMLElement $item, string $description): string
    {
        $content = $item->children('http://purl.org/rss/1.0/modules/content/');

        if (isset($content->encoded)) {
            $text = $this->text((string) $content->encoded);

            if ($text !== '') {
                return $text;
            }
        }

        $atomContent = $this->text((string) ($item->content ?? ''));

        if ($atomContent !== '' && mb_strlen($atomContent) > mb_strlen($this->text($description))) {
            return $atomContent;
        }

        return $this->text($description);
    }

    /**
     * Resolve a representative image for the article.
     */
    private function imageFor(SimpleXMLElement $item): ?string
    {
        if (isset($item->img)) {
            $image = $this->normalizeImageUrl((string) $item->img);

            if ($image !== '') {
                return $image;
            }
        }

        $media = $item->children('http://search.yahoo.com/mrss/');

        $candidates = [];

        if (isset($media->content)) {
            $candidates[] = $media->content;
        }

        if (isset($media->thumbnail)) {
            $candidates[] = $media->thumbnail;
        }

        if (isset($item->enclosure)) {
            $candidates[] = $item->enclosure;
        }

        foreach ($candidates as $candidate) {
            $url = trim((string) ($candidate->attributes()['url'] ?? ''));

            if ($url !== '') {
                return $this->normalizeImageUrl($url);
            }
        }

        $html = [
            (string) ($item->description ?? ''),
            (string) ($item->summary ?? ''),
            (string) ($item->content ?? ''),
        ];

        $content = $item->children('http://purl.org/rss/1.0/modules/content/');

        if (isset($content->encoded)) {
            $html[] = (string) $content->encoded;
        }

        foreach ($html as $fragment) {
            if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $fragment, $matches) === 1) {
                return $this->normalizeImageUrl($matches[1]);
            }
        }

        return null;
    }

    private function normalizeImageUrl(string $url): string
    {
        $url = html_entity_decode(trim($url), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return str_starts_with($url, '//') ? 'https:'.$url : $url;
    }

    private function timestampFor(string $date): int
    {
        $timestamp = $date === '' ? false : strtotime($date);

        return $timestamp === false ? now()->getTimestamp() : $timestamp;
    }

    /**
     * Convert an HTML fragment into clean plain text.
     */
    private function text(string $html): string
    {
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', $text) ?? '';

        return trim($text);
    }
}
