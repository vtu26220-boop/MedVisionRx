import React from "react";
import {
  ShieldCheck,
  HeartPulse,
  Droplets,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

import "./BloodRequirementEligibility.css";

const BloodRequirementEligibility: React.FC = () => {
  const criteria = [
    {
      icon: Droplets,
      title: "Valid Blood Requirement",
      description:
        "The requirement should represent a genuine need for blood or blood components for a patient.",
    },
    {
      icon: HeartPulse,
      title: "Medical Need",
      description:
        "The blood requirement should be connected to an actual medical need identified by a healthcare professional or medical facility.",
    },
    {
      icon: CalendarCheck,
      title: "Required Date",
      description:
        "The required date should accurately represent when blood support is expected to be needed.",
    },
    {
      icon: ShieldCheck,
      title: "Accurate Information",
      description:
        "Patient, blood group, hospital and contact information should be entered accurately.",
    },
  ];

  const importantPoints = [
    "The blood requirement should represent a genuine medical need.",
    "The patient's blood group should be entered accurately.",
    "The required quantity should reflect the actual medical requirement.",
    "The requester should provide a valid hospital or healthcare facility.",
    "The contact person and phone number should be reachable.",
    "The required date should be accurate and relevant.",
    "Urgency should reflect the actual medical situation.",
    "Creating a requirement does not guarantee blood availability.",
    "Final transfusion decisions must be made by qualified healthcare professionals.",
  ];

  return (
    <div className="requirement-info-page blood-requirement-page">
      <div className="requirement-info-container">

        {/* HERO */}
        <section className="requirement-info-hero">
          <div className="requirement-info-icon">
            <ShieldCheck size={30} />
          </div>

          <div>
            <p className="requirement-info-eyebrow">
              BLOOD REQUIREMENT
            </p>

            <h1 className="requirement-info-title">
              Eligibility
            </h1>

            <p className="requirement-info-description">
              Review the basic requirements for creating and managing a
              blood requirement through MedVisionRx.
            </p>
          </div>
        </section>

        {/* ELIGIBILITY CRITERIA */}
        <section className="requirement-info-grid">
          {criteria.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="requirement-info-card"
              >
                <div className="requirement-info-card-icon">
                  <Icon size={23} />
                </div>

                <h2 className="requirement-info-card-title">
                  {item.title}
                </h2>

                <p className="requirement-info-card-text">
                  {item.description}
                </p>
              </article>
            );
          })}
        </section>

        {/* CHECKLIST + NOTICE */}
        <section className="requirement-info-two-column">

          <div className="requirement-info-section">
            <div className="requirement-info-section-heading">
              <CheckCircle2 size={25} />

              <h2 className="requirement-info-section-title">
                Requirement Checklist
              </h2>
            </div>

            <div className="requirement-info-list">
              {importantPoints.map((point, index) => (
                <div
                  key={index}
                  className="requirement-info-list-item"
                >
                  <CheckCircle2 size={19} />

                  <p>{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="requirement-info-notice">
            <div className="requirement-info-notice-heading">
              <AlertTriangle size={25} />

              <h2 className="requirement-info-notice-title">
                Important Medical Notice
              </h2>
            </div>

            <p>
              MedVisionRx helps users submit and manage blood
              requirements. The platform does not independently determine
              transfusion suitability, blood compatibility, clinical
              priority, or medical eligibility.
            </p>

            <div className="requirement-info-notice-box">
              <Info size={19} />

              <p>
                Blood transfusion and compatibility decisions must be made
                by qualified healthcare professionals and authorized
                medical facilities.
              </p>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};

export default BloodRequirementEligibility;