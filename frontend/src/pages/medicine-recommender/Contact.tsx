import { useState } from "react";
import { submitSupportRequest } from "../../components/support/submitSupportRequest";
import {
  CheckCircle2,
  Clock3,
  Headphones,
  HeartHandshake,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import "./Contact.css";

function Contact() {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true); setSuccess(false); setError("");
    try {
      await submitSupportRequest({ name: String(data.get("name") || ""), email: String(data.get("email") || ""), subject: String(data.get("subject") || ""), message: String(data.get("message") || "") }, "medicine");
      setSuccess(true);
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your message could not be saved. Please try again.");
    } finally { setSending(false); }
  };

  return (
    <div className="medicine-contact-page">
      <div className="medicine-contact-inner">

        {/* HERO */}
        <section className="medicine-contact-hero">
          <div className="medicine-contact-hero-glow medicine-contact-glow-left" />
          <div className="medicine-contact-hero-glow medicine-contact-glow-right" />

          <div className="medicine-contact-hero-content">
            
            <span className="medicine-contact-eyebrow">
              <Headphones size={12} />
              CONTACT
            </span>

            <h1>
              Contact <span>Support</span>
            </h1>

            <p>
              We're here to help. If you have any questions, need assistance,
              or want to report an issue, our support team is ready to assist you.
            </p>

            <div className="medicine-contact-hero-chips">
              <span>
                <CheckCircle2 size={11} />
                Quick Support
              </span>

              <span>
                <CheckCircle2 size={11} />
                Secure Communication
              </span>

              <span>
                <CheckCircle2 size={11} />
                Healthcare Assistance
              </span>
            </div>
          </div>

          <div className="medicine-contact-support-card">
            <div className="medicine-contact-support-icon">
              <Headphones size={27} />
            </div>

            <span>MEDVISIONRX</span>

            <h2>We're here for you</h2>

            <p>Your questions matter to us.</p>

            <div className="medicine-contact-support-watermark">
              <HeartHandshake size={45} />
            </div>
          </div>
        </section>

        {/* SUPPORT TYPES */}
        <section className="medicine-contact-types-section">
          <div className="medicine-contact-type-card medicine-contact-blue">
            <div className="medicine-contact-type-icon">
              <MessageCircle size={17} />
            </div>

            <h3>General Support</h3>

            <p>
              Get help with MedVisionRx services, account issues and
              general questions.
            </p>
          </div>

          <div className="medicine-contact-type-card medicine-contact-purple">
            <div className="medicine-contact-type-icon">
              <Headphones size={17} />
            </div>

            <h3>Technical Support</h3>

            <p>
              Report technical issues or get help with platform-related
              problems.
            </p>
          </div>

          <div className="medicine-contact-type-card medicine-contact-green">
            <div className="medicine-contact-type-icon">
              <ShieldCheck size={17} />
            </div>

            <h3>Report a Concern</h3>

            <p>
              Report inappropriate content, fraudulent activity or
              safety concerns.
            </p>
          </div>
        </section>

        {/* MESSAGE + CONTACT DETAILS */}
        <section className="medicine-contact-main-section">

          {/* FORM */}
          <div className="medicine-contact-form-card">
            <span className="medicine-contact-small-label">
              SEND A MESSAGE
            </span>

            <h2>We're ready to help</h2>

            <p className="medicine-contact-form-intro">
              Send us your question and our support team will get back to you.
            </p>

            {success && <div className="medicine-contact-success" role="status">Your message has been saved. Our support team can now review it.</div>}
            {error && <div className="medicine-contact-error" role="alert">{error}</div>}
            <form onSubmit={handleSubmit}>

              <label htmlFor="medicine-contact-name">
                Your Name <span>*</span>
              </label>

              <input
                id="medicine-contact-name"
                name="name"
                maxLength={120}
                type="text"
                placeholder="Enter your name"
                required
              />

              <label htmlFor="medicine-contact-email">
                Your Email <span>*</span>
              </label>

              <input
                id="medicine-contact-email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
              />

              <label htmlFor="medicine-contact-subject">
                Subject <span>*</span>
              </label>

              <select
                id="medicine-contact-subject"
                name="subject"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select a subject
                </option>
                <option value="general-support">
                  General Support
                </option>
                <option value="technical-support">
                  Technical Support
                </option>
                <option value="report-concern">
                  Report a Concern
                </option>
                <option value="medicine-information">
                  Medicine Information
                </option>
                <option value="other">
                  Other
                </option>
              </select>

              <label htmlFor="medicine-contact-message">
                Message <span>*</span>
              </label>

              <textarea
                id="medicine-contact-message"
                name="message"
                minLength={5}
                maxLength={4000}
                rows={4}
                placeholder="Type your message here..."
                required
              />

              <button
                type="submit"
                className="medicine-contact-send-button"
                disabled={sending}
              >
                <Send size={12} />
                {sending ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          {/* CONTACT INFORMATION */}
          <div className="medicine-contact-right-column">

            <div className="medicine-contact-info-card">
              <span className="medicine-contact-small-label">
                OTHER WAYS TO REACH US
              </span>

              <h2>
                Get in <strong>touch</strong>
              </h2>

              <div className="medicine-contact-method">
                <div className="medicine-contact-method-icon mail">
                  <Mail size={17} />
                </div>

                <div>
                  <h3>Email Support</h3>
                  <a href="mailto:medvisionrx@gmail.com">
                    medvisionrx@gmail.com
                  </a>
                  <p>We usually respond within 24 hours.</p>
                </div>
              </div>

              <div className="medicine-contact-method">
                <div className="medicine-contact-method-icon phone">
                  <Phone size={17} />
                </div>

                <div>
                  <h3>Phone Support</h3>
                  <a href="tel:+919347386302">
                    +91 93473 86302
                  </a>
                  <p>Monday – Friday, 9:00 AM – 6:00 PM</p>
                </div>
              </div>
            </div>

            {/* SUPPORT HOURS */}
            <div className="medicine-contact-hours-card">
              <div className="medicine-contact-hours-icon">
                <Clock3 size={18} />
              </div>

              <div>
                <h3>Support Hours</h3>
                <p>Monday – Friday</p>
                <span>9:00 AM – 6:00 PM</span>
              </div>
            </div>
          </div>
        </section>

        {/* THANK YOU */}
        <section className="medicine-contact-thankyou">
          <div className="medicine-contact-thankyou-icon">
            <HeartHandshake size={18} />
          </div>

          <div>
            <h3>Thank You</h3>

            <p>
              Thank you for being a part of MedVisionRx. Together, we can create
              a healthier and more compassionate world.
            </p>
          </div>

          <Users className="medicine-contact-thankyou-watermark" size={42} />
        </section>

      </div>
    </div>
  );
}

export default Contact;
