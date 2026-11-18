import {
  HeartPulse,
  Droplets,
  HeartHandshake,
  ShieldCheck,
  Users,
  CheckCircle2,
  Activity,
  Hospital,
} from "lucide-react";
import "./About.css";

const steps = [
  {
    number: "01",
    title: "Create a Requirement",
    description:
      "Provide the blood group, quantity, urgency, location and other relevant information.",
    icon: <Droplets size={24} />,
  },
  {
    number: "02",
    title: "Requirement Review",
    description:
      "Review the submitted requirement and make sure the provided information is accurate.",
    icon: <ShieldCheck size={24} />,
  },
  {
    number: "03",
    title: "Find Potential Donors",
    description:
      "Suitable donors can view relevant blood requirements through the platform.",
    icon: <Users size={24} />,
  },
  {
    number: "04",
    title: "Receive Responses",
    description:
      "Potential donors can respond when they are willing and eligible to provide support.",
    icon: <HeartHandshake size={24} />,
  },
  {
    number: "05",
    title: "Coordinate Donation",
    description:
      "The actual donation is coordinated through the appropriate hospital or blood bank.",
    icon: <Hospital size={24} />,
  },
];

const features = [
  "Create and manage blood requirements.",
  "Provide blood group and required quantity.",
  "Specify urgency and required date.",
  "Provide relevant location information.",
  "Receive responses from potential donors.",
  "Manage requirements in an organized way.",
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
                MedVisionRx is a healthcare platform designed to help people
                communicate blood requirements and connect with potential
                donors through technology.
              </p>

              <div className="service-about-hero-points">
                <div>
                  <CheckCircle2 size={18} />
                  Blood Requirements
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Donor Connection
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Organized Support
                </div>
              </div>

            </div>

            <div className="service-about-hero-card">

              <div className="service-about-main-icon">
                <Droplets size={44} />
              </div>

              <span>MEDVISIONRX</span>

              <h2>
                Blood
                <br />
                Requirement
              </h2>

              <p>
                Connecting requirements with potential support.
              </p>

              <div className="service-about-heart">
                <Droplets size={68} />
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
              Making blood requirements
              <strong> easier to organize</strong>
            </h2>

            <p>
              Our goal is to provide an organized way for users to communicate
              blood requirements and help potential donors discover
              opportunities to support them.
            </p>

          </div>

          <div className="service-about-mission-grid">

            <div className="service-about-info-card">
              <div className="service-about-info-icon red">
                <Droplets size={25} />
              </div>

              <h3>Clear Requirements</h3>

              <p>
                Users can provide important information such as blood group,
                quantity, urgency and required date.
              </p>
            </div>

            <div className="service-about-info-card">
              <div className="service-about-info-icon green">
                <Users size={25} />
              </div>

              <h3>Potential Donors</h3>

              <p>
                Suitable donors can discover blood requirements and respond
                when they are willing and eligible.
              </p>
            </div>

            <div className="service-about-info-card">
              <div className="service-about-info-icon purple">
                <ShieldCheck size={25} />
              </div>

              <h3>Responsible Support</h3>

              <p>
                Final donor eligibility, testing and donation decisions remain
                with qualified healthcare professionals.
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
              Connecting blood requirements
              <strong> with community support</strong>
            </h2>

            <p>
              We envision a platform where people can communicate blood
              requirements efficiently and potential donors can discover
              opportunities to help.
            </p>

          </div>

        </div>

      </section>


      <section className="service-about-services">

        <div className="service-about-container">

          <div className="service-about-section-heading center">

            <span>WHAT THIS SERVICE OFFERS</span>

            <h2>
              Blood Requirement
              <strong> Features</strong>
            </h2>

            <p>
              The service provides tools for creating, managing and responding
              to blood requirements.
            </p>

          </div>

          <div className="service-about-services-grid">

            <div className="service-about-service-card red">

              <div className="service-about-service-icon">
                <Droplets size={28} />
              </div>

              <h3>Create Requirements</h3>

              <p>
                Create a blood requirement with the important information
                needed by potential donors.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Blood group
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Required quantity
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Urgency and date
                </li>
              </ul>

            </div>


            <div className="service-about-service-card blue">

              <div className="service-about-service-icon">
                <Users size={28} />
              </div>

              <h3>Find Potential Donors</h3>

              <p>
                Requirements can be viewed by potential donors who may be able
                to provide support.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Relevant donor discovery
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Blood group information
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Donor responses
                </li>
              </ul>

            </div>


            <div className="service-about-service-card green">

              <div className="service-about-service-icon">
                <Activity size={28} />
              </div>

              <h3>Manage Requirements</h3>

              <p>
                Keep track of submitted requirements and manage responses in
                an organized way.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Requirement management
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Response tracking
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Status information
                </li>
              </ul>

            </div>


            <div className="service-about-service-card purple">

              <div className="service-about-service-icon">
                <HeartHandshake size={28} />
              </div>

              <h3>Community Support</h3>

              <p>
                Help connect people who need blood support with people willing
                to help.
              </p>

              <ul>
                <li>
                  <CheckCircle2 size={16} />
                  Donor interaction
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Support coordination
                </li>

                <li>
                  <CheckCircle2 size={16} />
                  Community connection
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
              <strong> to support</strong>
            </h2>

            <p>
              The Blood Requirement service follows a simple process for
              communicating blood needs.
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
                Organize your blood need
                <strong> in one place</strong>
              </h2>

              <p>
                The Blood Requirement service brings important requirement
                information and donor responses together in an organized
                platform.
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
                  <Droplets size={38} />
                </div>

                <h3>
                  Every requirement
                  <br />
                  matters
                </h3>

                <p>
                  Clear information can help potential donors understand where
                  support may be needed.
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
                MedVisionRx helps organize blood requirements and create a
                connection between people seeking blood support and potential
                donors.
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
                Healthcare professionals make the final decisions.
              </h2>

              <p>
                MedVisionRx is a technology platform for organizing
                information and connecting people. Donor eligibility, blood
                testing, collection, transfusion and other medical decisions
                must be handled by qualified healthcare professionals and
                authorized hospitals or blood banks.
              </p>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

export default About;