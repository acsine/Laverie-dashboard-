"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import {
  OrderInvoiceReceipt,
  type OrderInvoiceReceiptData,
} from "./order-invoice-receipt";

type Props = {
  open: boolean;
  onClose: () => void;
  data: OrderInvoiceReceiptData;
};

export function OrderInvoiceModal({ open, onClose, data }: Props) {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open) setPrinting(false);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Facture"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            <Button
              type="button"
              loading={printing}
              onClick={() => setPrinting(true)}
            >
              <Printer className="h-4 w-4" strokeWidth={1.5} />
              Imprimer
            </Button>
          </div>
        }
      >
        <div className="flex justify-center bg-bg py-2">
          <OrderInvoiceReceipt data={data} />
        </div>
      </Modal>
      {printing && (
        <OrderInvoicePrintPortal data={data} onDone={() => setPrinting(false)} />
      )}
    </>
  );
}

function OrderInvoicePrintPortal({
  data,
  onDone,
}: {
  data: OrderInvoiceReceiptData;
  onDone: () => void;
}) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `Facture_${data.invoiceNumber ?? data.orderId}`;

    const after = () => {
      document.title = prevTitle;
      onDone();
    };

    window.addEventListener("afterprint", after);
    const t = window.setTimeout(() => window.print(), 200);

    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", after);
    };
  }, [data.invoiceNumber, data.orderId, onDone]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="invoice-print-root">
      <OrderInvoiceReceipt data={data} rootId="invoice-print-page" />
    </div>,
    document.body,
  );
}