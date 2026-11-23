export function Sparkline({
    values,
    positive,
    className = 'h-14',
}: {
    values: number[];
    positive: boolean;
    className?: string;
}) {
    const width = 120;
    const height = 44;

    if (values.length < 2) {
        return <div className={className} />;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const points = values.map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / span) * (height - 4) - 2;

        return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    const line = points.join(' ');
    const area = `0,${height} ${line} ${width},${height}`;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className={`${className} w-full`}
            aria-hidden="true"
        >
            <polygon
                points={area}
                className={positive ? 'fill-emerald-500/10' : 'fill-red-500/10'}
            />
            <polyline
                points={line}
                fill="none"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={positive ? 'stroke-emerald-500' : 'stroke-red-500'}
            />
        </svg>
    );
}

export function MiniBars({
    points,
    positive,
    className = 'h-16',
}: {
    points: { year: number; value: number }[];
    positive: boolean;
    className?: string;
}) {
    if (points.length === 0) {
        return <div className={className} />;
    }

    const values = points.map((point) => point.value);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const height = 64;
    const gap = 3;
    const barWidth = Math.max((120 - gap * (points.length - 1)) / points.length, 2);
    const zeroY = height - ((0 - min) / span) * height;

    return (
        <svg
            viewBox={`0 0 120 ${height}`}
            preserveAspectRatio="none"
            className={`${className} w-full`}
            aria-hidden="true"
        >
            {points.map((point, index) => {
                const valueY = height - ((point.value - min) / span) * height;
                const y = Math.min(zeroY, valueY);
                const barHeight = Math.max(Math.abs(zeroY - valueY), 1);
                const x = index * (barWidth + gap);

                return (
                    <rect
                        key={point.year}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx={1}
                        className={
                            point.value < 0
                                ? 'fill-red-500/70'
                                : positive
                                  ? 'fill-emerald-500/70'
                                  : 'fill-primary/70'
                        }
                    />
                );
            })}
        </svg>
    );
}
