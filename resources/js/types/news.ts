export interface NewsArticle {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    image: string | null;
    url: string;
    source: string;
    scope: 'domestic' | 'international';
    published_at: number;
}

export type NewsScope = 'all' | 'domestic' | 'international';

export interface NewsCounts {
    all: number;
    domestic: number;
    international: number;
}
