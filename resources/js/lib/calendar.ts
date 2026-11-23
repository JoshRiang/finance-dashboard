const CURRENCY_COUNTRY: Record<string, string> = {
    USD: 'us',
    EUR: 'eu',
    GBP: 'gb',
    JPY: 'jp',
    AUD: 'au',
    NZD: 'nz',
    CAD: 'ca',
    CHF: 'ch',
    CNY: 'cn',
    INR: 'in',
    BRL: 'br',
    MXN: 'mx',
    ZAR: 'za',
    KRW: 'kr',
    SGD: 'sg',
    HKD: 'hk',
    NOK: 'no',
    SEK: 'se',
    DKK: 'dk',
    TRY: 'tr',
    RUB: 'ru',
    PLN: 'pl',
    THB: 'th',
    IDR: 'id',
    MYR: 'my',
    PHP: 'ph',
    CZK: 'cz',
    HUF: 'hu',
    ILS: 'il',
    CLP: 'cl',
    COP: 'co',
    SAR: 'sa',
    AED: 'ae',
    EGP: 'eg',
    TWD: 'tw',
    VND: 'vn',
    NGN: 'ng',
    KES: 'ke',
    PKR: 'pk',
    BDT: 'bd',
};

/**
 * Resolve a currency code (USD, EUR, ...) to a lowercase ISO-3166 country code
 * that can be used with an SVG/PNG flag source.
 */
export function countryCode(currency: string): string | null {
    return CURRENCY_COUNTRY[currency.toUpperCase()] ?? null;
}

/**
 * Browsers report Indonesian zones as "GMT+7" instead of "WIB", so map the
 * common zones to their readable abbreviation.
 */
const ZONE_LABELS: Record<string, string> = {
    'Asia/Jakarta': 'WIB',
    'Asia/Pontianak': 'WIB',
    'Asia/Makassar': 'WITA',
    'Asia/Ujung_Pandang': 'WITA',
    'Asia/Jayapura': 'WIT',
    'Asia/Kuala_Lumpur': 'MYT',
    'Asia/Singapore': 'SGT',
    'Asia/Bangkok': 'ICT',
    'Asia/Manila': 'PHT',
    'Asia/Tokyo': 'JST',
    'Asia/Seoul': 'KST',
    'Asia/Shanghai': 'CST',
    'Asia/Kolkata': 'IST',
    'Asia/Dubai': 'GST',
    'Australia/Sydney': 'AEDT',
    'Europe/London': 'GMT',
    'Europe/Berlin': 'CET',
    'Europe/Paris': 'CET',
    'America/New_York': 'ET',
    'America/Chicago': 'CT',
    'America/Denver': 'MT',
    'America/Los_Angeles': 'PT',
    UTC: 'UTC',
};

function resolveZoneLabel(timeZone: string, fallback: string): string {
    if (ZONE_LABELS[timeZone]) {
        return ZONE_LABELS[timeZone];
    }

    return fallback.replace(/^GMT([+-])/, 'UTC$1');
}

export function formatInZone(
    datetime: string,
    timeZone: string,
): { time: string; zone: string } {
    const parts = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
        timeZoneName: 'short',
    }).formatToParts(new Date(datetime));

    const time = `${parts.find((part) => part.type === 'hour')?.value ?? '00'}:${
        parts.find((part) => part.type === 'minute')?.value ?? '00'
    }`;
    const raw = parts.find((part) => part.type === 'timeZoneName')?.value ?? '';

    return { time, zone: resolveZoneLabel(timeZone, raw) };
}

export function localTime(datetime: string): { time: string; zone: string } {
    return formatInZone(datetime, Intl.DateTimeFormat().resolvedOptions().timeZone);
}
