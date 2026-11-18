import type { MaintenanceRule } from "../../components/maintenance/maintenanceState";
import { adminAuth as auth, adminPersistenceReady } from "./adminFirebase";

export type AdminIdentity = { uid: string; email: string; name: string; reviewer: boolean };
export type AdminRow = Record<string, unknown> & { id: string };
export type AdminPage = { items: AdminRow[]; total: number; page: number; size: number };
export type AdminSettings = { maintenance: boolean; maintenance_reason: string; maintenance_ends_at: string | null; service_maintenance: Record<string, MaintenanceRule>; upload_limit_mb: number; support_email: string; support_phone: string; services: Record<string, boolean> };
export type DashboardData = { totals: Record<string, number>; chart: { date: string; analyzed: number; failed: number }[]; activity: AdminRow[]; services: Record<string, boolean>; maintenance: boolean; ocr_available: boolean; generated_at: string };
const BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "") + "/api/admin";

export async function adminFetch(path: string, options: RequestInit = {}) {
  await adminPersistenceReady;
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("Sign in with an administrator account.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${await auth.currentUser.getIdToken()}`);
  if (options.body) headers.set("Content-Type", "application/json");
  return fetch(BASE + path, { ...options, headers });
}
export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await adminFetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Admin request failed (${response.status}).`);
  return data as T;
}
export const textValue = (value: unknown): string => value == null ? "" : typeof value === "object" ? Array.isArray(value) ? value.map(textValue).join(", ") : JSON.stringify(value) : String(value);
export const dateValue = (value: unknown) => { const date = new Date(textValue(value)); return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
export const serviceNames: Record<string, string> = { prescription: "Prescription Analyzer", medicine: "Medicine Recommender", blood_donation: "Blood Donation", blood_requirement: "Blood Requirement", organ_donation: "Organ Donation", organ_requirement: "Organ Requirement" };
