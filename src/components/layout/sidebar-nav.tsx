
// src/components/layout/sidebar-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { LayoutDashboard, BarChart3, Smile, Puzzle, Settings2, FolderKanban } from "lucide-react"; // Added FolderKanban

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/project-overview", label: "Project Overview", icon: FolderKanban },
  { href: "/velocity", label: "Velocity Graphs", icon: BarChart3 },
  { href: "/sentiment-analysis", label: "Sentiment Analysis", icon: Smile },
  { href: "/integrations", label: "Integrations", icon: Puzzle },
];

const bottomNavItems = [
    { href: "/settings", label: "Settings", icon: Settings2 },
]

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <SidebarMenu className="flex-1 p-2">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
              tooltip={{ children: item.label, side: "right", align:"center", className: "ml-2" }}
              className="justify-start"
            >
              <Link href={item.href}>
                <item.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <SidebarMenu className="mt-auto p-2">
        {bottomNavItems.map((item) => (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={{ children: item.label, side: "right", align:"center", className: "ml-2" }}
              className="justify-start"
            >
              <Link href={item.href}>
                <item.icon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </div>
  );
}
