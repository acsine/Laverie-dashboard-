"use client";

import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/ui";

export type ConfirmRequest = {
  title?: string;
  description: string;
  confirmLabel?: string;
};

type PendingConfirm = ConfirmRequest & {
  onConfirm: () => void;
};

export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((request: ConfirmRequest, onConfirm: () => void) => {
    setPending({
      title: request.title ?? "Confirmer",
      description: request.description,
      confirmLabel: request.confirmLabel ?? "Confirmer",
      onConfirm,
    });
  }, []);

  const close = useCallback(() => setPending(null), []);

  const handleConfirm = useCallback(() => {
    if (!pending) return;
    const run = pending.onConfirm;
    setPending(null);
    run();
  }, [pending]);

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      onClose={close}
      onConfirm={handleConfirm}
      title={pending?.title ?? "Confirmer"}
      description={pending?.description ?? ""}
      confirmLabel={pending?.confirmLabel}
    />
  );

  return { confirm, confirmDialog: dialog };
}