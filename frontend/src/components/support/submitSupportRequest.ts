import { auth } from "../../firebase";

export type ContactService = "general" | "blood_donation" | "blood_requirement" | "organ_donation" | "organ_requirement" | "medicine" | "prescription";
export type ContactMessage = { name: string; email: string; subject: string; message: string };

export async function submitSupportRequest(form: ContactMessage, service: ContactService) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in before sending a support message.");
  const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
  if (!payload.name || !payload.email || payload.subject.length < 3 || payload.message.length < 5) {
    throw new Error("Enter your name, email, a subject, and a message of at least 5 characters.");
  }
  const base = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const response = await fetch(`${base}/api/admin/support/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ ...payload, service }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Your message could not be saved. Please check the fields and try again.");
  return result as { id: string; success: boolean };
}
