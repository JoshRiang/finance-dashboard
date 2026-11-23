import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface MapCountry {
    iso3: string;
    label: string;
    value: number | null;
    color: string;
}

interface MapPath {
    id: string;
    d: string;
}

let cache: MapPath[] | null = null;

async function loadWorld(): Promise<MapPath[]> {
    if (cache) {
        return cache;
    }

    const response = await fetch('/world.svg');

    if (!response.ok) {
        throw new Error('world map failed to load');
    }

    const text = await response.text();
    const document = new DOMParser().parseFromString(text, 'image/svg+xml');

    const paths = Array.from(document.querySelectorAll('path[id]'))
        .map((path) => ({
            id: path.getAttribute('id') ?? '',
            d: path.getAttribute('d') ?? '',
        }))
        .filter((path) => path.id !== '' && path.d !== '');

    cache = paths;

    return paths;
}

export function WorldMap({
    countries,
    selected,
    onSelect,
}: {
    countries: Record<string, MapCountry>;
    selected?: string | null;
    onSelect: (iso3: string) => void;
}) {
    const [paths, setPaths] = useState<MapPath[]>(cache ?? []);
    const [hover, setHover] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        loadWorld()
            .then((loaded) => {
                if (active) {
                    setPaths(loaded);
                }
            })
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, []);

    const hoveredCountry = hover ? countries[hover] : null;

    return (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0a0f16] p-2">
            {paths.length === 0 ? (
                <div className="flex aspect-[1010/666] w-full items-center justify-center text-sm text-slate-500">
                    Memuat peta…
                </div>
            ) : (
                <svg
                    viewBox="0 0 1010 666"
                    className="h-auto w-full"
                    role="img"
                    aria-label="Peta dunia"
                >
                    {paths.map((path) => {
                        const country = countries[path.id];
                        const isTracked = country !== undefined;
                        const isSelected =
                            selected && country && country.iso3 === selected;
                        const isHovered = hover === path.id;

                        return (
                            <path
                                key={path.id}
                                d={path.d}
                                fill={
                                    isTracked
                                        ? country.color
                                        : isHovered
                                          ? '#1b2634'
                                          : '#141b25'
                                }
                                stroke={
                                    isSelected
                                        ? '#ffffff'
                                        : isTracked
                                          ? 'rgba(255,255,255,0.25)'
                                          : 'rgba(255,255,255,0.05)'
                                }
                                strokeWidth={isSelected ? 1.4 : 0.5}
                                vectorEffect="non-scaling-stroke"
                                className={cn(
                                    'transition-colors',
                                    isTracked && 'cursor-pointer',
                                )}
                                onMouseEnter={() => setHover(path.id)}
                                onMouseLeave={() =>
                                    setHover((current) =>
                                        current === path.id ? null : current,
                                    )
                                }
                                onClick={() => {
                                    if (country) {
                                        onSelect(country.iso3);
                                    }
                                }}
                            />
                        );
                    })}
                </svg>
            )}

            {hoveredCountry && (
                <div className="pointer-events-none absolute top-3 left-3 rounded-md border border-white/10 bg-black/80 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur">
                    <span className="font-medium">{hoveredCountry.label}</span>
                    {hoveredCountry.value !== null && (
                        <span className="ml-2 text-slate-300">
                            {new Intl.NumberFormat('id-ID', {
                                maximumFractionDigits: 2,
                            }).format(hoveredCountry.value)}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
