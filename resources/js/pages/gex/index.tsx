import { Head, router } from '@inertiajs/react';
import {
    Activity,
    ArrowDownRight,
    ArrowUpRight,
    CalendarClock,
    Crosshair,
    Gauge,
    ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { gex } from '@/routes';
import type { GexAnalysis, GexCatalogItem } from '@/types/gex';

const numberFormat = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

const compactUsd = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
});

function money(value: number): string {
    return `$${compactUsd.format(value)}`;
}

function Stat({
    label,
    value,
    hint,
    tone,
    icon: Icon,
}: {
    label: string;
    value: string;
    hint?: string;
    tone?: 'positive' | 'negative' | 'neutral';
    icon?: typeof Activity;
}) {
    return (
        <div className="flex flex-col gap-1 rounded-xl border bg-card p-3.5 shadow-sm">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {Icon && <Icon className="size-3.5" />}
                {label}
            </span>
            <span
                className={cn(
                    'text-xl font-semibold tracking-tight tabular-nums',
                    tone === 'positive' && 'text-emerald-600 dark:text-emerald-400',
                    tone === 'negative' && 'text-red-600 dark:text-red-400',
                )}
            >
                {value}
            </span>
            {hint && (
                <span className="text-[10px] text-muted-foreground">{hint}</span>
            )}
        </div>
    );
}

function GexLadder({ analysis }: { analysis: GexAnalysis }) {
    const maxAbs = Math.max(
        ...analysis.strikes.map((row) => Math.abs(row.gex)),
        1,
    );
    const nearestDistance = Math.min(
        ...analysis.strikes.map((item) => Math.abs(item.strike - analysis.spot)),
    );

    return (
        <div className="flex flex-col gap-1">
            {analysis.strikes.map((row) => {
                const isSpot =
                    Math.abs(row.strike - analysis.spot) === nearestDistance;
                const isPutWall =
                    analysis.put_wall !== null &&
                    Math.abs(row.strike - analysis.put_wall) < 0.001;
                const isCallWall =
                    analysis.call_wall !== null &&
                    Math.abs(row.strike - analysis.call_wall) < 0.001;
                const width = (Math.abs(row.gex) / maxAbs) * 50;

                return (
                    <div
                        key={row.strike}
                        className={cn(
                            'flex items-center gap-2 rounded px-1 py-0.5',
                            isSpot && 'bg-accent/60',
                        )}
                    >
                        <span
                            className={cn(
                                'w-20 shrink-0 text-right font-mono text-[11px] tabular-nums',
                                isSpot && 'font-semibold text-foreground',
                                isPutWall && 'text-red-600 dark:text-red-400',
                                isCallWall && 'text-emerald-600 dark:text-emerald-400',
                            )}
                        >
                            {numberFormat.format(row.strike)}
                        </span>

                        <div className="relative h-3 flex-1">
                            <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                            <div
                                className={cn(
                                    'absolute inset-y-0 rounded-sm',
                                    row.gex >= 0
                                        ? 'left-1/2 bg-emerald-500/70'
                                        : 'right-1/2 bg-red-500/70',
                                )}
                                style={{ width: `${width}%` }}
                            />
                        </div>

                        <span
                            className={cn(
                                'w-20 shrink-0 font-mono text-[11px] tabular-nums',
                                row.gex >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400',
                            )}
                        >
                            {money(row.gex)}
                        </span>

                        {isSpot && (
                            <Badge variant="secondary" className="shrink-0 text-[9px]">
                                SPOT
                            </Badge>
                        )}
                        {isPutWall && (
                            <Badge variant="outline" className="shrink-0 text-[9px]">
                                Put Wall
                            </Badge>
                        )}
                        {isCallWall && (
                            <Badge variant="outline" className="shrink-0 text-[9px]">
                                Call Wall
                            </Badge>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function AssetSelector({
    catalog,
    symbol,
}: {
    catalog: GexCatalogItem[];
    symbol: string;
}) {
    const groups = [...new Set(catalog.map((item) => item.group))];

    const change = (value: string) => {
        router.get(
            gex({ query: { symbol: value } }).url,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <Select value={symbol} onValueChange={change}>
            <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Pilih aset" />
            </SelectTrigger>
            <SelectContent>
                {groups.map((group) => (
                    <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {catalog
                            .filter((item) => item.group === group)
                            .map((item) => (
                                <SelectItem
                                    key={item.symbol}
                                    value={item.symbol}
                                >
                                    {item.label} ({item.symbol})
                                </SelectItem>
                            ))}
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
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
    const referenceLabel = analysis?.reference_label ?? null;

    const refText = (value: number | null): string | undefined => {
        if (value === null || referenceLabel === null) {
            return undefined;
        }

        return `≈ ${numberFormat.format(value)} ${referenceLabel}`;
    };

    return (
        <>
            <Head title="Dealer Positioning" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Activity className="size-4" />
                            Options Dealer Positioning
                        </span>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Gamma Exposure (GEX)
                        </h1>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            Peta likuiditas dealer dari rantai opsi{' '}
                            <span className="font-medium text-foreground">
                                {analysis?.symbol ?? symbol}
                            </span>
                            . Diperbarui tiap 15 menit.
                        </p>
                    </div>
                    <AssetSelector catalog={catalog} symbol={symbol} />
                </header>

                {analysis === null ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
                        <Gauge className="size-8 text-muted-foreground/60" />
                        <p className="font-medium">Data opsi belum tersedia</p>
                        <p className="max-w-md text-sm text-muted-foreground">
                            Rantai opsi {symbol} sedang tidak dapat diambil dari
                            penyedia data. Coba pilih aset lain atau muat ulang
                            beberapa saat lagi.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant="outline"
                                className={cn(
                                    analysis.regime === 'positive'
                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
                                )}
                            >
                                {analysis.regime === 'positive'
                                    ? 'Positive Gamma'
                                    : 'Negative Gamma'}
                            </Badge>
                            <Badge variant="secondary">
                                {analysis.label} · {analysis.symbol}
                            </Badge>
                            {referenceLabel && (
                                <Badge variant="outline">
                                    Ref: {referenceLabel}
                                </Badge>
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Stat
                                label={`Spot ${analysis.symbol}`}
                                value={numberFormat.format(analysis.spot)}
                                hint={refText(analysis.spot_reference)}
                                icon={Crosshair}
                            />
                            <Stat
                                label="Gamma Flip"
                                value={
                                    analysis.gamma_flip === null
                                        ? '–'
                                        : numberFormat.format(analysis.gamma_flip)
                                }
                                hint={refText(analysis.gamma_flip_reference)}
                                icon={Gauge}
                            />
                            <Stat
                                label="Net GEX"
                                value={money(analysis.net_gex)}
                                hint="Per 1% pergerakan"
                                tone={analysis.regime}
                                icon={Activity}
                            />
                            <Stat
                                label="Expected Move"
                                value={
                                    analysis.expected_move.value === null
                                        ? '–'
                                        : `±${numberFormat.format(analysis.expected_move.value)}`
                                }
                                hint={`${analysis.expected_move.lower ?? '–'} – ${analysis.expected_move.upper ?? '–'}`}
                                icon={CalendarClock}
                            />
                            <Stat
                                label="Put Wall"
                                value={
                                    analysis.put_wall === null
                                        ? '–'
                                        : numberFormat.format(analysis.put_wall)
                                }
                                hint={refText(analysis.put_wall_reference)}
                                tone="negative"
                                icon={ArrowDownRight}
                            />
                            <Stat
                                label="Call Wall"
                                value={
                                    analysis.call_wall === null
                                        ? '–'
                                        : numberFormat.format(analysis.call_wall)
                                }
                                hint={refText(analysis.call_wall_reference)}
                                tone="positive"
                                icon={ArrowUpRight}
                            />
                            <Stat
                                label="Motherwall"
                                value={
                                    analysis.motherwall === null
                                        ? '–'
                                        : numberFormat.format(analysis.motherwall)
                                }
                                hint={refText(analysis.motherwall_reference)}
                                icon={ShieldAlert}
                            />
                            <Stat
                                label="Put/Call OI"
                                value={
                                    analysis.flow.put_call_ratio === null
                                        ? '–'
                                        : analysis.flow.put_call_ratio.toFixed(2)
                                }
                                hint={`${analysis.flow.put_oi.toLocaleString('id-ID')} put · ${analysis.flow.call_oi.toLocaleString('id-ID')} call`}
                                icon={Activity}
                            />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-3">
                            <Card className="gap-4 py-5 xl:col-span-2">
                                <CardHeader className="flex flex-row items-start justify-between gap-2 px-5">
                                    <div className="flex flex-col gap-1">
                                        <CardTitle className="text-base">
                                            GEX per Strike
                                        </CardTitle>
                                        <CardDescription>
                                            Hijau = gamma positif (meredam),
                                            merah = gamma negatif (mempercepat
                                            tren).
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="shrink-0">
                                        {analysis.symbol}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="max-h-[560px] overflow-y-auto px-5">
                                    {analysis.strikes.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-muted-foreground">
                                            Tidak ada strike di sekitar harga
                                            spot.
                                        </p>
                                    ) : (
                                        <GexLadder analysis={analysis} />
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex flex-col gap-4">
                                <Card className="gap-4 py-5">
                                    <CardHeader className="px-5">
                                        <CardTitle className="text-base">
                                            Level Kunci
                                        </CardTitle>
                                        <CardDescription>
                                            Dalam harga {analysis.symbol}
                                            {referenceLabel
                                                ? ` dan ${referenceLabel}`
                                                : ''}
                                            .
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2 px-5 text-sm">
                                        {[
                                            [
                                                'Gamma Flip',
                                                analysis.gamma_flip,
                                                analysis.gamma_flip_reference,
                                            ],
                                            [
                                                'Put Wall',
                                                analysis.put_wall,
                                                analysis.put_wall_reference,
                                            ],
                                            [
                                                'Call Wall',
                                                analysis.call_wall,
                                                analysis.call_wall_reference,
                                            ],
                                            [
                                                'Motherwall',
                                                analysis.motherwall,
                                                analysis.motherwall_reference,
                                            ],
                                        ].map(([label, value, reference]) => (
                                            <div
                                                key={label as string}
                                                className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"
                                            >
                                                <span className="text-muted-foreground">
                                                    {label as string}
                                                </span>
                                                <span className="text-right font-medium tabular-nums">
                                                    {value === null
                                                        ? '–'
                                                        : numberFormat.format(
                                                              value as number,
                                                          )}
                                                    {reference !== null && (
                                                        <span className="ml-1 text-[10px] text-muted-foreground">
                                                            ~
                                                            {numberFormat.format(
                                                                reference as number,
                                                            )}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card className="gap-4 py-5">
                                    <CardHeader className="px-5">
                                        <CardTitle className="text-base">
                                            Horizon Expiry
                                        </CardTitle>
                                        <CardDescription>
                                            Expiry yang dipakai dalam agregasi.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-1.5 px-5 text-xs">
                                        {analysis.expirations.map((expiration) => (
                                            <div
                                                key={expiration.date}
                                                className="flex items-center justify-between gap-2"
                                            >
                                                <span className="font-mono text-muted-foreground">
                                                    {expiration.date}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px]"
                                                >
                                                    {expiration.dte} DTE
                                                </Badge>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card className="gap-4 py-5">
                                    <CardHeader className="px-5">
                                        <CardTitle className="text-base">
                                            Order Flow
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2 px-5 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Call OI
                                            </span>
                                            <span className="tabular-nums">
                                                {analysis.flow.call_oi.toLocaleString(
                                                    'id-ID',
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Put OI
                                            </span>
                                            <span className="tabular-nums">
                                                {analysis.flow.put_oi.toLocaleString(
                                                    'id-ID',
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Put/Call
                                            </span>
                                            <span className="tabular-nums">
                                                {analysis.flow.put_call_ratio ??
                                                    '–'}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Metode: Greeks dihitung ulang (Black-Scholes) dari
                            implied volatility &amp; open interest rantai opsi{' '}
                            {analysis.symbol}
                            {referenceLabel
                                ? `, lalu dikonversi ke ${referenceLabel} memakai rasio harga referensi`
                                : ''}
                            . Bukan nasihat investasi. Diperbarui{' '}
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
            href: gex(),
        },
    ],
};