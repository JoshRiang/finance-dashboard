import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="relative flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm ring-1 ring-primary/20">
                <AppLogoIcon className="size-5 fill-current" />
            </div>
            <div className="ml-2 grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold">{name}</span>
                <span className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Market Terminal
                </span>
            </div>
        </>
    );
}