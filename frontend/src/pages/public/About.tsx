import { useState } from "react";
import { HeartPulse, Droplets, HeartHandshake, ShieldCheck, Search, Users, Building2, ChevronDown, Stethoscope } from "lucide-react";
import "./About.css";

type Service = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  theme: string;
  points: string[];
};

const services: Service[] = [
  {
    id: "prescription",
    title: "Prescription Analyzer",
    description:
      "Helps users understand prescription information by processing uploaded prescription images and extracting available medicine details.",
    icon: <Stethoscope size={28} />,
    theme: "blue",
    points: [
      "Upload a prescription image through the platform.",
      "The system processes the prescription image using OCR and image-processing techniques.",
      "Medicine names and available prescription details are extracted.",
      "The extracted information is presented in a clear and readable format.",
      "The information is provided as a reference and does not replace professional medical advice.",
    ],
  },
  {
    id: "blood-donation",
    title: "Blood Donation",
    description:
      "Connects eligible blood donors with people and facilities that may need blood support.",
    icon: <Droplets size={28} />,
    theme: "red",
    points: [
      "Register as a blood donor on the platform.",
      "Provide your blood group and relevant donor information.",
      "View available blood requirements and requests.",
      "Respond to requests when you are willing and eligible to donate.",
      "Coordinate the actual donation through the appropriate hospital or blood bank.",
    ],
  },
  {
    id: "blood-requirement",
    title: "Blood Requirement",
    description:
      "Helps people create and manage blood requirements and connect with potential donors.",
    icon: <HeartPulse size={28} />,
    theme: "rose",
    points: [
      "Create a blood requirement with blood group and required quantity.",
      "Provide urgency, required date, location, and other relevant details.",
      "Potential donors can view suitable requirements.",
      "Receive responses from donors who are willing to help.",
      "Coordinate the final donation through the appropriate medical facility.",
    ],
  },
  {
    id: "organ-donation",
    title: "Organ Donation",
    description:
      "Provides a platform for people to register their willingness to support organ donation.",
    icon: <HeartHandshake size={28} />,
    theme: "purple",
    points: [
      "Register your willingness to become an organ donor.",
      "Provide the relevant donor and organ information.",
      "View suitable organ-related requirements where applicable.",
      "Respond when you are willing and eligible to support a requirement.",
      "Final medical and legal decisions are handled by authorized healthcare organizations.",
    ],
  },
  {
    id: "organ-requirement",
    title: "Organ Requirement",
    description:
      "Helps users create and manage organ requirements and organize responses from potential donors.",
    icon: <ShieldCheck size={28} />,
    theme: "green",
    points: [
      "Create an organ requirement with the required organ and relevant details.",
      "Provide urgency, required date, location, and other information.",
      "Potential donors can review suitable requirements.",
      "Receive and manage donor responses through the platform.",
      "Final matching, eligibility, medical evaluation, and transplantation decisions remain with authorized professionals.",
    ],
  },
];

function About() {
  const [openService, setOpenService] = useState<string | null>(null);

  const toggleService = (id: string) => {
    setOpenService((current) => (current === id ? null : id));
  };

  return (
    <div className="about-page">

      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="about-hero">
        <div className="about-hero-background">
          <div className="about-orb about-orb-one" />
          <div className="about-orb about-orb-two" />
          <div className="about-orb about-orb-three" />
        </div>

        <div className="about-hero-content">

          <div className="about-eyebrow">
            <HeartPulse size={16} />
            ABOUT MEDVISIONRX
          </div>

          <h1>
            Connecting People
            <span> for a Healthier Tomorrow</span>
          </h1>

          <p>
            MedVisionRx is a healthcare platform designed to make essential
            healthcare-related information and community support easier to
            access through technology.
          </p>

          <div className="about-hero-highlights">

            <div className="about-highlight">
              <div className="about-highlight-icon">
                <Search size={20} />
              </div>
              <div>
                <strong>Accessible</strong>
                <span>Healthcare information</span>
              </div>
            </div>

            <div className="about-highlight">
              <div className="about-highlight-icon">
                <Users size={20} />
              </div>
              <div>
                <strong>Connected</strong>
                <span>Community support</span>
              </div>
            </div>

            <div className="about-highlight">
              <div className="about-highlight-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <strong>Responsible</strong>
                <span>Healthcare technology</span>
              </div>
            </div>

          </div>
        </div>

        <div className="about-hero-visual">
          <div className="about-visual-card about-visual-main">
            <div className="about-visual-icon">
              <HeartPulse size={42} />
            </div>

            <span>MedVisionRx</span>

            <strong>
              Technology with
              <br />
              a Human Purpose
            </strong>

            <div className="about-visual-line" />
          </div>

          <div className="about-floating-card about-floating-one">
            <Droplets size={20} />
            <span>Blood Support</span>
          </div>

          <div className="about-floating-card about-floating-two">
            <HeartHandshake size={20} />
            <span>Organ Support</span>
          </div>
        </div>
      </section>


      {/* =====================================================
          MISSION
          ===================================================== */}
      <section className="about-mission">
        <div className="about-section-container">

          <div className="about-section-heading">
            <span className="about-section-label">OUR MISSION</span>

            <h2>
              Making healthcare
              <span> more connected</span>
            </h2>

            <p>
              Our mission is to use technology to simplify access to useful
              healthcare information while helping people connect around
              important healthcare needs.
            </p>
          </div>

          <div className="about-mission-grid">

            <div className="about-mission-card">
              <div className="about-card-icon blue">
                <Search size={24} />
              </div>

              <h3>Accessible Information</h3>

              <p>
                Present healthcare-related information in a simple,
                understandable and organized way.
              </p>
            </div>

            <div className="about-mission-card">
              <div className="about-card-icon green">
                <Users size={24} />
              </div>

              <h3>Community Connection</h3>

              <p>
                Help donors, recipients and communities discover opportunities
                to support one another.
              </p>
            </div>

            <div className="about-mission-card">
              <div className="about-card-icon purple">
                <ShieldCheck size={24} />
              </div>

              <h3>Responsible Technology</h3>

              <p>
                Build healthcare technology while keeping professional medical
                guidance and appropriate safety considerations in mind.
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* =====================================================
          VISION
          ===================================================== */}
      <section className="about-vision">
        <div className="about-section-container">

          <div className="about-vision-content">

            <div className="about-vision-icon">
              <HeartHandshake size={38} />
            </div>

            <span className="about-section-label">OUR VISION</span>

            <h2>
              A healthcare ecosystem
              <span> built around people</span>
            </h2>

            <p>
              We envision a platform where technology helps people find
              information, discover opportunities to help others, and manage
              healthcare-related requirements more efficiently.
            </p>

          </div>

        </div>
      </section>


      {/* =====================================================
          SERVICES
          ===================================================== */}
      <section className="about-services-section">
        <div className="about-section-container">

          <div className="about-section-heading center">
            <span className="about-section-label">WHAT WE OFFER</span>

            <h2>
              Our <span>Healthcare Services</span>
            </h2>

            <p>
              MedVisionRx brings multiple healthcare-focused services together
              in one platform.
            </p>
          </div>


          <div className="about-services-grid">

            {services.map((service) => {
              const isOpen = openService === service.id;

              return (
                <article
                  key={service.id}
                  className={`about-service-card ${service.theme} ${
                    isOpen ? "is-open" : ""
                  }`}
                >

                  <div className="about-service-icon">
                    {service.icon}
                  </div>

                  <div className="about-service-content">

                    <h3>{service.title}</h3>

                    <p>{service.description}</p>

                    <button
                      type="button"
                      className="about-learn-more"
                      onClick={() => toggleService(service.id)}
                      aria-expanded={isOpen}
                    >
                      <span>
                        {isOpen ? "Hide Details" : "Learn More"}
                      </span>

                      <ChevronDown
                        size={18}
                        className={isOpen ? "rotated" : ""}
                      />
                    </button>

                    {isOpen && (
                      <div className="about-service-details">

                        <h4>How it works</h4>

                        <ul>
                          {service.points.map((point, index) => (
                            <li key={index}>
                              <span className="about-point-number">
                                {index + 1}
                              </span>

                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>

                      </div>
                    )}

                  </div>

                </article>
              );
            })}

          </div>

        </div>
      </section>


      {/* =====================================================
          COMMUNITY
          ===================================================== */}
      <section className="about-community">
        <div className="about-section-container">

          <div className="about-community-card">

            <div className="about-community-icon">
              <Building2 size={32} />
            </div>

            <div className="about-community-content">

              <span className="about-section-label">
                A COMMUNITY THAT CARES
              </span>

              <h2>
                Technology can connect people
                <span> when it matters.</span>
              </h2>

              <p>
                MedVisionRx brings together healthcare information, blood
                donation, blood requirements, organ donation and organ
                requirements in one connected platform.
              </p>

              <p className="about-disclaimer">
                MedVisionRx is a technology platform. Healthcare decisions,
                donor eligibility, medical matching, transplantation and
                treatment decisions must always be handled by qualified
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