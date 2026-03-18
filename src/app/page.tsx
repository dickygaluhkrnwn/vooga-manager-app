"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  DollarSign, TrendingUp, Users, Activity, 
  ArrowUpRight, ArrowDownRight, 
  Receipt, ChefHat, BellRing, Sparkles, 
  UtensilsCrossed, CheckCircle2, Loader2,
  CalendarDays, Check, X, UserCheck
} from "lucide-react";

// Firebase Imports
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";

// --- INTERFACES ---
interface Order {
  id: string;
  tableNumber: string;
  totalAmount: number;
  status: 'DRAFT' | 'SENT_TO_KITCHEN' | 'SERVED' | 'COMPLETED' | 'VOID';
  createdAt: string;
  customerName?: string;
  itemsCount: number;
}

interface ApprovalRequest {
  id: string;
  type: 'VOID_ORDER' | 'CUSTOM_DISCOUNT';
  orderId: string;
  tableName: string;
  requestedBy: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

export default function DashboardHome() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [staffOnDuty, setStaffOnDuty] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const appId = "voga-core";

  // 1. Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Live Data (Orders, Approvals, Staff)
  useEffect(() => {
    const ordersRef = collection(db, "artifacts", appId, "public", "data", "orders");
    const approvalsRef = collection(db, "artifacts", appId, "public", "data", "approvals");
    const staffRef = collection(db, "artifacts", appId, "public", "data", "staff");
    
    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setIsLoading(false);
    });

    const unsubApprovals = onSnapshot(approvalsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApprovalRequest));
      // Urutkan yang terbaru di atas
      setApprovals(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    const unsubStaff = onSnapshot(staffRef, (snapshot) => {
      // Sementara kita anggap semua staff yang isActive adalah sedang On-Duty
      // Nanti di modul absensi (aplikasi POS/Waiter) kita filter berdasarkan status Clock-In yang sebenarnya
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaffOnDuty(data.filter(s => s.isActive));
    });

    return () => { unsubOrders(); unsubApprovals(); unsubStaff(); };
  }, []);

  // 3. Kalkulasi Metrik Hari Ini (Real-time di memori)
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt || 0);
      return orderDate >= today && order.status !== 'VOID';
    });

    const grossSales = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const orderCount = todayOrders.length;
    const aov = orderCount > 0 ? grossSales / orderCount : 0;
    const activeOrders = todayOrders.filter(o => o.status === 'SENT_TO_KITCHEN' || o.status === 'SERVED').length;

    const mockYesterdaySales = grossSales * 0.85; 
    const trendPercent = mockYesterdaySales > 0 ? ((grossSales - mockYesterdaySales) / mockYesterdaySales) * 100 : 0;

    return { todayOrders, grossSales, orderCount, aov, activeOrders, trendPercent };
  }, [orders]);

  // 4. Handle Otorisasi (Approve / Reject)
  const handleProcessApproval = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      // Update dokumen Approval
      await updateDoc(doc(db, "artifacts", appId, "public", "data", "approvals", id), {
        status: newStatus,
        processedAt: new Date().toISOString()
      });

      // Jika disetujui dan tipenya VOID_ORDER, otomatis Void pesanannya (Simulasi End-to-End)
      const targetApproval = approvals.find(a => a.id === id);
      if (newStatus === 'APPROVED' && targetApproval?.type === 'VOID_ORDER' && targetApproval.orderId) {
         await updateDoc(doc(db, "artifacts", appId, "public", "data", "orders", targetApproval.orderId), {
            status: 'VOID'
         }).catch(() => console.warn("Dokumen order tidak ditemukan, mungkin dummy."));
      }

    } catch (err) {
      console.error("Gagal memproses otorisasi:", err);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-amber-500/20 animate-pulse" />
            <Loader2 className="h-14 w-14 animate-spin text-amber-500 relative z-10" />
          </div>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-sm mt-6 animate-pulse">Menghubungkan ke Operasional...</p>
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out pb-12">
        
        {/* EXECUTIVE HERO BANNER (5-Star Restaurant Theme) */}
        <div className="relative w-full rounded-3xl bg-slate-950 overflow-hidden shadow-2xl shadow-slate-900/20 border border-slate-800 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/4" />
          
          <div className="relative z-10 flex flex-col items-start w-full md:w-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-amber-400 text-[11px] font-black tracking-[0.2em] uppercase mb-6 backdrop-blur-md shadow-inner">
              <Sparkles className="h-3.5 w-3.5" /> Executive Command Center
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Live Sales & <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-600">
                Operations
              </span>
            </h1>
            <p className="text-slate-400 mt-5 text-sm md:text-base max-w-xl font-medium leading-relaxed">
              Pantau denyut nadi restoran Anda. Seluruh transaksi kasir, antrean dapur, dan otorisasi manajerial tersinkronisasi secara real-time di layar ini.
            </p>
          </div>

          <div className="relative z-10 shrink-0 w-full md:w-auto bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Sistem Online & Tersinkronisasi</span>
            </div>
            <div className="text-5xl font-black text-white tracking-tighter tabular-nums">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-slate-400 text-sm font-medium mt-2 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* PREMIUM METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-2">
          {/* Card 1: Gross Sales */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 h-32 w-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner"><DollarSign className="h-6 w-6" /></div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${todayStats.trendPercent >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                {todayStats.trendPercent >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(todayStats.trendPercent).toFixed(1)}%
              </div>
            </div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Omzet Kotor Hari Ini</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(todayStats.grossSales)}</h3>
          </div>

          {/* Card 2: Total Orders */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 h-32 w-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner"><Receipt className="h-6 w-6" /></div>
            </div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Struk / Pesanan</p>
            <div className="flex items-baseline gap-2"><h3 className="text-3xl font-black text-slate-900 tracking-tight">{todayStats.orderCount}</h3><span className="text-sm font-bold text-slate-500">Transaksi</span></div>
          </div>

          {/* Card 3: Average Order Value (AOV) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 h-32 w-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-inner"><TrendingUp className="h-6 w-6" /></div>
            </div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Rata-rata Belanja (AOV)</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(todayStats.aov)}</h3>
          </div>

          {/* Card 4: Active Kitchen Queue */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-6 -top-6 h-32 w-32 bg-rose-500/20 rounded-full blur-2xl group-hover:bg-rose-500/30 transition-colors" />
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center text-rose-400 border border-slate-700 shadow-inner relative">
                <ChefHat className="h-6 w-6" />
                {todayStats.activeOrders > 0 && (
                   <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-slate-900"></span>
                   </span>
                )}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">Dapur Aktif</div>
            </div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Pesanan Diproses</p>
            <div className="flex items-baseline gap-2"><h3 className="text-3xl font-black text-white tracking-tight">{todayStats.activeOrders}</h3><span className="text-sm font-bold text-slate-500">Tiket Antre</span></div>
          </div>
        </div>

        {/* WORKSPACE: LIVE FEED & APPROVAL PREVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          
          {/* Main Area: Live Order Feed */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-200/60 p-8 flex flex-col h-[550px]">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" /> Live Transaction Feed
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Aliran pesanan masuk secara real-time dari Kasir & Waiter.</p>
              </div>
              <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-indigo-100 shadow-sm">
                <div className="h-2.5 w-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" /> Live Sync
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-3 space-y-4 custom-scrollbar">
              {todayStats.todayOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
                    <Receipt className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-700">Belum ada transaksi hari ini</h3>
                  <p className="text-sm text-slate-500 max-w-sm mt-1 font-medium">Pesanan yang diinput kasir akan otomatis muncul di sini.</p>
                </div>
              ) : (
                todayStats.todayOrders.slice().reverse().map((order, idx) => (
                  <div key={order.id || idx} className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-[0_4px_15px_rgba(79,70,229,0.05)] transition-all group bg-white">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 shadow-inner text-lg">
                        {order.tableNumber || "TK"}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-lg">Pesanan #{order.id?.slice(-5).toUpperCase() || "NEW"}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-bold text-slate-500">{order.itemsCount || 0} Item Menu</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-indigo-600 text-xl">{formatCurrency(order.totalAmount)}</p>
                      <div className="mt-1.5">
                        {order.status === 'COMPLETED' && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-wider shadow-sm">Selesai Bayar</span>}
                        {order.status === 'SENT_TO_KITCHEN' && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 uppercase tracking-wider shadow-sm">Diproses Dapur</span>}
                        {order.status === 'SERVED' && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 uppercase tracking-wider shadow-sm">Telah Disajikan</span>}
                        {order.status === 'DRAFT' && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-wider shadow-sm">Draft Waiter</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Area: Action Required */}
          <div className="flex flex-col gap-6 h-[550px]">
            
            {/* Panel Otorisasi Cepat (Tahap 4.2) */}
            <div className={`rounded-3xl shadow-[0_8px_20px_rgba(0,0,0,0.03)] border p-6 flex flex-col h-3/5 transition-all duration-500 relative overflow-hidden ${pendingApprovals.length > 0 ? 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-200' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'}`}>
              
              {/* Background Glow */}
              <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-colors duration-1000 ${pendingApprovals.length > 0 ? 'bg-rose-500/20' : 'bg-amber-500/20'}`} />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className={`font-extrabold flex items-center gap-2 ${pendingApprovals.length > 0 ? 'text-rose-900' : 'text-amber-900'}`}>
                  <BellRing className={`h-5 w-5 ${pendingApprovals.length > 0 ? 'text-rose-600 animate-bounce' : 'text-amber-600'}`} /> 
                  Otorisasi Kasir
                </h3>
                <span className={`${pendingApprovals.length > 0 ? 'bg-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.4)]' : 'bg-amber-500'} text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-widest`}>
                  {pendingApprovals.length} PENDING
                </span>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 opacity-80">
                   <div className="h-16 w-16 bg-white/50 rounded-full flex items-center justify-center mb-3 shadow-inner">
                     <CheckCircle2 className="h-8 w-8 text-amber-500" />
                   </div>
                   <p className="text-sm font-extrabold text-amber-900">Semua Terkendali</p>
                   <p className="text-xs font-semibold text-amber-700/80 mt-1 max-w-[200px] leading-relaxed">Tidak ada permintaan Void atau Diskon khusus dari meja Kasir saat ini.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 mt-1 pr-2 custom-scrollbar relative z-10">
                  {pendingApprovals.map(app => (
                     <div key={app.id} className="bg-white rounded-2xl p-4 border border-rose-100 shadow-[0_4px_15px_rgba(225,29,72,0.05)] hover:border-rose-300 transition-colors">
                        <div className="flex justify-between items-start mb-2.5">
                           <div>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-rose-100 text-rose-700">{app.type.replace('_', ' ')}</span>
                              <h4 className="text-sm font-extrabold text-slate-900 mt-1.5 leading-none">{app.tableName}</h4>
                           </div>
                           <span className="font-black text-rose-600 text-sm">Rp {app.amount.toLocaleString('id-ID')}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{app.reason}" <br/>
                          <span className="font-bold text-indigo-600 mt-1 block flex items-center gap-1">
                            <UserCheck className="h-3 w-3" /> Req: {app.requestedBy}
                          </span>
                        </p>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                           <button onClick={() => handleProcessApproval(app.id, 'APPROVED')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-2.5 rounded-xl transition-all shadow-sm flex justify-center items-center gap-1 active:scale-95"><Check className="h-3.5 w-3.5" /> Izinkan</button>
                           <button onClick={() => handleProcessApproval(app.id, 'REJECTED')} className="flex-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-black py-2.5 rounded-xl transition-all border border-slate-200 hover:border-rose-200 flex justify-center items-center gap-1 active:scale-95"><X className="h-3.5 w-3.5" /> Tolak</button>
                        </div>
                     </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shift Tracker (Tahap 4.3) */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-200/60 p-6 flex flex-col h-2/5">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" /> Staf On-Duty <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-md ml-1">{staffOnDuty.length} Aktif</span>
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                 {staffOnDuty.length === 0 ? (
                   <div className="flex flex-col items-center justify-center text-center opacity-60 h-full">
                     <UtensilsCrossed className="h-8 w-8 text-slate-300 mb-2" />
                     <p className="text-xs font-bold text-slate-500">Belum ada shift berjalan</p>
                   </div>
                 ) : (
                   staffOnDuty.map(staff => (
                     <div key={staff.id} className="flex items-center gap-3 group cursor-default">
                       <div className="relative">
                         <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden">
                           <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${staff.name}&backgroundColor=0ea5e9`} alt={staff.name} />
                         </div>
                         <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                       </div>
                       <div>
                         <p className="text-sm font-extrabold text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">{staff.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{staff.role}</p>
                       </div>
                     </div>
                   ))
                 )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}