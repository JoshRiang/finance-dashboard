export function timeAgo(timestamp: number): string {
    const seconds = Math.floor(Date.now() / 1000) - timestamp;

    if (seconds < 60) {
        return 'baru saja';
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes} menit lalu`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} jam lalu`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days} hari lalu`;
    }

    return formatDateTime(timestamp);
}

export function formatDateTime(timestamp: number): string {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(timestamp * 1000));
}
