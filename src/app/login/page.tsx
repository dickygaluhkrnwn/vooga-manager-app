"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { Store, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Proses Autentikasi ke Firebase
      await signInWithEmailAndPassword(auth, email, password);
      
      // Catatan: Kita tidak perlu lagi menyetel global state secara manual di sini.
      // AuthProvider (onAuthStateChanged) akan otomatis mendeteksinya, menarik 
      // data role dari Firestore, dan menyimpannya ke Zustand secara otomatis.

      // 2. Set Cookie Sesi untuk dibaca oleh Middleware (Masa aktif 1 Hari)
      document.cookie = "vooga-session=true; path=/; max-age=86400; SameSite=Strict";

      // 3. Arahkan ke halaman utama (Dashboard)
      router.push("/");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Email atau password yang Anda masukkan salah.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Terlalu banyak percobaan. Silakan coba lagi nanti.");
      } else {
        setError("Terjadi kesalahan sistem. Silakan hubungi support.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ornaments (SaaS Vibe) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-slate-100 p-8 relative z-10">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/30 mb-6">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Vooga Manager</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Masuk ke pusat kendali cabang Anda</p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700 font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 ml-1">Email Karyawan</label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@vooga.id"
                className="w-full bg-slate-100/50 hover:bg-slate-100 focus:bg-white pl-11 pr-4 py-3 rounded-xl border-slate-200/60 shadow-inner transition-all text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Lupa Password?</a>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-100/50 hover:bg-slate-100 focus:bg-white pl-11 pr-4 py-3 rounded-xl border-slate-200/60 shadow-inner transition-all text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 mt-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk ke Dashboard</span>
            )}
          </button>
        </form>

      </div>
      
      {/* Footer text */}
      <p className="absolute bottom-6 text-xs font-medium text-slate-400">
        &copy; {new Date().getFullYear()} Vooga by IKY Tech. All rights reserved.
      </p>
    </div>
  );
}