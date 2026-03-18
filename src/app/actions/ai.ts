"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tidak ditemukan di environment variables.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
};

// 1. AI UNTUK ANALITIK PENJUALAN
export async function generateInventoryInsight(salesData: any[]) {
  try {
    const model = getGeminiModel();
    const prompt = `Anda adalah "Voga AI", Konsultan Eksekutif & Ahli F&B untuk restoran bintang 5.
      Berikut adalah data rekapitulasi penjualan 7 hari terakhir dari restoran kami: ${JSON.stringify(salesData)}
      Berdasarkan fluktuasi data pendapatan dan transaksi di atas, berikan 1 paragraf singkat (maksimal 3 kalimat) berupa:
      1. Insight performa penjualan minggu ini.
      2. Rekomendasi operasional / peringatan stok bahan baku.
      Gunakan nada bicara yang profesional, tegas, dan langsung to the point tanpa format markdown berlebih.`;

    const result = await model.generateContent(prompt);
    return { success: true, text: result.response.text() };
  } catch (error: any) {
    return { success: false, text: "Koneksi ke otak Voga AI terputus. Periksa API Key Anda." };
  }
}

// 2. AI COPYWRITER MENU (Versi Anti-Lebay)
export async function generateMenuDescription(menuName: string, category: string) {
  try {
    const model = getGeminiModel();
    const prompt = `Tolong buatkan deskripsi menu untuk restoran modern premium kami.
      Nama Menu: "${menuName}" | Kategori: "${category}"
      Berikan output HTML murni (tanpa \`\`\`html):
      1. Satu paragraf <p> berisi deskripsi makanan/minuman yang menarik, menggugah selera, dan jelas.
      2. Sebuah <ul> berisi 3-4 bullet points <li> tentang komposisi utama atau profil rasa.
      ATURAN PENTING: JANGAN LEBAY ATAU HIPERBOLA. Dilarang menggunakan kata: "mahakarya", "simfoni", "tarian rasa". Gunakan bahasa Indonesia yang profesional, modern, elegan, jujur, dan to-the-point.`;

    const result = await model.generateContent(prompt);
    return { success: true, html: result.response.text().replace(/```html/g, '').replace(/```/g, '').trim() };
  } catch (error: any) {
    return { success: false, html: "<p><em>Gagal memuat deskripsi AI.</em></p>" };
  }
}

// 3. AI UNTUK HR SHIFT
export async function generateHRInsight(staffStats: any, activeOrders: number) {
  try {
    const model = getGeminiModel();
    const prompt = `Anda adalah Voga AI, Konsultan HRD operasional restoran.
      Lantai: ${staffStats.floor} staf | Dapur: ${staffStats.kitchen} koki | Antrean: ${activeOrders} pesanan.
      Berikan rekomendasi alokasi shift dalam 2 kalimat tegas. Jika rasio pesanan/koki > 5, sarankan panggil staf part-time. Jika sepi, sarankan fokus cleaning/upselling. Langsung ke intinya.`;

    const result = await model.generateContent(prompt);
    return { success: true, text: result.response.text() };
  } catch (error: any) {
    return { success: false, text: "Sistem HR AI sedang perbaikan jaringan." };
  }
}

// 4. AI AUTO-COSTING (HPP & BOM GENERATOR)
export async function estimateHPpandRecipe(menuName: string) {
  try {
    const model = getGeminiModel();
    const prompt = `Anda adalah Executive Chef dan Food Cost Controller di restoran bintang 5 Indonesia.
      Tugas: Buat estimasi resep (Bill of Materials) dan Harga Pokok Penjualan (HPP/Modal) untuk menu bernama: "${menuName}".
      
      OUTPUT WAJIB DALAM FORMAT JSON murni (tanpa tag \`\`\`json):
      {
        "hpp": <angka_modal_total_dalam_rupiah_tanpa_titik>,
        "bomHtml": "<table border='1'><thead><tr><th>Bahan Baku</th><th>Qty/Porsi</th><th>Estimasi Harga (Rp)</th></tr></thead><tbody><tr><td>Bahan 1</td><td>...</td><td>...</td></tr>...<tr><td colspan='2'><strong>TOTAL HPP</strong></td><td><strong>Rp ...</strong></td></tr></tbody></table>"
      }
      Pastikan estimasi harganya logis untuk porsi restoran premium di Indonesia tahun ini.`;

    const result = await model.generateContent(prompt);
    const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);
    
    return { success: true, hpp: data.hpp, bomHtml: data.bomHtml };
  } catch (error: any) {
    return { success: false, error: "Gagal menghitung HPP otomatis." };
  }
}

// 5. AI SMART PRICING
export async function suggestSmartPricing(menuName: string, hpp: number) {
  try {
    const model = getGeminiModel();
    const prompt = `Sebagai Food & Beverage Consultant, menu "${menuName}" memiliki Harga Modal (HPP) Rp ${hpp}.
      Tentukan harga jual ideal dengan F&B cost margin ideal (food cost 28% - 35%).
      PENTING: Gunakan pembulatan psikologis yang elegan (misal berakhiran 000, 500, atau 900).
      
      OUTPUT WAJIB DALAM FORMAT JSON murni (tanpa tag \`\`\`json):
      {
        "suggestedPrice": <angka_harga_jual_tanpa_titik>
      }`;

    const result = await model.generateContent(prompt);
    const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return { success: true, price: data.suggestedPrice };
  } catch (error: any) {
    return { success: false, price: 0 };
  }
}

// 6. [BARU] AI TABLE & FLOOR OPTIMIZER
export async function generateTableInsight(tableStats: any) {
  try {
    const model = getGeminiModel();
    const prompt = `Anda adalah Voga AI, Manager Restoran Bintang 5.
      Kondisi meja (Floor Plan) saat ini:
      - Total Meja: ${tableStats.totalTables}
      - Terisi/Occupied: ${tableStats.occupiedTables}
      - Kosong/Available: ${tableStats.availableTables}
      - Kapasitas Kursi Kosong: ${tableStats.availableSeats} kursi
      
      TUGAS ANDA:
      Berikan rekomendasi taktis (seating strategy) dalam maksimal 2 kalimat tegas. 
      Jika hampir penuh (> 80%), sarankan untuk bersiap mengaktifkan waiting list atau membatasi waktu dine-in. Jika masih banyak kosong, sarankan strategi walk-in guest.
      Gunakan bahasa Indonesia yang sangat profesional dan berwibawa.`;

    const result = await model.generateContent(prompt);
    return { success: true, text: result.response.text() };
  } catch (error: any) {
    return { success: false, text: "Sistem Floor AI sedang tidak tersedia." };
  }
}