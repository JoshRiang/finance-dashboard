import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Gauge } from 'lucide-react';
import { GexHeader } from '@/components/gex-header';
import { GexLadder, money } from '@/components/gex-ladder';
import { GexStructure } from '@/components/gex-structure';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { distribution } from '@/routes/gex';
import type { GexAnalysis, GexCatalogItem } from '@/types/gex';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

const METRIC_LABELS: Record<string, string> = {
    gex: 'Gamma',
    dex: 'Delta',
    vex: 'Vanna',
    chex: 'Charm',
};

function Tile({
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

export default function GexIndex({
    analysis,
    catalog,
    symbol,
}: {
    analysis: GexAnalysis | null;
    catalog: GexCatalogItem[];
    symbol: string;
}) {
    const changeAsset = (value: string) => {
        router.get(
            `/gex?symbol=${encodeURIComponent(value)}`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Dealer Positioning" />

            <div className="flex flex-1 flex-col gap-5 p-4">
                <GexHeader
                    analysis={analysis}
                    catalog={catalog}
                    symbol={symbol}
                    active="overview"
                    onSelect={changeAsset}
                />

                {analysis === null ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
                        <Gauge className="size-8 text-muted-foreground/60" />
                        <p className="font-medium">
                            Rantai opsi {symbol} tidak tersedia
                        </p>
                        <p className="max-w-md text-sm text-muted-foreground">
                            Penyedia data tidak mengembalikan kontrak untuk
                            aset ini.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Tile
                                label="Net GEX"
                                value={money(analysis.net_gex)}
                                hint="Per 1% pergerakan"
                                tone={
                                    analysis.regime === 'positive'
                                        ? 'positive'
                                        : 'negative'
                                }
                            />
                            <Tile
                                label="Gamma Flip"
                                value={
                                    analysis.gamma_flip === null
                                        ? '–'
                                        : numberFormat.format(
                                              analysis.gamma_flip,
                                          )
                                }
                                hint={
                                    analysis.gamma_flip === null
                                        ? 'Tidak ada flip dalam ±20%'
                                        : `${(((analysis.gamma_flip - analysis.spot) / analysis.spot) * 100).toFixed(2)}% dari spot`
                                }
                                tone={
                                    analysis.gamma_flip === null
                                        ? 'muted'
                                        : undefined
                                }
                            />
                            <Tile
                                label="Expected Move"
                                value={
                                    analysis.expected_move.value === null
                                        ? '–'
                                        : `±${numberFormat.format(analysis.expected_move.value)}`
                                }
                                hint={
                                    analysis.expected_move.lower !== null
                                        ? `${numberFormat.format(analysis.expected_move.lower)} – ${numberFormat.format(analysis.expected_move.upper ?? 0)}`
                                        : undefined
                                }
                            />
                            <Tile
                                label="Put / Call OI"
                                value={
                                    analysis.flow.put_call_ratio === null
                                        ? '–'
                                        : analysis.flow.put_call_ratio.toFixed(
                                              2,
                                          )
                                }
                                hint={`${analysis.flow.put_oi.toLocaleString('id-ID')} / ${analysis.flow.call_oi.toLocaleString('id-ID')}`}
                            />
                        </div>

                        <Card className="gap-3 py-4">
                            <CardHeader className="flex flex-row items-center justify-between gap-2 px-4">
                                <CardTitle className="text-sm">
                                    Struktur Harga
                                </CardTitle>
                                <Badge
                                    variant="outline"
                                    className="font-mono text-[10px]"
                                >
                                    {analysis.symbol}
                                </Badge>
                            </CardHeader>
                            <CardContent className="px-4">
                                <GexStructure analysis={analysis} />
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 xl:grid-cols-3">
                            <Card className="gap-0 py-4 xl:col-span-2">
                                <CardHeader className="px-4 pb-2">
                                    <CardTitle className="text-sm">
                                        Gamma per Strike
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="max-h-[560px] overflow-y-auto px-4">
                                    <GexLadder
                                        analysis={analysis}
                                        metric="gex"
                                    />
                                </CardContent>
                            </Card>

                            <div className="flex flex-col gap-4">
                                <Card className="gap-3 py-4">
                                    <CardHeader className="px-4">
                                        <CardTitle className="text-sm">
                                            Bias Dealer
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2.5 px-4">
                                        {Object.entries(
                                            analysis.distribution.contributions,
                                        ).map(([metric, value]) => {
                                            const positive = value >= 0;

                                            return (
                                                <div
                                                    key={metric}
                                                    className="flex items-center gap-2"
                                                >
                                                    <span className="w-12 shrink-0 text-[11px] text-muted-foreground">
                                                        {METRIC_LABELS[metric] ??
                                                            metric}
                                                    </span>
                                                    <div className="relative h-1.5 flex-1 rounded-full bg-muted">
                                                        <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                                                        <div
                                                            className={cn(
                                                                'absolute inset-y-0 rounded-full',
                                                                positive
                                                                    ? 'left-1/2 bg-emerald-500/70'
                                                                    : 'right-1/2 bg-red-500/70',
                                                            )}
                                                            style={{
                                                                width: `${Math.abs(value) * 50}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'w-11 shrink-0 text-right font-mono text-[11px] tabular-nums',
                                                            positive
                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                : 'text-red-600 dark:text-red-400',
                                                        )}
                                                    >
                                                        {positive ? '+' : ''}
                                                        {value.toFixed(2)}
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="mt-1 w-full"
                                        >
                                            <Link href={distribution().url}>
                                                Lihat distribusi
                                                <ArrowRight className="size-3.5" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="gap-3 py-4">
                                    <CardHeader className="px-4">
                                        <CardTitle className="text-sm">
                                            Expiry Aktif
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-wrap gap-1.5 px-4">
                                        {analysis.expirations.map(
                                            (expiration) => (
                                                <Badge
                                                    key={expiration.date}
                                                    variant="secondary"
                                                    className="font-mono text-[10px] font-normal"
                                                >
                                                    {expiration.date.slice(5)} ·{' '}
                                                    {expiration.dte}D
                                                </Badge>
                                            ),
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                            Greeks dihitung ulang (Black-Scholes) dari implied
                            volatility &amp; open interest. Data{' '}
                            {new Date(analysis.as_of).toLocaleString('id-ID')}.
                        </p>
                    </>
                )}
            </div>
        </>
    );
}

GexIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dealer Positioning',
            href: '/gex',
        },
    ],
};