import { cn } from '@/lib/utils';

export function Tile({
    label,
    value,
    hint,
    tone,
}: {
    label: string;
    value: string;
    hint?: string;
    tone?: 'positive' | 'negative' | 'muted';
}) {
    return (
        <div className="flex flex-col gap-1.5 rounded-lg border bg-card px-3.5 py-3">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <span
                className={cn(
                    'text-xl leading-none font-semibold tabular-nums',
                    tone === 'positive' &&
                        'text-emerald-600 dark:text-emerald-400',
                    tone === 'negative' && 'text-red-600 dark:text-red-400',
                    tone === 'muted' && 'text-muted-foreground',
                )}
            >
                {value}
            </span>
            {hint && (
                <span className="text-[11px] text-muted-foreground">{hint}</span>
            )}
        </div>
    );
}