import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Info,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";

import "./OrganEligibility.css";

function OrganEligibility() {
  const considerations = [
    {
      icon: <UserCheck size={18} />,
      title: "Age and consent",
      text: "Living donation requires the donor to be 18 or older and capable of giving informed consent. Deceased donation has different consent and legal requirements.",
    },
    {
      icon: <HeartPulse size={18} />,
      title: "Current health",
      text: "A transplant centre evaluates the donor's overall health and medical history before accepting a donation.",
    },
    {
      icon: <Stethoscope size={18} />,
      title: "Medical assessment",
      text: "Blood tests, imaging, specialist assessments and other examinations may be required depending on the type of donation.",
    },
    {
      icon: <ShieldCheck size={18} />,
      title: "Donation type matters",
      text: "Living and deceased donation follow different medical and legal processes. The organs or tissues that can be donated also depend on the circumstances.",
    },
  ];

  const beforeRegistering = [
    "Read the organ donation information and understand the type of pledge you are making.",
    "Provide accurate personal and medical information during registration.",
    "Discuss your decision with your family so they know about your wishes.",
    "Understand that registration or a pledge is not the same as final medical clearance.",
    "For living donation, the transplant centre must complete the required medical and legal assessment.",
  ];

  return (
    <div className="organ-eligibility-page">
      <div className="organ-eligibility-container">

        <section className="organ-eligibility-header">
          <div>
            <span className="organ-eligibility-eyebrow">
              ORGAN DONATION
            </span>

            <h1>Eligibility</h1>

            <p>
              Understand the main eligibility considerations
              before registering an organ donation pledge.
            </p>
          </div>
        </section>

        <section className="organ-eligibility-notice">
          <div className="organ-eligibility-notice-icon">
            <Info size={21} />
          </div>

          <div>
            <strong>
              Registration screening is not final medical clearance
            </strong>

            <p>
              MedVisionRx provides general information and an
              initial registration screening. Final suitability
              for donation is determined by authorized healthcare
              professionals and registered transplant centres.
            </p>
          </div>
        </section>

        <section className="organ-eligibility-grid">
          {considerations.map((item) => (
            <article
              key={item.title}
              className="organ-eligibility-card"
            >
              <div className="organ-eligibility-card-icon">
                {item.icon}
              </div>

              <div>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="organ-eligibility-section-card">
          <div className="organ-eligibility-section-header">
            <div>
              <h2>Before You Register</h2>
              <p>
                Important points to review before submitting
                your pledge.
              </p>
            </div>

            <ClipboardCheck size={21} />
          </div>

          <div className="organ-eligibility-check-list">
            {beforeRegistering.map((item, index) => (
              <div
                className="organ-eligibility-check-item"
                key={item}
              >
                <span>{index + 1}</span>
                <CheckCircle2 size={16} />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="organ-eligibility-types">
          <div className="organ-eligibility-type-card">
            <div className="organ-eligibility-type-top">
              <div className="organ-eligibility-type-icon blue">
                <HeartPulse size={19} />
              </div>

              <div>
                <h2>Living Donation</h2>
                <span>During the donor's lifetime</span>
              </div>
            </div>

            <p>
              Living donation is subject to medical assessment,
              informed consent and the applicable legal and
              authorization process. Only medically and legally
              appropriate donations can proceed.
            </p>
          </div>

          <div className="organ-eligibility-type-card">
            <div className="organ-eligibility-type-top">
              <div className="organ-eligibility-type-icon green">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h2>Deceased Donation</h2>
                <span>After death</span>
              </div>
            </div>

            <p>
              Deceased donation is assessed at the time of death.
              Medical suitability, consent and the applicable
              hospital and transplant procedures determine whether
              organs or tissues can be recovered.
            </p>
          </div>
        </section>

        <section className="organ-eligibility-warning">
          <AlertCircle size={18} />

          <div>
            <strong>Important</strong>

            <p>
              Do not use this page to decide whether you are
              medically fit to donate. If you are considering
              living donation, speak directly with a registered
              transplant centre or qualified medical professional.
            </p>
          </div>
        </section>

        <div className="organ-eligibility-footer-note">
          <ShieldCheck size={15} />

          <span>
            Information is intended for awareness and registration
            guidance. Final donor acceptance is determined by
            authorized medical and transplant professionals.
          </span>
        </div>

      </div>
    </div>
  );
}

export default OrganEligibility;
