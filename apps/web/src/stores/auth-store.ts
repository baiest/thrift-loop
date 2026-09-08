import { create } from 'zustand';
import type { PublicUser } from '@thrift-loop/shared';

interface AuthState {
  user: PublicUser | null;
  setUser: (user: PublicUser) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
