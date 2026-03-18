"use client";

import { useState } from "react";
import { Database, Users, Receipt, Loader2, AlertTriangle, TerminalSquare, Utensils, Armchair } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, writeBatch, doc } from "firebase/firestore";
import { subDays } from "date-fns";

export default function SeederPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>(["Sistem Seeder Siap digunakan. Harap gunakan dengan bijak."]);
  
  const appId = "voga-core";

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // --- SEEDER KARYAWAN ---
  const handleSeedStaff = async () => {
    setIsLoading(true);
    addLog("Memulai proses seeding Karyawan (Staff)...");
    
    const dummyStaff = [
      { name: "Agus Santoso", role: "koki", gender: "Laki-laki", employmentStatus: "Tetap", pin: "1111" },
      { name: "Siti Rahma", role: "kasir", gender: "Perempuan", employmentStatus: "Tetap", pin: "2222" },
      { name: "Budi Setiawan", role: "waiter", gender: "Laki-laki", employmentStatus: "Kontrak", pin: "3333" },
      { name: "Dina Amelia", role: "waiter", gender: "Perempuan", employmentStatus: "Harian", pin: "4444" },
      { name: "Kevin Wijaya", role: "manager", gender: "Laki-laki", employmentStatus: "Tetap", pin: "9999" },
    ];

    try {
      const batch = writeBatch(db);
      dummyStaff.forEach((staff) => {
        const ref = doc(collection(db, "artifacts", appId, "public", "data", "staff"));
        batch.set(ref, {
          ...staff,
          employeeId: `VG-DEV-${Math.floor(Math.random() * 900) + 100}`,
          phone: "081200000000",
          email: `${staff.name.split(' ')[0].toLowerCase()}@vooga.dev`,
          isActive: true,
          joinDate: subDays(new Date(), Math.floor(Math.random() * 300)).toISOString(),
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
      addLog(`✅ Sukses! ${dummyStaff.length} karyawan berhasil ditambahkan.`);
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
    setIsLoading(false);
  };

  // --- SEEDER KATEGORI & MENU ---
  const handleSeedMenus = async () => {
    setIsLoading(true);
    addLog("Memulai proses seeding Kategori & Menu...");

    const dummyCategories = ["Signature Coffee", "Main Course", "Snacks & Bites", "Dessert"];
    const dummyMenus = [
      // Signature Coffee (Kategori 0)
      { catIdx: 0, name: "Iced Caramel Macchiato", price: 35000, hpp: 15000, photo: "https://github.com/ikyy/images/raw/main/menu-coffee-1.jpg" },
      { catIdx: 0, name: "Voga Aren Latte", price: 28000, hpp: 12000, photo: "https://github.com/ikyy/images/raw/main/menu-coffee-2.jpg" },
      { catIdx: 0, name: "Americano Classic", price: 20000, hpp: 8000, photo: "https://github.com/ikyy/images/raw/main/menu-coffee-3.jpg" },
      // Main Course (Kategori 1)
      { catIdx: 1, name: "Nasi Goreng Wagyu", price: 65000, hpp: 30000, photo: "https://github.com/ikyy/images/raw/main/menu-food-1.jpg" },
      { catIdx: 1, name: "Spaghetti Carbonara", price: 55000, hpp: 22000, photo: "https://github.com/ikyy/images/raw/main/menu-food-2.jpg" },
      { catIdx: 1, name: "Chicken Cordon Bleu", price: 48000, hpp: 20000, photo: "https://github.com/ikyy/images/raw/main/menu-food-3.jpg" },
      // Snacks & Bites (Kategori 2)
      { catIdx: 2, name: "Truffle French Fries", price: 30000, hpp: 10000, photo: "" },
      { catIdx: 2, name: "Spicy Chicken Wings", price: 35000, hpp: 15000, photo: "" },
      // Dessert (Kategori 3)
      { catIdx: 3, name: "Matcha Mille Crepe", price: 40000, hpp: 18000, photo: "" },
      { catIdx: 3, name: "Classic Tiramisu", price: 38000, hpp: 15000, photo: "" },
    ];

    try {
      const batch = writeBatch(db);
      const categoryIds: string[] = [];

      // 1. Insert Kategori
      dummyCategories.forEach((catName, index) => {
        const catRef = doc(collection(db, "artifacts", appId, "public", "data", "categories"));
        categoryIds.push(catRef.id);
        batch.set(catRef, {
          name: catName,
          orderIndex: index
        });
      });

      // 2. Insert Menu (ditautkan ke ID Kategori yang baru dibuat)
      dummyMenus.forEach((menu) => {
        const menuRef = doc(collection(db, "artifacts", appId, "public", "data", "menus"));
        batch.set(menuRef, {
          categoryId: categoryIds[menu.catIdx],
          name: menu.name,
          price: menu.price,
          hpp: menu.hpp,
          isAvailable: true,
          description: "<p>Menu spesial Voga yang diracik dengan bahan berkualitas tinggi dan resep rahasia koki kami.</p>",
          photoUrl: menu.photo || "",
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
      addLog(`✅ Sukses! ${dummyCategories.length} Kategori & ${dummyMenus.length} Menu berhasil ditambahkan.`);
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
    setIsLoading(false);
  };

  // --- SEEDER PESANAN (7 HARI TERAKHIR) ---
  const handleSeedOrders = async () => {
    setIsLoading(true);
    addLog("Memulai proses seeding Transaksi 7 Hari (Orders)...");

    try {
      const batch = writeBatch(db);
      let totalOrders = 0;

      // Loop untuk 7 hari terakhir
      for (let i = 0; i < 7; i++) {
        const targetDate = subDays(new Date(), i);
        // Buat 10-25 pesanan acak per hari
        const ordersPerDay = Math.floor(Math.random() * 15) + 10; 
        
        for (let j = 0; j < ordersPerDay; j++) {
          // Buat pesanan di jam acak antara jam 10:00 s.d 22:00
          const randomHour = Math.floor(Math.random() * 12) + 10;
          const randomMinute = Math.floor(Math.random() * 60);
          const orderDate = new Date(targetDate);
          orderDate.setHours(randomHour, randomMinute, 0);

          const ref = doc(collection(db, "artifacts", appId, "public", "data", "orders"));
          batch.set(ref, {
            tableNumber: `Meja ${Math.floor(Math.random() * 15) + 1}`,
            totalAmount: Math.floor(Math.random() * 250000) + 50000, // Rp 50rb - Rp 300rb
            status: Math.random() > 0.1 ? 'COMPLETED' : 'VOID', // 90% Completed, 10% Void
            itemsCount: Math.floor(Math.random() * 5) + 1,
            createdAt: orderDate.toISOString(),
            customerName: "Guest (Dev Seed)"
          });
          totalOrders++;
        }
      }

      await batch.commit();
      addLog(`✅ Sukses! ${totalOrders} transaksi berhasil disebar ke 7 hari terakhir.`);
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
    setIsLoading(false);
  };

  // --- SEEDER MEJA (TABLES) ---
  const handleSeedTables = async () => {
    setIsLoading(true);
    addLog("Memulai proses seeding Layout Meja...");

    const dummyTables = [
      { name: "T-01", capacity: 4, zone: "Main Dining", status: "AVAILABLE" },
      { name: "T-02", capacity: 4, zone: "Main Dining", status: "OCCUPIED" },
      { name: "T-03", capacity: 2, zone: "Main Dining", status: "AVAILABLE" },
      { name: "VIP-1", capacity: 8, zone: "VIP Lounge", status: "RESERVED" },
      { name: "VIP-2", capacity: 8, zone: "VIP Lounge", status: "AVAILABLE" },
      { name: "OUT-1", capacity: 4, zone: "Outdoor", status: "OCCUPIED" },
      { name: "OUT-2", capacity: 4, zone: "Outdoor", status: "AVAILABLE" },
      { name: "BAR-1", capacity: 1, zone: "Bar", status: "AVAILABLE" },
      { name: "BAR-2", capacity: 1, zone: "Bar", status: "OCCUPIED" },
    ];

    try {
      const batch = writeBatch(db);
      dummyTables.forEach((table) => {
        const ref = doc(collection(db, "artifacts", appId, "public", "data", "tables"));
        batch.set(ref, {
          ...table,
          createdAt: new Date().toISOString()
        });
      });
      await batch.commit();
      addLog(`✅ Sukses! ${dummyTables.length} meja berhasil ditambahkan ke Floor Plan.`);
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-300 font-mono">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800">
          <Database className="h-8 w-8 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Database Seeder <span className="text-emerald-500">[DEV MODE]</span></h1>
            <p className="text-sm text-slate-500">Tools khusus developer untuk mengisi data simulasi ke Firebase.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Card Seeder Karyawan */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
            <Users className="absolute -right-4 -bottom-4 h-32 w-32 text-slate-800 opacity-20 group-hover:text-blue-500/10 transition-colors" />
            <h3 className="text-lg font-bold text-white mb-2 relative z-10">Seed Data Karyawan</h3>
            <p className="text-sm text-slate-500 mb-6 relative z-10 h-10">Menghasilkan 5 karyawan (Manager, Kasir, Waiter, Koki) secara otomatis.</p>
            <button 
              onClick={handleSeedStaff} disabled={isLoading}
              className="relative z-10 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex justify-center gap-2 items-center"
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Users className="h-4 w-4" />}
              Jalankan Seeder
            </button>
          </div>

          {/* Card Seeder Kategori & Menu */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
            <Utensils className="absolute -right-4 -bottom-4 h-32 w-32 text-slate-800 opacity-20 group-hover:text-purple-500/10 transition-colors" />
            <h3 className="text-lg font-bold text-white mb-2 relative z-10">Seed Menu & Kategori</h3>
            <p className="text-sm text-slate-500 mb-6 relative z-10 h-10">Menghasilkan 4 Kategori dan 10 Menu dengan detail harga & HPP lengkap.</p>
            <button 
              onClick={handleSeedMenus} disabled={isLoading}
              className="relative z-10 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors flex justify-center gap-2 items-center"
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Utensils className="h-4 w-4" />}
              Jalankan Seeder
            </button>
          </div>

          {/* Card Seeder Transaksi */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
            <Receipt className="absolute -right-4 -bottom-4 h-32 w-32 text-slate-800 opacity-20 group-hover:text-emerald-500/10 transition-colors" />
            <h3 className="text-lg font-bold text-white mb-2 relative z-10">Seed Transaksi (7 Hari)</h3>
            <p className="text-sm text-slate-500 mb-6 relative z-10 h-10">Menyebarkan 100+ data transaksi acak (Completed & Void) untuk Grafik Analitik.</p>
            <button 
              onClick={handleSeedOrders} disabled={isLoading}
              className="relative z-10 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex justify-center gap-2 items-center"
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Receipt className="h-4 w-4" />}
              Jalankan Seeder
            </button>
          </div>

          {/* Card Seeder Meja */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden group">
            <Armchair className="absolute -right-4 -bottom-4 h-32 w-32 text-slate-800 opacity-20 group-hover:text-indigo-500/10 transition-colors" />
            <h3 className="text-lg font-bold text-white mb-2 relative z-10">Seed Layout Meja</h3>
            <p className="text-sm text-slate-500 mb-6 relative z-10 h-10">Menghasilkan 9 data meja simulasi dengan beragam kapasitas dan zona.</p>
            <button 
              onClick={handleSeedTables} disabled={isLoading}
              className="relative z-10 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex justify-center gap-2 items-center"
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Armchair className="h-4 w-4" />}
              Jalankan Seeder
            </button>
          </div>

        </div>

        {/* Terminal Logs */}
        <div className="bg-black border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-slate-900 px-4 py-3 flex items-center gap-2 border-b border-slate-800">
            <TerminalSquare className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Logs</span>
          </div>
          <div className="p-4 h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
            {logs.map((log, i) => (
              <div key={i} className={`text-xs ${log.includes('✅') ? 'text-emerald-400' : log.includes('❌') ? 'text-rose-400' : 'text-slate-400'}`}>
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
           <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
           <p className="text-xs text-amber-500/80 leading-relaxed">
             <strong>Peringatan:</strong> Halaman ini akan mengeksekusi Firebase Batch Write secara langsung. Jangan gunakan *tools* ini di environment *Production* agar data asli klien tidak tercampur dengan data *dummy*.
           </p>
        </div>

      </div>
    </div>
  );
}