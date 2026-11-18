import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import MaintenancePage from "./MaintenancePage";
import { maintenanceEndpoint, maintenanceForPath, type MaintenanceStatus } from "./maintenanceState";
import logo from "../../assets/medvisionrx-logo.png";

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;
  return <PublicGate pathname={pathname}>{children}</PublicGate>;
}
function PublicGate({ children, pathname }: { children: ReactNode; pathname: string }) {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const selected = status ? maintenanceForPath(status, pathname) : null;
  const deadline = selected?.rule.ends_at;
  useEffect(() => {
    let alive = true, fetching = false;
    const controller = new AbortController();
    const update = async () => {
      if (fetching) return;
      fetching = true;
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(maintenanceEndpoint, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Availability check failed");
        const data: MaintenanceStatus = await response.json();
        if (!data.website || !data.services || !data.server_time) throw new Error("Invalid availability response");
        if (alive) { setStatus(data); setOffset(new Date(data.server_time).getTime() - Date.now()); setError(""); }
      } catch { if (alive) setError("We couldn't check website availability. Please try again."); }
      finally { window.clearTimeout(timeout); fetching = false; }
    };
    void update();
    const timer = window.setInterval(() => { if (!controller.signal.aborted) void update(); else if (alive) setRevision((value) => value + 1); }, 5000);
    window.addEventListener("focus", update);
    return () => { alive = false; controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, [pathname, revision]);
  useEffect(() => {
    if (!deadline) return;
    const delay = new Date(deadline).getTime() - Date.now() - offset;
    if (delay <= 0 || delay > 2147480000) return;
    const timer = window.setTimeout(() => setRevision((value) => value + 1), delay + 50);
    return () => window.clearTimeout(timer);
  }, [deadline, offset]);
  if (selected) return <MaintenancePage rule={selected.rule} service={selected.service} clockOffset={offset} />;
  if (!status) return <div className="mv-maintenance-loading" role="status"><img src={logo} alt="MedVisionRx" /><h1>{error ? "Unable to check availability" : "Welcome to MedVisionRx"}</h1><p>{error || "Checking website availability..."}</p>{error && <button onClick={() => setRevision((value) => value + 1)}>Try again</button>}</div>;
  return children;
}
