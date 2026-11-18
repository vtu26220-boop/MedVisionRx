import {
  CheckCircle2,
  ClipboardCheck,
  Database,
  ExternalLink,
  HeartPulse,
  Info,
  Pill,
  Search,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Users,
} from "lucide-react";

import "./About.css";

function MedicineAbout() {
  const missionCards = [
    {
      icon: Search,
      title: "Easy Medicine Search",
      text: "Search the medicine catalogue by medicine name, symptoms, or common health issues and quickly find relevant records.",
      tone: "blue",
    },
    {
      icon: Database,
      title: "Organized Information",
      text: "View medicine information in one place, including uses, composition, side effects, precautions, and available database fields.",
      tone: "purple",
    },
    {
      icon: ShieldCheck,
      title: "Responsible Information",
      text: "The platform presents stored medicine information clearly and reminds users to verify important medical decisions with a qualified professional.",
      tone: "green",
    },
  ];

  const featureCards = [
    {
      icon: Pill,
      title: "Medicine Catalogue",
      text: "Browse a large collection of medicine records from the MedVisionRx catalogue.",
      points: [
        "Medicine and brand names",
        "Generic composition",
        "Dosage form and strength",
        "Category information",
      ],
      tone: "blue",
    },
    {
      icon: ShoppingCart,
      title: "Buying Information",
      text: "Open available buying links stored with each medicine record.",
      points: [
        "Multiple pharmacy options",
        "Direct external links",
        "Medicine-specific records",
        "Easy access from the details view",
      ],
      tone: "purple",
    },
    {
      icon: HeartPulse,
      title: "Health Issue Search",
      text: "Use common health issue buttons to quickly filter relevant medicine records.",
      points: [
        "Fever",
        "BP",
        "Sugar",
        "Headache",
        "Cold and cough",
        "Acidity and allergy",
      ],
      tone: "green",
    },
    {
      icon: ShieldCheck,
      title: "Safety-Focused Display",
      text: "Important warnings and limitations are displayed alongside the medicine information available in the database.",
      points: [
        "Warnings",
        "Side effects",
        "Contraindications",
        "Age-related information",
      ],
      tone: "orange",
    },
  ];

  const steps = [
    {
      number: "01",
      icon: Search,
      title: "Search",
      text: "Search for a medicine name, symptom, or health issue.",
    },
    {
      number: "02",
      icon: ClipboardCheck,
      title: "Review Information",
      text: "Open the medicine record and review the information stored in the database.",
    },
    {
      number: "03",
      icon: Info,
      title: "Check Details",
      text: "Explore uses, side effects, warnings, and other available details.",
    },
    {
      number: "04",
      icon: ShoppingCart,
      title: "View Buying Options",
      text: "Open the pharmacy links available for that medicine record.",
    },
    {
      number: "05",
      icon: Stethoscope,
      title: "Use Responsibly",
      text: "For diagnosis, dosage changes, or treatment decisions, consult a qualified healthcare professional.",
    },
  ];

  const informationPoints = [
    "Search medicines using common health issues",
    "Review medicine information in one place",
    "Compare available records before opening a link",
    "Access stored buying links from the database",
    "Use professional medical advice for treatment decisions",
    "Do not treat the platform as a substitute for a doctor",
  ];

  return (
    <div className="medicine-about-page">
      <div className="medicine-about-inner">

        {/* HERO */}
        <section className="medicine-about-hero">
          <div className="medicine-about-hero-glow medicine-about-hero-glow-left" />
          <div className="medicine-about-hero-glow medicine-about-hero-glow-right" />

          <div className="medicine-about-hero-content">
            

            <h1>
              Find medicine information
              <span> in one place</span>
            </h1>

            <p>
              MedVisionRx brings medicine search, medicine details,
              common health issue filtering, and stored buying links
              into one organized information platform.
            </p>

            <div className="medicine-about-hero-chips">
              <span>
                <CheckCircle2 size={12} />
                Medicine Search
              </span>
              <span>
                <CheckCircle2 size={12} />
                Medicine Details
              </span>
              <span>
                <CheckCircle2 size={12} />
                Buying Options
              </span>
            </div>
          </div>

          <div className="medicine-about-service-card">
            <div className="medicine-about-service-icon">
              <Pill size={24} />
            </div>

            <span className="medicine-about-service-label">
              MEDVISIONRX
            </span>

            <h2>Medicine</h2>
            <h3>Recommender</h3>

            <p>
              Search, explore and review medicine information.
            </p>

            <div className="medicine-about-service-watermark">
              <Pill size={48} />
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section className="medicine-about-section medicine-about-mission">
          <div className="medicine-about-section-heading">
            <span>OUR MISSION</span>

            <h2>
              Making medicine information
              <strong> easier to explore</strong>
            </h2>

            <p>
              Our goal is to make medicine information easier to find,
              easier to understand, and easier to access from one place.
            </p>
          </div>

          <div className="medicine-about-mission-grid">
            {missionCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className={`medicine-about-info-card ${card.tone}`}
                >
                  <div className="medicine-about-card-icon">
                    <Icon size={17} />
                  </div>

                  <h3>{card.title}</h3>

                  <p>{card.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* CULTURE / FEATURES */}
        <section className="medicine-about-section medicine-about-features-section">
          <div className="medicine-about-centered-heading">
            <span>WHAT YOU CAN EXPLORE</span>

            <h2>
              Medicine Recommender
              <strong> Features</strong>
            </h2>

            <p>
              The service is designed around quick discovery,
              organized medicine records, and clear access to
              the information already stored in the platform.
            </p>
          </div>

          <div className="medicine-about-feature-grid">
            {featureCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className={`medicine-about-feature-card ${card.tone}`}
                >
                  <div className="medicine-about-feature-icon">
                    <Icon size={17} />
                  </div>

                  <h3>{card.title}</h3>

                  <p>{card.text}</p>

                  <ul>
                    {card.points.map((point) => (
                      <li key={point}>
                        <CheckCircle2 size={11} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="medicine-about-section medicine-about-how-section">
          <div className="medicine-about-centered-heading">
            <span>HOW IT WORKS</span>

            <h2>
              From search to
              <strong> useful information</strong>
            </h2>

            <p>
              Follow a simple flow to find a medicine record,
              inspect its details, and open available buying options.
            </p>
          </div>

          <div className="medicine-about-steps">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.number}
                  className="medicine-about-step-card"
                >
                  <span className="medicine-about-step-number">
                    {step.number}
                  </span>

                  <div className="medicine-about-step-icon">
                    <Icon size={16} />
                  </div>

                  <h3>{step.title}</h3>

                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* INFORMATION IN ONE PLACE */}
        <section className="medicine-about-section medicine-about-information-section">
          <div className="medicine-about-information-copy">
            <span className="medicine-about-small-label">
              MEDICINE INFORMATION
            </span>

            <h2>
              Keep medicine
              <strong> information in one place</strong>
            </h2>

            <p>
              Instead of moving between different sections of the
              platform, the Medicine Recommender keeps the available
              medicine record, common issue filters, detailed fields,
              and buying links together.
            </p>

            <div className="medicine-about-check-list">
              {informationPoints.map((point) => (
                <div key={point}>
                  <CheckCircle2 size={14} />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="medicine-about-quote-card">
            <div className="medicine-about-quote-icon">
              <HeartPulse size={20} />
            </div>

            <h3>
              A clearer way to
              <br />
              explore medicine information
            </h3>

            <p>
              Search first. Review the stored information.
              Make important medical decisions with professional guidance.
            </p>

            <div className="medicine-about-quote-brand">
              MEDVISIONRX
            </div>
          </div>
        </section>

        {/* SAFETY BANNERS */}
        <section className="medicine-about-notice medicine-about-notice-green">
          <div className="medicine-about-notice-icon">
            <Users size={17} />
          </div>

          <div>
            <span>PLATFORM PURPOSE</span>

            <h3>
              Supporting easier access to medicine information.
            </h3>

            <p>
              MedVisionRx is intended to organize and present available
              medicine information so users can explore records more easily.
            </p>
          </div>
        </section>

        <section className="medicine-about-notice medicine-about-notice-orange">
          <div className="medicine-about-notice-icon">
            <ShieldCheck size={17} />
          </div>

          <div>
            <span>IMPORTANT SAFETY NOTE</span>

            <h3>
              Professional healthcare decisions come first.
            </h3>

            <p>
              Do not use the platform to self-prescribe, change a prescribed
              dose, or replace medical consultation. Verify important medicine
              information with a qualified doctor or pharmacist.
            </p>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="medicine-about-final">
          <div>
            <span>READY TO EXPLORE?</span>

            <h2>Start with the Medicine Recommender.</h2>

            <p>
              Search by medicine name or common health issue and explore
              the records available in the MedVisionRx catalogue.
            </p>
          </div>

          <a
            href="/medicine-recommender"
            className="medicine-about-final-button"
          >
            Open Dashboard
            <ExternalLink size={14} />
          </a>
        </section>

      </div>
    </div>
  );
}

export default MedicineAbout;
