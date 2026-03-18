import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F7FB] selection:bg-blue-200 selection:text-blue-900">
      {/* Sidebar fixed di kiri */}
      <Sidebar />
      
      {/* Area Konten Utama (didorong 20px / selebar sidebar collapse) */}
      <div className="ml-20 flex flex-col min-h-screen transition-all duration-300 relative">
        <Topbar />
        
        {/* Konten Halaman: Margin top 24 untuk space Topbar */}
        <main className="flex-1 mt-24 px-8 pb-12 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}