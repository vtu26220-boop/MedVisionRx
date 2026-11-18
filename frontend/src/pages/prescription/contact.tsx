import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { submitSupportRequest } from "../../components/support/submitSupportRequest";
import "./PrescriptionWorkspace.css";
import "./contact.css";

export default function PrescriptionContact() {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true); setSuccess(false); setError("");
    try {
      await submitSupportRequest({ name: String(data.get("name") || ""), email: String(data.get("email") || ""), subject: String(data.get("subject") || ""), message: String(data.get("message") || "") }, "prescription");
      setSuccess(true);
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your message could not be saved. Please try again.");
    } finally { setSending(false); }
  };
  return <div className="rx-workspace">
    <div className="rx-heading"><span className="rx-eyebrow">PRESCRIPTION ANALYZER</span><h1>Prescription support</h1><p>Get help with uploads, recognition and saved reports.</p></div>
    <div className="rx-review-grid">
      <section className="rx-card">
        <h2>Send a message</h2><p>Submit your question to the MedVisionRx support team.</p>
        {success && <div className="rx-info" role="status">Your message has been saved. Our support team can now review it.</div>}
        {error && <div className="rx-error" role="alert">{error}</div>}
        <form className="rx-contact-form" onSubmit={submit}>
          <fieldset disabled={sending}>
            <label>Your name<input name="name" autoComplete="name" required maxLength={120} /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={150} /></label>
            <label>Subject<input name="subject" required minLength={3} maxLength={150} /></label>
            <label>Message<textarea name="message" required minLength={5} maxLength={4000} rows={5} /></label>
            <button className="rx-button" disabled={sending}><Send size={16} />{sending ? "Sending..." : "Send Message"}</button>
          </fieldset>
        </form>
      </section>
      <section className="rx-card rx-prose">
        <h2>Upload or analysis problems</h2><p>Check file size and format, then try a sharper image. Include the error message in your support request if analysis fails.</p>
        <h2>Incorrect or unclear medicine name</h2><p>Compare the report with the original. Ask the prescriber or pharmacist to clarify unclear handwriting before confirming it.</p>
        <h2>Account or saved-file problems</h2><p>Make sure you are signed in with the account that uploaded the prescription.</p>
        <h2>Other ways to reach us</h2><p><a href="mailto:medvisionrx@gmail.com">medvisionrx@gmail.com</a></p><p><a href="tel:+919347386302">+91 93473 86302</a></p>
        <Link className="rx-text-link" to="/prescription/history">Open my history</Link>
      </section>
    </div>
  </div>;
}
