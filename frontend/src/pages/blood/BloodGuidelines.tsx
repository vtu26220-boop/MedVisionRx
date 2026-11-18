import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Coffee,
  Droplets,
  HeartPulse,
  Info,
  ShieldCheck,
  Stethoscope,
  Utensils,
  Wind,
  XCircle,
} from "lucide-react";

import "./BloodGuidelines.css";

function BloodGuidelines() {
  return (
    <div className="blood-guidelines-page">

      {/* ======================================================
          PAGE HEADER
          ====================================================== */}

      <div className="blood-guidelines-header">

        <div>
          <p className="blood-guidelines-eyebrow">
            Blood Donation
          </p>

          <h1>
            Blood Donation Guidelines
          </h1>

          <p className="blood-guidelines-subtitle">
            Simple guidance to help you prepare for donation,
            understand the process and take care of yourself
            afterwards.
          </p>
        </div>

        <div className="blood-guidelines-header-icon">
          <Droplets size={30} />
        </div>

      </div>


      {/* ======================================================
          IMPORTANT SAFETY NOTICE
          ====================================================== */}

      <section className="blood-guidelines-notice">

        <div className="blood-guidelines-notice-icon">
          <Stethoscope size={22} />
        </div>

        <div>
          <h2>
            Medical screening comes first
          </h2>

          <p>
            These guidelines provide general information.
            Before donation, blood-bank personnel assess your
            health and determine whether you can donate safely.
          </p>
        </div>

      </section>


      {/* ======================================================
          BEFORE DONATION
          ====================================================== */}

      <section className="blood-guidelines-card">

        <div className="blood-guidelines-card-header">

          <div className="blood-guidelines-section-icon blue">
            <HeartPulse size={21} />
          </div>

          <div>
            <h2>
              Before You Donate
            </h2>

            <p>
              Prepare yourself and provide accurate health
              information during screening.
            </p>
          </div>

        </div>


        <div className="blood-guidelines-grid">

          <div className="blood-guideline-item">
            <CheckCircle2 size={19} />

            <div>
              <h3>
                Eat normally
              </h3>

              <p>
                Have your usual meal or a light snack before
                donation. Avoid arriving on an empty stomach.
              </p>
            </div>
          </div>


          <div className="blood-guideline-item">
            <CheckCircle2 size={19} />

            <div>
              <h3>
                Stay hydrated
              </h3>

              <p>
                Drink fluids and arrive adequately hydrated
                before your donation.
              </p>
            </div>
          </div>


          <div className="blood-guideline-item">
            <CheckCircle2 size={19} />

            <div>
              <h3>
                Bring relevant information
              </h3>

              <p>
                Provide accurate information about your health,
                medicines, travel and other relevant history.
              </p>
            </div>
          </div>


          <div className="blood-guideline-item">
            <CheckCircle2 size={19} />

            <div>
              <h3>
                Ask questions
              </h3>

              <p>
                You can ask the blood-bank staff about the
                donation procedure or any concern you have.
              </p>
            </div>
          </div>

        </div>

      </section>


      {/* ======================================================
          HEALTH INFORMATION
          ====================================================== */}

      <section className="blood-guidelines-card">

        <div className="blood-guidelines-card-header">

          <div className="blood-guidelines-section-icon orange">
            <Info size={21} />
          </div>

          <div>
            <h2>
              Tell the Blood Bank
            </h2>

            <p>
              Accurate information helps staff make the
              appropriate donor-selection decision.
            </p>
          </div>

        </div>


        <div className="blood-guidelines-information-list">

          <div>
            <AlertCircle size={18} />

            <span>
              Tell staff if you currently have fever,
              infection or another acute illness.
            </span>
          </div>

          <div>
            <AlertCircle size={18} />

            <span>
              Tell staff about medicines or antibiotics
              you are currently taking.
            </span>
          </div>

          <div>
            <AlertCircle size={18} />

            <span>
              Tell staff about recent tattoos, piercings
              or acupuncture.
            </span>
          </div>

          <div>
            <AlertCircle size={18} />

            <span>
              Tell staff about recent travel and relevant
              medical history.
            </span>
          </div>

          <div>
            <AlertCircle size={18} />

            <span>
              Do not donate while under the influence
              of alcohol.
            </span>
          </div>

        </div>

      </section>


      {/* ======================================================
          SCREENING PROCESS
          ====================================================== */}

      <section className="blood-guidelines-card">

        <div className="blood-guidelines-card-header">

          <div className="blood-guidelines-section-icon purple">
            <ShieldCheck size={21} />
          </div>

          <div>
            <h2>
              Pre-Donation Screening
            </h2>

            <p>
              What generally happens before you donate.
            </p>
          </div>

        </div>


        <div className="blood-guidelines-process">

          <div className="blood-guidelines-step">

            <div className="blood-guidelines-step-number">
              01
            </div>

            <div>
              <h3>
                Registration
              </h3>

              <p>
                Your required donor details are recorded.
              </p>
            </div>

          </div>


          <div className="blood-guidelines-step">

            <div className="blood-guidelines-step-number">
              02
            </div>

            <div>
              <h3>
                Health questionnaire
              </h3>

              <p>
                Staff ask questions about your health,
                lifestyle and relevant medical history.
              </p>
            </div>

          </div>


          <div className="blood-guidelines-step">

            <div className="blood-guidelines-step-number">
              03
            </div>

            <div>
              <h3>
                Health assessment
              </h3>

              <p>
                Required checks can include pulse,
                temperature, blood pressure and hemoglobin.
              </p>
            </div>

          </div>


          <div className="blood-guidelines-step">

            <div className="blood-guidelines-step-number">
              04
            </div>

            <div>
              <h3>
                Final selection
              </h3>

              <p>
                Qualified blood-bank personnel decide
                whether donation can proceed.
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          DURING DONATION
          ====================================================== */}

      <section className="blood-guidelines-card">

        <div className="blood-guidelines-card-header">

          <div className="blood-guidelines-section-icon red">
            <Droplets size={21} />
          </div>

          <div>
            <h2>
              During Donation
            </h2>

            <p>
              The donation is performed using sterile
              equipment by trained personnel.
            </p>
          </div>

        </div>


        <div className="blood-guidelines-during">

          <div className="blood-guidelines-during-item">

            <Droplets size={20} />

            <div>
              <strong>
                Sterile equipment
              </strong>

              <span>
                Blood collection equipment is sterile
                and intended for appropriate use.
              </span>
            </div>

          </div>


          <div className="blood-guidelines-during-item">

            <Clock3 size={20} />

            <div>
              <strong>
                Donation time
              </strong>

              <span>
                The actual blood collection is generally
                completed within several minutes.
              </span>
            </div>

          </div>


          <div className="blood-guidelines-during-item">

            <HeartPulse size={20} />

            <div>
              <strong>
                Tell staff how you feel
              </strong>

              <span>
                Inform the staff immediately if you feel
                unwell, dizzy or uncomfortable.
              </span>
            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          AFTER DONATION
          ====================================================== */}

      <section className="blood-guidelines-card">

        <div className="blood-guidelines-card-header">

          <div className="blood-guidelines-section-icon green">
            <Coffee size={21} />
          </div>

          <div>
            <h2>
              After Donation
            </h2>

            <p>
              Follow the blood centre's instructions after
              completing your donation.
            </p>
          </div>

        </div>


        <div className="blood-guidelines-after-grid">

          <div className="blood-guidelines-after-item">

            <Droplets size={21} />

            <h3>
              Drink fluids
            </h3>

            <p>
              Increase your fluid intake after donation.
              e-RaktKosh recommends increased fluids for
              the following 24–48 hours.
            </p>

          </div>


          <div className="blood-guidelines-after-item">

            <Utensils size={21} />

            <h3>
              Eat well
            </h3>

            <p>
              Have balanced meals after donation and
              follow the advice given by the blood centre.
            </p>

          </div>


          <div className="blood-guidelines-after-item">

            <ShieldCheck size={21} />

            <h3>
              Take it easy
            </h3>

            <p>
              Avoid strenuous physical activity and
              heavy lifting with the donation arm for
              the period advised by the blood centre.
            </p>

          </div>


          <div className="blood-guidelines-after-item">

            <Wind size={21} />

            <h3>
              Rest if needed
            </h3>

            <p>
              If you feel light-headed, sit or lie down
              and inform the blood-bank staff.
            </p>

          </div>

        </div>

      </section>


      {/* ======================================================
          WHAT TO AVOID
          ====================================================== */}

      <section className="blood-guidelines-card">

        <div className="blood-guidelines-card-header">

          <div className="blood-guidelines-section-icon red">
            <XCircle size={21} />
          </div>

          <div>
            <h2>
              Things to Avoid After Donation
            </h2>

            <p>
              Follow the blood centre's post-donation
              instructions.
            </p>
          </div>

        </div>


        <div className="blood-guidelines-avoid-list">

          <div>
            <XCircle size={18} />

            <span>
              Avoid strenuous physical exertion immediately
              after donation.
            </span>
          </div>

          <div>
            <XCircle size={18} />

            <span>
              Avoid heavy lifting or pulling with the
              donation arm for the advised period.
            </span>
          </div>

          <div>
            <XCircle size={18} />

            <span>
              Avoid alcohol after donation according to
              blood-centre guidance.
            </span>
          </div>

          <div>
            <XCircle size={18} />

            <span>
              Do not ignore persistent or concerning
              symptoms after donation.
            </span>
          </div>

        </div>

      </section>


      {/* ======================================================
          WHEN TO SEEK HELP
          ====================================================== */}

      <section className="blood-guidelines-help">

        <div className="blood-guidelines-help-icon">
          <AlertCircle size={24} />
        </div>

        <div>

          <h2>
            If you feel unwell
          </h2>

          <p>
            Tell the blood-bank staff immediately if you
            experience significant dizziness, fainting,
            persistent bleeding or another concerning
            symptom during or after donation.
          </p>

          <p>
            For a serious or persistent medical problem,
            seek appropriate medical attention.
          </p>

        </div>

      </section>


      {/* ======================================================
          FINAL NOTE
          ====================================================== */}

      <section className="blood-guidelines-footer-note">

        <ShieldCheck size={22} />

        <p>
          Blood donation guidance does not replace medical
          assessment. Always follow the instructions provided
          by the qualified blood-bank team at the donation
          centre.
        </p>

      </section>

    </div>
  );
}

export default BloodGuidelines;