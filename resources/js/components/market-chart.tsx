import { TrendingDown, TrendingUp } from 'lucide-react';
import { Sparkline } from '@/components/sparkline';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { MarketQuote } from '@/types/macro';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

const compactFormat = new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function formatPrice(quote: MarketQuote): string {
    const decimals = quote.price >= 1000 ? 0 : 2;

    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(quote.price);
}

function formatValue(value: number | null): string {
    return value === null ? '–' : numberFormat.format(value);
}

function Change({ value, label }: { value: number; label: string }) {
    const positive = value >= 0;
    const Icon = positive ? TrendingUp : TrendingDown;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 font-medium',
                positive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400',
            )}
            title={label}
        >
            <Icon className="size-3.5" />
            {positive ? '+' : ''}
            {numberFormat.format(value)}%
        </span>
    );
}

export function MarketChart({
    quote,
    markets,
    onChange,
}: {
    quote: MarketQuote;
    markets: MarketQuote[];
    onChange: (symbol: string) => void;
}) {
    const groups = [...new Set(markets.map((market) => market.group))];

    return (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <Select value={quote.symbol} onValueChange={onChange}>
                    <SelectTrigger className="h-8 w-[190px]" size="sm">
                        <SelectValue placeholder="Pilih aset" />
                    </SelectTrigger>
                    <SelectContent>
                        {groups.map((group) => (
                            <SelectGroup key={group}>
                                <SelectLabel>{group}</SelectLabel>
                                {markets
                                    .filter((market) => market.group === group)
                                    .map((market) => (
                                        <SelectItem
                                            key={market.symbol}
                                            value={market.symbol}
                                        >
                                            {market.label}
                                        </SelectItem>
                                    ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>

                <Change value={quote.day_change} label="Perubahan harian" />
            </div>

            <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                    {formatPrice(quote)}
                </span>
                {quote.currency && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                        {quote.currency}
                    </Badge>
                )}
            </div>

            <Sparkline
                values={quote.points}
                positive={quote.range_change >= 0}
                className="h-28"
            />

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-xs sm:grid-cols-4">
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground">1 Tahun</dt>
                    <dd>
                        <Change
                            value={quote.range_change}
                            label="Perubahan 1 tahun"
                        />
                    </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground">52W High</dt>
                    <dd className="font-medium tabular-nums">
                        {formatValue(quote.week_52_high)}
                    </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground">52W Low</dt>
                    <dd className="font-medium tabular-nums">
                        {formatValue(quote.week_52_low)}
                    </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground">Volume</dt>
                    <dd className="font-medium tabular-nums">
                        {quote.volume === null
                            ? '–'
                            : compactFormat.format(quote.volume)}
                    </dd>
                </div>
            </dl>
        </div>
    );
}
