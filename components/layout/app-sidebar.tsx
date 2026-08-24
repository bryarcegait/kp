"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_ITEMS } from "@/components/layout/nav-items";

export function AppSidebar({ visibleHrefs }: { visibleHrefs: string[] }) {
  const pathname = usePathname();
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const items = NAV_ITEMS.filter((item) => visibleHrefs.includes(item.href));

  const hideSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
      return;
    }

    setOpen(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4 group-data-[collapsible=icon]:px-1">
        <div className="flex items-center gap-3 px-1 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <img
            src="/kanto-logo.png"
            alt="Kanto't Pakpakan"
            className="size-10 shrink-0 rounded-full bg-white object-contain p-1 shadow-sm"
          />
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate text-base font-semibold text-white">
              Kanto&apos;t Pakpakan
            </span>
            <span className="truncate text-xs text-white/75">
              Restaurant System
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0 py-2 group-data-[collapsible=icon]:px-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 pr-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:pr-0">
              {items.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem
                    key={item.href}
                    className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-12 rounded-r-full rounded-l-none border-l-[3px] border-transparent px-5 py-1.5 text-white hover:border-white hover:bg-white hover:text-primary data-active:border-white data-active:bg-white data-active:text-primary group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:hover:bg-transparent group-data-[collapsible=icon]:data-active:bg-transparent group-data-[collapsible=icon]:data-active:text-white"
                    >
                      <Link href={item.href} onClick={hideSidebar}>
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#161016] text-white transition-colors group-hover/menu-button:bg-primary group-hover/menu-button:text-primary-foreground group-data-[active=true]/menu-button:bg-primary group-data-[active=true]/menu-button:text-primary-foreground">
                          <item.icon className="size-4" />
                        </span>
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}