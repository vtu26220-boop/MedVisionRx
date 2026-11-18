import React from "react";
import {
  ShieldCheck,
  HeartPulse,
  Activity,
  Droplets,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

import "./OrganRequirementEligibility.css";

const OrganRequirementEligibility: React.FC = () => {
  const criteria = [
    {
      icon: HeartPulse,
      title: "Medical Need",
      description:
        "The organ requirement should be based on a genuine medical need identified by a qualified healthcare professional.",
    },
    {
      icon: Activity,
      title: "Valid Organ Requirement",
      description:
        "The requested organ or tissue must be one of the organs supported by the MedVisionRx organ requirement service.",
    },
    {
      icon: Droplets,
      title: "Blood Group Information",
      description:
        "Providing the patient's blood group helps donors and healthcare teams understand basic compatibility requirements.",
    },
    {
      icon: CalendarCheck,
      title: "Required Date",
      description:
        "The required date should represent the expected medical need and should not be a date in the past.",
    },
  ];

  const importantPoints = [
    "The requirement should be submitted using accurate patient and hospital information.",
    "Organ requirements should represent a genuine medical requirement.",
    "The requester should provide a valid contact person and reachable phone number.",
    "Blood group information should be entered accurately whenever available.",
    "Urgency should reflect the actual medical situation.",
    "Creating a requirement does not guarantee that an organ will be available.",
    "Final medical suitability and transplantation decisions must be made by authorized healthcare professionals.",
  ];

  return (
    <div className="requirement-info-page organ-requirement-page">
      <div className="requirement-info-container">

        {/* HERO */}
        <section className="requirement-info-hero">
          <div className="requirement-info-icon">
            <ShieldCheck size={30} />
          </div>

          <div>
            <p className="requirement-info-eyebrow">
              ORGAN REQUIREMENT
            </p>

            <h1 className="requirement-info-title">
              Eligibility
            </h1>

            <p className="requirement-info-description">
              Review the basic requirements for creating and managing an
              organ requirement through MedVisionRx.
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
              MedVisionRx helps users submit and manage organ
              requirements. The platform does not independently determine
              medical eligibility, transplant suitability, donor-recipient
              compatibility, or clinical priority.
            </p>

            <div className="requirement-info-notice-box">
              <Info size={19} />

              <p>
                All final medical decisions must be made by qualified
                healthcare professionals and authorized transplant
                organizations.
              </p>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};

export default OrganRequirementEligibility;