export {
  formatSerial,
  buildLinearBarcodeValue,
  lineCodeBarreLabel,
  buildQrPayload,
} from "@/lib/fidelity-format";

/** @deprecated Utiliser buildQrPayload (nom|série). Conservé pour compat cache dev. */
export { buildQrPayload as buildScanPayload } from "@/lib/fidelity-format";
