import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { dashboard, berita } from '@/routes';
import type { NewsArticle } from '@/types/news';

export default function Show({ article }: { article: NewsArticle }) {
    return (
        <>
            <Head title={article.title} />

            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4">
                <Link
                    href={berita()}
                    className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Kembali ke beranda
                </Link>

                <article className="flex flex-col gap-4">
                    <Badge variant="secondary" className="w-fit">
                        {article.source}
                    </Badge>

                    <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
                        {article.title}
                    </h1>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="size-4" />
                        {formatDateTime(article.published_at)}
                    </div>

                    {article.image && (
                        <div className="overflow-hidden rounded-xl border bg-muted">
                            <img
                                src={article.image}
                                alt={article.title}
                                className="w-full object-cover"
                            />
                        </div>
                    )}

                    <p className="text-base leading-relaxed whitespace-pre-line text-foreground/90">
                        {article.content || article.excerpt}
                    </p>

                    <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                        Ringkasan ini berasal dari feed resmi {article.source}.
                        Baca berita lengkapnya langsung di sumber aslinya.
                    </div>

                    <Button asChild className="w-fit">
                        <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Baca di {article.source}
                            <ExternalLink className="size-4" />
                        </a>
                    </Button>
                </article>
            </div>
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        {
            title: 'Berita',
            href: dashboard(),
        },
        {
            title: 'Detail Berita',
            href: '#',
        },
    ],
};
