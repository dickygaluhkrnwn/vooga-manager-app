"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  LayoutDashboard, Plus, Edit, Trash2, Map, 
  Users, CheckCircle2, XCircle, Search, 
  Loader2, Sparkles, Filter, AlertTriangle, 
  Armchair, ShieldCheck, Component, ChevronDown
} from "lucide-react";

// Firebase Imports
import { db } from "@/lib/firebase/config";
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy
} from "firebase/firestore";

// AI Import
import { generateTableInsight } from "@/app/actions/ai";

// --- INTERFACES ---
interface Table {
  id: string;
  name: string;
  capacity: number;
  zone: 'Main Dining' | 'VIP Lounge' | 'Outdoor' | 'Bar';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  createdAt: string;
}

const ZONE_COLORS = {
  'Main Dining': 'bg-blue-50 text-blue-700 border-blue-200',
  'VIP Lounge': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Outdoor': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Bar': 'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_COLORS = {
  AVAILABLE: 'bg-emerald-500 text-white shadow-emerald-500/30',
  OCCUPIED: 'bg-rose-500 text-white shadow-rose-500/30',
  RESERVED: 'bg-amber-500 text-white shadow-amber-500/30',
};

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States Vooga AI Floor Optimizer
  const [aiInsightText, setAiInsightText] = useState("Vooga AI Standby. Klik tombol analisis untuk membaca kapasitas restoran dan strategi penempatan tamu saat ini.");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Fitur Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeZone, setActiveZone] = useState<string>("all");

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    capacity: 4,
    zone: "Main Dining" as Table['zone'],
    status: "AVAILABLE" as Table['status'],
  });

  const appId = "voga-core";

  useEffect(() => {
    const tablesQuery = query(collection(db, "artifacts", appId, "public", "data", "tables"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(tablesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
      setTables(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openFormModal = (table?: Table) => {
    if (table) {
      setIsEditMode(true);
      setCurrentEditId(table.id);
      setFormData({
        name: table.name,
        capacity: table.capacity,
        zone: table.zone,
        status: table.status,
      });
    } else {
      setIsEditMode(false);
      setCurrentEditId(null);
      setFormData({ name: "", capacity: 4, zone: "Main Dining", status: "AVAILABLE" });
    }
    setIsFormModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.capacity < 1) return;

    try {
      if (isEditMode && currentEditId) {
        await updateDoc(doc(db, "artifacts", appId, "public", "data", "tables", currentEditId), formData);
      } else {
        await addDoc(collection(db, "artifacts", appId, "public", "data", "tables"), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setIsFormModalOpen(false);
    } catch (err) {
      console.error("Gagal menyimpan meja:", err);
    }
  };

  const updateTableStatus = async (id: string, newStatus: Table['status']) => {
    try {
      await updateDoc(doc(db, "artifacts", appId, "public", "data", "tables", id), { status: newStatus });
    } catch (err) {
      console.error("Gagal update status meja:", err);
    }
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", "tables", tableToDelete.id));
      setIsDeleteModalOpen(false);
      setTableToDelete(null);
    } catch (err) {
      console.error("Gagal menghapus meja:", err);
    }
  };

  // --- FILTERING ---
  const processedTables = useMemo(() => {
    return tables.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesZone = activeZone === "all" || t.zone === activeZone;
      return matchesSearch && matchesZone;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [tables, searchQuery, activeZone]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalTables = tables.length;
    const occupiedTables = tables.filter(t => t.status !== 'AVAILABLE').length;
    const availableTables = totalTables - occupiedTables;
    
    const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
    const availableSeats = tables.filter(t => t.status === 'AVAILABLE').reduce((sum, t) => sum + t.capacity, 0);
    const occupiedPercent = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;

    return { totalTables, occupiedTables, availableTables, totalCapacity, availableSeats, occupiedPercent };
  }, [tables]);

  // --- TRIGGER AI FLOOR OPTIMIZER ---
  const handleGenerateInsight = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateTableInsight(stats);
      if (result.success && result.text) {
        setAiInsightText(result.text.replace(/Voga/g, 'Vooga')); // Memastikan output dari AI juga menyebut Vooga
      } else {
        setAiInsightText("Gagal memuat analisis Floor Plan.");
      }
    } catch (error) {
      setAiInsightText("Terjadi kesalahan jaringan AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-6" />
          <p className="text-slate-500 font-bold tracking-widest uppercase text-sm animate-pulse">Menyiapkan Floor Plan...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out pb-12">
        
        {/* EXECUTIVE HERO BANNER */}
        <div className="relative w-full rounded-3xl bg-slate-950 overflow-hidden shadow-2xl shadow-indigo-900/20 border border-slate-800 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 mb-2">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/3" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black tracking-widest uppercase mb-4">
              <Map className="h-3.5 w-3.5" /> Modul Operasional
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Manajemen Layout & <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">Area Makan</span>
            </h1>
            <p className="text-slate-400 mt-4 text-sm md:text-base max-w-xl font-medium leading-relaxed">
              Atur kapasitas kursi, zona duduk (*VIP, Outdoor, Bar*), dan pantau ketersediaan meja secara *real-time* untuk memaksimalkan *turnover* tamu restoran Anda.
            </p>
          </div>

          <div className="relative z-10 shrink-0 w-full md:w-auto flex flex-col gap-3">
            <button 
              onClick={() => openFormModal()}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-indigo-50 px-8 py-4 rounded-2xl font-bold transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] active:scale-95 group"
            >
              <Plus className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform duration-300" /> Tambah Meja Baru
            </button>
          </div>
        </div>

        {/* TOP WIDGETS & AI AI OPTIMIZER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* KPI Cards (Col 1-8) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300">
              <div className="h-10 w-10 mb-3 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center"><LayoutDashboard className="h-5 w-5" /></div>
              <h3 className="text-3xl font-black text-slate-900">{stats.totalTables}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Meja</p>
            </div>
            
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300">
              <div className="h-10 w-10 mb-3 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><Users className="h-5 w-5" /></div>
              <h3 className="text-3xl font-black text-rose-600">{stats.occupiedTables}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Meja Terisi</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300">
              <div className="h-10 w-10 mb-3 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
              <h3 className="text-3xl font-black text-emerald-600">{stats.availableTables}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Meja Kosong</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-indigo-50 rounded-full blur-xl" />
              <div className="h-10 w-10 mb-3 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center relative z-10"><Armchair className="h-5 w-5" /></div>
              <h3 className="text-3xl font-black text-indigo-900 relative z-10">{stats.availableSeats}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 relative z-10">Kursi Tersedia</p>
            </div>
          </div>

          {/* AI Optimizer Box (Col 9-12) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-6 shadow-inner relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl bg-indigo-500/10 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
               <h4 className="text-sm font-extrabold text-indigo-900 flex items-center gap-2">
                 <Sparkles className="h-4 w-4 text-indigo-600" /> Vooga AI Floor Insight
               </h4>
               <button 
                  onClick={handleGenerateInsight}
                  disabled={isAiLoading || stats.totalTables === 0}
                  className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 hover:border-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 active:scale-95"
               >
                  {isAiLoading ? "Menganalisis..." : "Tanya AI"}
               </button>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white flex-1 flex items-center shadow-sm relative z-10">
               {isAiLoading ? (
                 <div className="flex items-center gap-3">
                   <Loader2 className="h-5 w-5 text-indigo-500 animate-spin shrink-0" />
                   <span className="text-sm font-semibold text-indigo-600 animate-pulse">Menghitung densitas lantai dan rasio okupansi...</span>
                 </div>
               ) : (
                 <p className="text-sm text-indigo-950/80 font-medium leading-relaxed italic">
                   "{aiInsightText}"
                 </p>
               )}
            </div>
            
            {/* Occupancy Progress Bar */}
            <div className="mt-4 relative z-10">
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">
                 <span>Okupansi Restoran</span>
                 <span>{stats.occupiedPercent.toFixed(0)}%</span>
               </div>
               <div className="w-full h-2 bg-indigo-200/50 rounded-full overflow-hidden">
                 <div className={`h-full transition-all duration-1000 rounded-full ${stats.occupiedPercent > 80 ? 'bg-rose-500' : stats.occupiedPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${stats.occupiedPercent}%` }} />
               </div>
            </div>
          </div>
        </div>

        {/* TOOLBAR FILTER */}
        <div className="bg-white rounded-2xl shadow-[0_4px_25px_rgb(0,0,0,0.02)] border border-slate-200/60 p-2.5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            
            {/* Zone Tabs */}
            <div className="flex w-full sm:w-auto overflow-x-auto no-scrollbar gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
              {['all', 'Main Dining', 'VIP Lounge', 'Outdoor', 'Bar'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveZone(tab)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-extrabold capitalize transition-all whitespace-nowrap ${
                    activeZone === tab 
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60' 
                    : 'text-slate-500 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {tab === 'all' ? 'Semua Area' : tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder="Cari No. Meja..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900"
              />
            </div>

          </div>
        </div>

        {/* FLOOR PLAN GRID */}
        <div className="bg-slate-50/50 rounded-3xl p-6 md:p-8 min-h-[400px] border border-slate-200/60 shadow-inner">
          {processedTables.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-60">
               <Component className="h-16 w-16 text-slate-400 mb-4" />
               <h3 className="text-xl font-black text-slate-700">Area Makan Kosong</h3>
               <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm">Belum ada meja yang didaftarkan di area ini. Klik tombol "Tambah Meja" untuk mulai mendesain Floor Plan.</p>
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {processedTables.map(table => {
                const zoneStyle = ZONE_COLORS[table.zone];
                const statusStyle = STATUS_COLORS[table.status];
                
                return (
                  <div key={table.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 relative group flex flex-col items-center text-center">
                     
                     {/* Action Buttons (Edit / Delete) - Hover Show */}
                     <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openFormModal(table)} className="p-1.5 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-md border border-slate-100 hover:border-indigo-200 transition-colors"><Edit className="h-3 w-3" /></button>
                        <button onClick={() => { setTableToDelete(table); setIsDeleteModalOpen(true); }} className="p-1.5 bg-slate-50 text-slate-500 hover:text-rose-600 rounded-md border border-slate-100 hover:border-rose-200 transition-colors"><Trash2 className="h-3 w-3" /></button>
                     </div>

                     {/* Visual Table Top */}
                     <div className="relative mt-2 mb-4">
                        {/* Table Graphic */}
                        <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-lg transition-colors duration-500 ${statusStyle}`}>
                          <span className="font-black text-2xl tracking-tighter">{table.name}</span>
                        </div>
                        {/* Chairs Graphic (Dots around) */}
                        <div className="absolute -inset-3 border border-slate-100 rounded-full -z-10 bg-slate-50 flex items-center justify-center">
                           <span className="absolute top-1 text-[10px] font-black text-slate-400 bg-white px-1 rounded-full"><Users className="h-3 w-3 inline mr-0.5" />{table.capacity}</span>
                        </div>
                     </div>

                     <div className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border mt-2 ${zoneStyle}`}>
                        {table.zone}
                     </div>

                     {/* Status Switcher */}
                     <div className="w-full mt-5 pt-4 border-t border-slate-100 flex gap-1 bg-slate-50/50 rounded-xl p-1">
                        <button 
                          onClick={() => updateTableStatus(table.id, 'AVAILABLE')}
                          className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all ${table.status === 'AVAILABLE' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-200'}`}
                        >
                          Kosong
                        </button>
                        <button 
                          onClick={() => updateTableStatus(table.id, 'OCCUPIED')}
                          className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all ${table.status === 'OCCUPIED' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-200'}`}
                        >
                          Terisi
                        </button>
                     </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* --- MODAL FORM MEJA --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-[0.98] duration-300 border border-white/20">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{isEditMode ? 'Edit Pengaturan Meja' : 'Registrasi Meja Baru'}</h3>
            </div>
            
            <form onSubmit={handleSaveTable} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-slate-700">Nomor / Nama Meja *</label>
                <input required autoFocus type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="Contoh: T-01, VIP-A" className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 font-black tracking-widest focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-extrabold text-slate-700">Kapasitas Kursi *</label>
                  <input required type="number" min="1" max="20" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: Number(e.target.value)})} className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-extrabold text-slate-700">Penempatan Area</label>
                  <div className="relative">
                    <select value={formData.zone} onChange={(e) => setFormData({...formData, zone: e.target.value as Table['zone']})} className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm">
                      <option value="Main Dining">Main Dining</option>
                      <option value="VIP Lounge">VIP Lounge</option>
                      <option value="Outdoor">Outdoor / Patio</option>
                      <option value="Bar">Bar Seating</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] active:scale-95">Simpan Meja</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Meja */}
      {isDeleteModalOpen && tableToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-10 text-center border border-white/20">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-rose-100"><AlertTriangle className="h-10 w-10 text-rose-500" /></div>
            <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Hapus Meja {tableToDelete.name}?</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">Meja ini akan dihapus dari layout ruangan secara permanen. Pastikan tidak ada transaksi aktif di meja ini.</p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={confirmDeleteTable} className="px-6 py-4 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95 w-full">Ya, Bongkar Meja</button>
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-4 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors w-full">Batal</button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}