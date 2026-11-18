import { submitSupportRequest } from "../../components/support/submitSupportRequest";
import { useState } from "react";
import type { FormEvent } from "react";


import {
  CheckCircle2,
  Clock3,
  Headphones,
  HeartHandshake,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Settings,
  ShieldAlert,
} from "lucide-react";

import "./Contact.css";

function BloodRequirementContact() {

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");


  const supportEmail =
    import.meta.env.VITE_SUPPORT_EMAIL ||
    "medvisionrx@gmail.com";

  const supportPhone =
    import.meta.env.VITE_SUPPORT_PHONE ||
    "+91 93473 86302";

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
        HTMLSelectElement |
        HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSuccess(false);
    setError("");
  };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (sending) return;

    setSending(true);
    setSuccess(false);
    setError("");

    try {
      await submitSupportRequest(formData, "blood_requirement");

      setSuccess(true);

      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      console.error(err);

      setError(err instanceof Error ? err.message : "Your message could not be saved. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const openEmail = () => {
    window.location.assign(`mailto:${supportEmail}`);
  };

  const openPhone = () => {
    window.location.assign(`tel:${supportPhone.replace(/\s/g, "")}`);
  };

  return (
    <div className="service-contact-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="service-contact-hero">

        <div className="service-contact-hero-orb service-contact-orb-one" />

        <div className="service-contact-hero-orb service-contact-orb-two" />

        <div className="service-contact-container">


          <div className="service-contact-hero-grid">

            <div className="service-contact-hero-content">

              <span className="service-contact-eyebrow">
                CONTACT
              </span>

              <h1>
                Contact{" "}
                <span>Support</span>
              </h1>

              <p>
                We're here to help. If you have any
                questions, need assistance, or want to
                report an issue, our support team is
                ready to assist you.
              </p>

              <div className="service-contact-hero-points">

                <div>
                  <CheckCircle2 size={16} />
                  Quick Support
                </div>

                <div>
                  <CheckCircle2 size={16} />
                  Secure Communication
                </div>

                <div>
                  <CheckCircle2 size={16} />
                  Healthcare Assistance
                </div>

              </div>

            </div>

            <div className="service-contact-hero-visual">

              <div className="service-contact-headset-card">

                <div className="service-contact-headset-icon">
                  <Headphones size={54} />
                </div>

                <div className="service-contact-plus">
                  <HeartHandshake size={28} />
                </div>

                <span>
                  MEDVISIONRX
                </span>

                <strong>
                  We're here for you
                </strong>

                <p>
                  Your questions matter to us.
                </p>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          SUPPORT CARDS
          ===================================================== */}

      <section className="service-contact-support">

        <div className="service-contact-container">

          <div className="service-contact-support-grid">

            <div className="service-contact-support-card">

              <div className="service-contact-card-icon blue">
                <MessageCircle size={22} />
              </div>

              <h3>
                General Support
              </h3>

              <p>
                Get help with MedVisionRx services,
                account issues and general questions.
              </p>

            </div>

            <div className="service-contact-support-card">

              <div className="service-contact-card-icon purple">
                <Settings size={22} />
              </div>

              <h3>
                Technical Support
              </h3>

              <p>
                Report technical issues or get help
                with platform-related problems.
              </p>

            </div>

            <div className="service-contact-support-card">

              <div className="service-contact-card-icon green">
                <ShieldAlert size={22} />
              </div>

              <h3>
                Report a Concern
              </h3>

              <p>
                Report inappropriate content,
                fraudulent activity or safety concerns.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          CONTACT MAIN
          ===================================================== */}

      <section className="service-contact-main">

        <div className="service-contact-container">

          <div className="service-contact-main-grid">

            {/* SEND MESSAGE */}

            <div className="service-contact-form-card">

              <div className="service-contact-section-title">

                <span>
                  SEND A MESSAGE
                </span>

                <h2>
                  We're ready to{" "}
                  <strong>help</strong>
                </h2>

                <p>
                  Send us your question and our support
                  team will get back to you.
                </p>

              </div>

              <form
                onSubmit={handleSubmit}
                className="service-contact-form"
              >

                <div className="service-contact-field">

                  <label htmlFor="name">
                    Your Name <span>*</span>
                  </label>

                  <input
                    id="name"
                    name="name"
                    maxLength={120}
type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="service-contact-field">

                  <label htmlFor="email">
                    Your Email <span>*</span>
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="service-contact-field">

                  <label htmlFor="subject">
                    Subject <span>*</span>
                  </label>

                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select a subject
                    </option>

                    <option value="General Support">
                      General Support
                    </option>

                    <option value="Technical Support">
                      Technical Support
                    </option>

                    <option value="Blood Requirement">
                      Blood Requirement
                    </option>

                    <option value="Account Issue">
                      Account Issue
                    </option>

                    <option value="Report a Concern">
                      Report a Concern
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                </div>

                <div className="service-contact-field">

                  <label htmlFor="message">
                    Message <span>*</span>
                  </label>

                  <textarea
                    id="message"
                    name="message"
                    minLength={5}
maxLength={4000}
rows={5}
                    placeholder="Type your message here..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />

                </div>

                {success && (
                  <div className="service-contact-success">
                    <CheckCircle2 size={18} />

                    <span>
                      Your message has been saved. Our support team can now review it.
                    </span>
                  </div>
                )}

                {error && (
                  <div className="service-contact-error">
                    <ShieldAlert size={18} />

                    <span>
                      {error}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="service-contact-submit"
                  disabled={sending}
                >
                  <Send size={16} />

                  {sending
                    ? "Sending..."
                    : "Send Message"}
                </button>

              </form>

            </div>

            {/* OTHER CONTACT METHODS */}

            <div className="service-contact-side">

              <div className="service-contact-side-card">

                <div className="service-contact-section-title small">

                  <span>
                    OTHER WAYS TO REACH US
                  </span>

                  <h2>
                    Get in <strong>touch</strong>
                  </h2>

                </div>

                {/* EMAIL */}

                <button
                  type="button"
                  className="service-contact-method"
                  onClick={openEmail}
                >

                  <div className="service-contact-method-icon blue">
                    <Mail size={19} />
                  </div>

                  <div>
                    <strong>
                      Email Support
                    </strong>

                    <span>
                      {supportEmail}
                    </span>

                    <small>
                      We usually respond within 24 hours.
                    </small>
                  </div>

                </button>

                {/* PHONE */}

                <button
                  type="button"
                  className="service-contact-method"
                  onClick={openPhone}
                >

                  <div className="service-contact-method-icon green">
                    <Phone size={19} />
                  </div>

                  <div>
                    <strong>
                      Phone Support
                    </strong>

                    <span>
                      {supportPhone}
                    </span>

                    <small>
                      Monday – Friday, 9:00 AM – 6:00 PM
                    </small>
                  </div>

                </button>

              </div>

              {/* SUPPORT HOURS */}

              <div className="service-contact-hours-card">

                <div className="service-contact-hours-icon">
                  <Clock3 size={21} />
                </div>

                <div>

                  <strong>
                    Support Hours
                  </strong>

                  <span>
                    Monday – Friday
                  </span>

                  <small>
                    9:00 AM – 6:00 PM
                  </small>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          THANK YOU
          ===================================================== */}

      <section className="service-contact-thankyou">

        <div className="service-contact-container">

          <div className="service-contact-thankyou-card">

            <div className="service-contact-thankyou-icon">
              <HeartHandshake size={25} />
            </div>

            <div>

              <h3>
                Thank You
              </h3>

              <p>
                Thank you for being a part of MedVisionRx.
                Together, we can create a healthier and
                more compassionate world.
              </p>

            </div>

            <HeartHandshake
              className="service-contact-thankyou-watermark"
              size={48}
            />

          </div>

        </div>

      </section>

    </div>
  );
}

export default BloodRequirementContact;