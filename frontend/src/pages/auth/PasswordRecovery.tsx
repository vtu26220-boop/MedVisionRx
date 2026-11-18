import { useEffect, useState, type FormEvent } from "react";
import { confirmPasswordReset, sendPasswordResetEmail, verifyPasswordResetCode } from "firebase/auth";
import { Link, useSearchParams } from "react-router-dom";
import { auth } from "../../firebase";
import logo from "../../assets/medvisionrx-logo.png";
import "../public/PublicForms.css";

export default function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const [params] = useSearchParams();
  const code = params.get("oobCode") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifiedCode, setVerifiedCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!reset || !code) return;
    let active = true;
    verifyPasswordResetCode(auth, code).then((address) => { if (active) { setEmail(address); setVerifiedCode(code); } }).catch(() => { if (active) setError("This reset link is invalid or expired. Request a new password reset email."); });
    return () => { active = false; };
  }, [reset, code]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    if (reset && (password.length < 6 || password !== confirmation)) { setError("Use at least 6 characters and make sure both passwords match."); return; }
    setBusy(true);
    try {
      if (reset) {
        if (!code || verifiedCode !== code) throw new Error("Request a new reset link before changing your password.");
        await confirmPasswordReset(auth, code, password);
        setPassword(""); setConfirmation(""); setVerifiedCode("");
        setNotice("Your password has been changed. You can now log in with your new password.");
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice("If this email belongs to an account with password sign-in, check its inbox and spam folder for reset instructions.");
      }
    } catch (reason) {
      const firebaseCode = (reason as { code?: string }).code;
      if (!reset && firebaseCode === "auth/user-not-found") setNotice("If this email belongs to an account with password sign-in, check its inbox and spam folder for reset instructions.");
      else setError(reset ? "Unable to reset your password. The link may have expired, or the password may not meet the account requirements. Request a new link and try again." : "Unable to send the reset email. Check the email address and your connection, then try again.");
    } finally { setBusy(false); }
  };
  const canReset = verifiedCode === code && !!code;
  return <main className="mv-public-form-page"><section className="mv-public-form-card">
    <Link to="/" className="mv-public-form-brand"><img src={logo} alt="MedVisionRx logo" /><strong>MedVisionRx</strong></Link>
    <h1>{reset ? "Reset Password" : "Forgot Password"}</h1>
    <p>{reset ? "Choose a new password for your MedVisionRx account." : "Enter your account email to receive a password reset link."}</p>
    {error && <div className="mv-form-error" role="alert">{error}</div>}{notice && <div className="mv-form-success" role="status">{notice}</div>}
    {reset && !code ? <p>Open the link in your password reset email to continue. If you do not have a link, request one below.</p> : <form onSubmit={submit}>
      <label>Email address<input type="email" required autoComplete="email" value={email} readOnly={reset} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></label>
      {reset && <><label>New password<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy || !canReset} /></label><label>Confirm new password<input type="password" required minLength={6} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy || !canReset} /></label></>}
      <button type="submit" disabled={busy || (reset && !canReset)}>{busy ? "Please wait..." : reset ? "Save new password" : "Send reset link"}</button>
    </form>}
    {reset && <Link className="mv-form-secondary" to="/forgot-password">Request a new reset link</Link>}
    <Link className="mv-form-secondary" to="/login">Back to login</Link>
  </section></main>;
}
