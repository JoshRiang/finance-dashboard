import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GexAnalysis, GexMetric } from '@/types/gex';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

const compactUsd = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
});

export function money(value: number): string {
    return `$${compactUsd.format(value)}`;
}

export function GexLadder({
    analysis,
    metric,
}: {
    analysis: GexAnalysis;
    metric: GexMetric;
}) {
    const maxAbs = Math.max(
        ...analysis.strikes.map((row) => Math.abs(row[metric])),
        1,
    );
    const nearestDistance = Math.min(
        ...analysis.strikes.map((item) => Math.abs(item.strike - analysis.spot)),
    );

    return (
        <div className="flex flex-col">
            <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card px-1 py-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                <span className="w-16 shrink-0 text-right">Strike</span>
                <span className="flex-1" />
                <span className="w-20 shrink-0 text-right">Nilai</span>
                <span className="w-16 shrink-0" />
            </div>

            {analysis.strikes.map((row) => {
                const value = row[metric];
                const isSpot =
                    Math.abs(row.strike - analysis.spot) === nearestDistance;
                const isPutWall =
                    analysis.put_wall !== null &&
                    Math.abs(row.strike - analysis.put_wall) < 0.001;
                const isCallWall =
                    analysis.call_wall !== null &&
                    Math.abs(row.strike - analysis.call_wall) < 0.001;
                const width = (Math.abs(value) / maxAbs) * 50;

                return (
                    <div
                        key={row.strike}
                        className={cn(
                            'group flex items-center gap-3 border-b border-transparent px-1 py-[3px] transition-colors hover:bg-accent/50',
                            isSpot && 'border-border bg-accent/60',
                        )}
                    >
                        <span
                            className={cn(
                                'w-16 shrink-0 text-right font-mono text-[11px] tabular-nums',
                                isSpot
                                    ? 'font-semibold text-foreground'
                                    : 'text-muted-foreground',
                                isPutWall &&
                                    'font-semibold text-red-600 dark:text-red-400',
                                isCallWall &&
                                    'font-semibold text-emerald-600 dark:text-emerald-400',
                            )}
                        >
                            {numberFormat.format(row.strike)}
                        </span>

                        <div className="relative h-2 flex-1">
                            <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                            <div
                                className={cn(
                                    'absolute inset-y-0 rounded-[1px]',
                                    value >= 0
                                        ? 'left-1/2 bg-emerald-500/60 group-hover:bg-emerald-500'
                                        : 'right-1/2 bg-red-500/60 group-hover:bg-red-500',
                                )}
                                style={{ width: `${width}%` }}
                            />
                        </div>

                        <span
                            className={cn(
                                'w-20 shrink-0 text-right font-mono text-[11px] tabular-nums',
                                value >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400',
                            )}
                        >
                            {money(value)}
                        </span>

                        <span className="flex w-16 shrink-0 justify-end">
                            {isSpot && (
                                <Badge
                                    variant="secondary"
                                    className="h-4 px-1 text-[9px]"
                                >
                                    Spot
                                </Badge>
                            )}
                            {isPutWall && (
                                <Badge
                                    variant="outline"
                                    className="h-4 border-red-500/40 px-1 text-[9px] text-red-600 dark:text-red-400"
                                >
                                    Put
                                </Badge>
                            )}
                            {isCallWall && (
                                <Badge
                                    variant="outline"
                                    className="h-4 border-emerald-500/40 px-1 text-[9px] text-emerald-600 dark:text-emerald-400"
                                >
                                    Call
                                </Badge>
                            )}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}