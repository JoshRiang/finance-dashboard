import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CatalogItem } from '@/types/macro';

export function AssetPicker({
    catalog,
    value,
    onChange,
    compact = false,
}: {
    catalog: CatalogItem[];
    value: string;
    onChange: (symbol: string) => void;
    compact?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleClick = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    const current = catalog.find((item) => item.symbol === value);
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
        ? catalog.filter(
              (item) =>
                  item.symbol.toLowerCase().includes(normalized) ||
                  item.label.toLowerCase().includes(normalized),
          )
        : catalog;
    const groups = [...new Set(filtered.map((item) => item.group))];

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((state) => !state)}
                className={cn(
                    'group flex items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-1.5 text-left transition hover:border-foreground/20 hover:bg-accent/50',
                    compact ? 'w-[150px]' : 'w-[190px]',
                )}
            >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary uppercase">
                    {value.slice(0, 2).replace('^', '')}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-xs font-semibold">
                        {value}
                    </span>
                    {!compact && (
                        <span className="truncate text-[10px] text-muted-foreground">
                            {current?.label ?? '—'}
                        </span>
                    )}
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>

            {open && (
                <div className="absolute top-full left-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border bg-popover shadow-xl">
                    <div className="flex items-center gap-2 border-b px-3 py-2">
                        <Search className="size-3.5 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Cari simbol atau nama…"
                            className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                    </div>

                    <div className="max-h-72 overflow-y-auto p-1.5">
                        {filtered.length === 0 ? (
                            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                                Tidak ada hasil.
                            </p>
                        ) : (
                            groups.map((group) => (
                                <div key={group} className="mb-1">
                                    <div className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        {group}
                                    </div>
                                    {filtered
                                        .filter((item) => item.group === group)
                                        .map((item) => {
                                            const active =
                                                item.symbol === value;

                                            return (
                                                <button
                                                    key={item.symbol}
                                                    type="button"
                                                    onClick={() => {
                                                        onChange(item.symbol);
                                                        setOpen(false);
                                                        setQuery('');
                                                    }}
                                                    className={cn(
                                                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition',
                                                        active
                                                            ? 'bg-accent'
                                                            : 'hover:bg-accent/60',
                                                    )}
                                                >
                                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary uppercase">
                                                        {item.symbol
                                                            .slice(0, 2)
                                                            .replace('^', '')}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-xs font-semibold">
                                                            {item.symbol}
                                                        </span>
                                                        <span className="block truncate text-[10px] text-muted-foreground">
                                                            {item.label}
                                                        </span>
                                                    </span>
                                                    {active && (
                                                        <Check className="size-3.5 shrink-0 text-primary" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
