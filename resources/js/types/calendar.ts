export interface EconomicEvent {
    date: string;
    time: string;
    datetime: string | null;
    title: string;
    country: string;
    impact: 'High' | 'Medium' | 'Low' | 'Holiday';
    forecast: string;
    previous: string;
    url: string;
    timestamp: number;
}
