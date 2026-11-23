import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Newspaper } from 'lucide-react';
import { EconomicCalendar } from '@/components/economic-calendar';
import { MacroOverview, MacroSkeleton } from '@/components/macro-overview';
import { NewsCard } from '@/components/news-card';
import { Button } from '@/components/ui/button';
import { berita, dashboard } from '@/routes';
import type { EconomicEvent } from '@/types/calendar';
import type { MacroOverview as MacroData } from '@/types/macro';
import type { NewsArticle } from '@/types/news';

export default function Dashboard({
    articles,
    total,
    events,
    macro,
}: {
    articles: NewsArticle[];
    total: number;
    events: EconomicEvent[];
    macro?: MacroData;
}) {
    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-10 p-4">
                <section className="flex flex-col gap-3">
                    <header className="flex flex-wrap items-end justify-between gap-2">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Kabar hari ini
                            </h1>
                            <p className="max-w-sm text-sm text-muted-foreground">
                                Berita terbaru dari berbagai sumber 
                            </p>
                        </div>
                        {total > 0 && (
                            <p className="text-sm text-muted-foreground">
                                {total} berita terkumpul
                            </p>
                        )}
                    </header>

                    {articles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
                            <Newspaper className="size-8 text-muted-foreground/60" />
                            <p className="font-medium">Belum ada berita</p>
                            <p className="max-w-sm text-sm text-muted-foreground">
                                Sumber berita sedang tidak dapat diakses. Coba
                                muat ulang halaman beberapa saat lagi.
                            </p>
                        </div>
                    ) : (
                        <div className="relative h-[50vh] min-h-[320px] overflow-hidden rounded-xl">
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                {articles.map((article) => (
                                    <NewsCard
                                        key={article.id}
                                        article={article}
                                    />
                                ))}
                            </div>

                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/90 to-transparent" />

                            <div className="absolute inset-x-0 bottom-0 flex justify-center pb-6">
                                <Button asChild size="lg">
                                    <Link href={berita()}>
                                        Lihat selengkapnya
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                {macro ? <MacroOverview data={macro} /> : <MacroSkeleton />}

                <EconomicCalendar events={events} />
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
