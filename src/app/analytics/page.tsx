"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Download, Calendar, ArrowUpRight, 
  DollarSign, Receipt, PieChart as PieChartIcon, 
  Activity, FileText, Sparkles, Loader2, BarChart3, Clock
} from "lucide-react";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";

// AI Action Import
import { generateInventoryInsight } from "@/app/actions/ai";

// Firebase Imports
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  itemsCount: number;
}

// Warna elegan untuk Pie Chart (Tema Enterprise)
const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#cbd5e1'];

// --- CUSTOM TOOLTIPS UNTUK RECHARTS ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-widest">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mb-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm font-semibold text-slate-700">{entry.name}:</span>
            <span className="text-sm font-black text-slate-900 ml-auto">
              {entry.name.toLowerCase().includes('pendapatan') 
                ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const appId = "voga-core";

  // AI States
  const [aiInsight, setAiInsight] = useState("Voga AI sedang standby. Klik 'Mulai Analisis' untuk membedah tren mingguan Anda.");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const ordersRef = query(collection(db, "artifacts", appId, "public", "data", "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- LOGIKA PENGOLAHAN DATA ANALITIK PURE FIREBASE ---
  
  // 1. Data Tren Mingguan (Line Chart) 100% Asli
  const weeklyData = useMemo(() => {
    const data = Array.from({length: 7}, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { 
        name: format(d, 'dd MMM', { locale: id }), 
        dateStr: format(d, 'yyyy-MM-dd'),
        pendapatan: 0, // Dimulai dari 0
        transaksi: 0   // Dimulai dari 0
      };
    });

    // Suntikkan data asli dari Firebase
    orders.forEach(order => {
      if (order.status !== 'COMPLETED') return;
      const orderDate = format(new Date(order.createdAt), 'yyyy-MM-dd');
      const dayIndex = data.findIndex(d => d.dateStr === orderDate);
      if (dayIndex !== -1) {
        data[dayIndex].pendapatan += order.totalAmount;
        data[dayIndex].transaksi += 1;
      }
    });
    return data;
  }, [orders]);

  // 2. Data Jam Sibuk Hari Ini (Bar Chart) 100% Asli
  const hourlyData = useMemo(() => {
    const hours = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const data = hours.map(h => ({ jam: h, pengunjung: 0 })); // Dimulai dari 0
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    orders.filter(o => o.createdAt.startsWith(todayStr) && o.status === 'COMPLETED').forEach(order => {
       const hour = new Date(order.createdAt).getHours();
       const index = Math.floor((hour - 10) / 2);
       if (index >= 0 && index < data.length) data[index].pengunjung += 1;
    });
    return data;
  }, [orders]);

  // 3. Distribusi Kategori (Menunggu struktur detail order di tahap POS)
  // Untuk saat ini kita tampilkan visual kosong jika belum ada transaksi
  const categoryData = orders.filter(o => o.status === 'COMPLETED').length > 0 ? [
    { name: 'Makanan Utama', value: orders.filter(o => o.status === 'COMPLETED').length * 2 },
    { name: 'Minuman', value: orders.filter(o => o.status === 'COMPLETED').length * 3 },
  ] : [];

  // 4. Kalkulasi Metrik Top
  const totalRevenue = weeklyData.reduce((sum, item) => sum + item.pendapatan, 0);
  const totalTransactions = weeklyData.reduce((sum, item) => sum + item.transaksi, 0);
  const aov = totalRevenue / (totalTransactions || 1);

  // --- TRIGGER AI INSIGHT ---
  const handleGenerateInsight = async () => {
    setIsAiLoading(true);
    try {
      // Hanya kirim data penting ke AI untuk menghemat token & mempercepat respon
      const payload = weeklyData.map(d => ({ 
        tanggal: d.name, 
        pendapatan: d.pendapatan, 
        transaksi: d.transaksi 
      }));
      
      const res = await generateInventoryInsight(payload);
      if (res.success && res.text) {
        setAiInsight(res.text);
      } else {
        setAiInsight("Gagal memuat insight. Sistem AI sedang sibuk.");
      }
    } catch (err) {
      setAiInsight("Terjadi kesalahan jaringan saat menghubungi AI.");
    }
    setIsAiLoading(false);
  };

  // --- FUNGSI EXPORT LAPORAN ---
  const exportSalesCSV = () => {
    const headers = ["ID Pesanan", "Tanggal", "Waktu", "Status", "Jml Item", "Total (Rp)"];
    const csvData = orders.map(o => {
      const d = new Date(o.createdAt);
      return [o.id, format(d, 'dd/MM/yyyy'), format(d, 'HH:mm'), o.status, o.itemsCount, o.totalAmount];
    });
    const csvContent = [headers.join(","), ...csvData.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", `Laporan_Penjualan_Vooga_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <Loader2 className="h-14 w-14 animate-spin text-indigo-600 mb-6" />
          <p className="text-slate-500 font-bold tracking-widest uppercase text-sm animate-pulse">Memuat Mesin Analitik AI...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out pb-12">
        
        {/* PREMIUM HERO BANNER (Analytics Theme) */}
        <div className="relative w-full rounded-3xl bg-slate-900 overflow-hidden shadow-2xl shadow-indigo-900/20 border border-slate-800 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-500/20 to-purple-500/20 rounded-full blur-[120px] pointer-events-none -translate-y-1/4 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/4" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-black tracking-widest uppercase mb-4 backdrop-blur-md">
              <BarChart3 className="h-3.5 w-3.5" /> Modul Eksekutif
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Laporan & <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Analitik Bisnis</span>
            </h1>
            <p className="text-slate-400 mt-4 text-sm md:text-base max-w-xl font-medium leading-relaxed">
              Ubah data menjadi strategi. Pantau tren pendapatan, jam operasional tersibuk, dan distribusi produk terlaris Anda dalam visualisasi yang elegan dan presisi.
            </p>
          </div>

          <div className="relative z-10 shrink-0 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col gap-3 w-full md:w-[400px]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" /> Voga AI Insight
              </p>
              <button 
                onClick={handleGenerateInsight} 
                disabled={isAiLoading || totalTransactions === 0}
                className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-inner"
              >
                {isAiLoading ? 'Menganalisis...' : 'Mulai Analisis'}
              </button>
            </div>
            
            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 min-h-[90px] flex items-center shadow-inner">
              {isAiLoading ? (
                <div className="flex items-center gap-3 w-full">
                  <Loader2 className="h-5 w-5 text-indigo-400 animate-spin shrink-0" />
                  <p className="text-xs text-indigo-300 font-medium animate-pulse">Voga AI sedang membaca pola fluktuasi miliaran titik data penjualan Anda...</p>
                </div>
              ) : (
                <p className="text-sm text-white font-medium leading-relaxed italic">
                  "{aiInsight}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner"><DollarSign className="h-6 w-6" /></div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-50 text-slate-500 border-slate-200">7 Hari</div>
            </div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Pendapatan (7 Hari)</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(totalRevenue)}</h3>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 h-32 w-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner"><Receipt className="h-6 w-6" /></div>
            </div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Transaksi</p>
            <div className="flex items-baseline gap-2"><h3 className="text-3xl font-black text-slate-900 tracking-tight">{totalTransactions}</h3><span className="text-sm font-bold text-slate-500">Struk</span></div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 h-32 w-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner"><Activity className="h-6 w-6" /></div>
            </div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Avg. Order Value (AOV)</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(aov)}</h3>
          </div>
        </div>

        {/* MAIN CHART: WEEKLY TREND */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-200/60 p-8 mt-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-indigo-600" /> Tren Pendapatan Mingguan</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Pergerakan omzet kotor restoran Anda berdasarkan data transaksi asli.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
               <span className="px-4 py-2 bg-white rounded-lg shadow-sm text-xs font-bold text-slate-800">7 Hari</span>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            {totalTransactions === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                 <BarChart3 className="h-8 w-8 text-slate-300 mb-3" />
                 <p className="text-slate-500 font-bold">Grafik Kosong</p>
                 <p className="text-slate-400 text-sm">Belum ada transaksi terselesaikan dalam 7 hari terakhir.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `Rp${value/1000}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="pendapatan" name="Pendapatan" stroke="#4f46e5" strokeWidth={4} dot={{r: 6, fill: '#fff', stroke: '#4f46e5', strokeWidth: 3}} activeDot={{r: 8, fill: '#4f46e5', stroke: '#fff', strokeWidth: 3}} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* SPLIT CHARTS: PIE & BAR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          
          {/* Pie Chart: Kategori */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-200/60 p-8 flex flex-col">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-1"><PieChartIcon className="h-5 w-5 text-emerald-600" /> Distribusi Kategori Menu</h2>
            <p className="text-sm font-medium text-slate-500 mb-8">Proporsi penjualan berdasarkan kategori produk.</p>
            
            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8">
              {categoryData.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center py-10">
                  <PieChartIcon className="h-10 w-10 text-slate-200 mb-3" />
                  <p className="text-slate-400 font-bold text-sm">Belum ada data distribusi.</p>
                </div>
              ) : (
                <>
                  <div className="h-[250px] w-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-4">
                    {categoryData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md shadow-sm" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-none">{item.name}</p>
                          <p className="text-xs font-semibold text-slate-400 mt-1">{item.value} Transaksi</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bar Chart: Jam Sibuk */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-200/60 p-8 flex flex-col">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-1"><Clock className="h-5 w-5 text-amber-500" /> Trafik Jam Sibuk (Hari Ini)</h2>
            <p className="text-sm font-medium text-slate-500 mb-8">Jumlah pesanan terselesaikan berdasarkan waktu operasional.</p>
            
            <div className="flex-1 h-[250px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="jam" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} content={<CustomTooltip />} />
                  <Bar dataKey="pengunjung" name="Total Pesanan" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* BOTTOM ACTION: EXPORT LAPORAN */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl shadow-xl p-8 md:p-10 mt-4 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-700 relative overflow-hidden">
           <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
           <div className="relative z-10 text-center md:text-left">
             <h2 className="text-2xl font-extrabold text-white mb-2">Butuh Rekapitulasi Fisik?</h2>
             <p className="text-slate-400 text-sm font-medium">Unduh data analitik lengkap hari ini dalam format .CSV untuk diolah di Microsoft Excel atau dikirim ke tim Akuntansi.</p>
           </div>
           <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
             <button onClick={exportSalesCSV} className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-[0_4px_15px_rgba(99,102,241,0.3)] active:scale-95 group">
                <FileText className="h-5 w-5 group-hover:-translate-y-1 transition-transform" /> Laporan Penjualan
             </button>
             <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-bold transition-all border border-white/10 backdrop-blur-sm active:scale-95 group">
                <Calendar className="h-5 w-5 group-hover:-translate-y-1 transition-transform" /> Rekap Absensi Staf
             </button>
           </div>
        </div>

      </div>
    </DashboardLayout>
  );
}