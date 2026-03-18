"use client";

import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { useAuthStore, UserProfile } from "@/lib/store/useAuthStore";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const setLoading = useAuthStore((state) => state.setLoading);
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Ambil data user dari Firestore berdasarkan UID
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          let profileData = null;

          if (userDocSnap.exists()) {
            profileData = userDocSnap.data() as UserProfile;
            
            // GATEKEEPER ROLE: Hanya Owner dan Manager yang boleh masuk aplikasi ini
            if (profileData.role !== "manager" && profileData.role !== "owner") {
              console.warn("Akses ditolak: Role tidak valid untuk Vooga Manager");
              await signOut(auth);
              logout();
              router.push("/login?error=unauthorized");
              return;
            }
          } else {
            // Skenario khusus akun pertama yang kita buat manual di Firebase Console
            // Karena belum ada di Firestore, kita buatkan otomatis sebagai 'owner/manager'
            profileData = {
              uid: currentUser.uid,
              email: currentUser.email || "",
              name: "Admin Utama",
              role: "owner", // Jadikan owner sebagai default akun pertama
            } as UserProfile;
            await setDoc(userDocRef, profileData);
          }

          setAuthData(currentUser, profileData);
          
          // Redirect ke dashboard jika sedang di halaman login
          if (pathname === "/login") {
            router.push("/");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setAuthData(currentUser, null);
        }
      } else {
        // Jika tidak ada user login
        logout();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setAuthData, setLoading, logout, router, pathname]);

  // Tampilkan loading screen muter-muter saat pertama kali web dibuka
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Memverifikasi sesi aman Vooga...</p>
      </div>
    );
  }

  return <>{children}</>;
}