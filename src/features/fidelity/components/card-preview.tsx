"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { formatExpiryOnCard } from "@/lib/fidelity-card-status";
import { lineCodeBarreLabel } from "@/lib/fidelity-format";
import { cn } from "@/lib/utils";

/** Gabarit mobile 1024×640 — calé sur FidelityCardPdfService */
const DESIGN = {
  w: 1024,
  h: 640,
  valueX: 118,
  valuePadLeft: 34,
  valueW: 388,
  valueBandH: 30,
  valueLineY: [315, 401, 483],
  valueFontPx: [23, 21, 20],
  qrFrameX: 741,
  qrFrameY: 249,
  qrFrameW: 175,
  qrFrameH: 169,
  qrPadding: 14,
  barFrameX: 613,
  barFrameY: 500,
  barFrameW: 361,
  barFrameH: 86,
  barInsetH: 10,
  barInsetV: 8,
} as const;

export type CardPreviewData = {
  detenteurNom: string;
  numeroSerie: string;
  codeBarre: string;
  qrPayload: string;
  validUntil?: string | null;
};

type Props = {
  data: CardPreviewData;
  className?: string;
  /** Taille fixe (impression) — évite le redimensionnement responsive */
  printWidthPx?: number;
};

export function FidelityCardPreview({ data, className, printWidthPx }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(
    printWidthPx ? printWidthPx / DESIGN.w : 1,
  );
  const [qrUrl, setQrUrl] = useState<string>("");
  const barcodeRef = useRef<SVGSVGElement>(null);
  const codeLabel = lineCodeBarreLabel(data.codeBarre, data.numeroSerie);
  const nom = data.detenteurNom.trim() ? data.detenteurNom.trim().toUpperCase() : "—";

  useEffect(() => {
    if (printWidthPx) {
      setScale(printWidthPx / DESIGN.w);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setScale(entry.contentRect.width / DESIGN.w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [printWidthPx]);

  useEffect(() => {
    const payload = data.qrPayload || "pending";
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 240,
      color: { dark: "#000000", light: "#FFFFFF" },
    }).then(setQrUrl);
  }, [data.qrPayload]);

  useEffect(() => {
    if (!barcodeRef.current || !codeLabel) return;
    try {
      JsBarcode(barcodeRef.current, codeLabel, {
        format: "CODE128",
        displayValue: false,
        height: Math.max(28, 48 * scale),
        margin: 0,
        background: "transparent",
        width: 1.4,
      });
    } catch {
      /* ignore invalid barcode data while typing */
    }
  }, [codeLabel, scale]);

  const expiryShort = formatExpiryOnCard(data.validUntil);
  const line3 = expiryShort ?? "—";
  const texts = [nom, data.numeroSerie || "—", line3];

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden rounded-panel border border-line shadow-card",
        printWidthPx ? "h-full w-full max-w-full" : "w-full",
        className,
      )}
      style={{
        aspectRatio: printWidthPx ? undefined : `${DESIGN.w} / ${DESIGN.h}`,
        ...(printWidthPx
          ? { width: "100%", height: "100%", maxWidth: printWidthPx }
          : {}),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/carte-fidelite.png"
        alt="Gabarit carte de fidélité Salam Wash Station"
        className="absolute inset-0 h-full w-full object-fill"
      />

      {DESIGN.valueLineY.map((lineY, i) => {
        const fontPx = (DESIGN.valueFontPx[i] ?? 20) * scale;
        const top = (lineY - DESIGN.valueBandH) * scale;
        const left = DESIGN.valueX * scale;
        const width = DESIGN.valueW * scale;
        const height = DESIGN.valueBandH * scale;
        const padLeft = DESIGN.valuePadLeft * scale;

        return (
          <div
            key={lineY}
            className="absolute flex items-end justify-start"
            style={{
              left,
              top,
              width,
              height,
              paddingLeft: padLeft,
              paddingBottom: Math.max(1, scale),
              color: "#0A1F44",
              fontWeight: 700,
              fontSize: fontPx,
              lineHeight: 1,
              letterSpacing: "0.02em",
            }}
          >
            <span
              className="block max-w-full overflow-visible whitespace-nowrap"
              style={{
                transform:
                  texts[i]!.length > 18
                    ? `scaleX(${Math.min(1, 17 / texts[i]!.length)})`
                    : undefined,
                transformOrigin: "left bottom",
              }}
            >
              {texts[i]}
            </span>
          </div>
        );
      })}

      <div
        className="absolute flex items-center justify-center bg-white"
        style={{
          left: DESIGN.qrFrameX * scale,
          top: DESIGN.qrFrameY * scale,
          width: DESIGN.qrFrameW * scale,
          height: DESIGN.qrFrameH * scale,
          padding: DESIGN.qrPadding * scale,
        }}
      >
        {qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrUrl} alt="QR code carte" className="h-full w-full object-contain" />
        ) : (
          <div className="h-full w-full animate-pulse bg-line/40" />
        )}
      </div>

      <div
        className="absolute flex items-center justify-center"
        style={{
          left: DESIGN.barFrameX * scale,
          top: DESIGN.barFrameY * scale,
          width: DESIGN.barFrameW * scale,
          height: DESIGN.barFrameH * scale,
          padding: `${DESIGN.barInsetV * scale}px ${DESIGN.barInsetH * scale}px`,
        }}
      >
        <svg ref={barcodeRef} className="h-[88%] w-full max-w-full" preserveAspectRatio="xMidYMid meet" />
      </div>
    </div>
  );
}