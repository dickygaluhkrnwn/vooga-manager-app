"use client";

import { useState, useEffect } from "react";
import { Search, Mic, Menu, Bell, Moon, LogOut } from "lucide-react";
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

export function Topbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const appId = "voga-core";

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
      <div className="absolute inset-x-4 inset-y-2 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] -z-10" />

      {/* Area Kiri: Judul Halaman / Breadcrumb */}
      <div className="flex items-center gap-4 flex-1">
        <div className="hidden md:flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Sistem Aktif</span>
          <span className="text-lg font-bold text-slate-900 leading-tight">Voga Manager HQ</span>
        </div>
      </div>

      {/* Area Tengah: Search Bar Premium */}
      <div className="hidden md:flex flex-1 justify-center max-w-lg w-full px-4">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <Input
            type="search"
            placeholder="Cari menu, transaksi, atau bantuan AI..."
            className="w-full bg-slate-100/50 hover:bg-slate-100 focus:bg-white pl-10 pr-10 rounded-xl border-slate-200/60 shadow-inner transition-all h-10 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
          />
          <Mic className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-blue-600 transition-colors" />
        </div>
      </div>

      {/* Area Kanan: Unified Dropdown Menu */}
      <div className="flex items-center justify-end flex-1 gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full bg-white hover:bg-slate-50 border border-slate-200/50 shadow-sm text-slate-600 hover:text-blue-600 transition-all focus-visible:ring-2 focus-visible:ring-blue-500">
              <Menu className="h-5 w-5" />
              {/* Indikator notifikasi merah otomatis menyala jika ada request PENDING */}
              {pendingApprovalsCount > 0 && (
                <span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-xl border-slate-200 shadow-xl rounded-2xl p-2 mt-2">
            
            {/* User Profile Summary */}
            <div className="flex flex-col space-y-1 p-3 mb-1 bg-slate-50/50 rounded-xl border border-slate-100">
              <p className="text-sm font-bold text-slate-900 leading-none">
                {profile?.name || "Manager Vooga"}
              </p>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {profile?.email || "admin@vooga.id"}
              </p>
              <div className="mt-2">
                 <span className="text-[10px] font-bold tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase">
                   {profile?.role || "OWNER"}
                 </span>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-slate-100 my-1" />

            {/* Menu Items */}
            <DropdownMenuItem 
              onClick={() => router.push("/")} 
              className="cursor-pointer flex items-center gap-3 p-3 rounded-xl text-slate-600 focus:bg-slate-100 focus:text-slate-900 transition-colors"
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
              onClick={() => alert("Fitur Mode Gelap akan segera hadir di update mendatang!")}
              className="cursor-pointer flex items-center gap-3 p-3 rounded-xl text-slate-400 focus:bg-slate-50 transition-colors"
            >
              <Moon className="h-4 w-4" />
              <span className="font-medium text-sm">
                Mode Gelap (Coming Soon)
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-slate-100 my-1" />
            
            {/* Logout Button */}
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="cursor-pointer flex items-center gap-3 p-3 rounded-xl text-rose-600 focus:bg-rose-50 focus:text-rose-700 transition-colors"
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