import { Head, router } from '@inertiajs/react';
import { Layers } from 'lucide-react';
import { GexHeader } from '@/components/gex-header';
import { GexLadder, money } from '@/components/gex-ladder';
import { Tile } from '@/components/gex-stat';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { charm, delta, gamma, vanna } from '@/routes/gex';
import type { GexAnalysis, GexCatalogItem, GexMetric } from '@/types/gex';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

const META: Record<
    GexMetric,
    { short: string; summary: string; formula: string; reading: string }
> = {
    gex: {
        short: 'GEX',
        summary: 'Perubahan delta yang di-hedge tiap $1 pergerakan harga.',
        formula: 'Γ × OI × 100 × S² × 0.01',
        reading:
            'Positif: dealer menahan pergerakan. Negatif: dealer memperkuat pergerakan.',
    },
    dex: {
        short: 'DEX',
        summary: 'Eksposur arah bersih dari seluruh kontrak terbuka.',
        formula: 'Δ × OI × 100 × S',
        reading: 'Positif: pasar condong bullish. Negatif: condong bearish.',
    },
    vex: {
        short: 'VEX',
        summary: 'Perubahan delta ketika implied volatility bergeser.',
        formula: 'Vanna × OI × 100 × S',
        reading:
            'Mengukur agresivitas dealer menyesuaikan hedge saat IV berubah.',
    },
    chex: {
        short: 'CHEX',
        summary: 'Perubahan delta akibat peluruhan waktu menuju expiry.',
        formula: 'Charm × OI × 100 × S',
        reading: 'Mendeteksi unwinding hedge menjelang sesi tutup atau OPEX.',
    },
};

const ROUTES = { gex: gamma, dex: delta, vex: vanna, chex: charm };

export default function GexMetricPage({
    analysis,
    catalog,
    symbol,
    metric,
}: {
    analysis: GexAnalysis | null;
    catalog: GexCatalogItem[];
    symbol: string;
    metric: GexMetric;
    slug: string;
}) {
    const meta = META[metric];

    const changeAsset = (value: string) => {
        router.get(
            `${ROUTES[metric]().url}?symbol=${encodeURIComponent(value)}`,
            {},
            { preserveScroll: true },
        );
    };

    const net = analysis
        ? analysis.strikes.reduce((total, row) => total + row[metric], 0)
        : 0;
    const gross = analysis
        ? analysis.strikes.reduce(
              (total, row) => total + Math.abs(row[metric]),
              0,
          )
        : 0;
    const share = gross > 0 ? (net / gross) * 100 : 0;
    const positive = net >= 0;
    const contribution = analysis?.distribution.contributions[metric] ?? 0;

    const positiveStrikes = analysis
        ? analysis.strikes.filter((row) => row[metric] > 0).length
        : 0;
    const negativeStrikes = analysis
        ? analysis.strikes.filter((row) => row[metric] < 0).length
        : 0;

    return (
        <>
            <Head title={`${meta.short} · Dealer Positioning`} />

            <div className="flex flex-1 flex-col gap-5 p-4">
                <GexHeader
                    analysis={analysis}
                    catalog={catalog}
                    symbol={symbol}
                    active={metric}
                    onSelect={changeAsset}
                />

                {analysis === null ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
                        <Layers className="size-8 text-muted-foreground/60" />
                        <p className="font-medium">
                            Rantai opsi {symbol} tidak tersedia
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Tile
                                label={`Net ${meta.short}`}
                                value={money(net)}
                                hint={positive ? 'Dominan positif' : 'Dominan negatif'}
                                tone={positive ? 'positive' : 'negative'}
                            />
                            <Tile
                                label="Share Bruto"
                                value={`${share >= 0 ? '+' : ''}${share.toFixed(1)}%`}
                                hint={`Bruto ${money(gross)}`}
                                tone={share >= 0 ? 'positive' : 'negative'}
                            />
                            <Tile
                                label="Strike + / −"
                                value={`${positiveStrikes} / ${negativeStrikes}`}
                                hint={`dari ${analysis.strikes.length}`}
                                tone="muted"
                            />
                            <Tile
                                label="Kontribusi Bias"
                                value={`${contribution >= 0 ? '+' : ''}${contribution.toFixed(2)}`}
                                hint="Terhadap distribusi"
                                tone={contribution >= 0 ? 'positive' : 'negative'}
                            />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-3">
                            <Card className="gap-0 py-4 xl:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 pb-2">
                                    <CardTitle className="text-sm">
                                        {meta.short} per Strike
                                    </CardTitle>
                                    <Badge
                                        variant="outline"
                                        className="font-mono text-[10px]"
                                    >
                                        {analysis.symbol}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="max-h-[560px] overflow-y-auto px-4">
                                    <GexLadder
                                        analysis={analysis}
                                        metric={metric}
                                    />
                                </CardContent>
                            </Card>

                            <div className="flex flex-col gap-4">
                                <Card className="gap-3 py-4">
                                    <CardHeader className="px-4">
                                        <CardTitle className="text-sm">
                                            Definisi
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2.5 px-4 text-xs text-muted-foreground">
                                        <p>{meta.summary}</p>
                                        <p>{meta.reading}</p>
                                        <div className="rounded-md border bg-muted/40 px-2 py-1.5 font-mono text-[11px] text-foreground">
                                            {meta.formula}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="gap-3 py-4">
                                    <CardHeader className="px-4">
                                        <CardTitle className="text-sm">
                                            Sebaran Strike
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2 px-4 text-xs">
                                        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="bg-emerald-500/70"
                                                style={{
                                                    width: `${(positiveStrikes / Math.max(analysis.strikes.length, 1)) * 100}%`,
                                                }}
                                            />
                                            <div
                                                className="bg-red-500/70"
                                                style={{
                                                    width: `${(negativeStrikes / Math.max(analysis.strikes.length, 1)) * 100}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                                {positiveStrikes} positif
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                {negativeStrikes} negatif
                                                <span className="size-1.5 rounded-full bg-red-500" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="gap-2 py-4">
                                    <CardHeader className="px-4">
                                        <CardTitle className="text-sm">
                                            Ringkasan
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-1.5 px-4 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Regime
                                            </span>
                                            <span
                                                className={cn(
                                                    'font-medium',
                                                    analysis.regime === 'positive'
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-red-600 dark:text-red-400',
                                                )}
                                            >
                                                {analysis.regime === 'positive'
                                                    ? 'Positive Gamma'
                                                    : 'Negative Gamma'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Total strike
                                            </span>
                                            <span className="font-medium tabular-nums">
                                                {analysis.strikes.length}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                            Data {new Date(analysis.as_of).toLocaleString('id-ID')}.
                        </p>
                    </>
                )}
            </div>
        </>
    );
}

GexMetricPage.layout = {
    breadcrumbs: [
        {
            title: 'Dealer Positioning',
            href: '/gex',
        },
    ],
};