import { create } from 'zustand';
import { User } from 'firebase/auth';

// Tipe data profil user dari Firestore
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier' | 'waiter' | 'chef';
  branchId?: string;
  pin?: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setAuthData: (user: User | null, profile: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  setAuthData: (user, profile) => set({ user, profile, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    document.cookie = "vooga-session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    set({ user: null, profile: null, isLoading: false });
  },
}));