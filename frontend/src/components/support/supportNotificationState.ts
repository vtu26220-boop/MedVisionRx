import { maintenanceServices } from "../maintenance/maintenanceState";
export function supportServiceForPath(pathname: string): string | null {
  if (pathname === "/services") return "general";
  return Object.entries(maintenanceServices).find(([, value]) => pathname === value.path || pathname === value.path + "/dashboard")?.[0] || null;
}
export type SupportNotification = { id: string; ticket_id: string; subject: string; request_message: string; message: string; service: string; created_at: string; read_at: string | null; feedback: "helpful" | "not_helpful" | null; cleared_at: string | null };
