import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ArrowLeft } from "lucide-react";
import logo from "../../assets/medvisionrx-logo.png";
import illustration from "./maintenance-kit.png";
import type { MaintenanceRule } from "./maintenanceState";
import "./Maintenance.css";

export default function MaintenancePage({ rule, service = "", clockOffset = 0 }: { rule: MaintenanceRule; service?: string; clockOffset?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const end = rule.ends_at ? new Date(rule.ends_at).getTime() : null;
  const remaining = end === null ? null : Math.max(0, Math.ceil((end - now - clockOffset) / 1000));
  const blocks = remaining === null ? [] : [[Math.floor(remaining / 3600), "HOURS"], [Math.floor(remaining / 60) % 60, "MINUTES"], [remaining % 60, "SECONDS"]];
  return <div className="mv-maintenance"><header className="mv-maintenance-brand"><img src={logo} alt="MedVisionRx logo" /><div><strong>MedVisionRx</strong><span>Healthcare Platform</span></div></header><main className="mv-maintenance-main"><section className="mv-maintenance-card" aria-labelledby="maintenance-title"><div className="mv-maintenance-hero"><div className="mv-maintenance-copy"><img className="mv-maintenance-logo" src={logo} alt="" /><span className="mv-maintenance-badge">TEMPORARY MAINTENANCE</span><h1 id="maintenance-title">{service ? `${service} is under maintenance` : "We'll be back shortly"}</h1><p>We're improving {service || "MedVisionRx"} to serve you better.</p></div><img className="mv-maintenance-art" src={illustration} alt="Medical kit with a maintenance wrench and gear" /></div><div className="mv-maintenance-reason"><CalendarClock size={38} aria-hidden="true" /><div><h2>Reason for maintenance</h2><p>{rule.reason || "Scheduled system updates and performance improvements."}</p></div></div>{end !== null && <div className="mv-maintenance-schedule"><p className="mv-maintenance-return">Expected return: {new Date(end).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} IST</p><div className="mv-maintenance-clock" aria-label="Time until expected return">{blocks.map(([value, label]) => <div key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>)}</div>{remaining === 0 && <p role="status">Checking service availability...</p>}</div>}<p className="mv-maintenance-auto">{end === null ? "We'll reopen this page automatically when maintenance is complete." : "This page will reopen automatically when maintenance ends."}</p>{service && <div className="mv-maintenance-other"><p>Other services remain available.</p><Link to="/services"><ArrowLeft size={17} />Back to services</Link></div>}</section><p className="mv-maintenance-thanks">Thank you for your patience.</p></main></div>;
}
