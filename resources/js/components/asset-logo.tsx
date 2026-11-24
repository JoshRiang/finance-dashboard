import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

function logoUrl(symbol: string): string | null {
    const upper = symbol.toUpperCase();

    if (upper.includes('-USD')) {
        const base = upper.split('-')[0].toLowerCase();

        return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${base}.png`;
    }

    // Plain tickers (stocks & ETFs) are served by FMP's logo endpoint.
    if (/^[A-Z]{1,5}$/.test(upper)) {
        return `https://financialmodelingprep.com/image-stock/${upper}.png`;
    }

    return null;
}

function initials(symbol: string): string {
    return symbol.replace('^', '').slice(0, 2).toUpperCase();
}

function hue(symbol: string): number {
    let hash = 0;

    for (let index = 0; index < symbol.length; index += 1) {
        hash = symbol.charCodeAt(index) + ((hash << 5) - hash);
    }

    return Math.abs(hash) % 360;
}

export function AssetLogo({
    symbol,
    size = 24,
    className,
}: {
    symbol: string;
    size?: number;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    const url = useMemo(() => logoUrl(symbol), [symbol]);

    if (url && !failed) {
        return (
            <img
                src={url}
                alt={symbol}
                width={size}
                height={size}
                loading="lazy"
                onError={() => setFailed(true)}
                className={cn(
                    'shrink-0 rounded object-contain',
                    className,
                )}
                style={{ width: size, height: size }}
            />
        );
    }

    const color = hue(symbol);

    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded font-bold',
                className,
            )}
            style={{
                width: size,
                height: size,
                fontSize: size * 0.38,
                backgroundColor: `hsl(${color} 50% 20%)`,
                color: `hsl(${color} 75% 70%)`,
            }}
        >
            {initials(symbol)}
        </span>
    );
}