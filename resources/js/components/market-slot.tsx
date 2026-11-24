import { TrendingDown, TrendingUp, Waves } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AssetPicker } from '@/components/asset-picker';
import { DeepChart } from '@/components/deep-chart';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type {
    CatalogItem,
    MarketDistributionResponse,
    MarketSeries,
} from '@/types/macro';

const TIMEFRAMES = ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y', 'MAX'];

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

const compactFormat = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function formatPrice(price: number): string {
    const decimals = price >= 1000 ? 0 : 2;

    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(price);
}

function formatValue(value: number | null): string {
    return value === null ? '–' : numberFormat.format(value);
}

function Change({ value, className }: { value: number; className?: string }) {
    const positive = value >= 0;
    const Icon = positive ? TrendingUp : TrendingDown;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 font-medium',
                positive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400',
                className,
            )}
        >
            <Icon className="size-3.5" />
            {positive ? '+' : ''}
            {numberFormat.format(value)}%
        </span>
    );
}

export function MarketSlot({
    catalog,
    initialSymbol,
    height = 300,
    compact = false,
}: {
    catalog: CatalogItem[];
    initialSymbol: string;
    height?: number;
    compact?: boolean;
}) {
    const [symbol, setSymbol] = useState(initialSymbol);
    const [timeframe, setTimeframe] = useState('1Y');
    const [series, setSeries] = useState<MarketSeries | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const requestId = useRef(0);

    const [showDistribution, setShowDistribution] = useState(true);
    const [distribution, setDistribution] = useState<
        MarketDistributionResponse['distribution']
    >(null);
    const [distLoading, setDistLoading] = useState(false);
    const [distUnavailable, setDistUnavailable] = useState(false);
    const distCache = useRef<Record<string, MarketDistributionResponse>>({});

    const loadDistribution = async (target: string) => {
        if (distCache.current[target]) {
            const cached = distCache.current[target];

            setDistribution(cached.distribution);
            setDistUnavailable(cached.distribution === null);

            return;
        }

        setDistLoading(true);

        try {
            const response = await fetch(
                `/pasar/distribution?symbol=${encodeURIComponent(target)}`,
                {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                },
            );
            const data =
                (await response.json()) as MarketDistributionResponse;

            distCache.current[target] = data;
            setDistribution(data.distribution);
            setDistUnavailable(data.distribution === null);
        } catch {
            setDistribution(null);
            setDistUnavailable(true);
        } finally {
            setDistLoading(false);
        }
    };

    useEffect(() => {
        setDistribution(null);
        setDistUnavailable(false);
        setShowDistribution(true);
        void loadDistribution(symbol);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol]);

    const toggleDistribution = () => {
        if (distUnavailable) {
            return;
        }

        setShowDistribution((state) => !state);
    };

    const overlay = useMemo(() => {
        if (!showDistribution || !distribution || !series) {
            return { skew: null, normal: null };
        }

        const scale =
            distribution.spot > 0 ? series.price / distribution.spot : 1;

        return {
            skew: distribution.points.map((sample) => ({
                strike: sample.strike * scale,
                density: sample.density,
            })),
            normal: (distribution.normal ?? []).map((sample) => ({
                strike: sample.strike * scale,
                density: sample.density,
            })),
        };
    }, [showDistribution, distribution, series]);

    useEffect(() => {
        const id = ++requestId.current;
        const controller = new AbortController();

        setLoading(true);
        setFailed(false);

        fetch(
            `/pasar/series?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`,
            {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                signal: controller.signal,
            },
        )
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('request failed');
                }

                return (await response.json()) as MarketSeries;
            })
            .then((data) => {
                if (requestId.current === id) {
                    setSeries(data);
                }
            })
            .catch(() => {
                if (requestId.current === id && !controller.signal.aborted) {
                    setFailed(true);
                }
            })
            .finally(() => {
                if (requestId.current === id) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [symbol, timeframe]);

    return (
        <div
            className={cn(
                'flex flex-col gap-2 rounded-xl border bg-gradient-to-b from-card to-card/40 shadow-sm',
                compact ? 'p-2.5' : 'p-3.5',
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <AssetPicker
                    catalog={catalog}
                    value={symbol}
                    onChange={setSymbol}
                    compact={compact}
                />

                <div className="flex items-center gap-2">
                    {series && (
                        <span className="text-[10px] text-muted-foreground">
                            {series.currency}
                        </span>
                    )}
                    {series && <Change value={series.day_change} className="text-xs" />}
                </div>
            </div>

            <div className="flex items-baseline gap-2">
                <span
                    className={cn(
                        'font-semibold tracking-tight tabular-nums',
                        compact ? 'text-xl' : 'text-2xl',
                    )}
                >
                    {series ? formatPrice(series.price) : '–'}
                </span>
                {series && (
                    <span
                        className={cn(
                            'text-[11px] font-medium tabular-nums',
                            series.range_change >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400',
                        )}
                    >
                        {series.range_change >= 0 ? '+' : ''}
                        {numberFormat.format(series.range_change)}% ·{' '}
                        {series.timeframe}
                    </span>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-1">
                {TIMEFRAMES.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setTimeframe(option)}
                        className={cn(
                            'rounded px-1.5 py-0.5 text-[11px] font-medium transition',
                            timeframe === option
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                    >
                        {option}
                    </button>
                ))}

                <span className="mx-0.5 h-4 w-px bg-border" />
                <button
                    type="button"
                    onClick={toggleDistribution}
                    disabled={distUnavailable}
                    title={
                        distUnavailable
                            ? 'Distribusi tidak tersedia untuk aset ini'
                            : 'Tampilkan/sembunyikan distribusi dealer (GEX)'
                    }
                    className={cn(
                        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition',
                        distUnavailable
                            ? 'cursor-not-allowed text-muted-foreground/40 line-through'
                            : showDistribution
                              ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                >
                    {distLoading ? (
                        <Spinner className="size-3" />
                    ) : (
                        <Waves className="size-3" />
                    )}
                    Distribusi
                </button>
            </div>

            <div className="relative">
                {series && !failed ? (
                    <DeepChart
                        points={series.points}
                        positive={series.range_change >= 0}
                        timeframe={timeframe}
                        height={height}
                        distribution={overlay.skew}
                        distributionNormal={overlay.normal}
                        distributionTone={distribution?.direction ?? 'neutral'}
                        className={loading ? 'opacity-50' : ''}
                    />
                ) : (
                    <div
                        className="flex w-full items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground"
                        style={{ height }}
                    >
                        {failed
                            ? 'Gagal memuat data. Coba ganti timeframe.'
                            : 'Memuat grafik…'}
                    </div>
                )}

                {loading && series && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Spinner className="size-5" />
                    </div>
                )}
            </div>

            {series && !compact && (
                <dl className="grid grid-cols-4 gap-x-3 gap-y-1 border-t pt-2 text-[11px]">
                    <div className="flex flex-col">
                        <dt className="text-muted-foreground">52W High</dt>
                        <dd className="font-medium tabular-nums">
                            {formatValue(series.week_52_high)}
                        </dd>
                    </div>
                    <div className="flex flex-col">
                        <dt className="text-muted-foreground">52W Low</dt>
                        <dd className="font-medium tabular-nums">
                            {formatValue(series.week_52_low)}
                        </dd>
                    </div>
                    <div className="flex flex-col">
                        <dt className="text-muted-foreground">Volume</dt>
                        <dd className="font-medium tabular-nums">
                            {series.volume === null
                                ? '–'
                                : compactFormat.format(series.volume)}
                        </dd>
                    </div>
                    <div className="flex flex-col">
                        <dt className="text-muted-foreground">Periode</dt>
                        <dd className="font-medium">{series.timeframe}</dd>
                    </div>
                </dl>
            )}
        </div>
    );
}
