import { HeartPulse, HeartHandshake, ShieldCheck, Users, CheckCircle2, Activity, Hospital, Heart } from "lucide-react";

import "./About.css";

const steps = [
  {
    number: "01",
    title: "Create a Requirement",
    description:
      "Provide the required organ, urgency, date, location and other relevant information.",
    icon: <Heart size={24} />,
  },
  {
    number: "02",
    title: "Review Information",
    description:
      "Review the requirement details and make sure the submitted information is accurate.",
    icon: <ShieldCheck size={24} />,
  },
  {
    number: "03",
    title: "Find Potential Support",
    description:
      "Potential donors can view relevant organ requirements through the platform.",
    icon: <Users size={24} />,
  },
  {
    number: "04",
    title: "Receive Responses",
    description:
      "Manage responses from potential donors who are willing to support the requirement.",
    icon: <HeartHandshake size={24} />,
  },
  {
    number: "05",
    title: "Professional Evaluation",
    description:
      "Medical matching, eligibility, legal authorization and transplantation decisions are handled by authorized professionals.",
    icon: <Hospital size={24} />,
  },
];

const features = [
  "Create and manage organ requirements.",
  "Provide required organ information.",
  "Specify urgency and required date.",
  "Provide relevant location information.",
  "Receive and manage donor responses.",
  "Keep requirements organized and trackable.",
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
                MedVisionRx helps organize organ requirements and connect
                relevant information with potential donor responses through
                technology.
              </p>

              <div className="service-about-hero-points">

                <div>
                  <CheckCircle2 size={18} />
                  Organ Requirements
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Donor Responses
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Organized Support
                </div>

              </div>

            </div>

            <div className="service-about-hero-card">

              <div className="service-about-main-icon">
                <Heart size={44} />
              </div>

              <span>MEDVISIONRX</span>

              <h2>
                Organ
                <br />
                Requirement
              </h2>

              <p>
                Organizing requirements and support.
              </p>

              <div className="service-about-heart">
                <Heart size={68} />
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
              Making organ requirements
              <strong> easier to organize</strong>
            </h2>

            <p>
              Our goal is to provide an organized platform for communicating
              organ requirements and managing responses from potential donors.
            </p>

          </div>

          <div className="service-about-mission-grid">

            <div className="service-about-info-card">

              <div className="service-about-info-icon purple">
                <Heart size={25} />
              </div>

              <h3>Clear Requirements</h3>

              <p>
                Users can provide important information about the required
                organ, urgency, date and location.
              </p>

            </div>

            <div className="service-about-info-card">

              <div className="service-about-info-icon blue">
                <Users size={25} />
              </div>

              <h3>Donor Responses</h3>

              <p>
                Potential donors can review suitable requirements and respond
                when they are willing to support them.
              </p>

            </div>

            <div className="service-about-info-card">

              <div className="service-about-info-icon green">
                <ShieldCheck size={25} />
              </div>

              <h3>Professional Oversight</h3>

              <p>
                Medical eligibility, matching, legal requirements and
                transplantation decisions remain with authorized professionals.
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
              Connecting requirements
              <strong> with potential support</strong>
            </h2>

            <p>
              We envision a platform where organ requirements can be
              communicated clearly and relevant donor responses can be
              organized efficiently through authorized healthcare systems.
            </p>

          </div>

        </div>

      </section>


      <section className="service-about-services">

        <div className="service-about-container">

          <div className="service-about-section-heading center">

            <span>WHAT THIS SERVICE OFFERS</span>

            <h2>
              Organ Requirement
              <strong> Features</strong>
            </h2>

            <p>
              The service provides tools for creating, managing and tracking
              organ requirements and donor responses.
            </p>

          </div>

          <div className="service-about-services-grid">

            <div className="service-about-service-card purple">

              <div className="service-about-service-icon">
                <Heart size={28} />
              </div>

              <h3>Create Requirements</h3>

              <p>
                Create an organ requirement with important information for
                potential donors and authorized organizations.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Required organ
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Urgency and date
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Location information
                </li>
              </ul>

            </div>


            <div className="service-about-service-card blue">

              <div className="service-about-service-icon">
                <Users size={28} />
              </div>

              <h3>Potential Donors</h3>

              <p>
                Potential donors can view relevant organ requirements and
                provide responses through the platform.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Requirement discovery
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Donor responses
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Response management
                </li>
              </ul>

            </div>


            <div className="service-about-service-card green">

              <div className="service-about-service-icon">
                <Activity size={28} />
              </div>

              <h3>Track Requirements</h3>

              <p>
                Keep requirements organized and manage the responses received
                from potential donors.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Requirement status
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Donor responses
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Organized records
                </li>
              </ul>

            </div>


            <div className="service-about-service-card red">

              <div className="service-about-service-icon">
                <ShieldCheck size={28} />
              </div>

              <h3>Professional Oversight</h3>

              <p>
                Final healthcare and transplantation decisions remain with
                qualified professionals and authorized organizations.
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
              From requirement
              <strong> to professional coordination</strong>
            </h2>

            <p>
              The Organ Requirement service provides an organized technology
              workflow while medical decisions remain with authorized
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
                Organize your organ requirement
                <strong> in one place</strong>
              </h2>

              <p>
                The Organ Requirement service brings requirement information
                and donor responses together in an organized platform.
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
                  <Heart size={38} />
                </div>

                <h3>
                  Every requirement
                  <br />
                  deserves attention
                </h3>

                <p>
                  Clear information can help organize communication around
                  important healthcare requirements.
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
                Connecting people
                <strong> when support matters.</strong>
              </h2>

              <p>
                MedVisionRx provides technology for organizing organ
                requirements and managing relevant donor responses.
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
                MedVisionRx is a technology platform. Organ eligibility,
                medical matching, legal authorization, transplantation and
                other healthcare decisions must always be handled by qualified
                healthcare professionals and authorized organizations.
              </p>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

export default About;