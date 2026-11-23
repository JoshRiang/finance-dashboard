export interface MarketQuote {
    symbol: string;
    label: string;
    region: 'americas' | 'world';
    group: string;
    name: string;
    currency: string;
    price: number;
    day_change: number;
    range_change: number;
    week_52_high: number | null;
    week_52_low: number | null;
    volume: number | null;
    points: number[];
}

export interface IndicatorPoint {
    year: number;
    value: number;
}

export interface IndicatorSeries {
    code: string;
    label: string;
    unit: string;
    points: IndicatorPoint[];
    latest: number | null;
    latest_year: number | null;
}

export interface IndicatorGroup {
    label: string;
    series: IndicatorSeries[];
}

export interface CountryIndicator {
    iso3: string;
    label: string;
    flag: string | null;
    points: IndicatorPoint[];
    latest: number | null;
    latest_year: number | null;
}

export interface MacroIndicator {
    code: string;
    label: string;
    unit: string;
    countries: CountryIndicator[];
}

export type MacroIndicatorMap = Record<string, MacroIndicator>;

export interface MacroOverview {
    markets: MarketQuote[];
    indicators: Record<string, IndicatorGroup>;
}

export interface CatalogItem {
    symbol: string;
    label: string;
    group: string;
}

export interface MarketPoint {
    t: number;
    c: number;
    v?: number;
}

export interface MarketSeries {
    symbol: string;
    label: string;
    timeframe: string;
    currency: string;
    name: string;
    price: number;
    day_change: number;
    range_change: number;
    week_52_high: number | null;
    week_52_low: number | null;
    volume: number | null;
    points: MarketPoint[];
}

export interface CountryDetail {
    iso3: string;
    label: string;
    flag: string | null;
    indicators: IndicatorSeries[];
    world: Record<string, number>;
}