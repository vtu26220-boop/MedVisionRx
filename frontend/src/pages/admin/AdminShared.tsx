import { useEffect, useRef, type ReactNode } from "react";
import { BookOpen, X } from "lucide-react";
import { textValue } from "./adminApi";

export function ErrorNotice({ message }: { message: string }) { return message ? <div className="ad-error" role="alert">{message}</div> : null; }
export function Status({ value }: { value: unknown }) { const label = textValue(value) || "Not recorded"; return <span className={`ad-status ad-status-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>{label.replace(/_/g, " ")}</span>; }
export function Empty({ text = "No records found." }: { text?: string }) { return <div className="ad-empty"><BookOpen size={30} /><p>{text}</p></div>; }
export function AdminModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab" || !ref.current) return;
      const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]'));
      if (!nodes.length) return;
      const first=nodes[0], last=nodes[nodes.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", key); previous?.focus(); };
  }, []);
  return <div className="ad-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="ad-modal" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" ref={ref}><div className="ad-card-title"><h2 id="admin-dialog-title">{title}</h2><button className="ad-icon" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>{children}</section></div>;
}
