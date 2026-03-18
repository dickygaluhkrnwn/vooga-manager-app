"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { 
  GripVertical, Plus, Pencil, Trash2, Tag, Layers, 
  Search, MoreVertical, Image as ImageIcon, CheckCircle2, XCircle,
  ArrowLeft, Bold, Italic, List, ListOrdered, Save, Loader2, AlertTriangle,
  Link as LinkIcon, Table as TableIcon, CheckSquare, Trash, Utensils, 
  TrendingUp, AlertCircle, Filter, ArrowUpDown, Edit, Eye, Sparkles, Calculator,
  Wand2
} from "lucide-react";

// Tiptap Imports
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';

// Firebase Imports
import { db } from "@/lib/firebase/config";
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, writeBatch
} from "firebase/firestore";

// AI Actions Import
import { generateMenuDescription, estimateHPpandRecipe, suggestSmartPricing } from "@/app/actions/ai";

// --- KOMPONEN TIPTAP EDITOR CUSTOM ---
const RichTextEditor = ({ content, onChange, placeholder = "Ketik di sini..." }: { content: string, onChange: (val: string) => void, placeholder?: string }) => {
  const [showTableToolbar, setShowTableToolbar] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'min-h-[150px] p-5 focus:outline-none text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none prose-indigo [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100',
      },
    },
    onUpdate: ({ editor }: { editor: Editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all flex flex-col">
      {/* Toolbar Utama */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200/80 bg-slate-50/80 p-2">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded-lg hover:bg-slate-200 transition-colors ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500'}`} title="Bold"><Bold className="h-4 w-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-lg hover:bg-slate-200 transition-colors ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500'}`} title="Italic"><Italic className="h-4 w-4" /></button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded-lg hover:bg-slate-200 transition-colors ${editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500'}`} title="Bullet List"><List className="h-4 w-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded-lg hover:bg-slate-200 transition-colors ${editor.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500'}`} title="Numbered List"><ListOrdered className="h-4 w-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded-lg hover:bg-slate-200 transition-colors ${editor.isActive('taskList') ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500'}`} title="Task List / Prep Steps"><CheckSquare className="h-4 w-4" /></button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        
        {/* Tombol Toggle Mode Tabel */}
        <button 
          type="button" 
          onClick={() => setShowTableToolbar(!showTableToolbar)} 
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${showTableToolbar ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'hover:bg-slate-200 text-slate-600'}`} 
          title="Tampilkan / Sembunyikan Mode Edit Tabel"
        >
          <TableIcon className="h-4 w-4" /> Mode Tabel
        </button>
      </div>

      {/* Toolbar Sekunder Khusus Tabel */}
      {showTableToolbar && (
        <div className="flex flex-wrap items-center gap-2 bg-indigo-50/50 p-2.5 border-b border-indigo-100/50 animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mr-1 hidden sm:block">Alat Tabel:</span>
          
          <button 
            type="button" 
            onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run()} 
            className="px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1 mr-1"
          >
            <Plus className="h-3 w-3" /> Buat Tabel
          </button>

          <div className="w-px h-5 bg-indigo-200 mx-1" />
          
          {/* Group Aksi Kolom */}
          <div className="flex items-center bg-white rounded-lg border border-indigo-100 overflow-hidden shadow-sm">
            <span className="px-2 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 border-r border-indigo-100 hidden md:block">Kolom</span>
            <button type="button" disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">+ Kiri</button>
            <button type="button" disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition-colors border-l border-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed">+ Kanan</button>
            <button type="button" disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors border-l border-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed">- Hapus</button>
          </div>
          
          {/* Group Aksi Baris */}
          <div className="flex items-center bg-white rounded-lg border border-indigo-100 overflow-hidden shadow-sm">
            <span className="px-2 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 border-r border-indigo-100 hidden md:block">Baris</span>
            <button type="button" disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().addRowBefore().run()} className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">+ Atas</button>
            <button type="button" disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition-colors border-l border-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed">+ Bawah</button>
            <button type="button" disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().deleteRow().run()} className="px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors border-l border-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed">- Hapus</button>
          </div>
          
          <div className="flex-1" />
          
          <button type="button" disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().toggleHeaderRow().run()} className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-100 rounded-lg border border-indigo-100 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Toggle Header</button>
          <button type="button" disabled={!editor.isActive('table')} onClick={() => editor.chain().focus().deleteTable().run()} className="px-3 py-1.5 text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-sm flex items-center gap-1 transition-colors ml-1 disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash className="h-3 w-3 hidden sm:block" /> Hapus Tabel
          </button>
        </div>
      )}

      {/* Area Teks */}
      {content === "" && !editor.isFocused && (
        <div className="absolute p-5 pointer-events-none text-slate-400 text-sm">
          {placeholder}
        </div>
      )}
      <EditorContent editor={editor} className="flex-1" />
    </div>
  );
};

// --- INTERFACES ---
interface Category {
  id: string;
  name: string;
  orderIndex: number;
}

interface Menu {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  hpp: number;
  isAvailable: boolean;
  description: string;
  bomContent: string; // Tambahan field untuk resep rahasia internal
  photoUrl: string;
  createdAt?: string;
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // States untuk Form Menu (Tambah / Edit)
  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [isEditMenuMode, setIsEditMenuMode] = useState(false);
  const [currentEditMenuId, setCurrentEditMenuId] = useState<string | null>(null);
  
  // State Form dengan tambahan bomContent
  const [menuForm, setMenuForm] = useState({ 
    name: "", price: "", hpp: "", description: "", bomContent: "", photoUrl: "" 
  });
  
  // State Voga AI Assistant (Unified)
  const [aiInstruction, setAiInstruction] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // States untuk Filter & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [sortBy, setSortBy] = useState("terbaru"); 

  // States untuk Modals
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleteMenuModalOpen, setIsDeleteMenuModalOpen] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);

  const appId = "voga-core";

  useEffect(() => {
    setIsMounted(true);
    const catQuery = query(collection(db, "artifacts", appId, "public", "data", "categories"), orderBy("orderIndex", "asc"));
    const unsubCats = onSnapshot(catQuery, (snapshot) => {
      const catData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(catData);
      setIsLoading(false);
    });

    const menuQuery = collection(db, "artifacts", appId, "public", "data", "menus");
    const unsubMenus = onSnapshot(menuQuery, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Menu));
      setMenus(menuData);
    });

    return () => { unsubCats(); unsubMenus(); };
  }, []);

  // --- KATEGORI ACTIONS ---
  const handleAddCategoryClick = () => { setNewCategoryName(""); setIsAddCategoryModalOpen(true); };
  const confirmAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await addDoc(collection(db, "artifacts", appId, "public", "data", "categories"), { name: newCategoryName.trim(), orderIndex: categories.length });
      setIsAddCategoryModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleDeleteCategoryClick = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setCategoryToDelete(id); setIsDeleteCategoryModalOpen(true); };
  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const batch = writeBatch(db);
      const menusToDelete = menus.filter(m => m.categoryId === categoryToDelete);
      menusToDelete.forEach(menu => batch.delete(doc(db, "artifacts", appId, "public", "data", "menus", menu.id)));
      batch.delete(doc(db, "artifacts", appId, "public", "data", "categories", categoryToDelete));
      await batch.commit();
      if (selectedCategoryId === categoryToDelete) setSelectedCategoryId(null);
      setIsDeleteCategoryModalOpen(false); setCategoryToDelete(null);
    } catch (err) { console.error(err); }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setCategories(items);
    const batch = writeBatch(db);
    items.forEach((item, index) => batch.update(doc(db, "artifacts", appId, "public", "data", "categories", item.id), { orderIndex: index }));
    await batch.commit();
  };

  // --- MENU ACTIONS ---
  const openMenuForm = (menu?: Menu) => {
    if (menu) {
      setIsEditMenuMode(true);
      setCurrentEditMenuId(menu.id);
      setMenuForm({
        name: menu.name,
        price: menu.price.toString(),
        hpp: menu.hpp.toString(),
        description: menu.description || "",
        bomContent: menu.bomContent || "",
        photoUrl: menu.photoUrl || ""
      });
      setAiInstruction(""); // Reset AI input
    } else {
      setIsEditMenuMode(false);
      setCurrentEditMenuId(null);
      setMenuForm({ name: "", price: "", hpp: "", description: "", bomContent: "", photoUrl: "" });
      setAiInstruction("");
    }
    setIsMenuFormOpen(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return;
    
    const menuData = {
      categoryId: selectedCategoryId,
      name: menuForm.name.trim(),
      price: Number(menuForm.price),
      hpp: Number(menuForm.hpp) || 0,
      photoUrl: menuForm.photoUrl.trim(),
      description: menuForm.description,
      bomContent: menuForm.bomContent, // Simpan BOM terpisah
    };

    try {
      if (isEditMenuMode && currentEditMenuId) {
        await updateDoc(doc(db, "artifacts", appId, "public", "data", "menus", currentEditMenuId), menuData);
      } else {
        await addDoc(collection(db, "artifacts", appId, "public", "data", "menus"), {
          ...menuData,
          isAvailable: true,
          createdAt: new Date().toISOString()
        });
      }
      setIsMenuFormOpen(false);
    } catch (err) { console.error(err); }
  };

  const toggleAvailability = async (menuId: string, currentStatus: boolean) => {
    try { await updateDoc(doc(db, "artifacts", appId, "public", "data", "menus", menuId), { isAvailable: !currentStatus }); } 
    catch (err) { console.error(err); }
  };

  const confirmDeleteMenu = async () => {
    if (!menuToDelete) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", "menus", menuToDelete.id));
      setIsDeleteMenuModalOpen(false); setMenuToDelete(null);
    } catch (err) { console.error(err); }
  };

  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name;

  // --- VOGA UNIFIED AI ASSISTANT ---
  const handleUnifiedAIGeneration = async () => {
    if (!menuForm.name.trim() || !selectedCategoryName) return;
    
    setIsGeneratingAI(true);
    try {
      // Gabungkan Nama Menu dan Instruksi/Bahan tambahan menjadi 1 kalimat konteks
      const promptContext = menuForm.name + (aiInstruction.trim() ? ` (Catatan Bahan/Instruksi: ${aiInstruction})` : "");

      // 1. Eksekusi Copywriter & Auto-Costing secara paralel agar cepat
      const [descRes, costRes] = await Promise.all([
        generateMenuDescription(promptContext, selectedCategoryName),
        estimateHPpandRecipe(promptContext)
      ]);

      let newHpp = menuForm.hpp;
      let newBom = menuForm.bomContent;
      let newDesc = menuForm.description;
      let newPrice = menuForm.price;

      if (descRes.success && descRes.html) {
        newDesc = descRes.html;
      }

      if (costRes.success && costRes.hpp && costRes.bomHtml) {
        newHpp = costRes.hpp.toString();
        newBom = costRes.bomHtml; // BOM Masuk ke Editor terpisah

        // 2. Setelah HPP didapat, panggil Smart Pricing
        const priceRes = await suggestSmartPricing(promptContext, costRes.hpp);
        if (priceRes.success && priceRes.price) {
          newPrice = priceRes.price.toString();
        }
      }

      // 3. Update Form State sekaligus
      setMenuForm(prev => ({
        ...prev,
        description: newDesc,
        hpp: newHpp,
        price: newPrice,
        bomContent: newBom
      }));

    } catch (error) {
      console.error("AI Generation Error:", error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // --- FILTER & SORTING LOGIC ---
  const processedMenus = useMemo(() => {
    if (!selectedCategoryId) return [];
    let result = menus.filter(menu => menu.categoryId === selectedCategoryId);
    if (searchQuery) {
      result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterStatus === 'available') result = result.filter(m => m.isAvailable);
    if (filterStatus === 'soldout') result = result.filter(m => !m.isAvailable);

    result.sort((a, b) => {
      if (sortBy === 'terbaru') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'terlama') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === 'harga-tinggi') return b.price - a.price;
      if (sortBy === 'harga-rendah') return a.price - b.price;
      if (sortBy === 'a-z') return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [menus, selectedCategoryId, searchQuery, filterStatus, sortBy]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalItems = menus.length;
    const soldOutItems = menus.filter(m => !m.isAvailable).length;
    const totalCats = categories.length;
    
    let totalMarginPercent = 0;
    let menusWithHpp = 0;
    menus.forEach(m => {
      if (m.hpp > 0 && m.price > 0) {
        const margin = ((m.price - m.hpp) / m.price) * 100;
        totalMarginPercent += margin;
        menusWithHpp++;
      }
    });
    const avgMargin = menusWithHpp > 0 ? (totalMarginPercent / menusWithHpp).toFixed(1) : "0.0";
    return { totalItems, soldOutItems, totalCats, avgMargin };
  }, [menus, categories]);

  if (isLoading) return (
    <DashboardLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-6" /><p className="text-slate-500 font-bold tracking-widest uppercase text-sm animate-pulse">Memuat Sistem Voga...</p></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out pb-12">
        
        {/* PREMIUM HERO BANNER */}
        <div className="relative w-full rounded-3xl bg-slate-900 overflow-hidden shadow-2xl shadow-indigo-900/20 border border-slate-800 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/3" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black tracking-widest uppercase mb-4">
              <Utensils className="h-3.5 w-3.5" /> Modul Master Data
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Manajemen Menu & <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">Resep Digital</span>
            </h1>
            <p className="text-slate-400 mt-4 text-sm md:text-base max-w-xl font-medium leading-relaxed">
              Atur ekosistem menu Anda secara terpusat. Terintegrasi penuh dengan <strong>Voga AI</strong> untuk kalkulasi harga pokok, penentuan harga pintar, dan deskripsi menu otomatis.
            </p>
          </div>

          <div className="relative z-10 shrink-0 w-full md:w-auto">
            <button onClick={handleAddCategoryClick} className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-indigo-50 px-8 py-4 rounded-2xl font-bold transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] active:scale-95 group">
              <Plus className="h-5 w-5 text-indigo-600 group-hover:rotate-90 transition-transform duration-300" /> Tambah Kategori Baru
            </button>
          </div>
        </div>

        {/* DYNAMIC STATISTIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Utensils className="h-5 w-5" /></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Total Menu</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900">{stats.totalItems}</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Item terdaftar di sistem</p>
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertCircle className="h-5 w-5" /></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Sold Out</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900">{stats.soldOutItems}</h3>
            <p className="text-xs font-medium text-rose-500 mt-1">Menu sedang habis/nonaktif</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp className="h-5 w-5" /></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Avg. Margin</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900">{stats.avgMargin}%</h3>
            <p className="text-xs font-medium text-emerald-600 mt-1">Rata-rata potensi profit</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Layers className="h-5 w-5" /></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">Kategori</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900">{stats.totalCats}</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Kelompok menu aktif</p>
          </div>
        </div>

        {/* MAIN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
          
          {/* KOLOM KIRI: KATEGORI (col-span-4) */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-200/60 p-5 sticky top-28">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2"><Layers className="h-4 w-4 text-indigo-500" /> Kategori Menu</h2>
            </div>
            
            {isMounted && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="categories-list">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {categories.map((cat, index) => {
                        const isSelected = selectedCategoryId === cat.id;
                        const count = menus.filter(m => m.categoryId === cat.id).length;
                        return (
                          <Draggable key={cat.id} draggableId={cat.id} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} onClick={() => { setSelectedCategoryId(cat.id); setIsMenuFormOpen(false); }} className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${snapshot.isDragging ? "bg-indigo-50 border-indigo-300 shadow-xl z-50 scale-105" : isSelected ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-600/20" : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50"}`}>
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps} onClick={e => e.stopPropagation()} className={`p-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors ${isSelected ? 'text-indigo-300 hover:bg-indigo-700 hover:text-white' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-200'}`}><GripVertical className="h-4 w-4" /></div>
                                  <div>
                                    <h3 className={`font-bold text-sm leading-none ${isSelected ? "text-white" : "text-slate-800"}`}>{cat.name}</h3>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>{count} Item Menu</p>
                                  </div>
                                </div>
                                <button onClick={(e) => handleDeleteCategoryClick(cat.id, e)} className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${isSelected ? 'text-indigo-200 hover:bg-indigo-700 hover:text-white' : 'text-slate-300 hover:bg-rose-50 hover:text-rose-600'}`}><Trash2 className="h-4 w-4" /></button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>

          {/* KOLOM KANAN: DAFTAR MENU / FORM TAMBAH (col-span-8) */}
          <div className="lg:col-span-8 xl:col-span-9">
            {!selectedCategoryId ? (
              <div className="bg-white/50 backdrop-blur-xl rounded-3xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center min-h-[600px] text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6 relative">
                   <Tag className="h-10 w-10 text-indigo-300" />
                   <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-amber-400 animate-pulse" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Pilih Kategori Menu</h3>
                <p className="text-base text-slate-500 max-w-md leading-relaxed font-medium">Klik salah satu kategori di sebelah kiri untuk melihat daftar menu, menambah item baru, atau mengelola HPP dengan bantuan Voga AI.</p>
              </div>
            ) : isMenuFormOpen ? (
              
              /* FORM TAMBAH / EDIT MENU (WITH SINGLE UNIFIED AI AGENT) */
              <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 p-8 animate-in slide-in-from-right-8 duration-300">
                
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setIsMenuFormOpen(false)} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"><ArrowLeft className="h-5 w-5" /></button>
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{isEditMenuMode ? 'Edit Data Menu' : 'Tambah Menu Baru'}</h2>
                      <p className="text-sm font-medium text-slate-500 mt-1">Kategori: <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{selectedCategoryName}</span></p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveMenu} className="space-y-8">
                  
                  {/* 1. Nama & Foto */}
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Area Input Foto URL */}
                    <div className="w-full md:w-40 flex flex-col gap-2 shrink-0">
                      <label className="text-sm font-extrabold text-slate-800">Foto (URL)</label>
                      <div className="w-full h-40 rounded-2xl border border-slate-200 bg-slate-50 shadow-inner flex items-center justify-center overflow-hidden relative group">
                        {menuForm.photoUrl ? (
                          <img src={menuForm.photoUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x400/f8fafc/94a3b8?text=Error"; }} />
                        ) : (
                          <div className="text-center text-slate-400">
                            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="relative mt-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input type="url" placeholder="https://..." value={menuForm.photoUrl} onChange={e => setMenuForm({...menuForm, photoUrl: e.target.value})} className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2.5 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 text-xs outline-none transition-all shadow-sm font-medium" />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-extrabold text-slate-800">Nama Menu <span className="text-rose-500">*</span></label>
                        <input required type="text" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} placeholder="Contoh: Nasi Goreng Wagyu Truffle" className="w-full bg-white border border-slate-200 px-4 py-4 rounded-2xl text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-bold text-lg" />
                      </div>

                      {/* --- UNIFIED AI ASSISTANT BOX --- */}
                      <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/50 p-5 rounded-2xl border border-indigo-100 shadow-inner relative overflow-hidden group">
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />
                        
                        <div className="flex justify-between items-start mb-3 relative z-10">
                          <label className="text-sm font-black text-indigo-900 flex items-center gap-2">
                            <Wand2 className="h-4 w-4 text-indigo-600" /> Voga AI Assistant
                          </label>
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-widest">Otomatisasi Menu</span>
                        </div>
                        
                        <textarea 
                          value={aiInstruction}
                          onChange={(e) => setAiInstruction(e.target.value)}
                          placeholder="Ketik bahan-bahan, gramasi, atau instruksi khusus di sini... (Misal: Pakai wagyu 50gr, truffle oil 5ml, tolong hitungkan modalnya dan buat deskripsi)"
                          className="w-full h-16 bg-white/80 backdrop-blur-sm border border-indigo-200/60 p-3 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none placeholder:text-slate-400 font-medium relative z-10"
                        />
                        
                        <div className="flex justify-end mt-3 relative z-10">
                          <button 
                            type="button" 
                            onClick={handleUnifiedAIGeneration}
                            disabled={isGeneratingAI || !menuForm.name.trim()}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-[0_4px_15px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50 active:scale-95"
                          >
                            {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            {isGeneratingAI ? "Memproses Data..." : "Generate Semua Data"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Grid Harga (HPP & Harga Jual) - Hasil dari AI akan masuk ke sini */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-800">Harga Modal (HPP)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                        <input type="number" value={menuForm.hpp} onChange={e => setMenuForm({...menuForm, hpp: e.target.value})} placeholder="0" className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3.5 rounded-xl text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-bold text-lg tracking-wider" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-slate-800">Harga Jual <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                        <input required type="number" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} placeholder="0" className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3.5 rounded-xl text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-bold text-lg tracking-wider" />
                      </div>
                    </div>
                  </div>
                  
                  {/* 3. SPLIT TEXT EDITORS (Publik vs Internal) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    
                    {/* Editor 1: Deskripsi Publik */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                        <label className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                          Deskripsi Menu Publik
                        </label>
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-black uppercase tracking-widest border border-indigo-100">E-Menu Pelanggan</span>
                      </div>
                      <RichTextEditor 
                        content={menuForm.description} 
                        onChange={(val) => setMenuForm({...menuForm, description: val})} 
                        placeholder="Tuliskan deskripsi menggugah selera untuk ditampilkan di aplikasi QR pelanggan..."
                      />
                    </div>

                    {/* Editor 2: BOM Internal */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                        <label className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                          Resep & Bill of Materials
                        </label>
                        <span className="text-[9px] bg-rose-50 text-rose-600 px-2 py-1 rounded font-black uppercase tracking-widest border border-rose-100">Rahasia Internal Dapur</span>
                      </div>
                      <RichTextEditor 
                        content={menuForm.bomContent} 
                        onChange={(val) => setMenuForm({...menuForm, bomContent: val})} 
                        placeholder="Gunakan tabel untuk menyusun bahan baku, porsi, dan modal spesifik..."
                      />
                    </div>

                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <button type="button" onClick={() => setIsMenuFormOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                    <button type="submit" className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-all active:scale-95">
                      <Save className="h-5 w-5" /> {isEditMenuMode ? 'Simpan Perubahan' : 'Tambah Menu'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              
              /* TAMPILAN DAFTAR MENU DENGAN TOOLBAR PREMIUM */
              <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-200/60 overflow-hidden flex flex-col min-h-[600px]">
                
                {/* Header Daftar Menu */}
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedCategoryName}</h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">{processedMenus.length} item ditemukan di kategori ini.</p>
                  </div>
                  <button onClick={() => openMenuForm()} className="flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold transition-all shadow-[0_4px_15px_rgba(79,70,229,0.2)] active:scale-95 shrink-0">
                    <Plus className="h-5 w-5" /> Tambah Item
                  </button>
                </div>

                {/* Toolbar Pencarian & Filter */}
                <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Cari nama menu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-40">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer text-slate-700">
                        <option value="all">Semua Status</option>
                        <option value="available">Tersedia</option>
                        <option value="soldout">Habis</option>
                      </select>
                      <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative w-full md:w-48">
                      <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer text-slate-700">
                        <option value="terbaru">Terbaru Ditambah</option>
                        <option value="terlama">Paling Lama</option>
                        <option value="harga-tinggi">Harga: Tertinggi</option>
                        <option value="harga-rendah">Harga: Terendah</option>
                        <option value="a-z">Alfabet (A-Z)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* List Menu Items */}
                <div className="p-6 flex-1 bg-slate-50/30">
                  {processedMenus.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-4">
                        <Search className="h-8 w-8 text-slate-300" />
                      </div>
                      <h3 className="text-slate-800 font-bold text-lg mb-1">Tidak Ada Menu</h3>
                      <p className="text-slate-500 text-sm max-w-sm font-medium leading-relaxed">Menu tidak ditemukan. Coba ubah kata kunci pencarian atau ganti filter status Anda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {processedMenus.map((menu) => {
                        const margin = menu.price > 0 && menu.hpp > 0 ? (((menu.price - menu.hpp) / menu.price) * 100).toFixed(0) : "0";
                        
                        return (
                          <div key={menu.id} className="group bg-white flex flex-col p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-[0_8px_20px_rgba(79,70,229,0.08)] transition-all duration-300">
                            
                            {/* Top Info: Image & Name */}
                            <div className="flex gap-4">
                              <div className="h-20 w-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                                {menu.photoUrl ? (
                                  <img src={menu.photoUrl} alt={menu.name} className={`w-full h-full object-cover transition-transform group-hover:scale-110 ${!menu.isAvailable && 'grayscale opacity-60'}`} onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x400/f8fafc/94a3b8?text=Error"; }} />
                                ) : (
                                  <ImageIcon className="h-8 w-8 text-slate-300" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-extrabold text-base truncate ${menu.isAvailable ? 'text-slate-900' : 'text-slate-500 line-through decoration-slate-300'}`} title={menu.name}>{menu.name}</h3>
                                <p className="text-lg font-black text-indigo-600 mt-1">Rp {menu.price.toLocaleString("id-ID")}</p>
                                
                                {menu.hpp > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-widest">HPP: {menu.hpp.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-widest">Margin {margin}%</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bottom Actions */}
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button 
                                onClick={() => toggleAvailability(menu.id, menu.isAvailable)}
                                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border w-1/2 ${menu.isAvailable ? "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"}`}
                              >
                                {menu.isAvailable ? <><CheckCircle2 className="h-3.5 w-3.5" /> Tersedia</> : <><XCircle className="h-3.5 w-3.5" /> Habis</>}
                              </button>
                              
                              <div className="flex items-center gap-2 w-1/2 justify-end">
                                <button onClick={() => openMenuForm(menu)} className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 transition-colors" title="Edit Menu"><Edit className="h-4 w-4" /></button>
                                <button onClick={() => { setMenuToDelete(menu); setIsDeleteMenuModalOpen(true); }} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors" title="Hapus Menu"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- CUSTOM MODALS KATEGORI & MENU --- */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50"><h3 className="text-xl font-extrabold text-slate-900">Tambah Kategori Baru</h3></div>
            <form onSubmit={confirmAddCategory} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nama Kategori</label>
                <input autoFocus type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Contoh: Signature Drinks" className="w-full bg-white border border-slate-200 px-4 py-3.5 rounded-xl text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold shadow-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddCategoryModalOpen(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                <button type="submit" disabled={!newCategoryName.trim()} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)]">Simpan Kategori</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteCategoryModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-8 text-center border border-white/20">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-rose-100"><AlertTriangle className="h-10 w-10 text-rose-500" /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Hapus Kategori?</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">Semua menu di dalamnya juga akan ikut terhapus secara permanen dari sistem.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsDeleteCategoryModalOpen(false)} className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl w-full border border-slate-200 transition-colors">Batal</button>
              <button type="button" onClick={confirmDeleteCategory} className="px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 w-full transition-all">Ya, Hapus Permanen</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Menu Item */}
      {isDeleteMenuModalOpen && menuToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-8 text-center border border-white/20">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-rose-100"><Trash className="h-10 w-10 text-rose-500" /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Hapus Item Menu?</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">Anda akan menghapus <span className="font-bold text-slate-800">{menuToDelete.name}</span>. Menu ini akan hilang dari aplikasi Kasir dan QR Pelanggan.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsDeleteMenuModalOpen(false)} className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-xl w-full border border-slate-200 transition-colors">Batal</button>
              <button type="button" onClick={confirmDeleteMenu} className="px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 w-full transition-all">Hapus Item</button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}