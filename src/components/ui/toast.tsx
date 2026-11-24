"use client";

import { create } from "zustand";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "info" | "success" | "danger";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastStore = {
  items: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (message, tone = "info") => {
    const id = crypto.randomUUID();
    set((s) => ({ items: [...s.items, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

const toneClass: Record<ToastTone, string> = {
  info: "border-primary-light bg-primary-softer text-ink",
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

export function ToastViewport() {
  const { items, dismiss } = useToastStore();
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-[60] flex w-[min(100%-2rem,360px)] flex-col gap-2 md:bottom-4">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2 rounded-panel border px-4 py-3 text-sm shadow-card",
            toneClass[item.tone],
          )}
          role="status"
        >
          <p className="flex-1">{item.message}</p>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control hover:bg-black/5"
            onClick={() => dismiss(item.id)}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function toast(message: string, tone?: ToastTone) {
  useToastStore.getState().push(message, tone);
}
