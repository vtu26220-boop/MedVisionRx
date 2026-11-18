import {
  HeartPulse,
  Droplets,
  HeartHandshake,
  ShieldCheck,
  Users,
  Stethoscope,
  CheckCircle2,
  Activity,
  Globe2,
  Hospital,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "./About.css";

const steps = [
  {
    number: "01",
    title: "Explore the Service",
    description:
      "Access healthcare-related information and understand how the MedVisionRx service can support your needs.",
    icon: <Globe2 size={24} />,
  },
  {
    number: "02",
    title: "Create Your Profile",
    description:
      "Provide the relevant information required to use the healthcare services available on the platform.",
    icon: <Users size={24} />,
  },
  {
    number: "03",
    title: "Find Relevant Support",
    description:
      "Use the available service features to find requirements, donors, information, or other relevant resources.",
    icon: <Activity size={24} />,
  },
  {
    number: "04",
    title: "Connect",
    description:
      "Communicate or respond through the platform when a suitable healthcare-related opportunity is available.",
    icon: <HeartHandshake size={24} />,
  },
  {
    number: "05",
    title: "Complete Through Professionals",
    description:
      "Final healthcare, medical, eligibility, and treatment decisions are handled by qualified professionals.",
    icon: <Hospital size={24} />,
  },
];

const features = [
  "Simple and organized healthcare-related information.",
  "Dedicated services for different healthcare needs.",
  "Blood donation and blood requirement support.",
  "Organ donation and organ requirement support.",
  "Prescription image analysis and medicine information.",
  "Clear information about service workflows.",
];

function getParentPath(pathname: string) {
  if (pathname.startsWith("/blood-requirement")) {
    return "/blood-requirement";
  }

  if (pathname.startsWith("/organ-donation")) {
    return "/organ-donation";
  }

  if (pathname.startsWith("/organ-requirement")) {
    return "/organ-requirement";
  }

  return "/blood-donation";
}

function About() {
  const navigate = useNavigate();
  const location = useLocation();

  const parentPath = getParentPath(location.pathname);

  return (
    <div className="service-about-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="service-about-hero">

        <div className="service-about-background">
          <div className="service-about-orb service-about-orb-one" />
          <div className="service-about-orb service-about-orb-two" />
          <div className="service-about-orb service-about-orb-three" />
        </div>

        <div className="service-about-container">

          <button
            type="button"
            className="service-about-back"
            onClick={() => navigate(parentPath)}
          >
           
          </button>

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
                MedVisionRx is a healthcare platform designed to make
                healthcare-related information, community support, and
                essential healthcare services easier to access through
                technology.
              </p>

              <div className="service-about-hero-points">

                <div>
                  <CheckCircle2 size={18} />
                  Accessible Information
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Connected Community
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Responsible Technology
                </div>

              </div>

            </div>

            <div className="service-about-hero-card">

              <div className="service-about-main-icon">
                <HeartPulse size={44} />
              </div>

              <span>MEDVISIONRX</span>

              <h2>
                Healthcare
                <br />
                Connected
              </h2>

              <p>
                Technology with a human purpose.
              </p>

              <div className="service-about-heart">
                <HeartPulse size={68} />
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          MISSION
          ===================================================== */}

      <section className="service-about-mission">

        <div className="service-about-container">

          <div className="service-about-section-heading">

            <span>OUR MISSION</span>

            <h2>
              Making healthcare
              <strong> more connected</strong>
            </h2>

            <p>
              Our mission is to use technology to organize healthcare-related
              information and help people connect around important healthcare
              needs in a simple and structured way.
            </p>

          </div>

          <div className="service-about-mission-grid">

            <div className="service-about-info-card">

              <div className="service-about-info-icon blue">
                <Stethoscope size={25} />
              </div>

              <h3>Accessible Information</h3>

              <p>
                Present useful healthcare-related information in a clear,
                organized and easy-to-understand format.
              </p>

            </div>

            <div className="service-about-info-card">

              <div className="service-about-info-icon green">
                <Users size={25} />
              </div>

              <h3>Community Connection</h3>

              <p>
                Help people discover opportunities to support others through
                blood and organ related services.
              </p>

            </div>

            <div className="service-about-info-card">

              <div className="service-about-info-icon purple">
                <ShieldCheck size={25} />
              </div>

              <h3>Responsible Technology</h3>

              <p>
                Build technology that supports healthcare workflows while
                keeping professional medical decisions with qualified experts.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          VISION
          ===================================================== */}

      <section className="service-about-vision">

        <div className="service-about-container">

          <div className="service-about-vision-content">

            <div className="service-about-vision-icon">
              <HeartHandshake size={38} />
            </div>

            <span>OUR VISION</span>

            <h2>
              A healthcare ecosystem
              <strong> built around people</strong>
            </h2>

            <p>
              We envision a connected healthcare platform where technology
              helps people find information, discover opportunities to help
              others, and manage healthcare-related requirements more
              efficiently.
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          WHAT WE OFFER
          ===================================================== */}

      <section className="service-about-services">

        <div className="service-about-container">

          <div className="service-about-section-heading center">

            <span>WHAT WE OFFER</span>

            <h2>
              Our <strong>Healthcare Services</strong>
            </h2>

            <p>
              MedVisionRx brings multiple healthcare-focused services
              together in one connected platform.
            </p>

          </div>

          <div className="service-about-services-grid">

            <div className="service-about-service-card blue">

              <div className="service-about-service-icon">
                <Stethoscope size={28} />
              </div>

              <h3>Prescription Analyzer</h3>

              <p>
                Upload prescription images and receive extracted prescription
                and medicine information in a more organized format.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Prescription image upload
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  OCR and image processing
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Medicine information extraction
                </li>
              </ul>

            </div>


            <div className="service-about-service-card red">

              <div className="service-about-service-icon">
                <Droplets size={28} />
              </div>

              <h3>Blood Donation</h3>

              <p>
                Helps potential blood donors register, view relevant
                requirements and connect around blood donation needs.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Donor registration
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Blood requirements
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Eligibility information
                </li>
              </ul>

            </div>


            <div className="service-about-service-card rose">

              <div className="service-about-service-icon">
                <HeartPulse size={28} />
              </div>

              <h3>Blood Requirement</h3>

              <p>
                Helps users communicate blood requirements and organize
                responses from potential donors.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Create blood requirements
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Find potential donors
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Manage responses
                </li>
              </ul>

            </div>


            <div className="service-about-service-card purple">

              <div className="service-about-service-icon">
                <HeartHandshake size={28} />
              </div>

              <h3>Organ Donation</h3>

              <p>
                Provides a platform for people to register their willingness
                to support organ donation.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Donor registration
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Organ information
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Requirement support
                </li>
              </ul>

            </div>


            <div className="service-about-service-card green">

              <div className="service-about-service-icon">
                <ShieldCheck size={28} />
              </div>

              <h3>Organ Requirement</h3>

              <p>
                Helps users create and manage organ requirements and organize
                responses from potential donors.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Create organ requirements
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Manage donor responses
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Track requirements
                </li>
              </ul>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          HOW IT WORKS
          ===================================================== */}

      <section className="service-about-how">

        <div className="service-about-container">

          <div className="service-about-section-heading center">

            <span>HOW MEDVISIONRX WORKS</span>

            <h2>
              Simple steps,
              <strong> connected healthcare</strong>
            </h2>

            <p>
              The platform is designed around a simple flow that helps users
              access information and connect with relevant services.
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


      {/* =====================================================
          FEATURES
          ===================================================== */}

      <section className="service-about-features">

        <div className="service-about-container">

          <div className="service-about-feature-grid">

            <div className="service-about-feature-content">

              <span>WHY MEDVISIONRX</span>

              <h2>
                One platform for
                <strong> connected healthcare services</strong>
              </h2>

              <p>
                MedVisionRx brings different healthcare-focused capabilities
                together so users can access information and manage relevant
                activities through a single platform.
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
                  <HeartPulse size={38} />
                </div>

                <h3>
                  Technology
                  <br />
                  with a purpose
                </h3>

                <p>
                  Helping people access information and connect around
                  important healthcare needs.
                </p>

                <div className="service-about-feature-line" />

                <span>MEDVISIONRX</span>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          COMMUNITY
          ===================================================== */}

      <section className="service-about-community">

        <div className="service-about-container">

          <div className="service-about-community-card">

            <div className="service-about-community-icon">
              <HeartHandshake size={32} />
            </div>

            <div>

              <span>OUR COMMUNITY</span>

              <h2>
                Technology can connect people
                <strong> when it matters.</strong>
              </h2>

              <p>
                MedVisionRx brings together healthcare information,
                prescription analysis, blood donation, blood requirements,
                organ donation and organ requirements in one connected
                platform.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          IMPORTANT NOTICE
          ===================================================== */}

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
                MedVisionRx is a technology platform. Information provided
                through the platform does not replace professional medical
                advice. Eligibility, diagnosis, treatment, donor suitability,
                medical matching, transplantation and other healthcare
                decisions must be handled by qualified healthcare
                professionals and authorized organizations.
              </p>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

export default About;