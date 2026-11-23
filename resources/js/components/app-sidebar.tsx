import { Link } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    Database,
    Globe,
    LayoutGrid,
    LineChart,
    Newspaper,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { berita, dashboard, gex, indikator, pasar } from '@/routes';
import type { NavItem } from '@/types';

const primaryNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Berita',
        href: berita(),
        icon: Newspaper,
    },
];

const analysisNavItems: NavItem[] = [
    {
        title: 'Pasar',
        href: pasar(),
        icon: LineChart,
    },
    {
        title: 'Indikator',
        href: indikator(),
        icon: BarChart3,
    },
    {
        title: 'Dealer GEX',
        href: gex(),
        icon: Activity,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Yahoo Finance',
        href: 'https://finance.yahoo.com',
        icon: Globe,
    },
    {
        title: 'World Bank',
        href: 'https://data.worldbank.org',
        icon: Database,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-1">
                <NavMain items={primaryNavItems} label="Utama" />
                <NavMain items={analysisNavItems} label="Analisis" />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}