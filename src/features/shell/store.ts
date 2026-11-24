"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ShellState = {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
};

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
    }),
    { name: "laverie-shell", partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);
