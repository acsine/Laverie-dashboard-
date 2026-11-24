"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs, Badge, Button, Select, toast } from "@/components/ui";
import {
  advanceOrderAction,
  assignOrderEmployeeAction,
  updateOrderStatusAction,
} from "@/server/orders/actions";
import {
  nextOrderActionLabel,
  normalizeOrderStatus,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/order-status";
import { useConfirm } from "@/hooks/use-confirm";
import { paymentMethodLabel } from "@/lib/payment-method";
import { OrderInvoiceModal } from "./order-invoice-modal";
import type { OrderInvoiceReceiptData } from "./order-invoice-receipt";

type Props = {
  order: {
    id: string;
    status: string;
    customerName: string;
    customerPhone: string;
    vehicleLabel: string;
    vehiclePlate: string;
    vehicleTypeName: string;
    serviceLabels: string;
    serviceItems: { name: string; price: number }[];
    subtotal: number;
    discountAmount: number;
    finalAmount: number;
    createdAt: string | null;
    totalLabel: string;
    discountLabel: string;
    paymentMethod: string;
    notes: string;
    invoiceNumber: string | null;
    pickupCode: string | null;
    washerName: string | null;
    assignedEmployeeId: string | null;
  };
  canEdit: boolean;
  washers: { value: string; label: string }[];
};

export function OrderDetailPage({ order, canEdit, washers }: Props) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [pendingAction, setPendingAction] = useState<
    "next" | "cancel" | "assign-only" | "assign-start" | null
  >(null);
  const [washerId, setWasherId] = useState(order.assignedEmployeeId ?? "");
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const invoiceData: OrderInvoiceReceiptData = {
    orderId: order.id,
    invoiceNumber: order.invoiceNumber,
    createdAt: order.createdAt,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    vehiclePlate: order.vehiclePlate,
    vehicleTypeName: order.vehicleTypeName,
    serviceItems: order.serviceItems,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    finalAmount: order.finalAmount,
    paymentMethod: order.paymentMethod,
    employeeName: order.washerName,
    pickupCode: order.pickupCode,
  };
  const status = normalizeOrderStatus(order.status);
  const actionLabel = nextOrderActionLabel(order.status);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Commandes", href: "/commandes" }, { label: order.invoiceNumber ?? order.id }]} />
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-ink">
          Commande {order.invoiceNumber ?? order.id}
        </h1>
        <Badge tone={orderStatusTone(status)}>{orderStatusLabel(status)}</Badge>
      </div>
      {order.pickupCode && (
        <p className="text-sm text-muted">
          Code retrait : <strong className="text-lg text-ink tabular-nums">{order.pickupCode}</strong>
        </p>
      )}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Client</dt>
          <dd className="font-medium">
            {order.customerName}
            {order.customerPhone && (
              <span className="block text-xs font-normal text-muted">{order.customerPhone}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Véhicule</dt>
          <dd className="font-medium">{order.vehicleLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Services</dt>
          <dd>{order.serviceLabels || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Montant</dt>
          <dd className="font-medium">{order.totalLabel}</dd>
        </div>
        <div>
          <dt className="text-muted">Remise</dt>
          <dd className="font-medium">{order.discountLabel}</dd>
        </div>
        <div>
          <dt className="text-muted">Paiement</dt>
          <dd className="font-medium">{paymentMethodLabel(order.paymentMethod)}</dd>
        </div>
        <div>
          <dt className="text-muted">Laveur</dt>
          <dd className="font-medium">{order.washerName ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Notes</dt>
          <dd>{order.notes || "—"}</dd>
        </div>
      </dl>

      {canEdit && status !== "cancelled" && status !== "delivered" && (
        <section className="space-y-3 rounded-panel border border-line bg-surface p-4">
          <h2 className="text-sm font-bold text-ink">Actions (comme sur mobile)</h2>
          <div className="flex flex-wrap gap-2">
            {actionLabel && (
              <Button
                type="button"
                loading={pendingAction === "next"}
                onClick={() => {
                  setPendingAction("next");
                  void (async () => {
                    try {
                      const res = await advanceOrderAction(order.id);
                      if (!res.ok) {
                        toast(res.error.message, "danger");
                        return;
                      }
                      toast("Étape suivante enregistrée", "success");
                      router.refresh();
                    } finally {
                      setPendingAction(null);
                    }
                  })();
                }}
              >
                {actionLabel}
              </Button>
            )}
          </div>
          <AssignWasherBlock
            washerId={washerId}
            setWasherId={setWasherId}
            washers={washers}
            assignPendingOnly={pendingAction === "assign-only"}
            assignPendingStart={pendingAction === "assign-start"}
            onAssign={(startWash: boolean) => {
              setPendingAction(startWash ? "assign-start" : "assign-only");
              void (async () => {
                try {
                  const res = await assignOrderEmployeeAction({
                    id: order.id,
                    assignedEmployeeId: washerId || null,
                    startWash,
                  });
                  if (!res.ok) {
                    toast(res.error.message, "danger");
                    return;
                  }
                  toast(startWash ? "Lavage démarré" : "Laveur assigné", "success");
                  router.refresh();
                } finally {
                  setPendingAction(null);
                }
              })();
            }}
          />
        </section>
      )}

      {canEdit && status !== "cancelled" && status !== "delivered" && (
        <Button
          type="button"
          variant="danger"
          loading={pendingAction === "cancel"}
          onClick={() => {
            confirm(
              {
                title: "Annuler la commande",
                description: "Annuler cette commande ?",
                confirmLabel: "Annuler la commande",
              },
              () => {
                setPendingAction("cancel");
                void (async () => {
                  try {
                    const res = await updateOrderStatusAction({ id: order.id, status: "cancelled" });
                    if (!res.ok) {
                      toast(res.error.message, "danger");
                      return;
                    }
                    toast("Commande annulée", "success");
                    router.refresh();
                  } finally {
                    setPendingAction(null);
                  }
                })();
              },
            );
          }}
        >
          Annuler la commande
        </Button>
      )}
      <Button type="button" variant="secondary" onClick={() => setInvoiceOpen(true)}>
        Aperçu facture
      </Button>
      <OrderInvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} data={invoiceData} />
      {confirmDialog}
    </div>
  );
}

function AssignWasherBlock({
  washerId,
  setWasherId,
  washers,
  assignPendingOnly,
  assignPendingStart,
  onAssign,
}: {
  washerId: string;
  setWasherId: (v: string) => void;
  washers: { value: string; label: string }[];
  assignPendingOnly: boolean;
  assignPendingStart: boolean;
  onAssign: (startWash: boolean) => void;
}) {
  const assignBusy = assignPendingOnly || assignPendingStart;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[12rem] flex-1">
        <Select
          label="Assigner un laveur"
          options={[{ value: "", label: "— Choisir —" }, ...washers]}
          value={washerId}
          disabled={assignBusy}
          onChange={setWasherId}
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        loading={assignPendingOnly}
        disabled={!washerId || assignBusy}
        onClick={() => onAssign(false)}
      >
        Assigner
      </Button>
      <Button
        type="button"
        loading={assignPendingStart}
        disabled={!washerId || assignBusy}
        onClick={() => onAssign(true)}
      >
        Assigner et démarrer
      </Button>
    </div>
  );
}