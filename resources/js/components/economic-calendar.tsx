import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { countryCode, formatInZone, localTime } from '@/lib/calendar';
import { cn } from '@/lib/utils';
import type { EconomicEvent } from '@/types/calendar';

const impactStyles: Record<EconomicEvent['impact'], string> = {
    High: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
    Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Low: 'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400',
    Holiday: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

function formatDay(date: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    }).format(new Date(`${date}T00:00:00Z`));
}

function TimeCell({ event }: { event: EconomicEvent }) {
    if (!event.datetime) {
        return (
            <span className="w-28 shrink-0 pt-0.5 text-xs text-muted-foreground">
                {event.time}
            </span>
        );
    }

    const utc = formatInZone(event.datetime, 'UTC');
    const local = localTime(event.datetime);

    return (
        <div
            className="w-28 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground"
            title="Waktu lokal Anda"
        >
            <div>
                {utc.time} <span className="opacity-70">UTC</span>
            </div>
            <div className="text-[10px] text-foreground/60">
                {local.time} {local.zone}
            </div>
        </div>
    );
}

export function EconomicCalendar({ events }: { events: EconomicEvent[] }) {
    const groups = events.reduce<Record<string, EconomicEvent[]>>(
        (carry, event) => {
            (carry[event.date] ??= []).push(event);

            return carry;
        },
        {},
    );

    return (
        <Card className="gap-4 border-0 bg-transparent py-0 shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-2 px-0">
                <div className="flex flex-col gap-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                        Kalender Ekonomi
                    </CardTitle>
                    <CardDescription>
                        Agenda berdampak tinggi &amp; menengah minggu ini.
                    </CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0">
                    UTC + lokal
                </Badge>
            </CardHeader>

            <CardContent className="px-0">
                {events.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        Belum ada agenda ekonomi untuk periode ini.
                    </p>
                ) : (
                    <div className="flex flex-col gap-5">
                        {Object.entries(groups).map(([date, dayEvents]) => (
                            <div key={date} className="flex flex-col gap-2">
                                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    {formatDay(date)}
                                </h3>

                                <ul className="flex flex-col divide-y">
                                    {dayEvents.map((event, index) => {
                                        const code = countryCode(event.country);

                                        return (
                                            <li
                                                key={`${event.url}-${index}`}
                                                className="flex items-start gap-3 py-2 first:pt-0 last:pb-0"
                                            >
                                                <TimeCell event={event} />

                                                <span
                                                    className="flex w-8 shrink-0 justify-center pt-0.5"
                                                    title={event.country}
                                                >
                                                    {code ? (
                                                        <img
                                                            src={`https://flagcdn.com/w40/${code}.png`}
                                                            srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
                                                            alt={event.country}
                                                            width={24}
                                                            height={18}
                                                            loading="lazy"
                                                            className="h-[18px] w-6 rounded-[2px] object-cover ring-1 ring-black/10 dark:ring-white/15"
                                                        />
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="font-mono"
                                                        >
                                                            {event.country}
                                                        </Badge>
                                                    )}
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {event.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Forecast{' '}
                                                        {event.forecast || '–'}
                                                        {' · '}
                                                        Prev{' '}
                                                        {event.previous || '–'}
                                                    </p>
                                                </div>

                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'shrink-0',
                                                        impactStyles[
                                                            event.impact
                                                        ],
                                                    )}
                                                >
                                                    {event.impact}
                                                </Badge>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
