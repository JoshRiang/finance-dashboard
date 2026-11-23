<?php

namespace App\Services;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MacroService
{
    /**
     * Market instruments tracked via the key-less Yahoo Finance chart API.
     *
     * @var array<int, array{symbol: string, label: string, region: string, group: string}>
     */
    private const INSTRUMENTS = [
        ['symbol' => '^GSPC', 'label' => 'S&P 500', 'region' => 'americas', 'group' => 'Indeks'],
        ['symbol' => '^IXIC', 'label' => 'Nasdaq', 'region' => 'americas', 'group' => 'Indeks'],
        ['symbol' => '^DJI', 'label' => 'Dow Jones', 'region' => 'americas', 'group' => 'Indeks'],
        ['symbol' => 'DX-Y.NYB', 'label' => 'Dollar Index', 'region' => 'americas', 'group' => 'Valuta'],
        ['symbol' => 'IDR=X', 'label' => 'USD/IDR', 'region' => 'world', 'group' => 'Valuta'],
        ['symbol' => 'GC=F', 'label' => 'Emas', 'region' => 'world', 'group' => 'Komoditas'],
        ['symbol' => 'CL=F', 'label' => 'Minyak WTI', 'region' => 'world', 'group' => 'Komoditas'],
        ['symbol' => 'BTC-USD', 'label' => 'Bitcoin', 'region' => 'world', 'group' => 'Kripto'],

        ['symbol' => '^RUT', 'label' => 'Russell 2000', 'region' => 'americas', 'group' => 'Indeks'],
        ['symbol' => '^FTSE', 'label' => 'FTSE 100', 'region' => 'world', 'group' => 'Indeks'],
        ['symbol' => '^GDAXI', 'label' => 'DAX', 'region' => 'world', 'group' => 'Indeks'],
        ['symbol' => '^N225', 'label' => 'Nikkei 225', 'region' => 'world', 'group' => 'Indeks'],
        ['symbol' => '^HSI', 'label' => 'Hang Seng', 'region' => 'world', 'group' => 'Indeks'],
        ['symbol' => '000001.SS', 'label' => 'Shanghai', 'region' => 'world', 'group' => 'Indeks'],
        ['symbol' => 'SI=F', 'label' => 'Perak', 'region' => 'world', 'group' => 'Komoditas'],
        ['symbol' => 'BZ=F', 'label' => 'Brent', 'region' => 'world', 'group' => 'Komoditas'],
        ['symbol' => 'HG=F', 'label' => 'Tembaga', 'region' => 'world', 'group' => 'Komoditas'],
        ['symbol' => 'NG=F', 'label' => 'Gas Alam', 'region' => 'world', 'group' => 'Komoditas'],
        ['symbol' => 'ETH-USD', 'label' => 'Ethereum', 'region' => 'world', 'group' => 'Kripto'],
        ['symbol' => 'SOL-USD', 'label' => 'Solana', 'region' => 'world', 'group' => 'Kripto'],
        ['symbol' => 'EURUSD=X', 'label' => 'EUR/USD', 'region' => 'world', 'group' => 'Valuta'],
        ['symbol' => 'JPY=X', 'label' => 'USD/JPY', 'region' => 'world', 'group' => 'Valuta'],
        ['symbol' => 'GBPUSD=X', 'label' => 'GBP/USD', 'region' => 'world', 'group' => 'Valuta'],
    ];

    /**
     * Annual macro indicators pulled from the key-less World Bank API.
     *
     * @var array<int, array{code: string, label: string, unit: string}>
     */
    private const INDICATORS = [
        ['code' => 'NY.GDP.MKTP.KD.ZG', 'label' => 'Pertumbuhan PDB', 'unit' => '%'],
        ['code' => 'FP.CPI.TOTL.ZG', 'label' => 'Inflasi', 'unit' => '%'],
        ['code' => 'SL.UEM.TOTL.ZS', 'label' => 'Pengangguran', 'unit' => '%'],
    ];

    /**
     * Countries compared on the macro indicator page, in display order.
     *
     * @var array<string, array{label: string, flag: ?string}>
     */
    private const COUNTRIES = [
        'USA' => ['label' => 'Amerika Serikat', 'flag' => 'us'],
        'CHN' => ['label' => 'Tiongkok', 'flag' => 'cn'],
        'JPN' => ['label' => 'Jepang', 'flag' => 'jp'],
        'DEU' => ['label' => 'Jerman', 'flag' => 'de'],
        'GBR' => ['label' => 'Inggris', 'flag' => 'gb'],
        'IND' => ['label' => 'India', 'flag' => 'in'],
        'IDN' => ['label' => 'Indonesia', 'flag' => 'id'],
        'BRA' => ['label' => 'Brasil', 'flag' => 'br'],
        'KOR' => ['label' => 'Korea Selatan', 'flag' => 'kr'],
        'AUS' => ['label' => 'Australia', 'flag' => 'au'],
        'EUU' => ['label' => 'Zona Euro', 'flag' => 'eu'],
        'WLD' => ['label' => 'Dunia', 'flag' => null],
    ];

    private const MARKET_CACHE_KEY = 'macro.markets.v2';

    private const INDICATOR_CACHE_KEY = 'macro.indicators.v2';

    private const SERIES_CACHE_KEY = 'macro.series.v2';

    /**
     * Yahoo Finance range/interval pairs exposed as chart timeframes.
     *
     * @var array<string, array{range: string, interval: string}>
     */
    private const TIMEFRAMES = [
        '1D' => ['range' => '1d', 'interval' => '5m'],
        '5D' => ['range' => '5d', 'interval' => '15m'],
        '1M' => ['range' => '1mo', 'interval' => '1h'],
        '3M' => ['range' => '3mo', 'interval' => '1d'],
        '6M' => ['range' => '6mo', 'interval' => '1d'],
        '1Y' => ['range' => '1y', 'interval' => '1d'],
        '5Y' => ['range' => '5y', 'interval' => '1wk'],
        'MAX' => ['range' => 'max', 'interval' => '1mo'],
    ];

    private const CACHE_TTL_MINUTES = 30;

    private const FAILURE_CACHE_TTL_MINUTES = 5;

    private const RANGE = '1y';

    private const MAX_POINTS = 60;

    private const MAX_YEARS = 10;

    /**
     * Preview payload for the dashboard: a slice of markets plus US/World indicators.
     *
     * @return array{markets: array<int, array<string, mixed>>, indicators: array<string, array{label: string, series: array<int, array<string, mixed>>}>}
     */
    public function overview(): array
    {
        $markets = $this->markets();
        $indicators = $this->indicators();

        return [
            'markets' => array_values(array_filter(
                $markets,
                static fn (array $market): bool => in_array($market['symbol'], ['^GSPC', '^IXIC', '^DJI', 'DX-Y.NYB', 'IDR=X', 'GC=F', 'CL=F', 'BTC-USD'], true),
            )),
            'indicators' => [
                'americas' => [
                    'label' => self::COUNTRIES['USA']['label'],
                    'series' => $this->seriesFor('USA', $indicators),
                ],
                'world' => [
                    'label' => self::COUNTRIES['WLD']['label'],
                    'series' => $this->seriesFor('WLD', $indicators),
                ],
            ],
        ];
    }

    /**
     * @return array<int, array{symbol: string, label: string, region: string, group: string, name: string, currency: string, price: float, day_change: float, range_change: float, week_52_high: float|null, week_52_low: float|null, volume: int|null, points: array<int, float>}>
     */
    public function markets(): array
    {
        return $this->remember(self::MARKET_CACHE_KEY, fn (): array => $this->fetchMarkets());
    }

    /**
     * Lightweight instrument catalog for selectors.
     *
     * @return array<int, array{symbol: string, label: string, group: string}>
     */
    public function catalog(): array
    {
        return array_map(static fn (array $instrument): array => [
            'symbol' => $instrument['symbol'],
            'label' => $instrument['label'],
            'group' => $instrument['group'],
        ], self::INSTRUMENTS);
    }

    /**
     * Get a full price series for one instrument and timeframe.
     *
     * @return array{symbol: string, label: string, timeframe: string, currency: string, name: string, price: float, day_change: float, range_change: float, week_52_high: float|null, week_52_low: float|null, volume: int|null, points: array<int, array{t: int, c: float, v: int}>}|null
     */
    public function series(string $symbol, string $timeframe): ?array
    {
        $timeframe = strtoupper($timeframe);

        if (! isset(self::TIMEFRAMES[$timeframe]) || $this->instrument($symbol) === null) {
            return null;
        }

        $ttl = in_array($timeframe, ['1D', '5D'], true) ? 5 : self::CACHE_TTL_MINUTES;

        $series = $this->remember(
            self::SERIES_CACHE_KEY.".{$symbol}.{$timeframe}",
            fn (): array => $this->fetchSeries($symbol, $timeframe),
            $ttl,
        );

        return $series === [] ? null : $series;
    }

    /**
     * Build the macro detail payload for a single country.
     *
     * @return array{iso3: string, label: string, flag: string|null, indicators: array<int, array<string, mixed>>, world: array<string, float>}|null
     */
    public function country(string $iso3): ?array
    {
        if (! isset(self::COUNTRIES[$iso3])) {
            return null;
        }

        $indicators = $this->indicators();
        $series = $this->seriesFor($iso3, $indicators);

        if ($series === []) {
            return null;
        }

        $world = [];

        foreach ($this->seriesFor('WLD', $indicators) as $indicator) {
            if ($indicator['latest'] !== null) {
                $world[$indicator['code']] = (float) $indicator['latest'];
            }
        }

        return [
            'iso3' => $iso3,
            'label' => self::COUNTRIES[$iso3]['label'],
            'flag' => self::COUNTRIES[$iso3]['flag'],
            'indicators' => $series,
            'world' => $world,
        ];
    }

    /**
     * @param  array{symbol: string, label: string, region: string, group: string}|null
     */
    private function instrument(string $symbol): ?array
    {
        foreach (self::INSTRUMENTS as $instrument) {
            if ($instrument['symbol'] === $symbol) {
                return $instrument;
            }
        }

        return null;
    }

    /**
     * @return array<string, array{code: string, label: string, unit: string, countries: array<int, array{iso3: string, label: string, flag: string|null, points: array<int, array{year: int, value: float}>, latest: float|null, latest_year: int|null}>}>
     */
    public function indicators(): array
    {
        return $this->remember(self::INDICATOR_CACHE_KEY, fn (): array => $this->fetchIndicators());
    }

    /**
     * Build the flat series list for one country across every indicator.
     *
     * @param  array<string, array{code: string, label: string, unit: string, countries: array<int, array{iso3: string, label: string, flag: string|null, points: array<int, array{year: int, value: float}>, latest: float|null, latest_year: int|null}>}>  $indicators
     * @return array<int, array<string, mixed>>
     */
    private function seriesFor(string $iso3, array $indicators): array
    {
        $series = [];

        foreach ($indicators as $indicator) {
            foreach ($indicator['countries'] as $country) {
                if ($country['iso3'] !== $iso3) {
                    continue;
                }

                $series[] = [
                    'code' => $indicator['code'],
                    'label' => $indicator['label'],
                    'unit' => $indicator['unit'],
                    'points' => $country['points'],
                    'latest' => $country['latest'],
                    'latest_year' => $country['latest_year'],
                ];
            }
        }

        return $series;
    }

    /**
     * @template T
     *
     * @param  callable(): T  $resolver
     * @return T
     */
    private function remember(string $key, callable $resolver, ?int $ttlMinutes = null): mixed
    {
        $cached = Cache::get($key);

        if (is_array($cached)) {
            return $cached;
        }

        $value = $resolver();

        $minutes = $value === []
            ? self::FAILURE_CACHE_TTL_MINUTES
            : ($ttlMinutes ?? self::CACHE_TTL_MINUTES);

        Cache::put($key, $value, now()->addMinutes($minutes));

        return $value;
    }

    /**
     * @return array{symbol: string, label: string, timeframe: string, currency: string, name: string, price: float, day_change: float, range_change: float, week_52_high: float|null, week_52_low: float|null, volume: int|null, points: array<int, array{t: int, c: float, v: int}>}
     */
    private function fetchSeries(string $symbol, string $timeframe): array
    {
        $config = self::TIMEFRAMES[$timeframe];
        $instrument = $this->instrument($symbol);

        $url = sprintf(
            'https://query1.finance.yahoo.com/v8/finance/chart/%s?range=%s&interval=%s',
            rawurlencode($symbol),
            $config['range'],
            $config['interval'],
        );

        $response = Http::timeout(25)
            ->retry(2, 300, throw: false)
            ->withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
            ->acceptJson()
            ->get($url);

        if (! $response->successful()) {
            Log::warning('Macro series request failed.', [
                'symbol' => $symbol,
                'timeframe' => $timeframe,
                'status' => $response->status(),
            ]);

            return [];
        }

        $result = $response->json('chart.result.0');

        if (! is_array($result)) {
            return [];
        }

        $timestamps = $result['timestamp'] ?? [];
        $closes = $result['indicators']['quote'][0]['close'] ?? [];
        $volumes = $result['indicators']['quote'][0]['volume'] ?? [];

        $points = [];

        foreach ($closes as $index => $close) {
            if (! is_numeric($close) || ! isset($timestamps[$index])) {
                continue;
            }

            $points[] = [
                't' => (int) $timestamps[$index],
                'c' => round((float) $close, 2),
                'v' => is_numeric($volumes[$index] ?? null) ? (int) $volumes[$index] : 0,
            ];
        }

        if (count($points) < 2) {
            return [];
        }

        $meta = $result['meta'] ?? [];
        $first = $points[0]['c'];
        $last = $points[array_key_last($points)]['c'];

        return [
            'symbol' => $symbol,
            'label' => $instrument['label'] ?? $symbol,
            'timeframe' => $timeframe,
            'currency' => (string) ($meta['currency'] ?? ''),
            'name' => (string) ($meta['shortName'] ?? $instrument['label'] ?? $symbol),
            'price' => round($last, 2),
            'day_change' => round((float) ($meta['regularMarketChangePercent'] ?? 0), 2),
            'range_change' => $first != 0.0 ? round((($last - $first) / $first) * 100, 2) : 0.0,
            'week_52_high' => isset($meta['fiftyTwoWeekHigh']) ? round((float) $meta['fiftyTwoWeekHigh'], 2) : null,
            'week_52_low' => isset($meta['fiftyTwoWeekLow']) ? round((float) $meta['fiftyTwoWeekLow'], 2) : null,
            'volume' => isset($meta['regularMarketVolume']) ? (int) $meta['regularMarketVolume'] : null,
            'points' => $points,
        ];
    }

    /**
     * @return array<int, array{symbol: string, label: string, region: string, group: string, name: string, currency: string, price: float, day_change: float, range_change: float, week_52_high: float|null, week_52_low: float|null, volume: int|null, points: array<int, float>}>
     */
    private function fetchMarkets(): array
    {
        $responses = Http::pool(function (Pool $pool): array {
            $requests = [];

            foreach (self::INSTRUMENTS as $index => $instrument) {
                $url = sprintf(
                    'https://query1.finance.yahoo.com/v8/finance/chart/%s?range=%s&interval=1d',
                    rawurlencode($instrument['symbol']),
                    self::RANGE,
                );

                $requests[$index] = $pool->as((string) $index)
                    ->timeout(20)
                    ->retry(2, 300, throw: false)
                    ->withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
                    ->acceptJson()
                    ->get($url);
            }

            return $requests;
        });

        $markets = [];

        foreach (self::INSTRUMENTS as $index => $instrument) {
            $response = $responses[$index] ?? null;

            if (! $response instanceof Response || ! $response->successful()) {
                Log::warning('Macro market request failed.', [
                    'symbol' => $instrument['symbol'],
                    'status' => $response instanceof Response ? $response->status() : 'connection error',
                ]);

                continue;
            }

            $parsed = $this->parseMarket($response->json(), $instrument);

            if ($parsed !== null) {
                $markets[] = $parsed;
            }
        }

        return $markets;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array{symbol: string, label: string, region: string, group: string}  $instrument
     * @return array{symbol: string, label: string, region: string, group: string, name: string, currency: string, price: float, day_change: float, range_change: float, week_52_high: float|null, week_52_low: float|null, volume: int|null, points: array<int, float>}|null
     */
    private function parseMarket(array $payload, array $instrument): ?array
    {
        $result = $payload['chart']['result'][0] ?? null;

        if (! is_array($result)) {
            return null;
        }

        $closes = $result['indicators']['quote'][0]['close'] ?? [];

        $series = [];

        foreach ($closes as $close) {
            if (is_numeric($close)) {
                $series[] = (float) $close;
            }
        }

        if (count($series) < 2) {
            return null;
        }

        $meta = $result['meta'] ?? [];
        $first = $series[0];
        $last = $series[array_key_last($series)];

        return [
            'symbol' => $instrument['symbol'],
            'label' => $instrument['label'],
            'region' => $instrument['region'],
            'group' => $instrument['group'],
            'name' => (string) ($meta['shortName'] ?? $instrument['label']),
            'currency' => (string) ($meta['currency'] ?? ''),
            'price' => round($last, 2),
            'day_change' => round((float) ($meta['regularMarketChangePercent'] ?? 0), 2),
            'range_change' => $first != 0.0 ? round((($last - $first) / $first) * 100, 2) : 0.0,
            'week_52_high' => isset($meta['fiftyTwoWeekHigh']) ? round((float) $meta['fiftyTwoWeekHigh'], 2) : null,
            'week_52_low' => isset($meta['fiftyTwoWeekLow']) ? round((float) $meta['fiftyTwoWeekLow'], 2) : null,
            'volume' => isset($meta['regularMarketVolume']) ? (int) $meta['regularMarketVolume'] : null,
            'points' => $this->downsample($series),
        ];
    }

    /**
     * Reduce a long series to a readable number of points for a sparkline.
     *
     * @param  array<int, float>  $series
     * @return array<int, float>
     */
    private function downsample(array $series): array
    {
        $count = count($series);

        if ($count <= self::MAX_POINTS) {
            return array_map(static fn (float $value): float => round($value, 2), $series);
        }

        $step = ($count - 1) / (self::MAX_POINTS - 1);
        $sampled = [];

        for ($i = 0; $i < self::MAX_POINTS; $i++) {
            $sampled[] = round($series[(int) round($i * $step)], 2);
        }

        return $sampled;
    }

    /**
     * @return array<string, array{code: string, label: string, unit: string, countries: array<int, array{iso3: string, label: string, flag: string|null, points: array<int, array{year: int, value: float}>, latest: float|null, latest_year: int|null}>}>
     */
    private function fetchIndicators(): array
    {
        $countryCodes = implode('%3B', array_keys(self::COUNTRIES));

        $requests = [];

        foreach (self::INDICATORS as $index => $indicator) {
            $requests[$index] = [
                'indicator' => $indicator,
                'url' => sprintf(
                    'https://api.worldbank.org/v2/country/%s/indicator/%s?format=json&per_page=500&date=2015:2025',
                    $countryCodes,
                    $indicator['code'],
                ),
            ];
        }

        $responses = Http::pool(function (Pool $pool) use ($requests): array {
            $handles = [];

            foreach ($requests as $index => $request) {
                $handles[$index] = $pool->as((string) $index)
                    ->timeout(30)
                    ->retry(2, 400, throw: false)
                    ->withUserAgent('Mozilla/5.0 (compatible; LaravelMacroReader/1.0)')
                    ->acceptJson()
                    ->get($request['url']);
            }

            return $handles;
        });

        $indicators = [];

        foreach ($requests as $index => $request) {
            $response = $responses[$index] ?? null;

            if (! $response instanceof Response || ! $response->successful()) {
                Log::warning('Macro indicator request failed.', [
                    'indicator' => $request['indicator']['code'],
                    'status' => $response instanceof Response ? $response->status() : 'connection error',
                ]);

                continue;
            }

            $countries = $this->parseIndicator($response->json());

            if ($countries === []) {
                continue;
            }

            $indicators[$request['indicator']['code']] = [
                'code' => $request['indicator']['code'],
                'label' => $request['indicator']['label'],
                'unit' => $request['indicator']['unit'],
                'countries' => $countries,
            ];
        }

        return $indicators;
    }

    /**
     * @param  array<int, mixed>  $payload
     * @return array<int, array{iso3: string, label: string, flag: string|null, points: array<int, array{year: int, value: float}>, latest: float|null, latest_year: int|null}>
     */
    private function parseIndicator(array $payload): array
    {
        $rows = $payload[1] ?? null;

        if (! is_array($rows)) {
            return [];
        }

        $byCountry = [];

        foreach ($rows as $row) {
            if (! is_array($row) || ! is_numeric($row['value'] ?? null)) {
                continue;
            }

            $iso = (string) ($row['countryiso3code'] ?? '');

            if (! isset(self::COUNTRIES[$iso])) {
                continue;
            }

            $byCountry[$iso][] = [
                'year' => (int) $row['date'],
                'value' => round((float) $row['value'], 2),
            ];
        }

        $countries = [];

        foreach (self::COUNTRIES as $iso => $meta) {
            if (! isset($byCountry[$iso])) {
                continue;
            }

            $points = $byCountry[$iso];
            usort($points, static fn (array $a, array $b): int => $a['year'] <=> $b['year']);
            $points = array_slice($points, -self::MAX_YEARS);
            $latest = $points[array_key_last($points)];

            $countries[] = [
                'iso3' => $iso,
                'label' => $meta['label'],
                'flag' => $meta['flag'],
                'points' => $points,
                'latest' => $latest['value'],
                'latest_year' => $latest['year'],
            ];
        }

        return $countries;
    }
}
