import { Head } from '@inertiajs/react';
import { Columns2, Grid2x2, LineChart, Square } from 'lucide-react';
import { useState } from 'react';
import { MarketSlot } from '@/components/market-slot';
import { cn } from '@/lib/utils';
import { pasar } from '@/routes';
import type { CatalogItem } from '@/types/macro';

const DEFAULT_SYMBOLS = ['^GSPC', '^IXIC', 'GC=F', 'IDR=X'];

const LAYOUTS = [
    { value: 1, icon: Square, label: '1 grafik', height: 520 },
    { value: 2, icon: Columns2, label: '2 grafik', height: 380 },
    { value: 4, icon: Grid2x2, label: '4 grafik', height: 260 },
] as const;

type Layout = (typeof LAYOUTS)[number]['value'];

export default function PasarIndex({ catalog }: { catalog: CatalogItem[] }) {
    const available = catalog.map((item) => item.symbol);
    const fallback = available[0] ?? '';

    const seeded = DEFAULT_SYMBOLS.filter((symbol) =>
        available.includes(symbol),
    );

    for (const symbol of available) {
        if (seeded.length >= DEFAULT_SYMBOLS.length) {
            break;
        }

        if (!seeded.includes(symbol)) {
            seeded.push(symbol);
        }
    }

    while (seeded.length < DEFAULT_SYMBOLS.length) {
        seeded.push(fallback);
    }

    const [symbols, setSymbols] = useState<string[]>(seeded);
    const [layout, setLayout] = useState<Layout>(2);

    const activeLayout = LAYOUTS.find((item) => item.value === layout)!;
    const visible = symbols.slice(0, layout);

    const updateSlot = (index: number, symbol: string) => {
        setSymbols((current) =>
            current.map((value, position) =>
                position === index ? symbol : value,
            ),
        );
    };

    return (
        <>
            <Head title="Pasar Global" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <LineChart className="size-4" />
                            Pasar Global
                        </span>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Pergerakan pasar
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pilih aset dan timeframe pada tiap grafik. Data
                            Yahoo Finance, diperbarui otomatis.
                        </p>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
                        {LAYOUTS.map((item) => {
                            const Icon = item.icon;
                            const active = layout === item.value;

                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    title={item.label}
                                    onClick={() => setLayout(item.value)}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition',
                                        active
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                    )}
                                >
                                    <Icon className="size-4" />
                                    <span className="hidden sm:inline">
                                        {item.value}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </header>

                {catalog.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
                        <LineChart className="size-8 text-muted-foreground/60" />
                        <p className="font-medium">Data pasar belum tersedia</p>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Sumber data sedang tidak dapat diakses. Coba muat
                            ulang halaman beberapa saat lagi.
                        </p>
                    </div>
                ) : (
                    <div
                        className={cn(
                            'grid gap-3',
                            layout === 1
                                ? 'grid-cols-1'
                                : 'grid-cols-1 xl:grid-cols-2',
                        )}
                    >
                        {visible.map((symbol, index) => (
                            <MarketSlot
                                key={index}
                                catalog={catalog}
                                initialSymbol={symbol}
                                height={activeLayout.height}
                                compact={layout === 4}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

PasarIndex.layout = {
    breadcrumbs: [
        {
            title: 'Pasar Global',
            href: pasar(),
        },
    ],
};