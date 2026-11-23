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
    className,
}: {
    points: MarketPoint[];
    positive: boolean;
    timeframe: string;
    height?: number;
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<number | null>(null);

    const width = 900;
    const padRight = 60;
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

        return {
            min,
            max,
            line,
            area,
            grid,
            ticks,
            volumes,
            bottomAxis,
            padTop,
            priceBottom,
            x,
            y,
        };
    }, [points, timeframe, height, innerWidth, width]);

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

        const ratio = Math.min(
            Math.max((event.clientX - rect.left) / rect.width, 0),
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

            <div className="pointer-events-none absolute inset-y-0 right-0 w-14">
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
                        left: `${Math.min(Math.max((hoverX / width) * 100, 8), 66)}%`,
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
