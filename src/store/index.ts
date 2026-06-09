import { create } from "zustand";

interface AppState {
  user: any;
  setUser: (user: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  loading: true,
  setLoading: (loading) => set({ loading }),
}));
