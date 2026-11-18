import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";

import "./CreateOrganRequirement.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

interface FormData {
  organ_required: string;
  donation_type: string;
  blood_group: string;
  units_required: string;
  hospital_name: string;
  hospital_city: string;
  hospital_state: string;
  required_date: string;
  urgency: string;
  reason: string;
  contact_name: string;
  contact_phone: string;
}

const INITIAL_FORM: FormData = {
  organ_required: "",
  donation_type: "",
  blood_group: "",
  units_required: "1",
  hospital_name: "",
  hospital_city: "",
  hospital_state: "",
  required_date: "",
  urgency: "normal",
  reason: "",
  contact_name: "",
  contact_phone: "",
};

/* =========================================================
   ORGAN OPTIONS

   Frontend sends normalized short values.
   Backend converts them to:
   lung    -> Lungs
   kidney  -> Kidneys
   etc.
========================================================= */

const ORGAN_OPTIONS = [
  {
    value: "heart",
    label: "Heart",
  },
  {
    value: "lung",
    label: "Lungs",
  },
  {
    value: "kidney",
    label: "Kidneys",
  },
  {
    value: "liver",
    label: "Liver",
  },
  {
    value: "pancreas",
    label: "Pancreas",
  },
  {
    value: "intestine",
    label: "Intestine",
  },
  {
    value: "cornea",
    label: "Corneas",
  },
  {
    value: "skin",
    label: "Skin",
  },
  {
    value: "bone",
    label: "Bone",
  },
  {
    value: "heart valve",
    label: "Heart Valves",
  },
];

const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];


/* =========================================================
   TODAY
========================================================= */

function getToday(): string {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================================
   COMPONENT
========================================================= */

function CreateOrganRequirement() {
  const navigate = useNavigate();

  const [form, setForm] =
    useState<FormData>(INITIAL_FORM);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [createdRequirementId, setCreatedRequirementId] =
    useState("");

  /* =======================================================
     UPDATE FIELD
  ======================================================= */

  const updateField = (
    field: keyof FormData,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess(false);

    /* =====================================================
       CLIENT VALIDATION
    ===================================================== */

    if (!form.organ_required) {
      setError(
        "Please select the required organ."
      );
      return;
    }

    if (!form.donation_type) {
      setError(
        "Please select the donation type."
      );
      return;
    }

    const units = Number(
      form.units_required
    );

    if (
      !Number.isInteger(units) ||
      units < 1 ||
      units > 20
    ) {
      setError(
        "Units required must be between 1 and 20."
      );
      return;
    }

    if (!form.hospital_name.trim()) {
      setError(
        "Please enter the hospital name."
      );
      return;
    }

    if (!form.hospital_city.trim()) {
      setError(
        "Please enter the hospital city."
      );
      return;
    }

    if (!form.hospital_state.trim()) {
      setError(
        "Please enter the hospital state."
      );
      return;
    }

    if (!form.required_date) {
      setError(
        "Please select the required date."
      );
      return;
    }

    if (
      form.required_date <
      getToday()
    ) {
      setError(
        "Required date cannot be in the past."
      );
      return;
    }

    /*
     * REASON IS OPTIONAL.
     *
     * No validation here.
     */

    if (!form.contact_name.trim()) {
      setError(
        "Please enter the contact name."
      );
      return;
    }

    if (!form.contact_phone.trim()) {
      setError(
        "Please enter the contact phone number."
      );
      return;
    }

    const phone = form.contact_phone.trim();

    if (
      !/^\d{10,15}$/.test(phone)
    ) {
      setError(
        "Contact phone must contain 10 to 15 digits."
      );
      return;
    }

        /* =====================================================
       PAYLOAD
    ===================================================== */

    const payload = {
      organ_required:
        form.organ_required,

      donation_type:
        form.donation_type,

      blood_group:
        form.blood_group || null,

      units_required:
        units,

      hospital_name:
        form.hospital_name.trim(),

      hospital_city:
        form.hospital_city.trim(),

      hospital_state:
        form.hospital_state.trim(),

      required_date:
        form.required_date,

      urgency:
        form.urgency,

      /*
       * OPTIONAL
       *
       * Empty reason becomes null.
       */
      reason:
        form.reason.trim() || null,

      contact_name:
        form.contact_name.trim(),

      contact_phone:
        phone,
    };

    /* =====================================================
       API REQUEST
    ===================================================== */

    try {
      setLoading(true);

      // Use the currently signed-in Firebase account.
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      // Firebase ID token is verified by the FastAPI backend.
      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        `${API_BASE_URL}/api/organ-requirements/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();
      let data: unknown = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText) as unknown;
        } catch {
          data = { detail: responseText };
        }
      }

      /* ===================================================
         ERROR RESPONSE
      =================================================== */

      if (!response.ok) {
        let message =
          "Unable to create the organ requirement.";

        if (
          typeof data === "object" &&
          data !== null &&
          "detail" in data
        ) {
          const detail = (
            data as {
              detail?: unknown;
            }
          ).detail;

          if (
            typeof detail === "string"
          ) {
            message = detail;
          } else if (
            Array.isArray(detail)
          ) {
            message = detail
              .map((item) => {
                if (
                  typeof item ===
                    "object" &&
                  item !== null &&
                  "msg" in item
                ) {
                  return String(
                    (
                      item as {
                        msg: unknown;
                      }
                    ).msg
                  );
                }

                return String(item);
              })
              .join(", ");
          }
        }

        throw new Error(message);
      }

      /* ===================================================
         SUCCESS RESPONSE

         Backend returns:

         {
           message: "...",
           requirement: {...}
         }
      =================================================== */

      let requirementId = "";

      if (
        typeof data === "object" &&
        data !== null &&
        "requirement" in data
      ) {
        const result = (
          data as {
            requirement?: {
              id?: string;
              _id?: string;
            };
          }
        ).requirement;

        if (result) {
          requirementId =
            result.id ||
            result._id ||
            "";
        }
      }

      setCreatedRequirementId(
        requirementId
      );

      setSuccess(true);

      setForm({
        ...INITIAL_FORM,
        required_date: "",
      });
    } catch (err) {
      console.error(
        "Create Organ Requirement error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the organ requirement."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     SUCCESS SCREEN
  ========================================================= */

  if (success) {
    return (
      <div className="create-organ-requirement-page">
        <section className="create-organ-success">

          <div className="create-organ-success-icon">
            <CheckCircle2 size={38} />
          </div>

          <span className="create-organ-requirement-eyebrow">
            ORGAN REQUIREMENT
          </span>

          <h1>
            Requirement Created Successfully
          </h1>

          <p>
            Your organ requirement has
            been saved to the MedVisionRx
            system.
          </p>

          {createdRequirementId && (
            <div className="create-organ-success-id">

              <span>
                Requirement ID
              </span>

              <strong>
                {createdRequirementId}
              </strong>

            </div>
          )}

          <div className="create-organ-success-actions">

            <button
              type="button"
              className="create-organ-primary-button"
              onClick={() =>
                navigate(
                  "/organ-requirement/my-requests"
                )
              }
            >
              View My Requests
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className="create-organ-secondary-button"
              onClick={() =>
                navigate(
                  "/organ-requirement"
                )
              }
            >
              Back to Dashboard
            </button>

          </div>

        </section>

      </div>
    );
  }

  /* =========================================================
     MAIN FORM
  ========================================================= */

  return (
    <div className="create-organ-requirement-page">

      {/* =====================================================
          BREADCRUMB
      ===================================================== */}
      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="create-organ-requirement-header">

        <div>

          <span className="create-organ-requirement-eyebrow">
            ORGAN REQUIREMENT
          </span>

          <h1>
            Create Organ Requirement
          </h1>

          <p>
            Submit a real organ requirement
            for matching with eligible
            organ donors.
          </p>

        </div>

        <div className="create-organ-secure-badge">

          <ShieldCheck size={17} />

          Secure Medical Request

        </div>

      </section>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="create-organ-error">

          <AlertCircle size={19} />

          <div>

            <strong>
              Unable to create requirement
            </strong>

            <span>
              {error}
            </span>

          </div>

        </div>
      )}

      {/* =====================================================
          FORM
      ===================================================== */}

      <form
        className="create-organ-form"
        onSubmit={handleSubmit}
      >

        {/* ===================================================
            ORGAN REQUIREMENT
        =================================================== */}

        <section className="create-organ-form-section">

          <div className="create-organ-section-heading">

            <div className="create-organ-section-icon">
              <Heart size={18} />
            </div>

            <div>

              <h2>
                Organ Requirement
              </h2>

              <p>
                Tell us what organ is required
                and the type of donation.
              </p>

            </div>

          </div>

          <div className="create-organ-form-grid">

            {/* ORGAN */}

            <label className="create-organ-field">

              <span>
                Required Organ
                <b>*</b>
              </span>

              <select
                value={
                  form.organ_required
                }
                onChange={(event) =>
                  updateField(
                    "organ_required",
                    event.target.value
                  )
                }
              >

                <option value="">
                  Select organ
                </option>

                {ORGAN_OPTIONS.map(
                  (organ) => (
                    <option
                      key={organ.value}
                      value={organ.value}
                    >
                      {organ.label}
                    </option>
                  )
                )}

              </select>

            </label>

            {/* DONATION TYPE */}

            <label className="create-organ-field">

              <span>
                Donation Type
                <b>*</b>
              </span>

              <select
                value={
                  form.donation_type
                }
                onChange={(event) =>
                  updateField(
                    "donation_type",
                    event.target.value
                  )
                }
              >

                <option value="">
                  Select donation type
                </option>

                <option value="living">
                  Living
                </option>

                <option value="deceased">
                  Deceased
                </option>

              </select>

            </label>

            {/* BLOOD GROUP */}

            <label className="create-organ-field">

              <span>
                Blood Group
                <small>
                  Optional
                </small>
              </span>

              <select
                value={
                  form.blood_group
                }
                onChange={(event) =>
                  updateField(
                    "blood_group",
                    event.target.value
                  )
                }
              >

                <option value="">
                  Not specified
                </option>

                {BLOOD_GROUPS.map(
                  (group) => (
                    <option
                      key={group}
                      value={group}
                    >
                      {group}
                    </option>
                  )
                )}

              </select>

            </label>

            {/* UNITS */}

            <label className="create-organ-field">

              <span>
                Units Required
                <b>*</b>
              </span>

              <input
                type="number"
                min="1"
                max="20"
                value={
                  form.units_required
                }
                onChange={(event) =>
                  updateField(
                    "units_required",
                    event.target.value
                  )
                }
              />

              <small className="create-organ-field-help">
                Enter a value from 1 to 20.
              </small>

            </label>

            {/* URGENCY */}

            <label className="create-organ-field">

              <span>
                Urgency
                <b>*</b>
              </span>

              <select
                value={
                  form.urgency
                }
                onChange={(event) =>
                  updateField(
                    "urgency",
                    event.target.value
                  )
                }
              >

                <option value="normal">
                  Normal
                </option>

                <option value="urgent">
                  Urgent
                </option>

                <option value="emergency">
                  Emergency
                </option>

              </select>

            </label>

            {/* REQUIRED DATE */}

            <label className="create-organ-field">

              <span>
                Required Date
                <b>*</b>
              </span>

              <div className="create-organ-input-icon">

                <CalendarDays size={16} />

                <input
                  type="date"
                  min={getToday()}
                  value={
                    form.required_date
                  }
                  onChange={(event) =>
                    updateField(
                      "required_date",
                      event.target.value
                    )
                  }
                />

              </div>

            </label>

          </div>

        </section>

        {/* ===================================================
            HOSPITAL
        =================================================== */}

        <section className="create-organ-form-section">

          <div className="create-organ-section-heading">

            <div className="create-organ-section-icon">
              <Building2 size={18} />
            </div>

            <div>

              <h2>
                Hospital Information
              </h2>

              <p>
                Enter the hospital or medical
                center where the requirement is needed.
              </p>

            </div>

          </div>

          <div className="create-organ-form-grid">

            <label className="create-organ-field create-organ-field-full">

              <span>
                Hospital Name
                <b>*</b>
              </span>

              <input
                type="text"
                placeholder="Enter hospital or medical center name"
                value={
                  form.hospital_name
                }
                onChange={(event) =>
                  updateField(
                    "hospital_name",
                    event.target.value
                  )
                }
              />

            </label>

            <label className="create-organ-field">

              <span>
                City
                <b>*</b>
              </span>

              <div className="create-organ-input-icon">

                <MapPin size={16} />

                <input
                  type="text"
                  placeholder="Enter city"
                  value={
                    form.hospital_city
                  }
                  onChange={(event) =>
                    updateField(
                      "hospital_city",
                      event.target.value
                    )
                  }
                />

              </div>

            </label>

            <label className="create-organ-field">

              <span>
                State
                <b>*</b>
              </span>

              <input
                type="text"
                placeholder="Enter state"
                value={
                  form.hospital_state
                }
                onChange={(event) =>
                  updateField(
                    "hospital_state",
                    event.target.value
                  )
                }
              />

            </label>

          </div>

        </section>

        {/* ===================================================
            REQUIREMENT DETAILS
            OPTIONAL
        =================================================== */}

        <section className="create-organ-form-section">

          <div className="create-organ-section-heading">

            <div className="create-organ-section-icon">
              <AlertCircle size={18} />
            </div>

            <div>

              <h2>
                Requirement Details
              </h2>

              <p>
                Provide additional information if needed.
              </p>

            </div>

          </div>

          <label className="create-organ-field create-organ-field-full">

            <span>
              Reason for Requirement
              <small>
                Optional
              </small>
            </span>

            <textarea
              rows={5}
              placeholder="Optional: Describe the requirement or relevant information..."
              value={
                form.reason
              }
              onChange={(event) =>
                updateField(
                  "reason",
                  event.target.value
                )
              }
            />

            <small className="create-organ-field-help">
              Do not enter unnecessary sensitive medical information.
            </small>

          </label>

        </section>

        {/* ===================================================
            CONTACT
        =================================================== */}

        <section className="create-organ-form-section">

          <div className="create-organ-section-heading">

            <div className="create-organ-section-icon">
              <UserRound size={18} />
            </div>

            <div>

              <h2>
                Contact Information
              </h2>

              <p>
                Provide the person who can be
                contacted about this requirement.
              </p>

            </div>

          </div>

          <div className="create-organ-form-grid">

            <label className="create-organ-field">

              <span>
                Contact Name
                <b>*</b>
              </span>

              <div className="create-organ-input-icon">

                <UserRound size={16} />

                <input
                  type="text"
                  placeholder="Full name"
                  value={
                    form.contact_name
                  }
                  onChange={(event) =>
                    updateField(
                      "contact_name",
                      event.target.value
                    )
                  }
                />

              </div>

            </label>

            <label className="create-organ-field">

              <span>
                Contact Phone
                <b>*</b>
              </span>

              <div className="create-organ-input-icon">

                <Phone size={16} />

                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="10-digit phone number"
                  value={
                    form.contact_phone
                  }
                  onChange={(event) =>
                    updateField(
                      "contact_phone",
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                />

              </div>

            </label>

          </div>

        </section>

        {/* ===================================================
            ACTIONS
        =================================================== */}

        <div className="create-organ-form-actions">

          <button
            type="button"
            className="create-organ-cancel-button"
            onClick={() =>
              navigate(
                "/organ-requirement"
              )
            }
            disabled={loading}
          >
            <ArrowLeft size={15} />
            Cancel
          </button>

          <button
            type="submit"
            className="create-organ-submit-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <Loader2
                  size={16}
                  className="create-organ-loading-icon"
                />
                Saving Requirement...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Create Requirement
              </>
            )}

          </button>

        </div>

        {/* ===================================================
            SECURITY NOTE
        =================================================== */}

        <div className="create-organ-security-note">

          <ShieldCheck size={18} />

          <div>

            <strong>
              Before submitting
            </strong>

            <span>
              Please verify the hospital,
              contact information, organ
              requirement and required date.
              The submitted information will
              be stored in the MedVisionRx
              database.
            </span>

          </div>

        </div>

      </form>
    </div>
  );
}

export default CreateOrganRequirement;