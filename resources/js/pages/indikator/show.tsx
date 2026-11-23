import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Globe2, TrendingDown, TrendingUp } from 'lucide-react';
import { MiniBars } from '@/components/sparkline';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { indikator } from '@/routes';
import type { CountryDetail, IndicatorSeries } from '@/types/macro';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

function IndicatorBlock({
    indicator,
    world,
}: {
    indicator: IndicatorSeries;
    world: number | undefined;
}) {
    const points = indicator.points;
    const latest = indicator.latest;
    const previous = points.length >= 2 ? points[points.length - 2].value : null;
    const delta = latest !== null && previous !== null ? latest - previous : null;

    const values = points.map((point) => point.value);
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;

    const diffToWorld =
        latest !== null && world !== undefined ? latest - world : null;
    const positive = (latest ?? 0) >= 0;

    return (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{indicator.label}</span>
                {delta !== null && (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
                            delta >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400',
                        )}
                    >
                        {delta >= 0 ? (
                            <TrendingUp className="size-3.5" />
                        ) : (
                            <TrendingDown className="size-3.5" />
                        )}
                        {delta >= 0 ? '+' : ''}
                        {numberFormat.format(delta)} {indicator.unit} YoY
                    </span>
                )}
            </div>

            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                    {latest === null
                        ? '–'
                        : `${numberFormat.format(latest)}${indicator.unit}`}
                </span>
                {indicator.latest_year && (
                    <span className="text-xs text-muted-foreground">
                        {indicator.latest_year}
                    </span>
                )}
            </div>

            <MiniBars points={points} positive={positive} className="h-24" />

            <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground">Terendah</dt>
                    <dd className="font-medium tabular-nums">
                        {min === null
                            ? '–'
                            : `${numberFormat.format(min)}${indicator.unit}`}
                    </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground">Tertinggi</dt>
                    <dd className="font-medium tabular-nums">
                        {max === null
                            ? '–'
                            : `${numberFormat.format(max)}${indicator.unit}`}
                    </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground">vs Dunia</dt>
                    <dd
                        className={cn(
                            'font-medium tabular-nums',
                            diffToWorld === null
                                ? ''
                                : diffToWorld >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400',
                        )}
                    >
                        {diffToWorld === null
                            ? '–'
                            : `${diffToWorld >= 0 ? '+' : ''}${numberFormat.format(diffToWorld)}${indicator.unit}`}
                    </dd>
                </div>
            </dl>
        </div>
    );
}

export default function IndikatorShow({
    country,
}: {
    country: CountryDetail;
}) {
    return (
        <>
            <Head title={`${country.label} · Indikator Makro`} />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <Link
                    href={indikator()}
                    className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Kembali ke peta
                </Link>

                <header className="flex items-center gap-3">
                    {country.flag ? (
                        <img
                            src={`https://flagcdn.com/w80/${country.flag}.png`}
                            alt={country.label}
                            width={48}
                            height={36}
                            className="h-9 w-12 rounded object-cover ring-1 ring-black/10 dark:ring-white/15"
                        />
                    ) : (
                        <Globe2 className="size-10 text-muted-foreground" />
                    )}
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-muted-foreground">
                            Profil makro
                        </span>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {country.label}
                        </h1>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                        World Bank
                    </Badge>
                </header>

                {country.indicators.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
                        <Globe2 className="size-8 text-muted-foreground/60" />
                        <p className="font-medium">Data belum tersedia</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 lg:grid-cols-3">
                            {country.indicators.map((indicator) => (
                                <IndicatorBlock
                                    key={indicator.code}
                                    indicator={indicator}
                                    world={country.world[indicator.code]}
                                />
                            ))}
                        </div>

                        <Card className="gap-4 py-5">
                            <CardHeader className="px-5">
                                <CardTitle className="text-base">
                                    Data tahunan
                                </CardTitle>
                                <CardDescription>
                                    Sepuluh tahun terakhir dalam persen.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="overflow-x-auto px-5">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="py-2 pr-4 text-xs font-semibold text-muted-foreground">
                                                Tahun
                                            </th>
                                            {country.indicators.map(
                                                (indicator) => (
                                                    <th
                                                        key={indicator.code}
                                                        className="py-2 text-right text-xs font-semibold text-muted-foreground"
                                                    >
                                                        {indicator.label}
                                                    </th>
                                                ),
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            ...new Set(
                                                country.indicators.flatMap(
                                                    (indicator) =>
                                                        indicator.points.map(
                                                            (point) =>
                                                                point.year,
                                                        ),
                                                ),
                                            ),
                                        ]
                                            .sort((a, b) => b - a)
                                            .map((year) => (
                                                <tr
                                                    key={year}
                                                    className="border-b last:border-0 hover:bg-accent/40"
                                                >
                                                    <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">
                                                        {year}
                                                    </td>
                                                    {country.indicators.map(
                                                        (indicator) => {
                                                            const point =
                                                                indicator.points.find(
                                                                    (item) =>
                                                                        item.year ===
                                                                        year,
                                                                );

                                                            return (
                                                                <td
                                                                    key={
                                                                        indicator.code
                                                                    }
                                                                    className={cn(
                                                                        'py-1.5 text-right tabular-nums',
                                                                        point &&
                                                                            point.value <
                                                                                0
                                                                            ? 'text-red-600 dark:text-red-400'
                                                                            : '',
                                                                    )}
                                                                >
                                                                    {point
                                                                        ? `${numberFormat.format(point.value)}${indicator.unit}`
                                                                        : '–'}
                                                                </td>
                                                            );
                                                        },
                                                    )}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    );
}

IndikatorShow.layout = {
    breadcrumbs: [
        {
            title: 'Indikator Makro',
            href: indikator(),
        },
        {
            title: 'Detail Negara',
            href: '#',
        },
    ],
};