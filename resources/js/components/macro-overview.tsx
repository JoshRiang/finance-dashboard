import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { MiniBars, Sparkline } from '@/components/sparkline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { indikator, pasar } from '@/routes';
import type {
    IndicatorSeries,
    MacroOverview as MacroData,
    MarketQuote,
} from '@/types/macro';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

function formatPrice(quote: MarketQuote): string {
    const decimals = quote.price >= 1000 ? 0 : 2;

    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(quote.price);
}

function ChangeBadge({ value, label }: { value: number; label: string }) {
    const positive = value >= 0;
    const Icon = positive ? TrendingUp : TrendingDown;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
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

function SeeMore({
    href,
    label,
}: {
    href: InertiaLinkProps['href'];
    label: string;
}) {
    return (
        <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href={href}>
                {label}
                <ArrowRight className="size-4" />
            </Link>
        </Button>
    );
}

function MarketCard({ quote }: { quote: MarketQuote }) {
    return (
        <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                    {quote.label}
                </span>
                <ChangeBadge value={quote.day_change} label="Perubahan harian" />
            </div>

            <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold tracking-tight tabular-nums">
                    {formatPrice(quote)}
                </span>
                {quote.currency && (
                    <span className="text-[10px] text-muted-foreground">
                        {quote.currency}
                    </span>
                )}
            </div>

            <Sparkline
                values={quote.points}
                positive={quote.range_change >= 0}
            />

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>1 tahun</span>
                <ChangeBadge
                    value={quote.range_change}
                    label="Perubahan 1 tahun"
                />
            </div>
        </div>
    );
}

function IndicatorCard({ indicator }: { indicator: IndicatorSeries }) {
    const positive = (indicator.latest ?? 0) >= 0;
    const first = indicator.points[0]?.year;
    const last = indicator.points[indicator.points.length - 1]?.year;

    return (
        <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                    {indicator.label}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                    {indicator.latest === null
                        ? '–'
                        : `${numberFormat.format(indicator.latest)}${indicator.unit}`}
                </span>
            </div>

            <MiniBars points={indicator.points} positive={positive} />

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{first ?? '–'}</span>
                <span>{indicator.latest_year ?? last ?? '–'}</span>
            </div>
        </div>
    );
}

function MarketSection({
    title,
    quotes,
}: {
    title: string;
    quotes: MarketQuote[];
}) {
    if (quotes.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {title}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {quotes.map((quote) => (
                    <MarketCard key={quote.symbol} quote={quote} />
                ))}
            </div>
        </div>
    );
}

export function MacroOverview({ data }: { data: MacroData }) {
    const americas = data.markets.filter((m) => m.region === 'americas');
    const world = data.markets.filter((m) => m.region === 'world');
    const groups = Object.values(data.indicators);

    if (data.markets.length === 0 && groups.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-10">
            {data.markets.length > 0 && (
                <Card className="gap-4 border-0 bg-transparent py-0 shadow-none">
                    <CardHeader className="flex flex-row items-start justify-between gap-2 px-0">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-base">
                                Pasar Global
                            </CardTitle>
                            <CardDescription>
                                Pergerakan indeks dan komoditas setahun
                                terakhir.
                            </CardDescription>
                        </div>
                        <SeeMore href={pasar()} label="Lihat selengkapnya" />
                    </CardHeader>

                    <CardContent className="flex flex-col gap-5 px-0">
                        <MarketSection title="Amerika Serikat" quotes={americas} />
                        <MarketSection title="Dunia" quotes={world} />
                    </CardContent>
                </Card>
            )}

            {groups.length > 0 && (
                <Card className="gap-4 border-0 bg-transparent py-0 shadow-none">
                    <CardHeader className="flex flex-row items-start justify-between gap-2 px-0">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-base">
                                Indikator Makro
                            </CardTitle>
                            <CardDescription>
                                Data tahunan pertumbuhan, inflasi, dan
                                pengangguran.
                            </CardDescription>
                        </div>
                        <SeeMore
                            href={indikator()}
                            label="Lihat selengkapnya"
                        />
                    </CardHeader>

                    <CardContent className="flex flex-col gap-5 px-0">
                        {groups.map((group) => (
                            <div
                                key={group.label}
                                className="flex flex-col gap-2"
                            >
                                <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    {group.label}
                                    <Badge
                                        variant="outline"
                                        className="font-normal normal-case"
                                    >
                                        World Bank
                                    </Badge>
                                </h3>

                                <div className="grid gap-2 sm:grid-cols-3">
                                    {group.series.map((indicator) => (
                                        <IndicatorCard
                                            key={indicator.code}
                                            indicator={indicator}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export function MacroSkeleton() {
    return (
        <div className="flex flex-col gap-10">
            <Card className="gap-4 border-0 bg-transparent py-0 shadow-none">
                <CardHeader className="px-0">
                    <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-3 w-64 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent className="grid gap-3 px-0 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-36 animate-pulse rounded-xl border bg-muted/40"
                        />
                    ))}
                </CardContent>
            </Card>

            <Card className="gap-4 border-0 bg-transparent py-0 shadow-none">
                <CardHeader className="px-0">
                    <div className="h-5 w-36 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent className="grid gap-2 px-0 sm:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-28 animate-pulse rounded-lg border bg-muted/40"
                        />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}