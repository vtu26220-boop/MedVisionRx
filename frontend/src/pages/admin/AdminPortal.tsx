import { openWebsiteAsAdmin, signOutAdministrator } from "../../components/admin-access/adminSession";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { Activity, Bell, Building2, ChevronDown, ChevronRight, ClipboardCheck, Droplet, ExternalLink, FileText, Headphones, Hospital, LayoutDashboard, LogOut, Menu, Moon, Pill, Settings, ShieldCheck, Sun, Users } from "lucide-react";
import { adminAuth as auth, adminPersistenceReady } from "./adminFirebase";
import { useTheme } from "../../context/useTheme";
import logo from "../../assets/medvisionrx-logo.png";
import bloodDonationImage from "../../assets/blood-donation-welcome.jpg";
import bloodRequirementImage from "../../assets/home/blood-requirement-hero.png";
import prescriptionImage from "../prescription/assets/prescription-welcome.jpg";
import organDonationImage from "../../assets/organ-donation-welcome.jpg";
import organRequirementImage from "../../assets/organ-requirement-welcome.jpg";
import medicineImage from "../../assets/medicine-service.jpg";

const loginServices = [
  { label: "Blood Donation", image: bloodDonationImage },
  { label: "Blood Requirement", image: bloodRequirementImage },
  { label: "Prescription Analysis", image: prescriptionImage },
  { label: "Organ Donation", image: organDonationImage },
  { label: "Organ Requirement", image: organRequirementImage },
  { label: "Medicine Recommender", image: medicineImage },
];
import { adminRequest, type AdminIdentity } from "./adminApi";
import { Empty, ErrorNotice } from "./AdminShared";
import AdminDashboard from "./AdminDashboard.tsx";
import AdminRecords from "./AdminRecords";
import AdminSettingsPage from "./AdminSettings.tsx";
import "./AdminPortal.css";

const navigation = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard }, { slug: "users", label: "Users", icon: Users },
  { slug: "prescriptions", label: "Prescriptions", icon: FileText }, { slug: "medicines", label: "Medicine Catalogue", icon: Pill },
  { slug: "blood", label: "Blood Services", icon: Droplet }, { slug: "blood-banks", label: "Blood Banks", icon: Building2 },
  { slug: "organ", label: "Organ Services", icon: Activity }, { slug: "organ-banks", label: "Organ Banks", icon: Hospital },
  { slug: "support", label: "Support", icon: Headphones }, { slug: "activity", label: "Activity Log", icon: ClipboardCheck }, { slug: "settings", label: "Settings", icon: Settings },
];
export default function AdminPortal() {
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const navigate = useNavigate();
  const [websiteBusy,setWebsiteBusy] = useState(false);
  const viewWebsite = async () => { setWebsiteBusy(true); setError(""); try { await openWebsiteAsAdmin(); navigate("/services"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open the website."); } finally { setWebsiteBusy(false); } };
  const location = useLocation(); const { theme, toggleTheme } = useTheme(); const [mobile, setMobile] = useState(false);
  const slug = location.pathname.replace(/^\/admin\/?/, "").split("/")[0];
  const current = navigation.find((item) => item.slug === slug);
  useEffect(() => {
    let controller = new AbortController();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      controller.abort(); controller = new AbortController(); const signal = controller.signal;
      setIdentity(null); setError(""); setLoading(true);
      if (!user) { setLoading(false); return; }
      adminRequest<AdminIdentity>("/me", { signal }).then((data) => { if (!signal.aborted) setIdentity(data); }).catch((reason: unknown) => { if (!signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to verify administrator access."); }).finally(() => { if (!signal.aborted) setLoading(false); });
    });
    return () => { controller.abort(); unsubscribe(); };
  }, []);
  if (loading) return <div className="admin-app ad-access"><img src={logo} alt="MedVisionRx" /><p>Verifying administrator access...</p></div>;
  if (!identity) return <LoginScreen error={error} />;
  return <div className="admin-app">
    {mobile && <button className="ad-backdrop" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`ad-sidebar ${mobile ? "ad-sidebar-open" : ""}`}>
      <Link className="ad-brand" to="/admin"><img src={logo} alt="MedVisionRx logo" /><span><strong>MedVisionRx</strong><small>Admin Portal</small></span></Link>
      <nav>{navigation.map(({ slug: path, label, icon: Icon }) => <Link key={path} to={`/admin/${path}`} onClick={() => setMobile(false)} className={`ad-nav ${path === slug ? "ad-nav-active" : ""}`}><Icon size={20} /><span>{label}</span></Link>)}</nav>
      <div className="ad-sidebar-footer"><button className="ad-nav" disabled={websiteBusy} onClick={()=>void viewWebsite()}><ExternalLink size={19} />{websiteBusy ? "Opening website..." : "View Website"}</button><button className="ad-nav" onClick={() => void signOutAdministrator().catch(() => setError("Unable to sign out. Try again."))}><LogOut size={19} />Logout</button></div>
    </aside>
    <div className="ad-main"><header className="ad-topbar"><div className="ad-breadcrumb"><button className="ad-icon ad-mobile-menu" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={20} /></button><button className="ad-link" disabled={websiteBusy} onClick={()=>void viewWebsite()}>Home</button><ChevronRight size={15} /><Link to="/admin">Admin</Link><ChevronRight size={15} /><strong>{current?.label || "Page not found"}</strong></div><div className="ad-top-actions"><button className="ad-icon" aria-label="Toggle theme" onClick={toggleTheme}>{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}</button><Link to="/admin/support" className="ad-icon" aria-label="Open support requests"><Bell size={19} /></Link><span className="ad-avatar"><ShieldCheck size={21} /></span><span className="ad-user"><strong>{identity.name}</strong><small>{identity.reviewer ? "Administrator / Reviewer" : "Administrator"}</small></span><ChevronDown size={15} /></div></header>
      <main className="ad-content"><ErrorNotice message={error} />{!current ? <Empty text="This admin page does not exist." /> : slug === "" ? <AdminDashboard /> : slug === "settings" ? <AdminSettingsPage /> : <AdminRecords key={slug} section={slug} title={current.label} identity={identity} />}</main>
      <footer className="ad-footer">MedVisionRx Administration <span>Protected administrator workspace</span></footer>
    </div>
  </div>;
}
function LoginScreen({ error: accessError }: { error: string }) {
  const [email, setEmail] = useState("medvisionrx@gmail.com"); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const login = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { await adminPersistenceReady; await signInWithEmailAndPassword(auth, email.trim(), password); } catch { setError("Unable to sign in. Check the administrator email and password."); } finally { setBusy(false); } };
  const reset = async () => { setBusy(true); setError(""); try { await sendPasswordResetEmail(auth, email.trim()); setNotice("If this account supports password sign-in, check its inbox for reset instructions."); } catch { setError("Unable to request a password reset. Check the email and try again."); } finally { setBusy(false); } };
  return <div className="admin-app ad-login">
    <div className="ad-login-background" aria-hidden="true">
      {loginServices.map((service, index) => <div key={service.label} className={`ad-login-float ad-login-float-${index + 1}`}>
        <img src={service.image} alt="" />
        <span>{service.label}</span>
      </div>)}
    </div>
    <section className="ad-login-card" aria-labelledby="admin-login-title">
      <div className="ad-login-heading">
        <img src={logo} alt="MedVisionRx" />
        <span className="ad-eyebrow">MEDVISIONRX ADMINISTRATION</span>
        <h1 id="admin-login-title">Admin Portal</h1>
        <p>Sign in with an account that has been granted administrator access.</p>
      </div>
      <ErrorNotice message={error || accessError} />
      {notice && <div className="ad-notice" role="status">{notice}</div>}
      {auth.currentUser && accessError ? <>
        <p>Signed in as {auth.currentUser.email}. This session has no verified administrator access.</p>
        <button className="admin-login-submit" disabled={busy} onClick={() => void signOutAdministrator()}>Switch account</button>
      </> : <form onSubmit={login}>
        <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button type="button" className="admin-login-reset" disabled={busy || !email} onClick={reset}>Forgot password?</button>
        <button type="submit" className="admin-login-submit" disabled={busy}>{busy ? "Signing in..." : "Sign in to Admin Portal"}</button>
      </form>}
      <Link className="ad-secondary ad-return-website" to="/services"><ExternalLink size={16} />Return to website</Link>
    </section>
  </div>;
}
