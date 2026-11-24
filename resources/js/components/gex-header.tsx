import { AssetLogo } from '@/components/asset-logo';
import { AssetPicker } from '@/components/asset-picker';
import { GexTabs, type GexTabKey } from '@/components/gex-tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GexAnalysis, GexCatalogItem } from '@/types/gex';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

export function GexHeader({
    analysis,
    catalog,
    symbol,
    active,
    onSelect,
}: {
    analysis: GexAnalysis | null;
    catalog: GexCatalogItem[];
    symbol: string;
    active: GexTabKey;
    onSelect: (symbol: string) => void;
}) {
    const positive = analysis?.regime === 'positive';

    return (
        <header className="flex flex-col gap-3 border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card">
                        <AssetLogo symbol={symbol} size={26} />
                    </span>
                    <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg leading-tight font-semibold">
                                {analysis?.label ?? symbol}
                            </h1>
                            {analysis && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'h-5 px-1.5 text-[10px] font-medium',
                                        positive
                                            ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                            : 'border-red-500/40 text-red-600 dark:text-red-400',
                                    )}
                                >
                                    {positive ? 'Positive γ' : 'Negative γ'}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            <span className="font-mono tabular-nums">
                                {numberFormat.format(analysis?.spot ?? 0)}
                            </span>
                            {analysis?.reference_label &&
                                analysis.spot_reference !== null &&
                                ` · ≈ ${numberFormat.format(analysis.spot_reference)} ${analysis.reference_label}`}
                        </p>
                    </div>
                </div>

                <AssetPicker
                    catalog={catalog}
                    value={symbol}
                    onChange={onSelect}
                />
            </div>

            <GexTabs active={active} symbol={symbol} />
        </header>
    );
}