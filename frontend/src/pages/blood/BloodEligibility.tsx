import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  HeartPulse,
  Info,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import "./BloodEligibility.css";

function BloodEligibility() {
  return (
    <div className="blood-eligibility-page">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="blood-eligibility-header">

        <div>
          <p className="blood-eligibility-eyebrow">
            Blood Donation
          </p>

          <h1>
            Donation Eligibility
          </h1>

          <p className="blood-eligibility-subtitle">
            Review the general requirements before visiting
            a blood donation centre.
          </p>
        </div>

        <div className="blood-eligibility-header-icon">
          <ClipboardCheck size={28} />
        </div>

      </div>


      {/* ======================================================
          IMPORTANT NOTICE
          ====================================================== */}

      <section className="blood-eligibility-notice">

        <div className="blood-eligibility-notice-icon">
          <Stethoscope size={22} />
        </div>

        <div>
          <h2>
            Final eligibility is decided during medical screening
          </h2>

          <p>
            This page provides general information only.
            Blood-bank staff will perform the required health
            checks and decide whether donation can proceed.
          </p>
        </div>

      </section>


      {/* ======================================================
          GENERAL REQUIREMENTS
          ====================================================== */}

      <section className="blood-eligibility-card">

        <div className="blood-eligibility-card-header">

          <div>
            <h2>
              General Requirements
            </h2>

            <p>
              Common requirements used during blood-donation
              screening.
            </p>
          </div>

          <CheckCircle2 size={22} />

        </div>


        <div className="blood-eligibility-grid">

          <div className="blood-eligibility-item">

            <div className="blood-eligibility-item-icon">
              <HeartPulse size={20} />
            </div>

            <div>
              <h3>
                Age
              </h3>

              <p>
                Generally, donors should be between
                18 and 65 years of age.
              </p>
            </div>

          </div>


          <div className="blood-eligibility-item">

            <div className="blood-eligibility-item-icon">
              <Droplets size={20} />
            </div>

            <div>
              <h3>
                Weight
              </h3>

              <p>
                A minimum body weight is required.
                Blood-bank staff determine the appropriate
                donation volume based on the donor's weight.
              </p>
            </div>

          </div>


          <div className="blood-eligibility-item">

            <div className="blood-eligibility-item-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h3>
                General Health
              </h3>

              <p>
                Donors should be in suitable health and
                free from conditions that require temporary
                or permanent deferral.
              </p>
            </div>

          </div>


          <div className="blood-eligibility-item">

            <div className="blood-eligibility-item-icon">
              <ClipboardCheck size={20} />
            </div>

            <div>
              <h3>
                Screening
              </h3>

              <p>
                A health questionnaire, interview and
                required medical checks are performed before
                donation.
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          BEFORE DONATING
          ====================================================== */}

      <section className="blood-eligibility-card">

        <div className="blood-eligibility-card-header">

          <div>
            <h2>
              Before You Donate
            </h2>

            <p>
              Inform the blood-bank staff about relevant
              health and lifestyle information.
            </p>
          </div>

          <Info size={22} />

        </div>


        <div className="blood-eligibility-check-list">

          <div className="blood-eligibility-check">

            <CheckCircle2 size={18} />

            <span>
              Tell the staff if you currently have fever,
              infection or an acute illness.
            </span>

          </div>


          <div className="blood-eligibility-check">

            <CheckCircle2 size={18} />

            <span>
              Tell the staff about medicines or antibiotics
              you are currently taking.
            </span>

          </div>


          <div className="blood-eligibility-check">

            <CheckCircle2 size={18} />

            <span>
              Inform staff about recent tattoos, piercings
              or acupuncture.
            </span>

          </div>


          <div className="blood-eligibility-check">

            <CheckCircle2 size={18} />

            <span>
              Inform staff about recent travel or other
              relevant medical history.
            </span>

          </div>


          <div className="blood-eligibility-check">

            <CheckCircle2 size={18} />

            <span>
              Do not donate while under the influence of
              alcohol.
            </span>

          </div>


          <div className="blood-eligibility-check">

            <CheckCircle2 size={18} />

            <span>
              Answer the donor questionnaire honestly and
              completely.
            </span>

          </div>

        </div>

      </section>


      {/* ======================================================
          MEDICAL SCREENING
          ====================================================== */}

      <section className="blood-eligibility-card">

        <div className="blood-eligibility-card-header">

          <div>
            <h2>
              Medical Screening
            </h2>

            <p>
              Checks performed by trained blood-bank personnel.
            </p>
          </div>

          <Stethoscope size={22} />

        </div>


        <div className="blood-eligibility-screening-grid">

          <div>
            <strong>
              Health questionnaire
            </strong>

            <span>
              Medical history and relevant risk factors.
            </span>
          </div>


          <div>
            <strong>
              Hemoglobin
            </strong>

            <span>
              Checked before donation.
            </span>
          </div>


          <div>
            <strong>
              Blood pressure
            </strong>

            <span>
              Checked as part of donor assessment.
            </span>
          </div>


          <div>
            <strong>
              Pulse
            </strong>

            <span>
              Checked during the health assessment.
            </span>
          </div>


          <div>
            <strong>
              Temperature
            </strong>

            <span>
              Checked for signs of illness.
            </span>
          </div>


          <div>
            <strong>
              Final assessment
            </strong>

            <span>
              Made by qualified blood-bank personnel.
            </span>
          </div>

        </div>

      </section>


      {/* ======================================================
          DEFERRAL NOTICE
          ====================================================== */}

      <section className="blood-eligibility-warning">

        <div className="blood-eligibility-warning-icon">
          <AlertCircle size={22} />
        </div>

        <div>

          <h2>
            Temporary deferral may be required
          </h2>

          <p>
            Some situations may require you to wait before
            donating. The duration depends on the specific
            situation and the blood-bank assessment.
          </p>

          <p>
            Examples can include acute illness, certain recent
            procedures, tattoos or piercings, travel-related
            restrictions, medications and other medical factors.
          </p>

        </div>

      </section>


      {/* ======================================================
          FINAL MESSAGE
          ====================================================== */}

      <section className="blood-eligibility-final">

        <ShieldCheck size={24} />

        <div>

          <h2>
            Ready to donate?
          </h2>

          <p>
            Meeting the general requirements does not guarantee
            eligibility. The blood-bank medical team will
            complete the final screening before donation.
          </p>

        </div>

      </section>

    </div>
  );
}

export default BloodEligibility;