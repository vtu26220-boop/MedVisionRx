export type MaintenanceRule = { enabled: boolean; reason: string; ends_at: string | null };
export type MaintenanceStatus = { website: MaintenanceRule; services: Record<string, MaintenanceRule>; server_time: string };
export const maintenanceServices: Record<string, { name: string; path: string }> = {
  prescription: { name: "Prescription Analyzer", path: "/prescription" },
  medicine: { name: "Medicine Recommender", path: "/medicine-recommender" },
  blood_donation: { name: "Blood Donation", path: "/blood-donation" },
  blood_requirement: { name: "Blood Requirement", path: "/blood-requirement" },
  organ_donation: { name: "Organ Donation", path: "/organ-donation" },
  organ_requirement: { name: "Organ Requirement", path: "/organ-requirement" },
};
export const maintenanceEndpoint = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "") + "/api/admin/maintenance-status";
export function maintenanceForPath(status: MaintenanceStatus, pathname: string) {
  if (status.website.enabled) return { rule: status.website, service: "" };
  const entry = Object.entries(maintenanceServices).find(([, service]) => pathname === service.path || pathname.startsWith(service.path + "/"));
  return entry && status.services[entry[0]]?.enabled ? { rule: status.services[entry[0]], service: entry[1].name } : null;
}
export function istInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).replace(" ", "T");
}
export function fromIstInput(value: string) { return value ? new Date(value + ":00+05:30").toISOString() : null; }
