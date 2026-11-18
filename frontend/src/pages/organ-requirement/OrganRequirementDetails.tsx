import { auth } from "../../firebase";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "./OrganRequirementDetails.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

interface DonorResponse {
  id?: string;
  _id?: string;
  organ_donation_id?: string;
  donation_id?: string;
  donor_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface OrganRequirement {
  id?: string;
  _id?: string;

  organ_required?: string;
  donation_type?: string;

  blood_group?: string | null;

  units_required?: number;
  original_units_required?: number;
  units_fulfilled?: number;
  remaining_units?: number;

  hospital_name?: string;
  hospital_city?: string;
  hospital_state?: string;

  city?: string;
  state?: string;

  required_date?: string;
  urgency?: string;
  status?: string;

  reason?: string;

  contact_name?: string;
  contact_phone?: string;

  created_at?: string;
  updated_at?: string;

  donor_responses?: DonorResponse[];
}



function formatText(
  value?: string | null
): string {
  if (!value) {
    return "Not specified";
  }

  return value
    .trim()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function getOrganEmoji(
  organ?: string
): string {
  const value =
    String(organ || "")
      .toLowerCase();

  if (value.includes("heart")) {
    return "❤️";
  }

  if (value.includes("lung")) {
    return "🫁";
  }

  if (value.includes("kidney")) {
    return "🫘";
  }

  if (value.includes("liver")) {
    return "🫀";
  }

  if (
    value.includes("eye") ||
    value.includes("cornea")
  ) {
    return "👁️";
  }

  return "🫀";
}

function formatDate(
  value?: string
): string {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function getLocation(
  requirement: OrganRequirement
): string {
  const city =
    requirement.hospital_city ||
    requirement.city ||
    "";

  const state =
    requirement.hospital_state ||
    requirement.state ||
    "";

  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || "Location not specified";
}

function getStatusClass(
  status?: string
): string {
  switch (
    String(status || "")
      .toLowerCase()
  ) {
    case "fulfilled":
      return "fulfilled";

    case "cancelled":
      return "cancelled";

    default:
      return "active";
  }
}

function getUrgencyClass(
  urgency?: string
): string {
  switch (
    String(urgency || "")
      .toLowerCase()
  ) {
    case "emergency":
      return "emergency";

    case "urgent":
      return "urgent";

    default:
      return "normal";
  }
}

function OrganRequirementDetails() {
  const navigate = useNavigate();

  const { requirementId } =
    useParams<{
      requirementId: string;
    }>();

  const [requirement, setRequirement] =
    useState<OrganRequirement | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadRequirement =
    useCallback(async () => {
      if (!requirementId) {
        setError(
          "Requirement ID is missing."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) throw new Error("Please sign in to view this organ requirement.");
        const token = await user.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/organ-requirements/${encodeURIComponent(requirementId)}`, { headers: { Authorization: `Bearer ${token}` } });

        const data: unknown =
          await response.json();

        if (!response.ok) {
          let message =
            "Unable to load the organ requirement.";

          if (
            typeof data ===
              "object" &&
            data !== null &&
            "detail" in data
          ) {
            const detail = (
              data as {
                detail?: unknown;
              }
            ).detail;

            if (
              typeof detail ===
              "string"
            ) {
              message = detail;
            }
          }

          throw new Error(message);
        }

        setRequirement(
          data as OrganRequirement
        );
      } catch (err) {
        console.error(
          "Organ requirement details error:",
          err
        );

        setRequirement(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the organ requirement."
        );
      } finally {
        setLoading(false);
      }
    }, [requirementId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadRequirement();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadRequirement]);

  const openMap = () => {
    if (!requirement) {
      return;
    }

    const query = [
      requirement.hospital_name ||
        "",
      requirement.hospital_city ||
        requirement.city ||
        "",
      requirement.hospital_state ||
        requirement.state ||
        "",
    ]
      .filter(Boolean)
      .join(", ");

    if (!query) {
      return;
    }

    const url =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const callContact = () => {
    if (
      requirement?.contact_phone
    ) {
      window.location.assign(`tel:${requirement.contact_phone}`);
    }
  };

  /* ============================================================
     LOADING
     ============================================================ */

  if (loading) {
    return (
      <div className="organ-requirement-details-page">

        <div className="organ-requirement-details-loading">

          <Loader2
            size={27}
            className="organ-requirement-details-spin"
          />

          <span>
            Loading requirement details...
          </span>

        </div>

      </div>
    );
  }

  /* ============================================================
     ERROR
     ============================================================ */

  if (error || !requirement) {
    return (
      <div className="organ-requirement-details-page">

        <div className="organ-requirement-details-error-page">

          <div className="organ-requirement-details-error-icon">
            <AlertCircle size={31} />
          </div>

          <h2>
            Requirement Not Found
          </h2>

          <p>
            {error ||
              "The requested organ requirement could not be found."}
          </p>

          <div className="organ-requirement-details-error-actions">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/organ-requirement/search"
                )
              }
            >
              Search Requirements
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/organ-requirement"
                )
              }
            >
              Back to Dashboard
            </button>

          </div>

        </div>

      </div>
    );
  }

  const originalUnits =
    requirement.original_units_required ??
    requirement.units_required ??
    0;

  const fulfilledUnits =
    requirement.units_fulfilled ??
    0;

  const remainingUnits =
    requirement.remaining_units ??
    Math.max(
      originalUnits -
        fulfilledUnits,
      0
    );

  const progress =
    originalUnits > 0
      ? Math.min(
          100,
          Math.round(
            (fulfilledUnits /
              originalUnits) *
              100
          )
        )
      : 0;

  const donorResponses =
    Array.isArray(
      requirement.donor_responses
    )
      ? requirement.donor_responses
      : [];

  return (
    <div className="organ-requirement-details-page">

      {/* ======================================================
          BREADCRUMB
          ====================================================== */}

      <div className="organ-requirement-details-breadcrumb">

        <button
          type="button"
          onClick={() =>
            navigate("/")
          }
        >
          Home
        </button>

        <ChevronRight size={14} />

        <button
          type="button"
          onClick={() =>
            navigate(
              "/organ-requirement"
            )
          }
        >
          Organ Requirement
        </button>

        <ChevronRight size={14} />

        <button
          type="button"
          onClick={() =>
            navigate(
              "/organ-requirement/search"
            )
          }
        >
          Search Organ
        </button>

        <ChevronRight size={14} />

        <strong>
          Requirement Details
        </strong>

      </div>

      {/* ======================================================
          HEADER
          ====================================================== */}

      <section className="organ-requirement-details-header">

        <div className="organ-requirement-details-header-main">

          <div className="organ-requirement-details-organ-icon">

            <span>
              {getOrganEmoji(
                requirement.organ_required
              )}
            </span>

          </div>

          <div>

            <span className="organ-requirement-details-eyebrow">
              ORGAN REQUIREMENT
            </span>

            <h1>
              {formatText(
                requirement.organ_required
              )}{" "}
              Required
            </h1>

            <p>
              {requirement.hospital_name ||
                "Hospital not specified"}
            </p>

          </div>

        </div>

        <div className="organ-requirement-details-header-badges">

          <span
            className={`organ-requirement-status ${getStatusClass(
              requirement.status
            )}`}
          >
            {requirement.status ===
            "fulfilled" ? (
              <CheckCircle2
                size={13}
              />
            ) : requirement.status ===
              "cancelled" ? (
              <XCircle size={13} />
            ) : (
              <Clock3 size={13} />
            )}

            {formatText(
              requirement.status ||
                "active"
            )}

          </span>

          <span
            className={`organ-requirement-urgency ${getUrgencyClass(
              requirement.urgency
            )}`}
          >
            {formatText(
              requirement.urgency
            )}
          </span>

        </div>

      </section>

      {/* ======================================================
          MAIN GRID
          ====================================================== */}

      <div className="organ-requirement-details-grid">

        {/* ====================================================
            REQUIREMENT SUMMARY
            ==================================================== */}

        <section className="organ-requirement-details-card">

          <div className="organ-requirement-details-card-title">

            <div className="organ-requirement-details-card-icon">
              <Heart size={17} />
            </div>

            <div>

              <h2>
                Requirement Summary
              </h2>

              <span>
                Current requirement status
              </span>

            </div>

          </div>

          <div className="organ-requirement-summary-grid">

            <div>
              <span>
                Organ
              </span>

              <strong>
                {formatText(
                  requirement.organ_required
                )}
              </strong>
            </div>

            <div>
              <span>
                Donation Type
              </span>

              <strong>
                {formatText(
                  requirement.donation_type
                )}
              </strong>
            </div>

            <div>
              <span>
                Blood Group
              </span>

              <strong>
                {requirement.blood_group ||
                  "Not specified"}
              </strong>
            </div>

            <div>
              <span>
                Required Date
              </span>

              <strong>
                {formatDate(
                  requirement.required_date
                )}
              </strong>
            </div>

          </div>

          {/* UNITS */}

          <div className="organ-requirement-units">

            <div className="organ-requirement-units-header">

              <span>
                Fulfilment Progress
              </span>

              <strong>
                {fulfilledUnits} /{" "}
                {originalUnits} units
              </strong>

            </div>

            <div className="organ-requirement-progress">

              <div
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

            <div className="organ-requirement-units-footer">

              <span>
                {fulfilledUnits} fulfilled
              </span>

              <span>
                {remainingUnits} remaining
              </span>

            </div>

          </div>

        </section>

        {/* ====================================================
            HOSPITAL
            ==================================================== */}

        <section className="organ-requirement-details-card">

          <div className="organ-requirement-details-card-title">

            <div className="organ-requirement-details-card-icon">
              <Building2 size={17} />
            </div>

            <div>

              <h2>
                Hospital Information
              </h2>

              <span>
                Location of the requirement
              </span>

            </div>

          </div>

          <div className="organ-requirement-hospital-info">

            <h3>
              {requirement.hospital_name ||
                "Hospital not specified"}
            </h3>

            <div>

              <MapPin size={15} />

              <span>
                {getLocation(
                  requirement
                )}
              </span>

            </div>

          </div>

          <button
            type="button"
            className="organ-requirement-map-button"
            onClick={openMap}
          >
            <MapPin size={15} />
            View on Map
          </button>

        </section>

        {/* ====================================================
            MEDICAL DETAILS
            ==================================================== */}

        <section className="organ-requirement-details-card">

          <div className="organ-requirement-details-card-title">

            <div className="organ-requirement-details-card-icon">
              <AlertCircle size={17} />
            </div>

            <div>

              <h2>
                Requirement Details
              </h2>

              <span>
                Information provided with the request
              </span>

            </div>

          </div>

          <div className="organ-requirement-reason">

            {requirement.reason ? (
              <p>
                {requirement.reason}
              </p>
            ) : (
              <p className="organ-requirement-muted">
                No additional reason was
                provided.
              </p>
            )}

          </div>

          <div className="organ-requirement-date-row">

            <CalendarDays
              size={15}
            />

            <span>
              Required by
            </span>

            <strong>
              {formatDate(
                requirement.required_date
              )}
            </strong>

          </div>

        </section>

        {/* ====================================================
            CONTACT
            ==================================================== */}

        <section className="organ-requirement-details-card">

          <div className="organ-requirement-details-card-title">

            <div className="organ-requirement-details-card-icon">
              <UserRound size={17} />
            </div>

            <div>

              <h2>
                Contact Information
              </h2>

              <span>
                Person responsible for this request
              </span>

            </div>

          </div>

          <div className="organ-requirement-contact">

            <div className="organ-requirement-contact-avatar">
              <UserRound size={21} />
            </div>

            <div>

              <strong>
                {requirement.contact_name ||
                  "Contact not specified"}
              </strong>

              {requirement.contact_phone && (
                <span>
                  <Phone size={13} />
                  {requirement.contact_phone}
                </span>
              )}

            </div>

          </div>

          {requirement.contact_phone && (
            <button
              type="button"
              className="organ-requirement-call-button"
              onClick={
                callContact
              }
            >
              <Phone size={15} />
              Contact
            </button>
          )}

        </section>

      </div>

      {/* ======================================================
          DONOR RESPONSE SUMMARY
          ====================================================== */}

      <section className="organ-requirement-response-card">

        <div className="organ-requirement-response-heading">

          <div className="organ-requirement-details-card-icon">
            <Users size={17} />
          </div>

          <div>

            <h2>
              Donor Responses
            </h2>

            <span>
              Responses received for this
              requirement
            </span>

          </div>

          <strong>
            {donorResponses.length}
          </strong>

        </div>

        {donorResponses.length ===
        0 ? (
          <div className="organ-requirement-no-responses">

            <Users size={25} />

            <p>
              No donor responses have
              been received yet.
            </p>

            <span>
              Eligible organ donors can
              respond to this requirement.
            </span>

          </div>
        ) : (
          <div className="organ-requirement-response-list">

            {donorResponses.map(
              (
                response,
                index
              ) => {

                const responseStatus =
                  String(
                    response.status ||
                      "pending"
                  ).toLowerCase();

                return (
                  <div
                    className="organ-requirement-response-row"
                    key={
                      response.id ||
                      response._id ||
                      response.organ_donation_id ||
                      response.donation_id ||
                      `response-${index}`
                    }
                  >

                    <div className="organ-requirement-response-user">
                      <UserRound
                        size={16}
                      />
                    </div>

                    <div>

                      <strong>
                        Donor Response{" "}
                        {index + 1}
                      </strong>

                      <span>
                        Response ID:{" "}
                        {response.id ||
                          response._id ||
                          response.organ_donation_id ||
                          response.donation_id ||
                          "Available"}
                      </span>

                    </div>

                    <span
                      className={`organ-requirement-response-status ${responseStatus}`}
                    >
                      {formatText(
                        responseStatus
                      )}
                    </span>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* ======================================================
          SECURITY
          ====================================================== */}

      <div className="organ-requirement-details-security">

        <ShieldCheck size={18} />

        <div>

          <strong>
            MedVisionRx requirement
          </strong>

          <span>
            This information is loaded from
            the organ requirement service and
            reflects the current database
            record.
          </span>

        </div>

      </div>

      {/* ======================================================
          ACTIONS
          ====================================================== */}

      <div className="organ-requirement-details-actions">

        <button
          type="button"
          className="organ-requirement-details-back"
          onClick={() =>
            navigate(
              "/organ-requirement/search"
            )
          }
        >
          <ArrowLeft size={15} />
          Back to Search
        </button>

        {requirement.status ===
          "active" && (
          <button
            type="button"
            className="organ-requirement-details-respond"
            onClick={() =>
              navigate(
                "/organ-donation/requests"
              )
            }
          >
            Find Organ Donors
            <ChevronRight
              size={15}
            />
          </button>
        )}

      </div>

    </div>
  );
}

export default OrganRequirementDetails;