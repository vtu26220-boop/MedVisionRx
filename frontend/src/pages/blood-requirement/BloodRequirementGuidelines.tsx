import React from "react";
import {
  BookOpen,
  FilePlus2,
  ClipboardCheck,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

import "./BloodRequirementGuidelines.css";

const BloodRequirementGuidelines: React.FC = () => {
  const steps = [
    {
      number: "01",
      icon: FilePlus2,
      title: "Create Requirement",
      description:
        "Enter accurate patient, blood group, quantity, urgency, hospital, contact and required-date information.",
    },
    {
      number: "02",
      icon: ClipboardCheck,
      title: "Review Requirement",
      description:
        "Check all information carefully before submitting the blood requirement.",
    },
    {
      number: "03",
      icon: Users,
      title: "Receive Donor Support",
      description:
        "Eligible blood donors can view active requirements and respond when they are willing to help.",
    },
    {
      number: "04",
      icon: ShieldCheck,
      title: "Coordinate Support",
      description:
        "Review responses and coordinate blood donation and transfusion arrangements through the appropriate healthcare facility.",
    },
  ];

  const guidelines = [
    "Provide accurate patient and blood requirement information.",
    "Select the correct blood group.",
    "Enter the required quantity accurately.",
    "Use the correct urgency level according to the actual situation.",
    "Provide a valid hospital or healthcare facility name.",
    "Provide a reachable contact person and phone number.",
    "Enter the correct required date.",
    "Keep the requirement information updated when circumstances change.",
    "Do not create false or misleading blood requirements.",
    "Do not make transfusion or compatibility decisions based only on platform information.",
    "Coordinate final medical decisions with qualified healthcare professionals.",
  ];

  return (
    <div className="requirement-info-page blood-requirement-page">
      <div className="requirement-info-container">

        {/* HERO */}
        <section className="requirement-info-hero">
          <div className="requirement-info-icon">
            <BookOpen size={30} />
          </div>

          <div>
            <p className="requirement-info-eyebrow">
              BLOOD REQUIREMENT
            </p>

            <h1 className="requirement-info-title">
              Guidelines
            </h1>

            <p className="requirement-info-description">
              Follow these guidelines when creating, managing and
              responding to blood requirements through MedVisionRx.
            </p>
          </div>
        </section>

        {/* PROCESS */}
        <section className="requirement-info-section">
          <div className="requirement-info-section-heading">
            <BookOpen size={25} />

            <h2 className="requirement-info-section-title">
              How Blood Requirement Works
            </h2>
          </div>

          <div className="requirement-info-step-grid">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.number}
                  className="requirement-info-step-card"
                >
                  <div className="requirement-info-step-top">
                    <div className="requirement-info-step-number">
                      {step.number}
                    </div>

                    <div className="requirement-info-card-icon">
                      <Icon size={22} />
                    </div>
                  </div>

                  <h3 className="requirement-info-card-title">
                    {step.title}
                  </h3>

                  <p className="requirement-info-card-text">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* GUIDELINES + NOTICE */}
        <section className="requirement-info-two-column">

          <div className="requirement-info-section">
            <div className="requirement-info-section-heading">
              <CheckCircle2 size={25} />

              <h2 className="requirement-info-section-title">
                Important Guidelines
              </h2>
            </div>

            <div className="requirement-info-list">
              {guidelines.map((guideline, index) => (
                <div
                  key={index}
                  className="requirement-info-list-item"
                >
                  <CheckCircle2 size={19} />

                  <p>{guideline}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="requirement-info-notice">
            <div className="requirement-info-notice-heading">
              <AlertTriangle size={25} />

              <h2 className="requirement-info-notice-title">
                Safety & Medical Notice
              </h2>
            </div>

            <p>
              MedVisionRx is intended to help users communicate and
              manage blood requirements. It does not replace professional
              medical advice, blood testing, compatibility testing,
              transfusion decisions, or healthcare-facility procedures.
            </p>

            <div className="requirement-info-notice-box">
              <Info size={19} />

              <p>
                Final blood compatibility, transfusion and treatment
                decisions must always be handled by qualified healthcare
                professionals.
              </p>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};

export default BloodRequirementGuidelines;