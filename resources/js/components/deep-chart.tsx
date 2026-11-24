import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { MarketPoint } from '@/types/macro';

const priceFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

const compactFormat = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function formatTick(timestamp: number, timeframe: string): string {
    const date = new Date(timestamp * 1000);

    if (timeframe === '1D') {
        return new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }

    if (timeframe === '5D' || timeframe === '1M' || timeframe === '3M') {
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
        }).format(date);
    }

    if (timeframe === 'MAX') {
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
        }).format(date);
    }

    return new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        year: '2-digit',
    }).format(date);
}

function formatTooltip(timestamp: number, timeframe: string): string {
    const date = new Date(timestamp * 1000);
    const options: Intl.DateTimeFormatOptions =
        timeframe === '1D' || timeframe === '5D'
            ? {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
              }
            : { day: 'numeric', month: 'short', year: 'numeric' };

    return new Intl.DateTimeFormat('id-ID', options).format(date);
}

export function DeepChart({
    points,
    positive,
    timeframe,
    height = 300,
    distribution,
    distributionNormal,
    distributionTone = 'neutral',
    className,
}: {
    points: MarketPoint[];
    positive: boolean;
    timeframe: string;
    height?: number;
    distribution?: { strike: number; density: number }[] | null;
    distributionNormal?: { strike: number; density: number }[] | null;
    distributionTone?: 'up' | 'down' | 'neutral';
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<number | null>(null);

    const width = 900;
    const hasDistribution = (distribution?.length ?? 0) > 1;
    const axisWidth = 58;
    const gutterWidth = hasDistribution ? 170 : 0;
    const padRight = axisWidth + gutterWidth;
    const innerWidth = width - padRight;

    const geometry = useMemo(() => {
        if (points.length < 2) {
            return null;
        }

        const padTop = 8;
        const bottomAxis = height - 18;
        const hasVolume = points.some((point) => (point.v ?? 0) > 0);
        const volumeHeight = hasVolume ? Math.min(48, height * 0.18) : 0;
        const priceBottom = bottomAxis - volumeHeight - (hasVolume ? 8 : 0);

        const values = points.map((point) => point.c);
        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const padding = (rawMax - rawMin || rawMax || 1) * 0.08;
        const min = rawMin - padding;
        const max = rawMax + padding;
        const span = max - min || 1;

        const x = (index: number): number =>
            (index / (points.length - 1)) * innerWidth;

        const y = (value: number): number =>
            padTop + ((max - value) / span) * (priceBottom - padTop);

        const line = points
            .map(
                (point, index) =>
                    `${x(index).toFixed(2)},${y(point.c).toFixed(2)}`,
            )
            .join(' ');

        const area = `0,${priceBottom} ${line} ${innerWidth},${priceBottom}`;

        const gridCount = 4;
        const grid = Array.from({ length: gridCount + 1 }, (_, index) => {
            const ratio = index / gridCount;

            return {
                y: padTop + ratio * (priceBottom - padTop),
                value: max - ratio * span,
            };
        });

        const tickCount = 5;
        const ticks = Array.from({ length: tickCount }, (_, index) => {
            const ratio = index / (tickCount - 1);
            const pointIndex = Math.round(ratio * (points.length - 1));

            return {
                left: (x(pointIndex) / width) * 100,
                label: formatTick(points[pointIndex].t, timeframe),
            };
        });

        const maxVolume = Math.max(...points.map((point) => point.v ?? 0), 1);
        const barWidth = Math.max(innerWidth / points.length - 1, 1);

        const volumes = hasVolume
            ? points.map((point, index) => {
                  const value = point.v ?? 0;
                  const barHeight = (value / maxVolume) * volumeHeight;
                  const rising =
                      index === 0 || point.c >= points[index - 1].c;

                  return {
                      x: x(index) - barWidth / 2,
                      y: bottomAxis - barHeight,
                      width: barWidth,
                      height: Math.max(barHeight, 0.5),
                      rising,
                  };
              })
            : [];

        const densityBase = innerWidth + axisWidth + 6;
        const maxDensityWidth = Math.max(gutterWidth - 16, 0);

        const densitySamples = (distribution ?? []).filter(
            (sample) => sample.strike >= min && sample.strike <= max,
        );

        const normalLine =
            hasDistribution && (distributionNormal?.length ?? 0) > 1
                ? (distributionNormal ?? [])
                      .filter(
                          (sample) =>
                              sample.strike >= min && sample.strike <= max,
                      )
                      .map(
                          (sample) =>
                              `${(densityBase + sample.density * maxDensityWidth).toFixed(2)},${y(sample.strike).toFixed(2)}`,
                      )
                      .join(' ')
                : null;

        const densityPolygon =
            hasDistribution && densitySamples.length > 1
                ? [
                      `${densityBase.toFixed(2)},${y(min).toFixed(2)}`,
                      ...densitySamples.map(
                          (sample) =>
                              `${(densityBase + sample.density * maxDensityWidth).toFixed(2)},${y(sample.strike).toFixed(2)}`,
                      ),
                      `${densityBase.toFixed(2)},${y(max).toFixed(2)}`,
                  ].join(' ')
                : null;

        const densityBars = hasDistribution
            ? densitySamples.map((sample, index) => {
                  const previous =
                      index === 0
                          ? null
                          : y(densitySamples[index - 1].strike);
                  const current = y(sample.strike);
                  const thickness =
                      previous === null
                          ? 2
                          : Math.max(Math.abs(current - previous), 0.8);

                  return {
                      x: densityBase,
                      y: Math.min(current, previous ?? current),
                      width: Math.max(sample.density * maxDensityWidth, 0.4),
                      height: thickness,
                  };
              })
            : [];

        return {
            min,
            max,
            line,
            area,
            grid,
            ticks,
            volumes,
            densityPolygon,
            densityBars,
            normalLine,
            densityBase,
            axisLeftPercent: (innerWidth / width) * 100,
            axisWidthPercent: (axisWidth / width) * 100,
            bottomAxis,
            padTop,
            priceBottom,
            x,
            y,
        };
    }, [
        points,
        timeframe,
        height,
        innerWidth,
        width,
        distribution,
        distributionNormal,
        hasDistribution,
        axisWidth,
        gutterWidth,
    ]);

    if (geometry === null) {
        return (
            <div
                className={cn(
                    'flex w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground',
                    className,
                )}
                style={{ height }}
            >
                Data grafik belum tersedia.
            </div>
        );
    }

    const hovered = hover === null ? null : points[hover];
    const hoverX = hover === null ? 0 : geometry.x(hover);
    const hoverY = hovered === null ? 0 : geometry.y(hovered.c);
    const lastPoint = points[points.length - 1];
    const lastY = geometry.y(lastPoint.c);

    const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();

        if (!rect) {
            return;
        }

        const chartWidth = rect.width * (innerWidth / width);
        const ratio = Math.min(
            Math.max((event.clientX - rect.left) / chartWidth, 0),
            1,
        );
        const index = Math.round(ratio * (points.length - 1));
        setHover(index);
    };

    const stroke = positive ? '#10b981' : '#ef4444';

    return (
        <div
            ref={containerRef}
            className={cn('relative w-full', className)}
            style={{ height }}
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
        >
            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                className="h-full w-full"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient
                        id="deep-chart-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop offset="0%" stopColor={stroke} stopOpacity="0.26" />
                        <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {geometry.grid.map((row, index) => (
                    <line
                        key={index}
                        x1={0}
                        x2={innerWidth}
                        y1={row.y}
                        y2={row.y}
                        className="stroke-border"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray={
                            index === geometry.grid.length - 1 ? '0' : '4 4'
                        }
                    />
                ))}

                {geometry.densityPolygon && (
                    <>
                        <line
                            x1={geometry.densityBase}
                            x2={geometry.densityBase}
                            y1={geometry.padTop}
                            y2={geometry.priceBottom}
                            className="stroke-border"
                            strokeWidth={1}
                            vectorEffect="non-scaling-stroke"
                        />
                        <polygon
                            points={geometry.densityPolygon}
                            className={
                                distributionTone === 'up'
                                    ? 'fill-violet-500/20'
                                    : distributionTone === 'down'
                                      ? 'fill-rose-500/20'
                                      : 'fill-slate-400/20'
                            }
                            strokeWidth={0}
                        />
                        {geometry.densityBars.map((bar, index) => (
                            <rect
                                key={index}
                                x={bar.x}
                                y={bar.y}
                                width={bar.width}
                                height={bar.height}
                                className={
                                    distributionTone === 'up'
                                        ? 'fill-violet-500/70'
                                        : distributionTone === 'down'
                                          ? 'fill-rose-500/70'
                                          : 'fill-slate-400/70'
                                }
                            />
                        ))}
                        {geometry.normalLine && (
                            <polyline
                                points={geometry.normalLine}
                                fill="none"
                                strokeDasharray="3 3"
                                strokeWidth={1.25}
                                vectorEffect="non-scaling-stroke"
                                className="stroke-muted-foreground/60"
                            />
                        )}
                    </>
                )}

                <polygon points={geometry.area} fill="url(#deep-chart-fill)" />

                <polyline
                    points={geometry.line}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                />

                {geometry.volumes.map((bar, index) => (
                    <rect
                        key={index}
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        className={
                            bar.rising
                                ? 'fill-emerald-500/30'
                                : 'fill-red-500/30'
                        }
                    />
                ))}

                <line
                    x1={0}
                    x2={innerWidth}
                    y1={lastY}
                    y2={lastY}
                    stroke={stroke}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.7}
                />

                {hover !== null && (
                    <>
                        <line
                            x1={hoverX}
                            x2={hoverX}
                            y1={geometry.padTop}
                            y2={geometry.bottomAxis}
                            className="stroke-muted-foreground/50"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            vectorEffect="non-scaling-stroke"
                        />
                        <circle
                            cx={hoverX}
                            cy={hoverY}
                            r={4}
                            fill={stroke}
                            stroke="var(--background)"
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                        />
                    </>
                )}
            </svg>

            <div
                className="pointer-events-none absolute inset-y-0"
                style={{
                    left: `${geometry.axisLeftPercent}%`,
                    width: `${geometry.axisWidthPercent}%`,
                }}
            >
                {geometry.grid.map((row, index) => (
                    <span
                        key={index}
                        className="absolute right-0 -translate-y-1/2 font-mono text-[10px] text-muted-foreground"
                        style={{ top: `${(row.y / height) * 100}%` }}
                    >
                        {priceFormat.format(Number(row.value.toFixed(2)))}
                    </span>
                ))}
                <span
                    className="absolute right-0 -translate-y-1/2 rounded-sm px-1 font-mono text-[10px] font-semibold text-white"
                    style={{
                        top: `${(lastY / height) * 100}%`,
                        backgroundColor: stroke,
                    }}
                >
                    {priceFormat.format(lastPoint.c)}
                </span>
            </div>

            {geometry.densityPolygon && (
                <div className="pointer-events-none absolute top-0 right-0 flex flex-col items-end gap-1">
                    <span className="rounded-sm border bg-card/80 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
                        Distribusi
                    </span>
                    <span className="flex items-center gap-1 rounded-sm bg-card/80 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        <span
                            className={
                                distributionTone === 'up'
                                    ? 'inline-block size-1.5 rounded-full bg-violet-500'
                                    : distributionTone === 'down'
                                      ? 'inline-block size-1.5 rounded-full bg-rose-500'
                                      : 'inline-block size-1.5 rounded-full bg-slate-400'
                            }
                        />
                        Skew
                        <span className="inline-block h-0 w-3 border-t border-dashed border-muted-foreground/60" />
                        Normal
                    </span>
                </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4">
                {geometry.ticks.map((tick, index) => (
                    <span
                        key={index}
                        className="absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
                        style={{ left: `${tick.left}%` }}
                    >
                        {tick.label}
                    </span>
                ))}
            </div>

            {hovered !== null && hover !== null && (
                <div
                    className="pointer-events-none absolute z-10 -translate-y-1/2 rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
                    style={{
                        left: `${Math.min(Math.max((hoverX / width) * 100, 6), 52)}%`,
                        top: `${Math.min(Math.max((hoverY / height) * 100, 10), 88)}%`,
                    }}
                >
                    <div className="font-medium tabular-nums">
                        {priceFormat.format(hovered.c)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        {formatTooltip(hovered.t, timeframe)}
                    </div>
                    {(hovered.v ?? 0) > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                            Vol {compactFormat.format(hovered.v ?? 0)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
