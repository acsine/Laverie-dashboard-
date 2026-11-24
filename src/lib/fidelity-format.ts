/** Helpers fidélité utilisables côté client et serveur (sans Node crypto). */

export function formatSerial(value: number): string {
  return `SW-${value.toString().padStart(8, "0")}`;
}

export function buildLinearBarcodeValue(serial: number): string {
  return `SW${serial.toString().padStart(10, "0")}`;
}

export function lineCodeBarreLabel(codeBarre: string, numeroSerie: string): string {
  const code = codeBarre.trim();
  if (code.length <= 20 && /^[A-Za-z0-9\-]+$/.test(code)) return code;
  return numeroSerie.replaceAll("-", "");
}

/** Contenu QR : nom du détenteur + numéro de carte (lisible en caisse). */
export function buildQrPayload(detenteurNom: string, numeroSerie: string): string {
  const nom = detenteurNom.trim().toUpperCase().replace(/\s+/g, " ");
  return `${nom}|${numeroSerie.trim()}`;
}
