import { HeartPulse, HeartHandshake, ShieldCheck, Users, CheckCircle2, Activity, Hospital, Heart } from "lucide-react";

import "./About.css";

const steps = [
  {
    number: "01",
    title: "Register as a Donor",
    description:
      "Register your willingness to support organ donation and provide the relevant donor information.",
    icon: <Users size={24} />,
  },
  {
    number: "02",
    title: "Provide Information",
    description:
      "Provide the relevant organ and donor information required by the service.",
    icon: <Heart size={24} />,
  },
  {
    number: "03",
    title: "Review Requirements",
    description:
      "View relevant organ requirements and understand where support may be needed.",
    icon: <Activity size={24} />,
  },
  {
    number: "04",
    title: "Respond",
    description:
      "Respond to a suitable requirement when you are willing to support it.",
    icon: <HeartHandshake size={24} />,
  },
  {
    number: "05",
    title: "Professional Evaluation",
    description:
      "Final medical, legal, eligibility and transplantation decisions are handled by authorized professionals.",
    icon: <Hospital size={24} />,
  },
];

const features = [
  "Register willingness to support organ donation.",
  "Provide relevant donor information.",
  "Provide organ-related information.",
  "View suitable organ requirements.",
  "Respond to relevant requirements.",
  "Keep donation-related information organized.",
];

function About() {
  

  return (
    <div className="service-about-page">

      <section className="service-about-hero">

        <div className="service-about-background">
          <div className="service-about-orb service-about-orb-one" />
          <div className="service-about-orb service-about-orb-two" />
          <div className="service-about-orb service-about-orb-three" />
        </div>

        <div className="service-about-container">

          

          <div className="service-about-hero-grid">

            <div className="service-about-hero-content">

              <div className="service-about-eyebrow">
                <HeartPulse size={17} />
                ABOUT MEDVISIONRX
              </div>

              <h1>
                Connecting People
                <span> for a Healthier Tomorrow</span>
              </h1>

              <p>
                MedVisionRx provides a technology platform that helps people
                register their willingness to support organ donation and
                organize relevant information.
              </p>

              <div className="service-about-hero-points">

                <div>
                  <CheckCircle2 size={18} />
                  Donor Registration
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Organ Information
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Community Support
                </div>

              </div>

            </div>

            <div className="service-about-hero-card">

              <div className="service-about-main-icon">
                <HeartHandshake size={44} />
              </div>

              <span>MEDVISIONRX</span>

              <h2>
                Organ
                <br />
                Donation
              </h2>

              <p>
                Supporting the spirit of giving.
              </p>

              <div className="service-about-heart">
                <HeartHandshake size={68} />
              </div>

            </div>

          </div>
        </div>

      </section>


      <section className="service-about-mission">

        <div className="service-about-container">

          <div className="service-about-section-heading">

            <span>OUR MISSION</span>

            <h2>
              Supporting organ donation
              <strong> through technology</strong>
            </h2>

            <p>
              Our goal is to provide an organized platform where people can
              express their willingness to support organ donation and access
              relevant information.
            </p>

          </div>

          <div className="service-about-mission-grid">

            <div className="service-about-info-card">

              <div className="service-about-info-icon blue">
                <Users size={25} />
              </div>

              <h3>Donor Registration</h3>

              <p>
                Potential donors can register their willingness and provide
                relevant information through the platform.
              </p>

            </div>

            <div className="service-about-info-card">

              <div className="service-about-info-icon purple">
                <HeartHandshake size={25} />
              </div>

              <h3>Community Support</h3>

              <p>
                Technology can help organize information and connect people
                around important organ donation needs.
              </p>

            </div>

            <div className="service-about-info-card">

              <div className="service-about-info-icon green">
                <ShieldCheck size={25} />
              </div>

              <h3>Responsible Process</h3>

              <p>
                Medical eligibility, legal requirements and transplantation
                decisions remain with authorized professionals.
              </p>

            </div>

          </div>

        </div>

      </section>


      <section className="service-about-vision">

        <div className="service-about-container">

          <div className="service-about-vision-content">

            <div className="service-about-vision-icon">
              <HeartHandshake size={38} />
            </div>

            <span>OUR VISION</span>

            <h2>
              Encouraging a culture of
              <strong> organ donation</strong>
            </h2>

            <p>
              We envision a platform that makes information easier to
              organize and helps people understand opportunities to support
              organ donation through authorized healthcare systems.
            </p>

          </div>

        </div>

      </section>


      <section className="service-about-services">

        <div className="service-about-container">

          <div className="service-about-section-heading center">

            <span>WHAT THIS SERVICE OFFERS</span>

            <h2>
              Organ Donation
              <strong> Features</strong>
            </h2>

            <p>
              The service provides tools for organizing donor information and
              supporting organ donation workflows.
            </p>

          </div>

          <div className="service-about-services-grid">

            <div className="service-about-service-card purple">

              <div className="service-about-service-icon">
                <Users size={28} />
              </div>

              <h3>Donor Registration</h3>

              <p>
                Register your willingness to support organ donation and
                provide relevant information.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Donor information
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Donation preferences
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Organ information
                </li>
              </ul>

            </div>


            <div className="service-about-service-card blue">

              <div className="service-about-service-icon">
                <Heart size={28} />
              </div>

              <h3>Organ Information</h3>

              <p>
                Organ-related information can be organized through the donor
                registration workflow.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Organ details
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Donor details
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Requirement information
                </li>
              </ul>

            </div>


            <div className="service-about-service-card green">

              <div className="service-about-service-icon">
                <Activity size={28} />
              </div>

              <h3>Requirement Support</h3>

              <p>
                Donors can view relevant organ requirements where applicable
                through the platform.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  View requirements
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Review information
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Respond when appropriate
                </li>
              </ul>

            </div>


            <div className="service-about-service-card red">

              <div className="service-about-service-icon">
                <ShieldCheck size={28} />
              </div>

              <h3>Professional Oversight</h3>

              <p>
                Final medical and legal decisions are handled through
                authorized healthcare organizations.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Medical evaluation
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Eligibility assessment
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Authorized coordination
                </li>
              </ul>

            </div>

          </div>

        </div>

      </section>


      <section className="service-about-how">

        <div className="service-about-container">

          <div className="service-about-section-heading center">

            <span>HOW IT WORKS</span>

            <h2>
              From registration
              <strong> to professional evaluation</strong>
            </h2>

            <p>
              The Organ Donation service provides an organized technology
              workflow while leaving medical decisions to authorized
              professionals.
            </p>

          </div>

          <div className="service-about-steps">

            {steps.map((step) => (
              <div
                className="service-about-step"
                key={step.number}
              >

                <div className="service-about-step-number">
                  {step.number}
                </div>

                <div className="service-about-step-icon">
                  {step.icon}
                </div>

                <h3>{step.title}</h3>

                <p>{step.description}</p>

              </div>
            ))}

          </div>

        </div>

      </section>


      <section className="service-about-features">

        <div className="service-about-container">

          <div className="service-about-feature-grid">

            <div className="service-about-feature-content">

              <span>WHY USE THIS SERVICE</span>

              <h2>
                Organize donation information
                <strong> in one place</strong>
              </h2>

              <p>
                The Organ Donation service provides a structured place for
                donor information and organ-related support.
              </p>

              <div className="service-about-benefits">

                {features.map((feature) => (
                  <div
                    className="service-about-benefit"
                    key={feature}
                  >
                    <CheckCircle2 size={19} />
                    <span>{feature}</span>
                  </div>
                ))}

              </div>

            </div>

            <div className="service-about-feature-visual">

              <div className="service-about-feature-card">

                <div className="service-about-feature-icon">
                  <HeartHandshake size={38} />
                </div>

                <h3>
                  A decision to give
                  <br />
                  can matter deeply
                </h3>

                <p>
                  Technology can help organize information around the
                  willingness to support organ donation.
                </p>

                <div className="service-about-feature-line" />

                <span>MEDVISIONRX</span>

              </div>

            </div>

          </div>

        </div>

      </section>


      <section className="service-about-community">

        <div className="service-about-container">

          <div className="service-about-community-card">

            <div className="service-about-community-icon">
              <HeartHandshake size={32} />
            </div>

            <div>

              <span>OUR COMMUNITY</span>

              <h2>
                Supporting people
                <strong> when it matters.</strong>
              </h2>

              <p>
                MedVisionRx provides technology for organizing organ donation
                information and connecting relevant healthcare-related
                workflows.
              </p>

            </div>

          </div>

        </div>

      </section>


      <section className="service-about-notice">

        <div className="service-about-container">

          <div className="service-about-notice-card">

            <div className="service-about-notice-icon">
              <ShieldCheck size={30} />
            </div>

            <div>

              <span>IMPORTANT INFORMATION</span>

              <h2>
                Professional healthcare decisions always come first.
              </h2>

              <p>
                MedVisionRx is a technology platform. Organ donation,
                eligibility, medical suitability, legal authorization,
                matching and transplantation decisions must always be handled
                by qualified healthcare professionals and authorized
                organizations.
              </p>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

export default About;