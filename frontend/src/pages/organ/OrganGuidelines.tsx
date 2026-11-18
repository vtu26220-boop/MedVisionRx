import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Info,
  PhoneCall,
  ShieldCheck,
  Users,
} from "lucide-react";

import "./OrganGuidelines.css";

function OrganGuidelines() {
  const steps = [
    {
      number: "01",
      title: "Learn",
      text: "Understand living and deceased donation, the donation process and the information you are agreeing to.",
    },
    {
      number: "02",
      title: "Discuss",
      text: "Tell your family about your decision so they understand your wishes and can discuss them when needed.",
    },
    {
      number: "03",
      title: "Register",
      text: "Complete the MedVisionRx pledge with accurate personal, contact and donation preference information.",
    },
    {
      number: "04",
      title: "Medical assessment",
      text: "Where donation proceeds, authorized transplant professionals determine medical suitability and complete the required process.",
    },
  ];

  const keyPoints = [
    "Organ donation is voluntary and should be based on informed decision-making.",
    "Keep your registration information accurate and up to date.",
    "A pledge or registration does not guarantee that donation will be medically possible later.",
    "Living donation has additional medical, ethical and legal requirements.",
    "Deceased donation is assessed according to the circumstances at the time of death.",
    "Final retrieval, allocation and transplantation decisions are handled through authorized systems and healthcare professionals.",
  ];

  return (
    <div className="organ-guidelines-page">
      <div className="organ-guidelines-container">

        <section className="organ-guidelines-header">
          <div>
            <span className="organ-guidelines-eyebrow">
              ORGAN DONATION
            </span>

            <h1>Donation Guidelines</h1>

            <p>
              Important information to help you understand
              organ donation before making or managing a pledge.
            </p>
          </div>
        </section>

        <section className="organ-guidelines-hero">
          <div className="organ-guidelines-hero-icon">
            <HeartHandshake size={27} />
          </div>

          <div>
            <span>MAKE AN INFORMED DECISION</span>

            <h2>
              Understand your pledge and talk with your family.
            </h2>

            <p>
              Organ donation involves medical, legal and consent
              processes. Use these guidelines as general
              awareness information and contact an authorized
              transplant centre for case-specific guidance.
            </p>
          </div>
        </section>

        <section className="organ-guidelines-section">
          <div className="organ-guidelines-section-header">
            <div>
              <h2>How the Process Works</h2>
              <p>
                A simple overview from learning to medical assessment.
              </p>
            </div>

            <BookOpen size={21} />
          </div>

          <div className="organ-guidelines-steps">
            {steps.map((step) => (
              <article
                key={step.number}
                className="organ-guidelines-step"
              >
                <span>{step.number}</span>

                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="organ-guidelines-two-column">

          <article className="organ-guidelines-card">
            <div className="organ-guidelines-card-heading">
              <div className="blue">
                <Users size={18} />
              </div>

              <div>
                <h2>Talk With Your Family</h2>
                <span>Make your wishes known</span>
              </div>
            </div>

            <p>
              Discuss your decision with the people close to you.
              Clear communication can help your family understand
              your wishes and the importance of your decision.
            </p>
          </article>

          <article className="organ-guidelines-card">
            <div className="organ-guidelines-card-heading">
              <div className="green">
                <FileText size={18} />
              </div>

              <div>
                <h2>Keep Information Accurate</h2>
                <span>Review your pledge information</span>
              </div>
            </div>

            <p>
              Provide truthful information during registration
              and keep relevant contact and pledge information
              updated when circumstances change.
            </p>
          </article>

        </section>

        <section className="organ-guidelines-section">
          <div className="organ-guidelines-section-header">
            <div>
              <h2>Important Points</h2>
              <p>
                Keep these points in mind when managing your pledge.
              </p>
            </div>

            <ShieldCheck size={21} />
          </div>

          <div className="organ-guidelines-points">
            {keyPoints.map((point, index) => (
              <div
                className="organ-guidelines-point"
                key={point}
              >
                <span>{index + 1}</span>
                <CheckCircle2 size={16} />
                <p>{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="organ-guidelines-alert">
          <AlertTriangle size={19} />

          <div>
            <strong>
              Do not treat online information as medical clearance
            </strong>

            <p>
              MedVisionRx cannot determine final donor suitability.
              Living donation decisions require assessment by
              authorized healthcare professionals and the applicable
              authorization process.
            </p>
          </div>
        </section>

        <section className="organ-guidelines-contact-card">
          <div className="organ-guidelines-contact-icon">
            <PhoneCall size={19} />
          </div>

          <div>
            <h2>Need Case-Specific Guidance?</h2>

            <p>
              Contact a registered transplant centre or qualified
              healthcare professional for questions about your
              individual medical or donation circumstances.
            </p>
          </div>
        </section>

        <div className="organ-guidelines-footer-note">
          <Info size={15} />

          <span>
            These guidelines are for general awareness. Indian
            organ donation and transplantation procedures are
            governed through the applicable legal, medical and
            authorized transplant systems.
          </span>
        </div>

      </div>
    </div>
  );
}

export default OrganGuidelines;
