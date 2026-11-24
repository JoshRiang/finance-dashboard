import { cn } from '@/lib/utils';
import type { GexAnalysis } from '@/types/gex';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

interface Level {
    key: string;
    label: string;
    value: number | null;
    className: string;
    dot: string;
}

export function GexStructure({ analysis }: { analysis: GexAnalysis }) {
    const levels: Level[] = [
        {
            key: 'put',
            label: 'Put Wall',
            value: analysis.put_wall,
            className: 'text-red-600 dark:text-red-400',
            dot: 'bg-red-500',
        },
        {
            key: 'flip',
            label: 'Gamma Flip',
            value: analysis.gamma_flip,
            className: 'text-amber-600 dark:text-amber-400',
            dot: 'bg-amber-500',
        },
        {
            key: 'spot',
            label: 'Spot',
            value: analysis.spot,
            className: 'text-sky-600 dark:text-sky-400',
            dot: 'bg-sky-500',
        },
        {
            key: 'call',
            label: 'Call Wall',
            value: analysis.call_wall,
            className: 'text-emerald-600 dark:text-emerald-400',
            dot: 'bg-emerald-500',
        },
    ].filter((level) => level.value !== null) as Level[];

    if (levels.length < 2) {
        return null;
    }

    const values = levels.map((level) => level.value as number);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const span = high - low || 1;
    const padding = span * 0.08;
    const start = low - padding;
    const end = high + padding;
    const total = end - start;

    const position = (value: number): number =>
        ((value - start) / total) * 100;

    const spotPosition = position(analysis.spot);

    return (
        <div className="flex flex-col gap-6 px-1 pt-2">
            <div className="relative h-9">
                <div className="absolute top-4 right-0 left-0 h-px bg-border" />

                <div
                    className="absolute top-4 h-px bg-gradient-to-r from-red-500/40 via-amber-500/40 to-emerald-500/40"
                    style={{ left: 0, right: `${100 - spotPosition}%` }}
                />

                {levels.map((level) => {
                    const left = position(level.value as number);

                    return (
                        <div
                            key={level.key}
                            className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1"
                            style={{ left: `${left}%` }}
                        >
                            <span
                                className={cn(
                                    'font-mono text-[10px] font-semibold whitespace-nowrap tabular-nums',
                                    level.className,
                                )}
                            >
                                {numberFormat.format(level.value as number)}
                            </span>
                            <span
                                className={cn(
                                    'size-2 rounded-full ring-2 ring-background',
                                    level.dot,
                                )}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                {levels.map((level) => {
                    const percent =
                        ((level.value as number) - analysis.spot) /
                        analysis.spot *
                        100;

                    return (
                        <span
                            key={level.key}
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                        >
                            <span
                                className={cn('size-1.5 rounded-full', level.dot)}
                            />
                            {level.label}
                            <span
                                className={cn(
                                    'font-mono tabular-nums',
                                    percent >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400',
                                )}
                            >
                                {percent >= 0 ? '+' : ''}
                                {percent.toFixed(2)}%
                            </span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}