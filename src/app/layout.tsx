import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// Kita gunakan font Inter yang sangat cocok untuk Dashboard Admin
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voga Manager | Control Panel",
  description: "Enterprise Management Dashboard for Voga B2B Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}