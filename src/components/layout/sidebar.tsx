"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Utensils,
  LayoutGrid,
  Users,
  LineChart,
  Settings,
  Store,
  ChevronRight
} from "lucide-react";

const sidebarLinks = [
  { name: "Dashboard Overview", href: "/", icon: LayoutDashboard },
  { name: "Master Data Menu", href: "/menu", icon: Utensils },
  { name: "Manajemen Meja", href: "/tables", icon: LayoutGrid },
  { name: "Karyawan & Shift", href: "/staff", icon: Users },
  { name: "Laporan & Analitik AI", href: "/analytics", icon: LineChart },
  { name: "Pengaturan Cabang", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-20 flex-col border-r border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-[width] duration-300 ease-in-out hover:w-72 group/sidebar overflow-hidden">
      
      {/* Brand Logo Area */}
      <div className="flex h-20 shrink-0 items-center px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
          <Store className="h-5 w-5 text-white" />
        </div>
        <div className="ml-4 flex flex-col opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100 whitespace-nowrap">
          <span className="font-bold text-xl tracking-tight text-slate-900 leading-none">Vooga</span>
          <span className="text-xs font-semibold text-blue-600 tracking-wider mt-1 uppercase">Manager HQ</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-4 space-y-2 no-scrollbar">
        <div className="px-2 mb-4 opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100 whitespace-nowrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Navigasi</span>
        </div>
        
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "relative flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 group/item",
                isActive
                  ? "bg-slate-900 shadow-md shadow-slate-900/10 text-white"
                  : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-300 group-hover/item:scale-110",
                  isActive ? "text-blue-400" : "text-slate-400 group-hover/item:text-blue-600"
                )}
              />
              <span className="ml-4 opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100 whitespace-nowrap flex-1">
                {link.name}
              </span>
              {/* Panah kecil di ujung kanan saat hover menu */}
              {isActive && (
                <ChevronRight className="h-4 w-4 opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100 text-slate-400" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Profile (Icon only initially) */}
      <div className="p-4 mt-auto border-t border-slate-200/60">
        <div className="flex items-center rounded-xl bg-slate-50 p-2 border border-slate-200/50 shadow-inner overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors">
          <div className="relative shrink-0">
             <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                MG
             </div>
             <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="ml-3 flex flex-col opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100 whitespace-nowrap">
            <span className="text-sm font-bold text-slate-900">Raditya Manager</span>
            <span className="text-xs text-slate-500">Cab. Sudirman</span>
          </div>
        </div>
      </div>
    </aside>
  );
}