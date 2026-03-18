"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  Users, UserPlus, KeyRound, ShieldCheck, 
  ChefHat, Coffee, Calculator, Trash2, 
  RefreshCw, Loader2, AlertTriangle, CheckCircle2, XCircle,
  Search, Download, Phone, Mail, Calendar, Edit, Briefcase, ChevronDown,
  LayoutGrid, List as ListIcon, Filter, ArrowUpDown, MoreHorizontal,
  Settings2, FileText, Activity, TrendingUp, Sparkles, Building2, UserCog
} from "lucide-react";

// Firebase Imports
import { db } from "@/lib/firebase/config";
import { 
  collection, addDoc, deleteDoc, doc, onSnapshot, 
  query, orderBy, updateDoc
} from "firebase/firestore";

// AI Action Import
import { generateHRInsight } from "@/app/actions/ai";

interface Staff {
  id: string;
  employeeId: string;
  name: string;
  gender: 'Laki-laki' | 'Perempuan';
  email: string;
  phone: string;
  role: 'kasir' | 'waiter' | 'koki' | 'manager';
  employmentStatus: 'Tetap' | 'Kontrak' | 'Harian';
  pin: string;
  isActive: boolean;
  joinDate: string;
  createdAt: string;
}

const ROLE_CONFIG = {
  kasir: { icon: Calculator, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-200", label: "Kasir (POS)", gradient: "from-emerald-500/20 to-transparent" },
  waiter: { icon: Coffee, color: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-200", label: "Waiter (Floor)", gradient: "from-blue-500/20 to-transparent" },
  koki: { icon: ChefHat, color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-200", label: "Koki (Kitchen)", gradient: "from-orange-500/20 to-transparent" },
  manager: { icon: ShieldCheck, color: "text-indigo-600", bg: "bg-indigo-500/10", border: "border-indigo-200", label: "Supervisor", gradient: "from-indigo-500/20 to-transparent" },
};

const STATUS_CONFIG = {
  Tetap: "bg-blue-100 text-blue-700 border-blue-200",
  Kontrak: "bg-amber-100 text-amber-700 border-amber-200",
  Harian: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0); // State untuk Antrean Dapur
  const [isLoading, setIsLoading] = useState(true);
  
  // States Voga AI HR Assistant
  const [hrInsightText, setHrInsightText] = useState("Sistem Voga AI standby. Klik tombol analisis untuk memantau rasio beban kerja staf terhadap antrean pesanan saat ini.");
  const [isHrAiLoading, setIsHrAiLoading] = useState(false);

  // Fitur Filter, Search, Sort & View Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("terbaru");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    gender: "Laki-laki" as Staff['gender'],
    email: "",
    phone: "",
    role: "waiter" as Staff['role'],
    employmentStatus: "Tetap" as Staff['employmentStatus'],
    pin: "",
    joinDate: new Date().toISOString().split('T')[0],
  });

  const appId = "voga-core";

  useEffect(() => {
    // 1. Listen to Staff Data
    const staffQuery = query(collection(db, "artifacts", appId, "public", "data", "staff"), orderBy("createdAt", "desc"));
    const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaffList(data);
      setIsLoading(false);
    });

    // 2. Listen to Active Orders (For AI Insight context)
    const ordersRef = collection(db, "artifacts", appId, "public", "data", "orders");
    const unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
      const active = snapshot.docs.filter(doc => {
        const data = doc.data();
        // Hanya hitung pesanan yang sedang menumpuk di dapur
        return data.status === 'SENT_TO_KITCHEN' || data.status === 'SERVED';
      }).length;
      setActiveOrdersCount(active);
    });

    return () => { unsubscribeStaff(); unsubscribeOrders(); };
  }, []);

  const generateAutoData = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const year = new Date().getFullYear().toString().slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const randomId = Math.floor(100 + Math.random() * 900).toString();
    const generatedId = `VG-${year}${month}-${randomId}`;

    setFormData(prev => ({ ...prev, pin: randomPin, employeeId: prev.employeeId || generatedId }));
  };

  const openFormModal = (staff?: Staff) => {
    if (staff) {
      setIsEditMode(true);
      setCurrentEditId(staff.id);
      setFormData({
        employeeId: staff.employeeId || "",
        name: staff.name,
        gender: staff.gender || "Laki-laki",
        email: staff.email || "",
        phone: staff.phone || "",
        role: staff.role,
        employmentStatus: staff.employmentStatus || "Tetap",
        pin: staff.pin,
        joinDate: staff.joinDate || new Date().toISOString().split('T')[0],
      });
    } else {
      setIsEditMode(false);
      setCurrentEditId(null);
      setFormData({
        employeeId: "", name: "", gender: "Laki-laki", email: "", phone: "", role: "waiter", employmentStatus: "Tetap", pin: "", joinDate: new Date().toISOString().split('T')[0]
      });
      generateAutoData();
    }
    setIsFormModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.pin) return;

    try {
      const staffData = {
        employeeId: formData.employeeId,
        name: formData.name.trim(),
        gender: formData.gender,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        employmentStatus: formData.employmentStatus,
        pin: formData.pin,
        joinDate: formData.joinDate,
      };

      if (isEditMode && currentEditId) {
        await updateDoc(doc(db, "artifacts", appId, "public", "data", "staff", currentEditId), staffData);
      } else {
        await addDoc(collection(db, "artifacts", appId, "public", "data", "staff"), {
          ...staffData,
          isActive: true,
          createdAt: new Date().toISOString()
        });
      }
      setIsFormModalOpen(false);
    } catch (err) {
      console.error("Gagal menyimpan karyawan:", err);
    }
  };

  const toggleStaffStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "artifacts", appId, "public", "data", "staff", id), { isActive: !currentStatus });
    } catch (err) {
      console.error("Gagal update status:", err);
    }
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", "staff", staffToDelete.id));
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
    } catch (err) {
      console.error("Gagal menghapus karyawan:", err);
    }
  };

  const exportToCSV = () => {
    const headers = ["ID Karyawan", "Nama Lengkap", "Jenis Kelamin", "Role Sistem", "Status Karyawan", "No. HP", "Email", "Tgl Gabung", "Status Aktif"];
    const csvData = staffList.map(s => [
      s.employeeId || "-", s.name, s.gender || "-", s.role.toUpperCase(), s.employmentStatus || "-", 
      s.phone || "-", s.email || "-", s.joinDate || "-", s.isActive ? "Aktif" : "Nonaktif"
    ]);
    
    const csvContent = [headers.join(","), ...csvData.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Data_Karyawan_Vooga_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processedStaff = useMemo(() => {
    let result = staffList.filter(staff => {
      const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (staff.employeeId && staff.employeeId.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTab = activeTab === "all" || staff.role === activeTab;
      const matchesStatus = filterStatus === "all" ? true : filterStatus === "active" ? staff.isActive : !staff.isActive;
      
      return matchesSearch && matchesTab && matchesStatus;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      
      if (sortBy === "terbaru") return dateB - dateA;
      if (sortBy === "terlama") return dateA - dateB;
      if (sortBy === "a-z") return a.name.localeCompare(b.name);
      if (sortBy === "z-a") return b.name.localeCompare(a.name);
      return 0;
    });

    return result;
  }, [staffList, searchQuery, activeTab, filterStatus, sortBy]);

  // Hitung statistik untuk Dashboard Dinamis
  const stats = useMemo(() => {
    const total = staffList.length || 1; // hindari pembagian 0
    const active = staffList.filter(s => s.isActive).length;
    const inactive = staffList.length - active;
    
    const floor = staffList.filter(s => s.isActive && (s.role === 'waiter' || s.role === 'kasir')).length;
    const kitchen = staffList.filter(s => s.isActive && s.role === 'koki').length;
    const manager = staffList.filter(s => s.isActive && s.role === 'manager').length;

    const tetap = staffList.filter(s => s.employmentStatus === 'Tetap').length;
    const kontrak = staffList.filter(s => s.employmentStatus === 'Kontrak').length;
    const harian = staffList.filter(s => s.employmentStatus === 'Harian').length;

    const male = staffList.filter(s => s.gender === 'Laki-laki').length;
    const female = staffList.filter(s => s.gender === 'Perempuan').length;

    const currentMonth = new Date().getMonth();
    const newHires = staffList.filter(s => s.joinDate && new Date(s.joinDate).getMonth() === currentMonth).length;

    return { total, active, inactive, floor, kitchen, manager, tetap, kontrak, harian, male, female, newHires };
  }, [staffList]);

  // --- TRIGGER AI HR INSIGHT ---
  const handleGenerateHRInsight = async () => {
    setIsHrAiLoading(true);
    try {
      const staffStats = { floor: stats.floor, kitchen: stats.kitchen };
      const result = await generateHRInsight(staffStats, activeOrdersCount);
      
      if (result.success && result.text) {
        setHrInsightText(result.text);
      } else {
        setHrInsightText("Gagal memuat analisis. Coba lagi dalam beberapa saat.");
      }
    } catch (error) {
      console.error(error);
      setHrInsightText("Terjadi kesalahan jaringan saat menghubungi server AI.");
    } finally {
      setIsHrAiLoading(false);
    }
  };

  // Widget Cards Configuration
  const widgets = [
    {
      id: "w-status",
      title: "Status Akses Aktif",
      icon: ShieldCheck,
      color: "emerald",
      content: (
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-2 font-bold">
            <span className="text-emerald-700">{stats.active} Aktif</span>
            <span className="text-rose-500">{stats.inactive} Nonaktif</span>
          </div>
          <div className="w-full h-3 bg-rose-100 rounded-full overflow-hidden flex shadow-inner">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000" style={{ width: `${(stats.active/stats.total)*100}%` }} />
          </div>
        </div>
      )
    },
    {
      id: "w-role",
      title: "Staf On-Duty (Aktif)",
      icon: Building2,
      color: "blue",
      content: (
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-2 font-bold">
            <span className="text-blue-700">Lantai ({stats.floor})</span>
            <span className="text-orange-500">Dapur ({stats.kitchen})</span>
          </div>
          <div className="w-full h-3 bg-orange-100 rounded-full overflow-hidden flex shadow-inner">
            <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000" style={{ width: `${(stats.floor/(stats.floor+stats.kitchen || 1))*100}%` }} />
          </div>
        </div>
      )
    },
    {
      id: "w-contract",
      title: "Komposisi Kontrak",
      icon: FileText,
      color: "purple",
      content: (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex flex-col items-center"><span className="font-black text-purple-700 text-xl">{stats.tetap}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tetap</span></div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex flex-col items-center"><span className="font-black text-amber-600 text-xl">{stats.kontrak}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kontrak</span></div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex flex-col items-center"><span className="font-black text-slate-600 text-xl">{stats.harian}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Harian</span></div>
        </div>
      )
    },
    {
      id: "w-gender",
      title: "Diversitas Gender",
      icon: Users,
      color: "pink",
      content: (
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-2 font-bold">
            <span className="text-indigo-600">Pria ({stats.male})</span>
            <span className="text-pink-500">Wanita ({stats.female})</span>
          </div>
          <div className="w-full h-3 bg-pink-100 rounded-full overflow-hidden flex shadow-inner">
            <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-1000" style={{ width: `${(stats.male/stats.total)*100}%` }} />
          </div>
        </div>
      )
    },
    {
      id: "w-insight",
      title: "🔥 AI HR Insights & Analisis Beban",
      icon: Sparkles,
      color: "indigo",
      isFullWidth: true,
      content: (
        <div className="mt-2 flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-5 bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm w-full md:w-auto shrink-0">
             <div className="h-12 w-12 bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-center shadow-inner">
                <Activity className="h-6 w-6" />
             </div>
             <div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Beban Dapur (Live)</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{activeOrdersCount} <span className="text-xs font-semibold text-slate-500 ml-1">Antrean</span></p>
             </div>
          </div>
          <div className="h-px w-full md:w-px md:h-16 bg-indigo-200/50 hidden md:block" />
          <div className="flex-1 w-full">
             <h4 className="text-sm font-extrabold text-indigo-950 mb-1.5 flex items-center gap-2">
               <UserCog className="h-4 w-4 text-indigo-600" /> AI Evaluasi Penjadwalan:
             </h4>
             <div className="bg-white/60 p-3 rounded-xl border border-indigo-100/50 shadow-inner min-h-[65px] flex items-center">
               {isHrAiLoading ? (
                 <div className="flex items-center gap-3">
                   <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                   <span className="text-sm font-bold text-indigo-500 animate-pulse">Membandingkan rasio koki terhadap antrean dapur saat ini...</span>
                 </div>
               ) : (
                 <p className="text-sm text-indigo-900/80 leading-relaxed font-medium italic">
                   "{hrInsightText}"
                 </p>
               )}
             </div>
          </div>
          <button 
            onClick={handleGenerateHRInsight}
            disabled={isHrAiLoading}
            className="px-6 py-3.5 bg-indigo-600 text-white text-sm font-black rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 w-full md:w-auto whitespace-nowrap border border-indigo-500 disabled:opacity-50"
          >
            {isHrAiLoading ? "Memproses..." : "Analisis Beban Kerja"}
          </button>
        </div>
      )
    }
  ];

  const getWidgetSpanClass = (index: number, total: number, isFullWidth?: boolean) => {
    if (isFullWidth) return "md:col-span-2 xl:col-span-4";
    const isLastRow = Math.floor(index / 4) === Math.floor((total - 1) / 4);
    const itemsInLastRow = total % 4 === 0 ? 4 : total % 4;
    if (isLastRow && itemsInLastRow < 4) {
      if (itemsInLastRow === 1) return "md:col-span-2 xl:col-span-4";
      if (itemsInLastRow === 2) return "md:col-span-1 xl:col-span-2";
      if (itemsInLastRow === 3 && index === total - 1) return "md:col-span-2 xl:col-span-2";
    }
    return "md:col-span-1 xl:col-span-1";
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-6" />
          <p className="text-slate-500 font-bold tracking-widest uppercase text-sm animate-pulse">Memuat Modul HRIS Voga...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out pb-12">
        
        {/* PREMIUM HERO BANNER */}
        <div className="relative w-full rounded-3xl bg-slate-900 overflow-hidden shadow-2xl shadow-indigo-900/20 border border-slate-800 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 mb-2">
          {/* Abstract Backgrounds */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/3" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-black tracking-widest uppercase mb-4">
              <Users className="h-3.5 w-3.5" /> Modul HRIS
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Manajemen Karyawan & <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Hak Akses</span>
            </h1>
            <p className="text-slate-400 mt-4 text-sm md:text-base max-w-xl font-medium leading-relaxed">
              Pusat kendali sumber daya manusia (SDM) Anda. Kelola identitas, divisi kerja, dan *generate* PIN akses sistem untuk Kasir, Waiter, dan Koki dalam satu *dashboard* terpusat.
            </p>
          </div>

          <div className="relative z-10 shrink-0 w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-3">
            <button 
              onClick={() => openFormModal()}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-indigo-50 px-8 py-4 rounded-2xl font-bold transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] active:scale-95 group"
            >
              <UserPlus className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform duration-300" /> Registrasi Karyawan
            </button>
            <button 
              onClick={exportToCSV}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-800/80 text-white hover:bg-slate-700 border border-slate-700 px-8 py-3.5 rounded-2xl font-bold transition-all active:scale-95 backdrop-blur-sm"
            >
              <Download className="h-4 w-4 text-slate-300" /> Export Laporan CSV
            </button>
          </div>
        </div>

        {/* Dynamic Customizable Widgets Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest">Ringkasan Eksekutif SDM</h2>
            <button className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
              <Settings2 className="h-3.5 w-3.5" /> Atur Widget
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {widgets.map((widget, index) => {
              const spanClass = getWidgetSpanClass(index, widgets.length, widget.isFullWidth);
              const bgGradient = widget.isFullWidth ? 'bg-gradient-to-br from-indigo-50 to-blue-50/30 border-indigo-100/60 shadow-indigo-900/5' : 'bg-white border-slate-200/60';
              
              return (
                <div key={widget.id} className={`p-6 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 ${spanClass} ${bgGradient}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`h-12 w-12 rounded-2xl bg-${widget.color}-50 flex items-center justify-center text-${widget.color}-600 border border-${widget.color}-100/50 shrink-0 shadow-inner`}>
                      <widget.icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-white/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm">{widget.title}</span>
                  </div>
                  {widget.content}
                </div>
              );
            })}
          </div>
        </div>

        {/* Professional Toolbar (Search, Filter, Sort, View Toggle) */}
        <div className="bg-white rounded-3xl shadow-[0_4px_25px_rgb(0,0,0,0.03)] border border-slate-200/60 p-2.5 mt-2">
          
          {/* Top Row: Tabs & View Toggle */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-2 border-b border-slate-100 pb-4 mb-2.5">
            <div className="flex w-full sm:w-auto overflow-x-auto no-scrollbar gap-1.5">
              {['all', 'kasir', 'waiter', 'koki', 'manager'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-extrabold capitalize transition-all whitespace-nowrap ${
                    activeTab === tab 
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab === 'all' ? 'Semua Divisi' : tab}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200/60 shadow-inner">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
              >
                <LayoutGrid className="h-4 w-4" /> <span className="hidden md:inline pr-1">Grid</span>
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
              >
                <ListIcon className="h-4 w-4" /> <span className="hidden md:inline pr-1">List</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Search, Filter Status, Sort */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-2">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder="Cari berdasarkan nama atau NIK karyawan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 shadow-sm"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-44">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-11 pr-8 py-3 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm font-extrabold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer text-slate-700 shadow-sm"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Hanya Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative w-full sm:w-48">
                <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-11 pr-8 py-3 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm font-extrabold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer text-slate-700 shadow-sm"
                >
                  <option value="terbaru">Paling Baru</option>
                  <option value="terlama">Paling Lama</option>
                  <option value="a-z">Nama (A - Z)</option>
                  <option value="z-a">Nama (Z - A)</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {processedStaff.length === 0 ? (
          <div className="py-28 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm mt-2">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100 shadow-inner">
              <Search className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-extrabold text-xl mb-2 tracking-tight">Tidak ada data ditemukan</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed font-medium">Ubah kata kunci pencarian, sesuaikan filter divisi, atau hapus filter status untuk melihat data lainnya.</p>
          </div>
        ) : viewMode === 'grid' ? (
          
          /* VIEW MODE: GRID (Premium ID Cards) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-2">
            {processedStaff.map((staff) => {
              const RoleConfig = ROLE_CONFIG[staff.role] || ROLE_CONFIG['waiter'];
              const RoleIcon = RoleConfig.icon;
              const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${staff.name}&backgroundColor=0f172a,4f46e5,0ea5e9&textColor=ffffff`;

              return (
                <div key={staff.id} className="bg-white rounded-3xl p-0 shadow-[0_8px_25px_rgb(0,0,0,0.03)] border border-slate-200/80 relative group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_35px_rgb(0,0,0,0.08)] hover:border-indigo-200/80 flex flex-col h-full overflow-hidden">
                  
                  {/* Floating Action Buttons (Absolute top right, above cover) */}
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={() => openFormModal(staff)} className="p-2 rounded-xl bg-white/90 backdrop-blur-sm text-slate-500 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 shadow-sm hover:border-blue-200 transition-all" title="Edit Data"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => toggleStaffStatus(staff.id, staff.isActive)} className={`p-2 rounded-xl bg-white/90 backdrop-blur-sm border shadow-sm transition-all ${staff.isActive ? 'text-rose-600 hover:bg-rose-50 border-slate-200 hover:border-rose-200' : 'text-emerald-600 hover:bg-emerald-50 border-slate-200 hover:border-emerald-200'}`} title={staff.isActive ? "Nonaktifkan Akses" : "Aktifkan Akses"}>{staff.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</button>
                    <button onClick={() => { setStaffToDelete(staff); setIsDeleteModalOpen(true); }} className="p-2 rounded-xl bg-white/90 backdrop-blur-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 shadow-sm hover:border-rose-200 transition-all" title="Hapus Permanen"><Trash2 className="h-4 w-4" /></button>
                  </div>

                  {/* ID Card Cover Gradient */}
                  <div className={`h-24 w-full bg-gradient-to-br ${RoleConfig.gradient} ${RoleConfig.bg} relative`}>
                    {!staff.isActive && <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-[1px]" />}
                  </div>

                  {/* Avatar & Badge Row */}
                  <div className="px-6 flex justify-between items-end -mt-12 mb-3 relative z-10">
                    <div className={`h-24 w-24 rounded-2xl border-4 border-white shadow-md flex items-center justify-center overflow-hidden bg-white ${!staff.isActive && 'grayscale opacity-70 border-slate-100'}`}>
                       <img src={avatarUrl} alt={staff.name} className="w-full h-full object-cover" />
                       {!staff.isActive && (
                         <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                           <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-sm font-extrabold tracking-widest">INACTIVE</span>
                         </div>
                       )}
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border bg-white shadow-sm mb-2 ${RoleConfig.color} ${RoleConfig.border}`}>
                      <RoleIcon className="h-3.5 w-3.5" /> {RoleConfig.label}
                    </div>
                  </div>

                  {/* Personal Info */}
                  <div className="px-6 pb-6 flex flex-col flex-1">
                    <h3 className={`text-xl font-extrabold leading-tight ${staff.isActive ? 'text-slate-900' : 'text-slate-500 line-through decoration-slate-300'}`}>{staff.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{staff.employeeId || "VG-XXXX-XXX"}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{staff.gender || '-'}</span>
                    </div>

                    <div className="w-full h-px bg-slate-100 my-5" />

                    {/* Contact Detail */}
                    <div className="space-y-3 w-full text-sm text-slate-600 flex-grow">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-400"><Phone className="h-4 w-4" /></div>
                        <span className="truncate font-semibold">{staff.phone || "Belum ada No. HP"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-400"><Mail className="h-4 w-4" /></div>
                        <span className="truncate font-semibold">{staff.email || "Belum ada email"}</span>
                      </div>
                    </div>
                    
                    {/* Bottom Fixed Action & PIN */}
                    <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-slate-100 border-dashed">
                      <div className="flex-1 px-4 py-2.5 bg-slate-50/80 rounded-xl flex items-center justify-between border border-slate-200/60 shadow-inner group/pin hover:bg-slate-100 transition-colors">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><KeyRound className="h-3 w-3" /> PIN</span>
                        <span className="font-mono font-black text-slate-900 tracking-[0.2em] text-lg">{staff.pin}</span>
                      </div>
                      {staff.phone && (
                        <a href={`https://wa.me/${staff.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-100 hover:border-emerald-500 transition-all shadow-sm shrink-0" title="Chat WhatsApp">
                          <Phone className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        ) : (
          
          /* VIEW MODE: LIST (Enterprise Data Table) */
          <div className="bg-white rounded-3xl shadow-[0_4px_25px_rgb(0,0,0,0.02)] border border-slate-200/60 overflow-hidden mt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-5 font-extrabold text-slate-500 uppercase tracking-widest text-[10px]">Profil Karyawan</th>
                    <th className="px-6 py-5 font-extrabold text-slate-500 uppercase tracking-widest text-[10px]">Divisi / Posisi</th>
                    <th className="px-6 py-5 font-extrabold text-slate-500 uppercase tracking-widest text-[10px]">Status Kontrak</th>
                    <th className="px-6 py-5 font-extrabold text-slate-500 uppercase tracking-widest text-[10px]">Kontak</th>
                    <th className="px-6 py-5 font-extrabold text-slate-500 uppercase tracking-widest text-[10px]">Kode PIN</th>
                    <th className="px-6 py-5 font-extrabold text-slate-500 uppercase tracking-widest text-[10px] text-right">Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedStaff.map((staff) => {
                    const RoleConfig = ROLE_CONFIG[staff.role] || ROLE_CONFIG['waiter'];
                    const avatarUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${staff.name}&backgroundColor=0f172a,4f46e5,0ea5e9&textColor=ffffff`;
                    
                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0 bg-white">
                              <img src={avatarUrl} alt={staff.name} className={`w-full h-full object-cover ${!staff.isActive && 'grayscale opacity-70'}`} />
                            </div>
                            <div>
                              <p className={`font-extrabold text-base ${staff.isActive ? 'text-slate-900' : 'text-slate-500 line-through decoration-slate-300'}`}>{staff.name}</p>
                              <p className="text-xs font-bold text-slate-400 mt-0.5 tracking-wider">{staff.employeeId || "VG-XXXX"} • {staff.gender}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-widest border bg-white shadow-sm ${RoleConfig.color} ${RoleConfig.border}`}>
                            <RoleConfig.icon className="h-3.5 w-3.5" /> {RoleConfig.label}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <span className={`w-2.5 h-2.5 rounded-full shadow-inner ${staff.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className={staff.isActive ? 'text-slate-700' : 'text-rose-600'}>{staff.isActive ? 'Aktif' : 'Nonaktif'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">{staff.employmentStatus}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-bold text-slate-700">{staff.phone || '-'}</span>
                            <span className="text-slate-400 font-medium">{staff.email || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-black text-slate-900 tracking-[0.2em] bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 shadow-inner">{staff.pin}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openFormModal(staff)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Edit Data"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => toggleStaffStatus(staff.id, staff.isActive)} className={`p-2.5 rounded-xl bg-white border transition-all shadow-sm ${staff.isActive ? 'text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200' : 'text-slate-400 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'}`} title={staff.isActive ? "Nonaktifkan Akses" : "Aktifkan Akses"}>{staff.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</button>
                            <button onClick={() => { setStaffToDelete(staff); setIsDeleteModalOpen(true); }} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm" title="Hapus Permanen"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- CUSTOM MODALS --- */}

      {/* Modal Formulir Karyawan */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-[0.98] duration-300 max-h-[90vh] flex flex-col border border-white/20">
            
            <div className="px-10 py-8 border-b border-slate-100 shrink-0 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{isEditMode ? 'Edit Profil Karyawan' : 'Registrasi Karyawan Baru'}</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Lengkapi identitas, penempatan divisi kerja, dan *generate* hak akses (PIN) HRIS untuk staf yang bersangkutan.</p>
            </div>
            
            <div className="overflow-y-auto p-10 flex-grow custom-scrollbar">
              <form id="staff-form" onSubmit={handleSaveStaff} className="space-y-12">
                
                {/* Section 1: Data Pribadi */}
                <div>
                  <h4 className="text-sm font-extrabold text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-2 pb-3 border-b border-indigo-50">
                    <div className="p-1.5 bg-indigo-100 rounded-md"><Users className="h-4 w-4 text-indigo-700" /></div> Identitas Personal
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-700">Nama Lengkap *</label>
                      <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Sesuai KTP" className="w-full bg-slate-50/50 border border-slate-200 px-5 py-3.5 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-700">Jenis Kelamin</label>
                      <div className="relative">
                        <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as Staff['gender']})} className="w-full bg-slate-50/50 border border-slate-200 px-5 py-3.5 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm">
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-700">No. HP / WhatsApp</label>
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="08123456789" className="w-full bg-slate-50/50 border border-slate-200 px-5 py-3.5 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-700">Alamat Email</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@contoh.com" className="w-full bg-slate-50/50 border border-slate-200 px-5 py-3.5 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Section 2: Pekerjaan & Akses */}
                <div>
                  <h4 className="text-sm font-extrabold text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-2 pb-3 border-b border-indigo-50">
                    <div className="p-1.5 bg-indigo-100 rounded-md"><Briefcase className="h-4 w-4 text-indigo-700" /></div> Posisi & Sistem Operasional
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-700">ID Karyawan (NIK)</label>
                      <input type="text" value={formData.employeeId} onChange={(e) => setFormData({...formData, employeeId: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 px-5 py-3.5 rounded-xl text-slate-900 font-mono font-black tracking-widest focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-700">Tanggal Bergabung</label>
                      <input type="date" value={formData.joinDate} onChange={(e) => setFormData({...formData, joinDate: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 px-5 py-3.5 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-700">Divisi / Role Sistem *</label>
                      <div className="relative">
                        <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as Staff['role']})} className="w-full bg-slate-50/50 border border-slate-200 px-5 py-3.5 rounded-xl text-slate-900 font-black focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm">
                          <option value="waiter">Waiter (Floor)</option>
                          <option value="kasir">Kasir (POS)</option>
                          <option value="koki">Koki (Kitchen)</option>
                          <option value="manager">Supervisor / Manager</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-700">Status Kontrak</label>
                      <div className="relative">
                        <select value={formData.employmentStatus} onChange={(e) => setFormData({...formData, employmentStatus: e.target.value as Staff['employmentStatus']})} className="w-full bg-slate-50/50 border border-slate-200 px-5 py-3.5 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer shadow-sm">
                          <option value="Tetap">Karyawan Tetap (Full-time)</option>
                          <option value="Kontrak">Kontrak (PKWT)</option>
                          <option value="Harian">Pekerja Harian Lepas</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-4 md:col-span-2 mt-4 p-8 bg-indigo-50/60 rounded-3xl border border-indigo-100/80 shadow-inner">
                      <label className="text-sm font-black text-slate-900 flex justify-between items-center">
                        <span className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-indigo-600" /> PIN Akses Aplikasi (4-6 Digit) *</span>
                        <button type="button" onClick={generateAutoData} className="text-indigo-600 hover:text-white flex items-center gap-1.5 text-xs bg-white hover:bg-indigo-600 px-4 py-2 rounded-xl border border-indigo-200 hover:border-indigo-600 shadow-sm transition-all active:scale-95 font-bold">
                          <RefreshCw className="h-4 w-4" /> Auto Generate
                        </button>
                      </label>
                      <input
                        required
                        type="text"
                        maxLength={6}
                        value={formData.pin}
                        onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                        placeholder="Contoh: 1234"
                        className="w-full md:w-1/3 bg-white border-2 border-indigo-200/80 px-6 py-5 rounded-2xl text-slate-900 font-mono tracking-[0.4em] text-3xl text-center font-black focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-[0_4px_20px_rgba(79,70,229,0.08)]"
                      />
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-xl">PIN ini berfungsi sebagai <span className="text-indigo-600 font-black">Password Internal</span> untuk *login* super cepat tanpa email ke dalam ekosistem operasional: Voga POS (Kasir), Voga Waiter App, atau Voga KDS (Dapur).</p>
                    </div>

                  </div>
                </div>

              </form>
            </div>

            <div className="px-10 py-6 border-t border-slate-100 shrink-0 bg-slate-50/80 flex items-center justify-end gap-4">
              <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-8 py-3.5 font-bold text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-200">Batal & Tutup</button>
              <button type="submit" form="staff-form" className="px-10 py-3.5 bg-slate-900 text-white font-extrabold rounded-xl hover:bg-slate-800 transition-all shadow-[0_8px_25px_rgba(0,0,0,0.15)] flex items-center gap-2 active:scale-95">
                <ShieldCheck className="h-5 w-5" /> {isEditMode ? 'Simpan Perubahan' : 'Registrasi Karyawan'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Hapus Karyawan */}
      {isDeleteModalOpen && staffToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-10 text-center border border-white/20">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-rose-100 shadow-inner">
              <AlertTriangle className="h-12 w-12 text-rose-500" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Cabut Akses?</h3>
            <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">
              Anda akan menghapus profil <span className="font-bold text-slate-800 border-b border-slate-300 pb-0.5">{staffToDelete.name}</span> secara permanen dari direktori HRIS. Jika karyawan hanya sedang cuti/resign sementara, sangat disarankan untuk menggunakan fitur <strong>Nonaktifkan Akses</strong>.
            </p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={confirmDeleteStaff} className="px-6 py-4 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95 w-full">
                Ya, Hapus Permanen
              </button>
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-4 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors w-full">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}