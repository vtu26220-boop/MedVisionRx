import { useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../../firebase";
import { submitSupportRequest } from "../../components/support/submitSupportRequest";
import logo from "../../assets/medvisionrx-logo.png";
import "./PublicForms.css";
export default function Contact() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  useEffect(() => onAuthStateChanged(auth, (account) => { setUser(account); setReady(true); if (account) setForm((current) => ({ ...current, name: current.name || account.displayName || "", email: current.email || account.email || "" })); }), []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try { await submitSupportRequest(form, "general"); setNotice("Your support request has been saved. The MedVisionRx administrator can review it in Support."); setForm((current) => ({ ...current, subject: "", message: "" })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save your message."); }
    finally { setBusy(false); }
  };
  return <main className="mv-public-form-page"><section className="mv-public-form-card">
    <Link to="/" className="mv-public-form-brand"><img src={logo} alt="MedVisionRx logo" /><strong>MedVisionRx</strong></Link>
    <h1>Contact MedVisionRx</h1><p>Send questions about your account or website services to the support team. For a medical emergency, contact your local emergency service.</p>
    {error && <div className="mv-form-error" role="alert">{error}</div>}{notice && <div className="mv-form-success" role="status">{notice}</div>}
    {ready && !user && <p>Please <Link to="/login">log in</Link> to send a support request.</p>}
    <form onSubmit={submit}><fieldset disabled={busy || !user || !ready}>
      <label>Your name<input required maxLength={120} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Subject<input required minLength={3} maxLength={150} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label>
      <label>Message<textarea required minLength={5} maxLength={4000} rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label>
      <button type="submit">{busy ? "Sending..." : "Send support request"}</button>
    </fieldset></form><Link className="mv-form-secondary" to="/services">Return to services</Link>
  </section></main>;
}
