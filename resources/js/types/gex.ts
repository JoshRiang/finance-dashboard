export interface GexCatalogItem {
    symbol: string;
    label: string;
    group: string;
}

export interface GexStrike {
    strike: number;
    strike_reference: number | null;
    gex: number;
    dex: number;
    vex: number;
    chex: number;
    call_oi: number;
    put_oi: number;
}

export interface GexExpiration {
    date: string;
    dte: number;
}

export interface GexAnalysis {
    symbol: string;
    label: string;
    group: string;
    reference_label: string | null;
    spot: number;
    spot_reference: number | null;
    ratio: number;
    as_of: string;
    regime: 'positive' | 'negative';
    net_gex: number;
    gamma_flip: number | null;
    gamma_flip_reference: number | null;
    put_wall: number | null;
    put_wall_reference: number | null;
    call_wall: number | null;
    call_wall_reference: number | null;
    motherwall: number | null;
    motherwall_reference: number | null;
    expected_move: {
        upper: number | null;
        lower: number | null;
        value: number | null;
    };
    flow: {
        call_oi: number;
        put_oi: number;
        call_volume: number;
        put_volume: number;
        put_call_ratio: number | null;
    };
    expirations: GexExpiration[];
    strikes: GexStrike[];
}