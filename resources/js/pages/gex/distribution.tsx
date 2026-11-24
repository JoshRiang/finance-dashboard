import { Head, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Minus, Sparkles } from 'lucide-react';
import { GexHeader } from '@/components/gex-header';
import { Tile } from '@/components/gex-stat';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { distribution as distributionRoute } from '@/routes/gex';
import type { GexAnalysis, GexCatalogItem, GexDistribution } from '@/types/gex';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

const METRIC_LABELS: Record<string, string> = {
    gex: 'Gamma (GEX)',
    dex: 'Delta (DEX)',
    vex: 'Vanna (VEX)',
    chex: 'Charm (CHEX)',
};

function DistributionChart({ data }: { data: GexDistribution }) {
    const points = data.points;
    const normal = data.normal;

    if (points.length < 2) {
        return (
            <div className="flex h-[340px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Distribusi belum tersedia.
            </div>
        );
    }

    const width = 900;
    const height = 340;
    const padRight = 8;
    const padTop = 14;
    const padBottom = 26;
    const innerWidth = width - padRight;
    const innerHeight = height - padTop - padBottom;

    const minX = points[0].strike;
    const maxX = points[points.length - 1].strike;
    const span = maxX - minX || 1;

    const x = (strike: number): number => ((strike - minX) / span) * innerWidth;
    const y = (density: number): number =>
        padTop + (1 - density) * innerHeight;

    const toLine = (samples: { strike: number; density: number }[]) =>
        samples
            .map(
                (point) =>
                    `${x(point.strike).toFixed(2)},${y(point.density).toFixed(2)}`,
            )
            .join(' ');

    const skewLine = toLine(points);
    const normalLine = normal.length > 1 ? toLine(normal) : null;
    const skewArea = `${skewLine} ${innerWidth},${padTop + innerHeight} 0,${padTop + innerHeight}`;

    const markers = [
        { label: 'Spot', value: data.spot, color: '#0ea5e9' },
        { label: 'Mean', value: data.mean, color: '#a855f7' },
        ...(data.gamma_flip !== null
            ? [
                  {
                      label: 'Gamma Flip',
                      value: data.gamma_flip,
                      color: '#f59e0b',
                  },
              ]
            : []),
    ].filter((marker) => marker.value >= minX && marker.value <= maxX);

    const ticks = Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;

        return {
            left: ratio * 100,
            label: numberFormat.format(minX + span * ratio),
        };
    });

    const stroke =
        data.direction === 'up'
            ? '#10b981'
            : data.direction === 'down'
              ? '#ef4444'
              : '#64748b';

    return (
        <div className="flex flex-col gap-3">
            <div className="relative w-full">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="none"
                    className="h-[340px] w-full"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient
                            id="distribution-fill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor={stroke}
                                stopOpacity="0.3"
                            />
                            <stop
                                offset="100%"
                                stopColor={stroke}
                                stopOpacity="0.02"
                            />
                        </linearGradient>
                    </defs>

                    {Array.from({ length: 5 }, (_, index) => {
                        const ratio = index / 4;

                        return (
                            <line
                                key={index}
                                x1={0}
                                x2={innerWidth}
                                y1={padTop + ratio * innerHeight}
                                y2={padTop + ratio * innerHeight}
                                className="stroke-border"
                                strokeWidth={1}
                                vectorEffect="non-scaling-stroke"
                                strokeDasharray="4 4"
                            />
                        );
                    })}

                    <polygon points={skewArea} fill="url(#distribution-fill)" />

                    <polyline
                        points={skewLine}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />

                    {normalLine && (
                        <polyline
                            points={normalLine}
                            fill="none"
                            strokeWidth={1.5}
                            strokeDasharray="5 4"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            className="stroke-muted-foreground/70"
                        />
                    )}

                    {markers.map((marker) => (
                        <line
                            key={marker.label}
                            x1={x(marker.value)}
                            x2={x(marker.value)}
                            y1={padTop}
                            y2={padTop + innerHeight}
                            stroke={marker.color}
                            strokeWidth={1.2}
                            strokeDasharray="4 3"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                </svg>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5">
                    {ticks.map((tick, index) => (
                        <span
                            key={index}
                            className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
                            style={{ left: `${tick.left}%` }}
                        >
                            {tick.label}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className="inline-block h-0.5 w-4 rounded"
                        style={{ backgroundColor: stroke }}
                    />
                    Skew (α {data.skew >= 0 ? '+' : ''}
                    {data.skew.toFixed(2)})
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-4 border-t border-dashed border-muted-foreground/70" />
                    Normal (referensi)
                </span>
                {markers.map((marker) => (
                    <span
                        key={marker.label}
                        className="inline-flex items-center gap-1.5"
                    >
                        <span
                            className="inline-block size-1.5 rounded-full"
                            style={{ backgroundColor: marker.color }}
                        />
                        {marker.label}
                        <span className="font-mono text-foreground">
                            {numberFormat.format(marker.value)}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function GexDistributionPage({
    analysis,
    catalog,
    symbol,
}: {
    analysis: GexAnalysis | null;
    catalog: GexCatalogItem[];
    symbol: string;
}) {
    const changeAsset = (value: string) => {
        router.get(
            `${distributionRoute().url}?symbol=${encodeURIComponent(value)}`,
            {},
            { preserveScroll: true },
        );
    };

    const data = analysis?.distribution ?? null;
    const trend = data?.direction ?? 'neutral';
    const tone =
        trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'muted';
    const peak = data?.points.length
        ? data.points.reduce(
              (best, point) => (point.density > best.density ? point : best),
              data.points[0],
          )
        : null;
    const shift = data ? data.mean - data.spot : 0;

    return (
        <>
            <Head title="Distribusi · Dealer Positioning" />

            <div className="flex flex-1 flex-col gap-5 p-4">
                <GexHeader
                    analysis={analysis}
                    catalog={catalog}
                    symbol={symbol}
                    active="distribution"
                    onSelect={changeAsset}
                />

                {analysis === null || data === null ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
                        <Sparkles className="size-8 text-muted-foreground/60" />
                        <p className="font-medium">
                            Distribusi {symbol} tidak tersedia
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Tile
                                label="Arah Bias"
                                value={
                                    trend === 'up'
                                        ? 'Condong Naik'
                                        : trend === 'down'
                                          ? 'Condong Turun'
                                          : 'Netral'
                                }
                                hint={`Bias ${data.bias >= 0 ? '+' : ''}${(data.bias * 100).toFixed(0)}%`}
                                tone={tone}
                            />
                            <Tile
                                label="Puncak Distribusi"
                                value={
                                    peak === null
                                        ? '–'
                                        : numberFormat.format(peak.strike)
                                }
                                hint={`Mean ${numberFormat.format(data.mean)}`}
                            />
                            <Tile
                                label="Geser dari Spot"
                                value={`${shift >= 0 ? '+' : ''}${numberFormat.format(Number(shift.toFixed(2)))}`}
                                hint={`σ ${numberFormat.format(data.sigma)}`}
                                tone={
                                    shift >= 0 ? 'positive' : 'negative'
                                }
                            />
                            <Tile
                                label="Skew (α)"
                                value={`${data.skew >= 0 ? '+' : ''}${data.skew.toFixed(2)}`}
                                hint={
                                    data.skew === 0
                                        ? 'Simetris'
                                        : data.skew > 0
                                          ? 'Ekor kanan'
                                          : 'Ekor kiri'
                                }
                                tone="muted"
                            />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-3">
                            <Card className="gap-0 py-4 xl:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 pb-2">
                                    <CardTitle className="text-sm">
                                        Sebaran Skew-Normal
                                    </CardTitle>
                                    <Badge
                                        variant="outline"
                                        className="font-mono text-[10px]"
                                    >
                                        {analysis.symbol}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="px-4">
                                    <DistributionChart data={data} />
                                </CardContent>
                            </Card>

                            <div className="flex flex-col gap-4">
                                <Card className="gap-3 py-4">
                                    <CardHeader className="px-4">
                                        <CardTitle className="text-sm">
                                            Kontribusi Metrik
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2.5 px-4">
                                        {Object.entries(
                                            data.contributions,
                                        ).map(([metric, value]) => {
                                            const positive = value >= 0;

                                            return (
                                                <div
                                                    key={metric}
                                                    className="flex items-center gap-2"
                                                >
                                                    <span className="w-24 shrink-0 text-[11px] text-muted-foreground">
                                                        {METRIC_LABELS[metric] ??
                                                            metric}
                                                    </span>
                                                    <div className="relative h-1.5 flex-1 rounded-full bg-muted">
                                                        <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                                                        <div
                                                            className={cn(
                                                                'absolute inset-y-0 rounded-full',
                                                                positive
                                                                    ? 'left-1/2 bg-emerald-500/70'
                                                                    : 'right-1/2 bg-red-500/70',
                                                            )}
                                                            style={{
                                                                width: `${Math.abs(value) * 50}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'w-11 shrink-0 text-right font-mono text-[11px] tabular-nums',
                                                            positive
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-red-600 dark:text-red-400',
                                                        )}
                                                    >
                                                        {positive ? '+' : ''}
                                                        {value.toFixed(2)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>

                                <Card className="gap-3 py-4">
                                    <CardHeader className="px-4">
                                        <CardTitle className="text-sm">
                                            Interpretasi
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2 px-4 text-xs text-muted-foreground">
                                        <p className="flex items-start gap-2">
                                            {trend === 'up' ? (
                                                <ArrowUp className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                            ) : trend === 'down' ? (
                                                <ArrowDown className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                                            ) : (
                                                <Minus className="mt-0.5 size-4 shrink-0" />
                                            )}
                                            <span className="text-foreground">
                                                {trend === 'up'
                                                    ? 'Hedging dealer menyerap tekanan jual — bias mengarah ke atas.'
                                                    : trend === 'down'
                                                      ? 'Hedging dealer menambah tekanan jual — bias mengarah ke bawah.'
                                                      : 'Tekanan beli dan jual berimbang.'}
                                            </span>
                                        </p>
                                        <p>
                                            Kurva solid = skew aktual. Garis
                                            putus-putus = distribusi normal
                                            simetris dengan σ sama, sebagai
                                            pembanding.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                            Data {new Date(analysis.as_of).toLocaleString('id-ID')}.
                        </p>
                    </>
                )}
            </div>
        </>
    );
}

GexDistributionPage.layout = {
    breadcrumbs: [
        {
            title: 'Dealer Positioning',
            href: '/gex',
        },
        {
            title: 'Distribusi',
            href: '/gex/distribution',
        },
    ],
};