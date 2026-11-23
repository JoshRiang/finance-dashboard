import { Head, Link } from '@inertiajs/react';
import { Globe2, Newspaper } from 'lucide-react';
import { NewsCard } from '@/components/news-card';
import { berita } from '@/routes';
import { cn } from '@/lib/utils';
import type { NewsArticle, NewsCounts, NewsScope } from '@/types/news';

const tabs: { value: NewsScope; label: string }[] = [
    { value: 'all', label: 'Semua' },
    { value: 'domestic', label: 'Indonesia' },
    { value: 'international', label: 'Luar Negeri' },
];

function tabHref(scope: NewsScope) {
    return scope === 'all' ? berita() : berita({ query: { scope } });
}

export default function BeritaIndex({
    articles,
    scope,
    counts,
}: {
    articles: NewsArticle[];
    scope: NewsScope;
    counts: NewsCounts;
}) {
    return (
        <>
            <Head title="Berita" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <header className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Newspaper className="size-4" />
                            Berita Terkini
                        </span>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Semua berita
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {counts.all} berita dari dalam dan luar negeri ·
                            diperbarui otomatis tiap 10 menit.
                        </p>
                    </div>

                    <nav className="flex flex-wrap items-center gap-1.5">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.value}
                                href={tabHref(tab.value)}
                                preserveScroll
                                preserveState
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition',
                                    scope === tab.value
                                        ? 'border-transparent bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                                )}
                            >
                                {tab.value === 'international' && (
                                    <Globe2 className="size-3.5" />
                                )}
                                {tab.label}
                                <span
                                    className={cn(
                                        'text-xs',
                                        scope === tab.value
                                            ? 'opacity-80'
                                            : 'opacity-60',
                                    )}
                                >
                                    {counts[tab.value]}
                                </span>
                            </Link>
                        ))}
                    </nav>
                </header>

                {articles.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
                        <Newspaper className="size-8 text-muted-foreground/60" />
                        <p className="font-medium">Belum ada berita</p>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Sumber berita sedang tidak dapat diakses. Coba muat
                            ulang halaman beberapa saat lagi.
                        </p>
                    </div>
                ) : (
                    <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {articles.map((article) => (
                            <NewsCard key={article.id} article={article} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

BeritaIndex.layout = {
    breadcrumbs: [
        {
            title: 'Berita',
            href: berita(),
        },
    ],
};
