"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatDateTime } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-method";
import { cn } from "@/lib/utils";

export type OrderInvoiceReceiptData = {
  orderId: string;
  invoiceNumber: string | null;
  createdAt: string | null;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleTypeName: string;
  serviceItems: { name: string; price: number }[];
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string;
  employeeName: string | null;
  pickupCode: string | null;
};

function amountShort(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} F`;
}

function Divider() {
  return <hr className="my-2 border-0 border-t border-line" />;
}

type Props = {
  data: OrderInvoiceReceiptData;
  className?: string;
  rootId?: string;
};

export function OrderInvoiceReceipt({ data, className, rootId }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const invoiceNo = data.invoiceNumber ?? data.orderId.slice(0, 8);
  const plate =
    data.vehiclePlate && data.vehiclePlate !== "—"
      ? data.vehiclePlate
      : data.vehicleTypeName;

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(data.orderId, { margin: 1, width: 140 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [data.orderId]);

  return (
    <article
      id={rootId}
      className={cn(
        "relative mx-auto w-[min(100%,300px)] overflow-hidden rounded-sm bg-surface px-5 py-5 text-center text-ink shadow-card",
        className,
      )}
    >
      <ReceiptWatermark />
      <div className="relative z-10 flex flex-col items-center">
        <Image
          src="/brand/logo-salam.jpg"
          alt=""
          width={60}
          height={60}
          unoptimized
          className="h-[60px] w-[60px] object-contain"
        />
        <p className="mt-2 text-base font-bold tracking-tight">LAVERIE AUTOMOBILE</p>
        <p className="text-[11px] text-muted">Votre satisfaction, notre priorité</p>
        <Divider />
        <p className="text-2xl font-bold tracking-wide tabular-nums">{plate}</p>
        <Divider />
        <p className="text-xs font-bold">Facture N°: {invoiceNo}</p>
        <p className="text-[11px] text-muted">
          {data.createdAt ? formatDateTime(data.createdAt) : "—"}
        </p>
        {data.pickupCode && (
          <p className="mt-1 text-[11px]">
            Code retrait : <strong className="tabular-nums">{data.pickupCode}</strong>
          </p>
        )}
        <div className="mt-2 w-full text-left text-[11px]">
          <p>Client: {data.customerName}</p>
          {data.customerPhone && <p>Tél: {data.customerPhone}</p>}
        </div>
        <Divider />
        <p className="w-full text-left text-xs font-bold">SERVICES:</p>
        <ul className="mt-1 w-full space-y-0.5 text-left text-[11px]">
          {data.serviceItems.map((item) => (
            <li key={item.name} className="flex justify-between gap-2">
              <span className="min-w-0 truncate">- {item.name}</span>
              <span className="shrink-0 tabular-nums">{amountShort(item.price)}</span>
            </li>
          ))}
        </ul>
        <Divider />
        {data.discountAmount > 0 && (
          <div className="w-full space-y-0.5 text-left text-[11px]">
            <p className="flex justify-between">
              <span>Sous-total</span>
              <span className="tabular-nums">{amountShort(data.subtotal)}</span>
            </p>
            <p className="flex justify-between text-danger">
              <span>Remise</span>
              <span className="tabular-nums">-{amountShort(data.discountAmount)}</span>
            </p>
          </div>
        )}
        <p className="mt-1 w-full text-left text-xs font-bold">NET À PAYER</p>
        <p className="text-base font-bold text-primary-dark tabular-nums">
          {amountShort(data.finalAmount)}
        </p>
        <div className="mt-3 w-full rounded-md border-[1.5px] border-ink px-2 py-2">
          <p className="text-[11px] font-bold">TOTAL À RÉGLER</p>
          <p className="text-[22px] font-bold leading-tight tabular-nums">
            {amountShort(data.finalAmount)}
          </p>
          <p className="mt-1 text-[9px] text-muted">
            Mode: {paymentMethodLabel(data.paymentMethod)}
          </p>
        </div>
        {data.employeeName && (
          <p className="mt-3 w-full text-left text-[11px]">Employé: {data.employeeName}</p>
        )}
        <div className="mt-4 flex flex-col items-center">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="" width={70} height={70} className="h-[70px] w-[70px]" />
          ) : (
            <div className="h-[70px] w-[70px] animate-pulse rounded bg-primary-softer" />
          )}
          <p className="mt-1 font-mono text-[7px] text-muted">ID: {data.orderId.slice(0, 12)}</p>
        </div>
        <Divider />
        <p className="text-xs font-bold">Merci de votre visite !</p>
      </div>
    </article>
  );
}

function ReceiptWatermark() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <Image
        src="/brand/logo-salam.jpg"
        alt=""
        width={250}
        height={250}
        unoptimized
        className="opacity-[0.08] object-contain"
      />
    </div>
  );
}