import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vooga Manager | Control Panel",
  description: "Enterprise Management Dashboard for Vooga B2B Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning wajib ditambahkan agar NextThemes bisa memanipulasi class 'dark' tanpa error
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-[#F4F7FB] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300`}>
        {/* Bungkus aplikasi dengan ThemeProvider untuk mengaktifkan Mode Gelap */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          {/* AuthProvider akan mengawasi semua halaman di dalamnya */}
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}