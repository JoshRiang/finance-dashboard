<?php

namespace App\Services;

use GuzzleHttp\Cookie\CookieJar;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GexService
{
    /**
     * Liquid, key-less option chains exposed by the selector.
     *
     * @var array<string, array{label: string, group: string, reference_symbol: string|null, reference_label: string|null}>
     */
    private const INSTRUMENTS = [
        'GLD' => ['label' => 'Gold', 'group' => 'Logam', 'reference_symbol' => 'GC=F', 'reference_label' => 'XAUUSD'],
        'SLV' => ['label' => 'Silver', 'group' => 'Logam', 'reference_symbol' => 'SI=F', 'reference_label' => 'Silver'],
        'SPY' => ['label' => 'S&P 500', 'group' => 'Indeks', 'reference_symbol' => null, 'reference_label' => null],
        'QQQ' => ['label' => 'Nasdaq 100', 'group' => 'Indeks', 'reference_symbol' => null, 'reference_label' => null],
        'IWM' => ['label' => 'Russell 2000', 'group' => 'Indeks', 'reference_symbol' => null, 'reference_label' => null],
        'NVDA' => ['label' => 'NVIDIA', 'group' => 'Saham', 'reference_symbol' => null, 'reference_label' => null],
        'AAPL' => ['label' => 'Apple', 'group' => 'Saham', 'reference_symbol' => null, 'reference_label' => null],
        'MSFT' => ['label' => 'Microsoft', 'group' => 'Saham', 'reference_symbol' => null, 'reference_label' => null],
        'TSLA' => ['label' => 'Tesla', 'group' => 'Saham', 'reference_symbol' => null, 'reference_label' => null],
        'AMZN' => ['label' => 'Amazon', 'group' => 'Saham', 'reference_symbol' => null, 'reference_label' => null],
        'META' => ['label' => 'Meta', 'group' => 'Saham', 'reference_symbol' => null, 'reference_label' => null],
        'GOOGL' => ['label' => 'Alphabet', 'group' => 'Saham', 'reference_symbol' => null, 'reference_label' => null],
        'USO' => ['label' => 'Crude Oil', 'group' => 'Energi', 'reference_symbol' => 'CL=F', 'reference_label' => 'WTI'],
        'XLE' => ['label' => 'Energy Sector', 'group' => 'Energi', 'reference_symbol' => null, 'reference_label' => null],
        'TLT' => ['label' => 'US 20Y Bonds', 'group' => 'Obligasi', 'reference_symbol' => null, 'reference_label' => null],
        'UUP' => ['label' => 'US Dollar', 'group' => 'Valuta', 'reference_symbol' => null, 'reference_label' => null],
    ];

    private const DEFAULT_SYMBOL = 'GLD';

    private const MAX_EXPIRATIONS = 6;

    private const RISK_FREE_RATE = 0.043;

    private const CONTRACT_MULTIPLIER = 100;

    private const MIN_IV = 0.05;

    private const MAX_IV = 2.0;

    private const CACHE_TTL_MINUTES = 15;

    private const FAILURE_CACHE_TTL_MINUTES = 5;

    /**
     * @return array<int, array{symbol: string, label: string, group: string}>
     */
    public function catalog(): array
    {
        $catalog = [];

        foreach (self::INSTRUMENTS as $symbol => $instrument) {
            $catalog[] = [
                'symbol' => $symbol,
                'label' => $instrument['label'],
                'group' => $instrument['group'],
            ];
        }

        return $catalog;
    }

    public function defaultSymbol(): string
    {
        return self::DEFAULT_SYMBOL;
    }

    public function supports(string $symbol): bool
    {
        return isset(self::INSTRUMENTS[strtoupper($symbol)]);
    }

    /**
     * Full dealer-positioning payload for one instrument.
     *
     * @return array<string, mixed>
     */
    public function analysis(string $symbol): array
    {
        $symbol = strtoupper($symbol);

        if (! $this->supports($symbol)) {
            return [];
        }

        $cacheKey = 'gex.analysis.'.$symbol;
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return $cached;
        }

        $analysis = $this->build($symbol);

        Cache::put(
            $cacheKey,
            $analysis,
            now()->addMinutes($analysis === [] ? self::FAILURE_CACHE_TTL_MINUTES : self::CACHE_TTL_MINUTES),
        );

        return $analysis;
    }

    /**
     * @return array<string, mixed>
     */
    private function build(string $symbol): array
    {
        $instrument = self::INSTRUMENTS[$symbol];

        $crumbData = $this->yahooSession();

        if ($crumbData === null) {
            return [];
        }

        [$crumb, $jar] = $crumbData;

        $chain = $this->optionChain($symbol, $crumb, $jar);

        if ($chain === null) {
            Log::warning('GEX option chain unavailable.', ['symbol' => $symbol]);

            return [];
        }

        $spot = $this->spotPrice($symbol, $instrument['reference_symbol']);

        if ($spot === null) {
            return [];
        }

        [$spotPrice, $referencePrice] = $spot;
        $ratio = $referencePrice !== null && $spotPrice > 0 ? $referencePrice / $spotPrice : 1.0;

        $contracts = [];
        $strikes = [];
        $callOi = 0;
        $putOi = 0;
        $callVolume = 0;
        $putVolume = 0;

        foreach ($chain['expirations'] as $expiration) {
            $dte = $expiration['dte'];

            if ($dte < 0) {
                continue;
            }

            $t = max($dte, 0.5) / 365;

            foreach (['calls' => 1, 'puts' => -1] as $side => $isCall) {
                foreach ($expiration[$side] as $contract) {
                    $strike = (float) ($contract['strike'] ?? 0);
                    $oi = (int) ($contract['openInterest'] ?? 0);
                    $iv = (float) ($contract['impliedVolatility'] ?? 0);

                    if ($strike <= 0 || $oi <= 0 || $iv <= 0) {
                        continue;
                    }

                    $iv = min(max($iv, self::MIN_IV), self::MAX_IV);

                    $greeks = $this->greeks($spotPrice, $strike, $t, $iv, $isCall);

                    $contracts[] = [
                        'strike' => $strike,
                        'is_call' => $isCall,
                        'oi' => $oi,
                        'dte' => $dte,
                        'iv' => $iv,
                        'gamma' => $greeks['gamma'],
                        'delta' => $greeks['delta'],
                        'vanna' => $greeks['vanna'],
                        'charm' => $greeks['charm'],
                    ];

                    $strikes[$strike] ??= [
                        'strike' => $strike,
                        'gex' => 0.0,
                        'dex' => 0.0,
                        'vex' => 0.0,
                        'chex' => 0.0,
                        'call_oi' => 0,
                        'put_oi' => 0,
                    ];

                    $strikes[$strike]['gex'] += $greeks['gamma'] * $oi * self::CONTRACT_MULTIPLIER * $spotPrice * $spotPrice * 0.01 * $isCall;
                    $strikes[$strike]['dex'] += $greeks['delta'] * $oi * self::CONTRACT_MULTIPLIER * $spotPrice;
                    $strikes[$strike]['vex'] += $greeks['vanna'] * $oi * self::CONTRACT_MULTIPLIER * $spotPrice;
                    $strikes[$strike]['chex'] += $greeks['charm'] * $oi * self::CONTRACT_MULTIPLIER * $spotPrice;

                    $volume = (int) ($contract['volume'] ?? 0);

                    if ($isCall === 1) {
                        $strikes[$strike]['call_oi'] += $oi;
                        $callOi += $oi;
                        $callVolume += $volume;
                    } else {
                        $strikes[$strike]['put_oi'] += $oi;
                        $putOi += $oi;
                        $putVolume += $volume;
                    }
                }
            }
        }

        if ($contracts === []) {
            return [];
        }

        $netGex = array_sum(array_column($strikes, 'gex'));
        $gammaFlip = $this->gammaFlip($contracts, $spotPrice);
        $putWall = $this->wall($strikes, $spotPrice, 'put');
        $callWall = $this->wall($strikes, $spotPrice, 'call');
        $motherwall = $this->motherwall($strikes);
        $expectedMove = $this->expectedMove($chain['nearest'], $spotPrice);

        $chartStrikes = array_values(array_filter(
            $strikes,
            static fn (array $row): bool => $row['strike'] >= $spotPrice * 0.8 && $row['strike'] <= $spotPrice * 1.2,
        ));
        usort($chartStrikes, static fn (array $a, array $b): int => $a['strike'] <=> $b['strike']);

        $convert = static fn (?array $row): ?float => $row === null ? null : round($row['strike'] * $ratio, 2);

        return [
            'symbol' => $symbol,
            'label' => $instrument['label'],
            'group' => $instrument['group'],
            'reference_label' => $instrument['reference_label'],
            'spot' => round($spotPrice, 2),
            'spot_reference' => $referencePrice === null ? null : round($referencePrice, 2),
            'ratio' => round($ratio, 4),
            'as_of' => now()->toIso8601String(),
            'regime' => $netGex >= 0 ? 'positive' : 'negative',
            'net_gex' => round($netGex, 0),
            'gamma_flip' => $gammaFlip === null ? null : round($gammaFlip, 2),
            'gamma_flip_reference' => $gammaFlip === null || $instrument['reference_label'] === null ? null : round($gammaFlip * $ratio, 2),
            'put_wall' => $putWall === null ? null : round($putWall['strike'], 2),
            'put_wall_reference' => $convert($putWall),
            'call_wall' => $callWall === null ? null : round($callWall['strike'], 2),
            'call_wall_reference' => $convert($callWall),
            'motherwall' => $motherwall === null ? null : round($motherwall['strike'], 2),
            'motherwall_reference' => $convert($motherwall),
            'expected_move' => [
                'upper' => $expectedMove === null ? null : round($spotPrice + $expectedMove, 2),
                'lower' => $expectedMove === null ? null : round($spotPrice - $expectedMove, 2),
                'value' => $expectedMove === null ? null : round($expectedMove, 2),
            ],
            'flow' => [
                'call_oi' => $callOi,
                'put_oi' => $putOi,
                'call_volume' => $callVolume,
                'put_volume' => $putVolume,
                'put_call_ratio' => $callOi > 0 ? round($putOi / $callOi, 2) : null,
            ],
            'expirations' => array_map(static fn (array $expiration): array => [
                'date' => $expiration['date'],
                'dte' => $expiration['dte'],
            ], $chain['expirations']),
            'strikes' => array_map(static fn (array $row): array => [
                'strike' => round($row['strike'], 2),
                'strike_reference' => $instrument['reference_label'] === null ? null : round($row['strike'] * $ratio, 2),
                'gex' => round($row['gex'], 0),
                'dex' => round($row['dex'], 0),
                'vex' => round($row['vex'], 0),
                'chex' => round($row['chex'], 0),
                'call_oi' => $row['call_oi'],
                'put_oi' => $row['put_oi'],
            ], $chartStrikes),
        ];
    }

    /**
     * Establish a Yahoo Finance session and fetch the CSRF crumb.
     *
     * @return array{0: string, 1: CookieJar}|null
     */
    private function yahooSession(): ?array
    {
        try {
            $jar = new CookieJar;

            Http::withOptions(['cookies' => $jar])
                ->withUserAgent($this->userAgent())
                ->timeout(15)
                ->get('https://fc.yahoo.com');

            $crumb = Http::withOptions(['cookies' => $jar])
                ->withUserAgent($this->userAgent())
                ->timeout(15)
                ->get('https://query1.finance.yahoo.com/v1/test/getcrumb')
                ->body();

            $crumb = trim($crumb);

            return $crumb === '' ? null : [$crumb, $jar];
        } catch (\Throwable $exception) {
            Log::warning('Yahoo session failed.', ['error' => $exception->getMessage()]);

            return null;
        }
    }

    /**
     * Fetch the nearest expirations of the option chain.
     *
     * @return array{expirations: array<int, array<string, mixed>>, nearest: array<string, mixed>}|null
     */
    private function optionChain(string $symbol, string $crumb, CookieJar $jar): ?array
    {
        try {
            $base = Http::withOptions(['cookies' => $jar])
                ->withUserAgent($this->userAgent())
                ->acceptJson()
                ->timeout(20)
                ->get('https://query1.finance.yahoo.com/v7/finance/options/'.$symbol, ['crumb' => $crumb]);

            if (! $base->successful()) {
                return null;
            }

            $result = $base->json('optionChain.result.0');

            if (! is_array($result)) {
                return null;
            }

            $dates = array_slice($result['expirationDates'] ?? [], 0, self::MAX_EXPIRATIONS);
            $nearest = $result['options'][0] ?? [];

            $expirations = [[
                'date' => isset($nearest['expirationDate']) ? gmdate('Y-m-d', $nearest['expirationDate']) : '',
                'dte' => $this->daysToExpiration($nearest['expirationDate'] ?? null),
                'calls' => $nearest['calls'] ?? [],
                'puts' => $nearest['puts'] ?? [],
            ]];

            $remaining = array_slice($dates, 1);

            if ($remaining !== []) {
                $responses = Http::pool(function (Pool $pool) use ($remaining, $symbol, $crumb, $jar): array {
                    $requests = [];

                    foreach ($remaining as $index => $timestamp) {
                        $requests[$index] = $pool->as((string) $index)
                            ->withOptions(['cookies' => $jar])
                            ->withUserAgent($this->userAgent())
                            ->acceptJson()
                            ->timeout(20)
                            ->retry(1, 200, throw: false)
                            ->get('https://query1.finance.yahoo.com/v7/finance/options/'.$symbol, [
                                'crumb' => $crumb,
                                'date' => $timestamp,
                            ]);
                    }

                    return $requests;
                });

                foreach ($remaining as $index => $timestamp) {
                    $response = $responses[$index] ?? null;

                    if (! $response instanceof Response || ! $response->successful()) {
                        continue;
                    }

                    $option = $response->json('optionChain.result.0.options.0');

                    if (! is_array($option)) {
                        continue;
                    }

                    $expirations[] = [
                        'date' => gmdate('Y-m-d', $timestamp),
                        'dte' => $this->daysToExpiration($option['expirationDate'] ?? $timestamp),
                        'calls' => $option['calls'] ?? [],
                        'puts' => $option['puts'] ?? [],
                    ];
                }
            }

            return ['expirations' => $expirations, 'nearest' => $nearest];
        } catch (\Throwable $exception) {
            Log::warning('GEX option chain fetch failed.', ['symbol' => $symbol, 'error' => $exception->getMessage()]);

            return null;
        }
    }

    /**
     * Fetch the instrument spot price and optional reference price.
     *
     * @return array{0: float, 1: float|null}|null
     */
    private function spotPrice(string $symbol, ?string $referenceSymbol): ?array
    {
        try {
            $responses = Http::pool(function (Pool $pool) use ($symbol, $referenceSymbol): array {
                $requests = [
                    'spot' => $pool->as('spot')->withUserAgent($this->userAgent())->acceptJson()->timeout(20)
                        ->get('https://query1.finance.yahoo.com/v8/finance/chart/'.rawurlencode($symbol).'?range=1d&interval=1d'),
                ];

                if ($referenceSymbol !== null) {
                    $requests['reference'] = $pool->as('reference')->withUserAgent($this->userAgent())->acceptJson()->timeout(20)
                        ->get('https://query1.finance.yahoo.com/v8/finance/chart/'.rawurlencode($referenceSymbol).'?range=1d&interval=1d');
                }

                return $requests;
            });

            $spotResponse = $responses['spot'] ?? null;

            if (! $spotResponse instanceof Response) {
                return null;
            }

            $spotPrice = (float) ($spotResponse->json('chart.result.0.meta.regularMarketPrice') ?? 0);

            if ($spotPrice <= 0) {
                return null;
            }

            $referencePrice = null;
            $referenceResponse = $responses['reference'] ?? null;

            if ($referenceSymbol !== null && $referenceResponse instanceof Response) {
                $value = (float) ($referenceResponse->json('chart.result.0.meta.regularMarketPrice') ?? 0);
                $referencePrice = $value > 0 ? $value : null;
            }

            return [$spotPrice, $referencePrice];
        } catch (\Throwable $exception) {
            Log::warning('GEX spot fetch failed.', ['symbol' => $symbol, 'error' => $exception->getMessage()]);

            return null;
        }
    }

    /**
     * @return array{gamma: float, delta: float, vanna: float, charm: float}
     */
    private function greeks(float $spot, float $strike, float $t, float $iv, int $isCall): array
    {
        $sqrtT = sqrt($t);
        $denom = $iv * $sqrtT;

        if ($denom <= 0) {
            return ['gamma' => 0.0, 'delta' => 0.0, 'vanna' => 0.0, 'charm' => 0.0];
        }

        $d1 = (log($spot / $strike) + (self::RISK_FREE_RATE + 0.5 * $iv * $iv) * $t) / $denom;
        $d2 = $d1 - $denom;

        $pdf = $this->normalPdf($d1);
        $gamma = $pdf / ($spot * $denom);
        $delta = $isCall === 1 ? $this->normalCdf($d1) : $this->normalCdf($d1) - 1;
        $vanna = -$pdf * $d2 / $iv;
        $charm = -$pdf * ((self::RISK_FREE_RATE / $denom) - $d2 / (2 * $t));

        return [
            'gamma' => $gamma,
            'delta' => $delta,
            'vanna' => $vanna,
            'charm' => $charm,
        ];
    }

    private function normalPdf(float $x): float
    {
        return exp(-0.5 * $x * $x) / sqrt(2 * M_PI);
    }

    private function normalCdf(float $x): float
    {
        // Abramowitz & Stegun approximation (error < 7.5e-8).
        $sign = $x < 0 ? -1 : 1;
        $x = abs($x) / sqrt(2);
        $t = 1 / (1 + 0.3275911 * $x);
        $y = 1 - (((((1.061405429 * $t - 1.453152027) * $t) + 1.421413741) * $t - 0.284496736) * $t + 0.254829592) * $t * exp(-$x * $x);

        return 0.5 * (1 + $sign * $y);
    }

    /**
     * Find the spot price where net dealer gamma flips sign.
     *
     * @param  array<int, array<string, mixed>>  $contracts
     */
    private function gammaFlip(array $contracts, float $spot): ?float
    {
        $previousPrice = null;
        $previousValue = null;

        for ($step = 0; $step <= 80; $step++) {
            $price = $spot * (0.8 + ($step / 80) * 0.4);
            $value = 0.0;

            foreach ($contracts as $contract) {
                $t = max($contract['dte'], 0.5) / 365;
                $greeks = $this->greeks($price, $contract['strike'], $t, $contract['iv'], $contract['is_call'] ? 1 : -1);
                $value += $greeks['gamma'] * $contract['oi'] * self::CONTRACT_MULTIPLIER * $price * $price * 0.01 * ($contract['is_call'] ? 1 : -1);
            }

            if ($previousValue !== null && (($previousValue < 0 && $value >= 0) || ($previousValue > 0 && $value <= 0))) {
                $span = $value - $previousValue;
                $ratio = $span == 0.0 ? 0 : -$previousValue / $span;

                return $previousPrice + ($price - $previousPrice) * $ratio;
            }

            $previousPrice = $price;
            $previousValue = $value;
        }

        return null;
    }

    /**
     * @param  array<int|string, array<string, mixed>>  $strikes
     * @return array<string, mixed>|null
     */
    private function wall(array $strikes, float $spot, string $side): ?array
    {
        $candidates = array_filter(
            $strikes,
            static fn (array $row): bool => $side === 'put' ? $row['strike'] < $spot : $row['strike'] > $spot,
        );

        if ($candidates === []) {
            return null;
        }

        if ($side === 'put') {
            usort($candidates, static fn (array $a, array $b): int => $a['gex'] <=> $b['gex']);
        } else {
            usort($candidates, static fn (array $a, array $b): int => $b['gex'] <=> $a['gex']);
        }

        return $candidates[0];
    }

    /**
     * @param  array<int|string, array<string, mixed>>  $strikes
     * @return array<string, mixed>|null
     */
    private function motherwall(array $strikes): ?array
    {
        if ($strikes === []) {
            return null;
        }

        usort($strikes, static fn (array $a, array $b): int => abs($b['gex']) <=> abs($a['gex']));

        return $strikes[0];
    }

    /**
     * Estimate the daily expected move from the at-the-money straddle.
     *
     * @param  array<string, mixed>  $nearest
     */
    private function expectedMove(array $nearest, float $spot): ?float
    {
        $calls = $nearest['calls'] ?? [];
        $puts = $nearest['puts'] ?? [];

        if ($calls === [] || $puts === []) {
            return null;
        }

        $closest = null;

        foreach (array_merge($calls, $puts) as $contract) {
            $strike = (float) ($contract['strike'] ?? 0);

            if ($strike <= 0) {
                continue;
            }

            $distance = abs($strike - $spot);

            if ($closest === null || $distance < $closest['distance']) {
                $closest = ['strike' => $strike, 'distance' => $distance];
            }
        }

        if ($closest === null) {
            return null;
        }

        $find = static function (array $contracts, float $strike): ?float {
            foreach ($contracts as $contract) {
                if ((float) ($contract['strike'] ?? 0) !== $strike) {
                    continue;
                }

                $bid = (float) ($contract['bid'] ?? 0);
                $ask = (float) ($contract['ask'] ?? 0);

                if ($bid > 0 && $ask > 0) {
                    return ($bid + $ask) / 2;
                }

                $last = (float) ($contract['lastPrice'] ?? 0);

                return $last > 0 ? $last : null;
            }

            return null;
        };

        $call = $find($calls, $closest['strike']);
        $put = $find($puts, $closest['strike']);

        if ($call === null && $put === null) {
            return null;
        }

        return ($call ?? 0) + ($put ?? 0);
    }

    private function daysToExpiration(?int $timestamp): int
    {
        if ($timestamp === null) {
            return 0;
        }

        return (int) floor(($timestamp - now()->getTimestamp()) / 86400);
    }

    private function userAgent(): string
    {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    }
}
