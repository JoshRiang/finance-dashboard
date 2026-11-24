import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { gex } from '@/routes';
import { charm, delta, distribution, gamma, vanna } from '@/routes/gex';

export type GexTabKey =
    | 'overview'
    | 'gex'
    | 'dex'
    | 'vex'
    | 'chex'
    | 'distribution';

export function GexTabs({
    active,
    symbol,
}: {
    active: GexTabKey;
    symbol: string;
}) {
    const tabs: { key: GexTabKey; label: string; href: string }[] = [
        { key: 'overview', label: 'Ringkasan', href: gex({ query: { symbol } }).url },
        { key: 'gex', label: 'GEX', href: gamma({ query: { symbol } }).url },
        { key: 'dex', label: 'DEX', href: delta({ query: { symbol } }).url },
        { key: 'vex', label: 'VEX', href: vanna({ query: { symbol } }).url },
        { key: 'chex', label: 'CHEX', href: charm({ query: { symbol } }).url },
        {
            key: 'distribution',
            label: 'Distribusi',
            href: distribution({ query: { symbol } }).url,
        },
    ];

    return (
        <nav className="flex flex-wrap items-center gap-4 text-sm">
            {tabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={tab.href}
                    preserveScroll
                    className={cn(
                        'relative py-1 transition-colors',
                        active === tab.key
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {tab.label}
                    {active === tab.key && (
                        <span className="absolute inset-x-0 -bottom-[13px] h-0.5 rounded-full bg-primary" />
                    )}
                </Link>
            ))}
        </nav>
    );
}