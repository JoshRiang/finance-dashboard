import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Globe2, LineChart } from 'lucide-react';
import { useState } from 'react';
import { MiniBars } from '@/components/sparkline';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorldMap, type MapCountry } from '@/components/world-map';
import { cn } from '@/lib/utils';
import { indikator } from '@/routes';
import { show as showCountry } from '@/routes/indikator';
import type { CountryIndicator, MacroIndicator, MacroIndicatorMap } from '@/types/macro';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

const HIGHER_IS_BETTER = 'NY.GDP.MKTP.KD.ZG';

function scoreColor(score: number): string {
    const hue = Math.round(Math.min(Math.max(score, 0), 1) * 150);

    return `hsl(${hue} 68% 42%)`;
}

function deltaFor(country: CountryIndicator): number | null {
    if (country.points.length < 2 || country.latest === null) {
        return null;
    }

    const previous = country.points[country.points.length - 2].value;

    return previous === 0 ? null : country.latest - previous;
}

function CountryRow({
    country,
    rank,
    unit,
}: {
    country: CountryIndicator;
    rank: number;
    unit: string;
}) {
    const delta = deltaFor(country);

    return (
        <Link
            href={showCountry(country.iso3)}
            className="group flex flex-col gap-2 rounded-xl border bg-card p-3.5 shadow-sm transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="w-4 shrink-0 font-mono text-[10px] text-muted-foreground">
                        {rank}
                    </span>
                    {country.flag ? (
                        <img
                            src={`https://flagcdn.com/w40/${country.flag}.png`}
                            srcSet={`https://flagcdn.com/w80/${country.flag}.png 2x`}
                            alt={country.label}
                            width={24}
                            height={18}
                            loading="lazy"
                            className="h-[18px] w-6 shrink-0 rounded-[2px] object-cover ring-1 ring-black/10 dark:ring-white/15"
                        />
                    ) : (
                        <Globe2 className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm font-medium group-hover:text-primary">
                        {country.label}
                    </span>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {country.latest === null
                        ? '–'
                        : `${numberFormat.format(country.latest)}${unit}`}
                </span>
            </div>

            <MiniBars
                points={country.points}
                positive={(country.latest ?? 0) >= 0}
                className="h-10"
            />

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{country.latest_year ?? '–'}</span>
                <span className="inline-flex items-center gap-1">
                    {delta !== null && (
                        <span
                            className={cn(
                                'font-medium tabular-nums',
                                delta >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400',
                            )}
                        >
                            {delta >= 0 ? '+' : ''}
                            {numberFormat.format(delta)} {unit}
                        </span>
                    )}
                    <ArrowRight className="size-3 opacity-0 transition group-hover:opacity-100" />
                </span>
            </div>
        </Link>
    );
}

function buildMap(
    indicator: MacroIndicator,
): { countries: Record<string, MapCountry>; min: number; max: number } {
    const values = indicator.countries.filter(
        (country) => country.latest !== null,
    );

    if (values.length === 0) {
        return { countries: {}, min: 0, max: 0 };
    }

    const latestValues = values.map((country) => country.latest as number);
    const min = Math.min(...latestValues);
    const max = Math.max(...latestValues);
    const span = max - min || 1;
    const higherIsBetter = indicator.code === HIGHER_IS_BETTER;

    const countries: Record<string, MapCountry> = {};

    for (const country of values) {
        if (!country.flag) {
            continue;
        }

        const ratio = ((country.latest as number) - min) / span;
        const score = higherIsBetter ? ratio : 1 - ratio;

        countries[country.flag] = {
            iso3: country.iso3,
            label: country.label,
            value: country.latest,
            color: scoreColor(score),
        };
    }

    return { countries, min, max };
}

export default function IndikatorIndex({
    indicators,
}: {
    indicators: MacroIndicatorMap;
}) {
    const entries = Object.values(indicators);
    const [activeCode, setActiveCode] = useState<string>(entries[0]?.code ?? '');

    const active = indicators[activeCode] ?? entries[0];
    const map = active ? buildMap(active) : { countries: {}, min: 0, max: 0 };

    const ranked = active
        ? [...active.countries].sort(
              (a, b) => (b.latest ?? -Infinity) - (a.latest ?? -Infinity),
          )
        : [];

    return (
        <>
            <Head title="Indikator Makro" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <header className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <LineChart className="size-4" />
                        Indikator Makro
                    </span>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Peta ekonomi dunia
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Klik negara pada peta untuk melihat detail makronya.
                        Data tahunan dari World Bank.
                    </p>
                </header>

                {entries.length === 0 || active === undefined ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
                        <LineChart className="size-8 text-muted-foreground/60" />
                        <p className="font-medium">Data belum tersedia</p>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Sumber data makro sedang tidak dapat diakses. Coba
                            muat ulang halaman beberapa saat lagi.
                        </p>
                    </div>
                ) : (
                    <>
                        <nav className="flex flex-wrap items-center gap-1.5">
                            {entries.map((indicator) => (
                                <button
                                    key={indicator.code}
                                    type="button"
                                    onClick={() => setActiveCode(indicator.code)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition',
                                        activeCode === indicator.code
                                            ? 'border-transparent bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                    )}
                                >
                                    {indicator.label}
                                    <span className="text-xs opacity-70">
                                        {indicator.countries.length}
                                    </span>
                                </button>
                            ))}
                        </nav>

                        <section className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-sm font-semibold">
                                    {active.label}
                                </h2>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span>Rendah</span>
                                    <span className="h-2 w-32 rounded-full bg-gradient-to-r from-[hsl(0,68%,42%)] via-[hsl(75,68%,42%)] to-[hsl(150,68%,42%)]" />
                                    <span>Tinggi</span>
                                </div>
                            </div>

                            <WorldMap
                                countries={map.countries}
                                onSelect={(iso3) => router.visit(showCountry(iso3))}
                            />

                            <p className="text-[11px] text-muted-foreground">
                                {active.code === HIGHER_IS_BETTER
                                    ? 'Warna hijau menandakan pertumbuhan lebih tinggi.'
                                    : 'Warna hijau menandakan nilai lebih rendah (lebih baik).'}
                                {' '}Rentang: {numberFormat.format(Number(map.min.toFixed(2)))}–
                                {numberFormat.format(Number(map.max.toFixed(2)))}{active.unit}
                            </p>
                        </section>

                        <Card className="gap-4 py-5">
                            <CardHeader className="flex flex-row items-start justify-between gap-2 px-5">
                                <div className="flex flex-col gap-1">
                                    <CardTitle className="text-base">
                                        Peringkat negara
                                    </CardTitle>
                                    <CardDescription>
                                        {ranked.length} negara, diurutkan dari
                                        nilai terbaru tertinggi.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="shrink-0">
                                    World Bank
                                </Badge>
                            </CardHeader>
                            <CardContent className="grid gap-3 px-5 sm:grid-cols-2 xl:grid-cols-3">
                                {ranked.map((country, index) => (
                                    <CountryRow
                                        key={country.iso3}
                                        country={country}
                                        rank={index + 1}
                                        unit={active.unit}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    );
}

IndikatorIndex.layout = {
    breadcrumbs: [
        {
            title: 'Indikator Makro',
            href: indikator(),
        },
    ],
};
