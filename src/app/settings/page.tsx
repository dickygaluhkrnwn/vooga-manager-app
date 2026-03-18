"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { 
  Store, Settings, MapPin, Phone, Save, Loader2, 
  Percent, Printer, Sparkles, Building2, Receipt,
  CheckCircle2, AlertCircle, Edit, X
} from "lucide-react";

// Firebase Imports
import { db } from "@/lib/firebase/config";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

interface StoreSettings {
  restaurantName: string;
  address: string;
  phone: string;
  taxRate: number; // PB1 (misal 10%)
  serviceCharge: number; // Service (misal 5%)
  receiptHeader: string;
  receiptFooter: string;
  enableAIUpselling: boolean;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // State untuk Mode Edit
  const [isEditing, setIsEditing] = useState(false);

  // Original settings state (untuk fitur Batal/Cancel)
  const [originalSettings, setOriginalSettings] = useState<StoreSettings | null>(null);

  // Active settings state (yang terhubung ke input form)
  const [settings, setSettings] = useState<StoreSettings>({
    restaurantName: "",
    address: "",
    phone: "",
    taxRate: 10,
    serviceCharge: 5,
    receiptHeader: "",
    receiptFooter: "Terima kasih atas kunjungan Anda!",
    enableAIUpselling: true,
  });

  const appId = "voga-core";

  useEffect(() => {
    // Listen to settings changes from Firestore
    const settingsRef = doc(db, "artifacts", appId, "public", "data", "settings", "general");
    
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        setSettings(data);
        setOriginalSettings(data);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCancel = () => {
    if (originalSettings) {
      setSettings(originalSettings); // Kembalikan ke data asli
    }
    setIsEditing(false); // Keluar dari mode edit
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const settingsRef = doc(db, "artifacts", appId, "public", "data", "settings", "general");
      await setDoc(settingsRef, settings, { merge: true });
      
      setOriginalSettings(settings); // Perbarui data asli
      setIsEditing(false); // Keluar dari mode edit setelah sukses
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000); // Reset status setelah 3 detik
    } catch (error) {
      console.error("Gagal menyimpan pengaturan:", error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-6" />
          <p className="text-slate-500 font-bold tracking-widest uppercase text-sm animate-pulse">Memuat Konfigurasi Cabang...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out pb-12">
        
        {/* PREMIUM HERO BANNER */}
        <div className="relative w-full rounded-3xl bg-slate-900 overflow-hidden shadow-2xl shadow-indigo-900/20 border border-slate-800 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-2">
          {/* Abstract Backgrounds */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/3" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-black tracking-widest uppercase mb-4">
              <Settings className="h-3.5 w-3.5" /> Konfigurasi Sistem
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Pengaturan <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Cabang & Operasional</span>
            </h1>
            <p className="text-slate-400 mt-4 text-sm md:text-base max-w-xl font-medium leading-relaxed">
              Atur identitas restoran, pajak lokal (PB1), *service charge*, dan integrasi AI. Perubahan di sini akan otomatis berlaku di seluruh ekosistem Kasir, KDS, dan Menu QR.
            </p>
          </div>
        </div>

        {/* STATUS ALERT */}
        {saveStatus === 'success' && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="font-bold text-sm">Pengaturan berhasil disimpan dan disinkronisasi ke seluruh sistem.</p>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 shadow-sm">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <p className="font-bold text-sm">Gagal menyimpan pengaturan. Silakan periksa koneksi Anda.</p>
          </div>
        )}

        {/* MAIN SETTINGS CONTENT */}
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
          
          {/* KOLOM KIRI (col-span-8): Pengaturan Utama */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Profil Restoran */}
            <div className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border p-8 transition-colors duration-300 ${isEditing ? 'border-indigo-200 ring-4 ring-indigo-500/5' : 'border-slate-200/60'}`}>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-blue-50 rounded-xl"><Building2 className="h-5 w-5 text-blue-600" /></div>
                <h2 className="text-lg font-extrabold text-slate-900">Profil Restoran</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-extrabold text-slate-700">Nama Restoran / Cabang {isEditing && <span className="text-rose-500">*</span>}</label>
                  {isEditing ? (
                    <div className="relative animate-in fade-in zoom-in-95 duration-200">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input required type="text" value={settings.restaurantName} onChange={e => setSettings({...settings, restaurantName: e.target.value})} placeholder="Contoh: Vooga Coffee - Sudirman" className="w-full bg-slate-50/50 border border-slate-200 pl-12 pr-4 py-3.5 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-900 font-bold animate-in fade-in duration-200">
                      <Store className="h-5 w-5 text-slate-400 shrink-0" />
                      {settings.restaurantName || <span className="text-slate-400 font-medium italic">Belum diatur</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-extrabold text-slate-700">Alamat Lengkap</label>
                  {isEditing ? (
                    <div className="relative animate-in fade-in zoom-in-95 duration-200">
                      <MapPin className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <textarea value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} placeholder="Jalan Jend. Sudirman No..." className="w-full bg-slate-50/50 border border-slate-200 pl-12 pr-4 py-3.5 rounded-xl text-slate-900 font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm min-h-[100px] resize-none" />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 px-4 py-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-900 font-medium min-h-[100px] animate-in fade-in duration-200">
                      <MapPin className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="whitespace-pre-wrap leading-relaxed">{settings.address || <span className="text-slate-400 italic">Belum diatur</span>}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-extrabold text-slate-700">Telepon / WhatsApp Cabang</label>
                  {isEditing ? (
                    <div className="relative animate-in fade-in zoom-in-95 duration-200">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input type="tel" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} placeholder="0812..." className="w-full bg-slate-50/50 border border-slate-200 pl-12 pr-4 py-3.5 rounded-xl text-slate-900 font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-900 font-medium animate-in fade-in duration-200">
                      <Phone className="h-5 w-5 text-slate-400 shrink-0" />
                      {settings.phone || <span className="text-slate-400 italic">Belum diatur</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pengaturan Pajak & Biaya */}
            <div className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border p-8 transition-colors duration-300 ${isEditing ? 'border-indigo-200 ring-4 ring-indigo-500/5' : 'border-slate-200/60'}`}>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 rounded-xl"><Percent className="h-5 w-5 text-emerald-600" /></div>
                <h2 className="text-lg font-extrabold text-slate-900">Pajak & Biaya Layanan</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-extrabold text-slate-700 flex justify-between">Pajak Restoran (PB1) <span className="text-slate-400">%</span></label>
                  {isEditing ? (
                    <div className="relative animate-in fade-in zoom-in-95 duration-200">
                      <input type="number" min="0" max="100" step="0.1" value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: Number(e.target.value)})} className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 font-black focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm" />
                    </div>
                  ) : (
                    <div className="px-4 py-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-900 font-black text-lg animate-in fade-in duration-200">
                      {settings.taxRate}%
                    </div>
                  )}
                  <p className="text-xs text-slate-500 font-medium mt-1">Biasanya 10% sesuai regulasi daerah.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-extrabold text-slate-700 flex justify-between">Service Charge <span className="text-slate-400">%</span></label>
                  {isEditing ? (
                    <div className="relative animate-in fade-in zoom-in-95 duration-200">
                      <input type="number" min="0" max="100" step="0.1" value={settings.serviceCharge} onChange={e => setSettings({...settings, serviceCharge: Number(e.target.value)})} className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 font-black focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm" />
                    </div>
                  ) : (
                    <div className="px-4 py-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-900 font-black text-lg animate-in fade-in duration-200">
                      {settings.serviceCharge}%
                    </div>
                  )}
                  <p className="text-xs text-slate-500 font-medium mt-1">Biaya pelayanan restoran (opsional).</p>
                </div>
              </div>
            </div>

          </div>

          {/* KOLOM KANAN (col-span-4): Pengaturan Opsional & AI */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Cetak Struk */}
            <div className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border p-6 transition-colors duration-300 ${isEditing ? 'border-indigo-200 ring-4 ring-indigo-500/5' : 'border-slate-200/60'}`}>
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 rounded-xl"><Printer className="h-4 w-4 text-amber-600" /></div>
                <h2 className="text-base font-extrabold text-slate-900">Format Struk Kasir</h2>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700">Teks Header Struk</label>
                  {isEditing ? (
                    <textarea value={settings.receiptHeader} onChange={e => setSettings({...settings, receiptHeader: e.target.value})} placeholder="Misal: Wi-Fi: voogaguest | Pass: 12345" className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm min-h-[60px] resize-none animate-in fade-in zoom-in-95 duration-200" />
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-900 text-sm font-medium min-h-[60px] animate-in fade-in duration-200 flex items-center">
                      <p className="whitespace-pre-wrap">{settings.receiptHeader || <span className="text-slate-400 italic">Belum diatur</span>}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700">Teks Footer Struk</label>
                  {isEditing ? (
                    <textarea value={settings.receiptFooter} onChange={e => setSettings({...settings, receiptFooter: e.target.value})} placeholder="Terima kasih atas kunjungan Anda" className="w-full bg-slate-50/50 border border-slate-200 px-4 py-3 rounded-xl text-slate-900 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm min-h-[60px] resize-none animate-in fade-in zoom-in-95 duration-200" />
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-900 text-sm font-medium min-h-[60px] animate-in fade-in duration-200 flex items-center">
                      <p className="whitespace-pre-wrap">{settings.receiptFooter || <span className="text-slate-400 italic">Belum diatur</span>}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Integrations */}
            <div className={`bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl shadow-inner border p-6 relative overflow-hidden group transition-colors duration-300 ${isEditing ? 'border-indigo-300 ring-4 ring-indigo-500/10' : 'border-indigo-100'}`}>
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />
              
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-indigo-100 relative z-10">
                <div className="p-2 bg-white rounded-xl shadow-sm"><Sparkles className="h-4 w-4 text-indigo-600" /></div>
                <h2 className="text-base font-extrabold text-indigo-900">Vooga AI Features</h2>
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white shadow-sm transition-all">
                  {isEditing ? (
                    <div className="flex items-center h-5 mt-0.5 animate-in zoom-in-95 duration-200">
                      <input 
                        type="checkbox" 
                        checked={settings.enableAIUpselling}
                        onChange={(e) => setSettings({...settings, enableAIUpselling: e.target.checked})}
                        className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="mt-0.5 animate-in fade-in duration-200">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border ${settings.enableAIUpselling ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                        {settings.enableAIUpselling ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex flex-col">
                    <span className="text-sm font-extrabold text-slate-900">AI Upselling (QR Menu)</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Asisten pintar Gemini untuk merekomendasikan tambahan menu saat pelanggan memesan via QR.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Aksi Dinamis */}
            <div className="mt-4 pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              {isEditing ? (
                <>
                  <button 
                    type="button" 
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="w-full sm:w-1/3 flex items-center justify-center py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200 disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-1" /> Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full sm:w-2/3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black transition-all shadow-[0_8px_30px_rgba(79,70,229,0.3)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setIsEditing(true)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-[0_8px_30px_rgba(0,0,0,0.15)] active:scale-95"
                >
                  <Edit className="h-4 w-4" /> Edit Pengaturan
                </button>
              )}
            </div>

          </div>
        </form>

      </div>
    </DashboardLayout>
  );
}