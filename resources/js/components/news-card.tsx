import { Link } from '@inertiajs/react';
import { Clock, Globe2, Newspaper } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/format';
import { show as showArticle } from '@/routes/news';
import type { NewsArticle } from '@/types/news';

export function NewsCard({ article }: { article: NewsArticle }) {
    return (
        <Link
            href={showArticle(article.id)}
            prefetch
            className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {article.image ? (
                    <img
                        src={article.image}
                        alt={article.title}
                        loading="lazy"
                        className="size-full object-cover transition duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                        <Newspaper className="size-8 text-muted-foreground/60" />
                    </div>
                )}

                <Badge variant="secondary" className="absolute top-3 left-3">
                    {article.scope === 'international' && (
                        <Globe2 className="size-3" />
                    )}
                    {article.source}
                </Badge>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
                <h2 className="line-clamp-2 leading-snug font-semibold group-hover:text-primary">
                    {article.title}
                </h2>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                    {article.excerpt}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {timeAgo(article.published_at)}
                </span>
            </div>
        </Link>
    );
}
