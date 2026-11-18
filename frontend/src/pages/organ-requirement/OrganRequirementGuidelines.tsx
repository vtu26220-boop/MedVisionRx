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

import "./OrganRequirementGuidelines.css";

const OrganRequirementGuidelines: React.FC = () => {
  const steps = [
    {
      number: "01",
      icon: FilePlus2,
      title: "Create Requirement",
      description:
        "Enter accurate patient, organ, blood group, urgency, hospital, contact and required-date information.",
    },
    {
      number: "02",
      icon: ClipboardCheck,
      title: "Review Requirement",
      description:
        "Review the information carefully before submitting the organ requirement to make sure all details are accurate.",
    },
    {
      number: "03",
      icon: Users,
      title: "Receive Donor Responses",
      description:
        "Eligible donors may review active requirements and submit a response when they are willing to support the requirement.",
    },
    {
      number: "04",
      icon: ShieldCheck,
      title: "Review Responses",
      description:
        "Review donor responses and coordinate with the appropriate healthcare professionals and authorized organizations.",
    },
  ];

  const guidelines = [
    "Provide accurate patient and medical requirement information.",
    "Select the correct organ required by the patient.",
    "Enter the patient's blood group accurately whenever it is known.",
    "Use the correct urgency level according to the actual medical situation.",
    "Provide a valid hospital or healthcare facility name.",
    "Provide a reachable contact person and phone number.",
    "Keep requirement information updated when the medical situation changes.",
    "Do not use the platform for false, misleading, or non-medical requirements.",
    "Do not make medical or transplant decisions based only on information shown on the platform.",
    "Coordinate final medical decisions with qualified healthcare professionals.",
  ];

  return (
    <div className="requirement-info-page organ-requirement-page">
      <div className="requirement-info-container">

        {/* HERO */}
        <section className="requirement-info-hero">
          <div className="requirement-info-icon">
            <BookOpen size={30} />
          </div>

          <div>
            <p className="requirement-info-eyebrow">
              ORGAN REQUIREMENT
            </p>

            <h1 className="requirement-info-title">
              Guidelines
            </h1>

            <p className="requirement-info-description">
              Follow these guidelines when creating, managing and
              responding to organ requirements through MedVisionRx.
            </p>
          </div>
        </section>

        {/* PROCESS */}
        <section className="requirement-info-section">
          <div className="requirement-info-section-heading">
            <BookOpen size={25} />

            <h2 className="requirement-info-section-title">
              How Organ Requirement Works
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
              manage organ requirements. It does not replace professional
              medical advice, transplant evaluation, or decisions made by
              authorized healthcare organizations.
            </p>

            <div className="requirement-info-notice-box">
              <Info size={19} />

              <p>
                Never rely only on a donor response or platform information
                to determine medical suitability or transplant eligibility.
              </p>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};

export default OrganRequirementGuidelines;