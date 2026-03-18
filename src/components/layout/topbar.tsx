"use client";

import { useState, useEffect } from "react";
import { Search, Mic, Menu, Bell, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useTheme } from "next-themes";

export function Topbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  
  const { theme, setTheme } = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const appId = "voga-core";

  // Mencegah hydration mismatch untuk next-themes
  useEffect(() => {
    setMounted(true);
  }, []);

  // Logic untuk Auto-Hide Topbar saat di-scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Logic Mendengarkan Notifikasi (Otorisasi Kasir PENDING) secara Real-time
  useEffect(() => {
    const approvalsRef = collection(db, "artifacts", appId, "public", "data", "approvals");
    const q = query(approvalsRef, where("status", "==", "PENDING"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingApprovalsCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  // Logic Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      router.push("/login");
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  return (
    <header 
      className={`fixed top-0 right-0 left-20 z-40 flex h-20 items-center justify-between px-8 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* Latar Belakang Glassmorphism melayang */}
      <div className="absolute inset-x-4 inset-y-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] -z-10 transition-colors duration-300" />

      {/* Area Kiri: Judul Halaman / Breadcrumb */}
      <div className="flex items-center gap-4 flex-1">
        <div className="hidden md:flex flex-col">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sistem Aktif</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Voga Manager HQ</span>
        </div>
      </div>

      {/* Area Tengah: Search Bar Premium */}
      <div className="hidden md:flex flex-1 justify-center max-w-lg w-full px-4">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
          <Input
            type="search"
            placeholder="Cari menu, transaksi, atau bantuan AI..."
            className="w-full bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 pl-10 pr-10 rounded-xl border-slate-200/60 dark:border-slate-700/60 shadow-inner transition-all h-10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 dark:focus-visible:border-blue-400"
          />
          <Mic className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
        </div>
      </div>

      {/* Area Kanan: Unified Dropdown Menu */}
      <div className="flex items-center justify-end flex-1 gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shadow-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all focus-visible:ring-2 focus-visible:ring-blue-500">
              <Menu className="h-5 w-5" />
              {/* Indikator notifikasi merah otomatis menyala jika ada request PENDING */}
              {pendingApprovalsCount > 0 && (
                <span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-2 mt-2">
            
            {/* User Profile Summary */}
            <div className="flex flex-col space-y-1 p-3 mb-1 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-colors">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                {profile?.name || "Manager Vooga"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                {profile?.email || "admin@vooga.id"}
              </p>
              <div className="mt-2">
                 <span className="text-[10px] font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full uppercase">
                   {profile?.role || "OWNER"}
                 </span>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />

            {/* Menu Items */}
            <DropdownMenuItem 
              onClick={() => router.push("/")} 
              className="cursor-pointer flex items-center gap-3 p-3 rounded-xl text-slate-600 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-slate-900 dark:focus:text-white transition-colors"
            >
              <Bell className="h-4 w-4" />
              <span className="font-medium text-sm">Otorisasi Kasir</span>
              {pendingApprovalsCount > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {pendingApprovalsCount} Baru
                </span>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => mounted && setTheme(theme === "dark" ? "light" : "dark")}
              className="cursor-pointer flex items-center gap-3 p-3 rounded-xl text-slate-600 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-slate-900 dark:focus:text-white transition-colors"
            >
              {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="font-medium text-sm">
                Mode {mounted && theme === "dark" ? "Terang" : "Gelap"}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
            
            {/* Logout Button */}
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="cursor-pointer flex items-center gap-3 p-3 rounded-xl text-rose-600 dark:text-rose-500 focus:bg-rose-50 dark:focus:bg-rose-950/30 focus:text-rose-700 dark:focus:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-bold text-sm">Keluar (Logout)</span>
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}