import { auth } from "../../firebase";

export const RX_API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "") + "/api/prescription";

export type RxPrescribed = {
  dose: string; frequency: string; duration: string; morning: string; afternoon: string; evening: string; night: string; meal_instructions: string; schedule_code: string;
};
export type RxDocumentField = { key: string; label: string; value: string; source_text: string; user_confirmed?: boolean };
export type RxDocumentDetails = { fields: RxDocumentField[]; remaining_text: string; reviewed: boolean; note?: string };
export type RxMedicine = {
  medicine_name: string;
  strength: string;
  dosage_form: string;
  instructions?: string;
  prescribed?: Partial<RxPrescribed>;
  source_text?: string;
  generic_name?: string | null;
  needs_verification?: boolean;
  reference_status?: string;
  reference_note?: string;
  uses?: string[];
  side_effects?: string[];
  precautions?: string[];
  age_restrictions?: Record<string, string | null>;
  sources?: { title: string; url: string }[];
  pharmacy_options?: { store: string; url: string }[];
};
export type RxRecord = {
  id: string;
  filename: string;
  created_at: string;
  updated_at: string;
  status: "processing" | "needs_review" | "completed" | "failed";
  medicines: RxMedicine[];
  raw_text?: string;
  document_details?: RxDocumentDetails;
  ocr_provider?: string;
  ocr_confidence?: number | null;
  page_count?: number;
  error?: string;
  warnings?: string[];
  version?: number;
};
export type RxCapabilities = { available: boolean; provider: string; multilingual: boolean; pdf: boolean; max_pages: number; message: string };

export async function rxFetch(path: string, options: RequestInit = {}) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to view or analyze your prescriptions.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  return fetch(RX_API + path, { ...options, headers });
}

export async function rxRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await rxFetch(path, options);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : `Prescription request failed (${response.status}).`);
  return (result.data ?? result) as T;
}

export function rxDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export { statusLabel } from "./prescriptionStatus";
