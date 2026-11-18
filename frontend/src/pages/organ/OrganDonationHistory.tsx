import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileHeart,
  HeartHandshake,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebase";
import { Link } from "react-router-dom";

import "./OrganDonationHistory.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

interface OrganDonation {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  emergency_name?: string | null;
  emergency_relationship?: string | null;
  emergency_phone?: string | null;
  donation_type: "deceased" | "living";
  organs: string[];
  has_chronic_disease: boolean;
  chronic_disease_details?: string | null;
  has_infectious_disease: boolean;
  infectious_disease_details?: string | null;
  currently_taking_medication: boolean;
  medication_details?: string | null;
  eligibility_status:
    | "eligible"
    | "not_eligible"
    | "medical_review";
  eligibility_reasons: string[];
  status: "active" | "inactive" | "cancelled";
  consent: boolean;
  information_correct: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

interface AcceptedDonation {
  id: string;
  status: string;
  accepted_at?: string | null;
  organ?: string | null;
  organ_required?: string | null;
  donation_type?: string | null;
  blood_group?: string | null;
  hospital_name?: string | null;
  hospital_city?: string | null;
  hospital_state?: string | null;
  required_date?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  requester_name?: string | null;
  requester_phone?: string | null;
  requester_email?: string | null;
  urgency?: string | null;
  reason?: string | null;
  donor_snapshot?: Record<string, unknown> | null;
  requirement_snapshot?: Record<string, unknown> | null;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "Not available";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDonationTypeLabel(type?: string | null) {
  if (type === "living") return "Living Donation";
  if (type === "deceased") return "Donation After Death";
  return "Not available";
}

function getEligibilityLabel(
  status?: OrganDonation["eligibility_status"]
) {
  if (status === "eligible") {
    return "No Immediate Eligibility Concern Found";
  }

  if (status === "medical_review") {
    return "Medical Review Required";
  }

  if (status === "not_eligible") {
    return "Not Eligible";
  }

  return "Not Available";
}

function getStatusLabel(status?: OrganDonation["status"]) {
  if (status === "active") return "Active";
  if (status === "cancelled") return "Cancelled";
  if (status === "inactive") return "Inactive";
  return "Unknown";
}

function OrganDonationHistory() {
  const [donations, setDonations] = useState<OrganDonation[]>([]);
  const [acceptedDonations, setAcceptedDonations] = useState<AcceptedDonation[]>([]);
  const [acceptedError, setAcceptedError] = useState("");
  const [selectedAcceptedDonation, setSelectedAcceptedDonation] = useState<AcceptedDonation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDonation, setSelectedDonation] =
    useState<OrganDonation | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<OrganDonation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadDonations = useCallback(async (firebaseUser: User | null) => {
    try {
      setLoading(true);
      setError("");

      if (!firebaseUser) {
        setDonations([]);
        setAcceptedDonations([]);
        throw new Error("Please sign in to view your organ donation pledges.");
      }

      // Use the authenticated Firebase UID, never a localStorage development ID.
      const userId = firebaseUser.uid;
      const token = await firebaseUser.getIdToken();

      /*
       * This is a personal "My Donations" page.
       * It requests only the signed-in user's record and sends the Firebase
       * ID token in the same way as the Blood Donation service.
       */
      const response = await fetch(
        `${API_BASE_URL}/api/organ-donations/by-user/${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        let message = `Unable to load your organ donation pledges. Server returned ${response.status}.`;
        try {
          const errorData = await response.json();
          if (typeof errorData?.detail === "string") {
            message = errorData.detail;
          }
        } catch {
          // Keep the readable fallback message.
        }
        throw new Error(message);
      }

      const data: unknown = response.status === 404 ? [] : await response.json();

      /*
       * Accept the response shapes already supported by the page:
       * array, { data }, { donations }, { records }, or one donor object.
       */
      let records: unknown[] = [];

      if (Array.isArray(data)) {
        records = data;
      } else if (typeof data === "object" && data !== null) {
        const responseData = data as {
          data?: unknown;
          donations?: unknown;
          records?: unknown;
        };

        if (Array.isArray(responseData.data)) {
          records = responseData.data;
        } else if (Array.isArray(responseData.donations)) {
          records = responseData.donations;
        } else if (Array.isArray(responseData.records)) {
          records = responseData.records;
        } else if ("id" in data || "_id" in data) {
          records = [data];
        }
      }

      const normalizedDonations: OrganDonation[] = records
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" &&
            item !== null &&
            ("id" in item || "_id" in item)
        )
        .map((item): OrganDonation => ({
          ...(item as unknown as OrganDonation),
          id: String(item.id ?? item._id),
          organs: Array.isArray(item.organs)
            ? item.organs.map(String)
            : [],
          eligibility_reasons: Array.isArray(item.eligibility_reasons)
            ? item.eligibility_reasons.map(String)
            : [],
          created_at:
            typeof item.created_at === "string" || item.created_at === null
              ? item.created_at
              : undefined,
          updated_at:
            typeof item.updated_at === "string" || item.updated_at === null
              ? item.updated_at
              : undefined,
        }))
        .sort((a: OrganDonation, b: OrganDonation) => {
          const dateA = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;
          const dateB = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;

          return dateB - dateA;
        });

      setDonations(normalizedDonations);

      // Load accepted donor responses from the dedicated donation-history
      // endpoint. The endpoint returns { success, count, data }.
      try {
        setAcceptedError("");
        const historyResponse = await fetch(
          `${API_BASE_URL}/api/organ-donations/history?user_id=${encodeURIComponent(userId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!historyResponse.ok) {
          let historyMessage = `Unable to load accepted donations (${historyResponse.status}).`;
          try {
            const historyError = await historyResponse.json();
            if (typeof historyError?.detail === "string") {
              historyMessage = historyError.detail;
            }
          } catch {
            // Use fallback message.
          }
          throw new Error(historyMessage);
        }

        const historyPayload: unknown = await historyResponse.json();
        let historyRecords: unknown[] = [];

        if (Array.isArray(historyPayload)) {
          historyRecords = historyPayload;
        } else if (typeof historyPayload === "object" && historyPayload !== null) {
          const payload = historyPayload as {
            data?: unknown;
            history?: unknown;
            records?: unknown;
          };
          if (Array.isArray(payload.data)) historyRecords = payload.data;
          else if (Array.isArray(payload.history)) historyRecords = payload.history;
          else if (Array.isArray(payload.records)) historyRecords = payload.records;
        }

        const normalizedHistory = historyRecords
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === "object" && item !== null
          )
          .map((item): AcceptedDonation => {
            const requirementSnapshot =
              typeof item.requirement_snapshot === "object" && item.requirement_snapshot !== null
                ? item.requirement_snapshot as Record<string, unknown>
                : {};
            const donorSnapshot =
              typeof item.donor_snapshot === "object" && item.donor_snapshot !== null
                ? item.donor_snapshot as Record<string, unknown>
                : {};

            return {
              id: String(item.id ?? item._id ?? item.response_id ?? item.responseId ?? ""),
              status: String(item.status ?? item.response_status ?? "accepted"),
              accepted_at:
                typeof item.accepted_at === "string" || item.accepted_at === null
                  ? item.accepted_at
                  : undefined,
              organ: String(item.organ ?? item.organ_required ?? requirementSnapshot.organ_required ?? ""),
              organ_required: String(item.organ_required ?? item.organ ?? requirementSnapshot.organ_required ?? ""),
              donation_type: String(item.donation_type ?? requirementSnapshot.donation_type ?? donorSnapshot.donation_type ?? ""),
              blood_group: String(item.blood_group ?? donorSnapshot.blood_group ?? ""),
              hospital_name: String(item.hospital_name ?? requirementSnapshot.hospital_name ?? ""),
              hospital_city: String(item.hospital_city ?? requirementSnapshot.hospital_city ?? ""),
              hospital_state: String(item.hospital_state ?? requirementSnapshot.hospital_state ?? ""),
              required_date:
                typeof item.required_date === "string" || item.required_date === null
                  ? item.required_date
                  : typeof requirementSnapshot.required_date === "string"
                    ? requirementSnapshot.required_date
                    : undefined,
              contact_name: String(item.contact_name ?? requirementSnapshot.contact_name ?? ""),
              contact_phone: String(item.contact_phone ?? requirementSnapshot.contact_phone ?? ""),
              requester_name: String(item.requester_name ?? requirementSnapshot.requester_name ?? item.contact_name ?? requirementSnapshot.contact_name ?? ""),
              requester_phone: String(item.requester_phone ?? requirementSnapshot.requester_phone ?? item.contact_phone ?? requirementSnapshot.contact_phone ?? ""),
              requester_email: String(item.requester_email ?? requirementSnapshot.requester_email ?? ""),
              urgency: String(item.urgency ?? requirementSnapshot.urgency ?? ""),
              reason: String(item.reason ?? requirementSnapshot.reason ?? ""),
              donor_snapshot: donorSnapshot,
              requirement_snapshot: requirementSnapshot,
            };
          })
          .filter((item) => item.id);

        setAcceptedDonations(
          normalizedHistory.sort((a, b) =>
            new Date(b.accepted_at || 0).getTime() -
            new Date(a.accepted_at || 0).getTime()
          )
        );
      } catch (historyFetchError) {
        console.error("Accepted organ donation history error:", historyFetchError);
        setAcceptedDonations([]);
        setAcceptedError(
          historyFetchError instanceof Error
            ? historyFetchError.message
            : "Unable to load accepted donations."
        );
      }
    } catch (fetchError) {
      console.error("Organ donation API error:", fetchError);
      setAcceptedDonations([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load organ donation pledges from the database."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      void loadDonations(user);
    });

    return unsubscribe;
  }, [loadDonations]);

  const handleContact = (phone?: string | null) => {
    if (!phone || !phone.trim()) {
      window.alert("No phone number is available for this donor.");
      return;
    }
    window.location.assign(`tel:${phone}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      setDeleteError("");

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const token = await firebaseUser.getIdToken();

      const response = await fetch(
        `${API_BASE_URL}/api/organ-donations/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      let responseData: { detail?: unknown } | null = null;

      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        const backendMessage =
          responseData?.detail ||
          "Unable to delete the organ donation pledge.";

        throw new Error(
          typeof backendMessage === "string"
            ? backendMessage
            : "Unable to delete the organ donation pledge."
        );
      }

      setDonations((current) =>
        current.filter(
          (donation) =>
            String(donation.id) !== String(deleteTarget.id)
        )
      );

      setSelectedDonation((current) =>
        current?.id === deleteTarget.id
          ? null
          : current
      );

      setDeleteTarget(null);
    } catch (deleteException) {
      console.error(
        "Organ donation delete error:",
        deleteException
      );

      setDeleteError(
        deleteException instanceof Error
          ? deleteException.message
          : "Unable to delete the pledge. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="organ-history-page">
        <div className="organ-history-container">
          <div className="organ-history-loading">
            <div className="organ-history-spinner" />
            <p>Loading your organ donations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organ-history-page">
        <div className="organ-history-container">
          <div className="organ-history-error">
            <XCircle size={36} />
            <h2>Unable to load donations</h2>
            <p>{error}</p>

            <button
              type="button"
              className="organ-history-primary-button"
              onClick={() => void loadDonations(auth.currentUser)}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="organ-history-page">
      <div className="organ-history-container">

        {/* HEADER */}
        <div className="organ-history-header">
          <div>
            <span className="organ-history-eyebrow">
              ORGAN DONATION
            </span>

            <h1>My Donations</h1>

            <p>
              View and manage your registered organ
              donation pledges.
            </p>

            <span className="organ-history-data-source">
              Live data from MongoDB via MedVisionRx API
            </span>
          </div>

          <Link
            to="/organ-donation/register"
            className="organ-history-register-button"
          >
            <FileHeart size={16} />
            Register New Pledge
          </Link>
        </div>

        {/* EMPTY STATE */}
        {donations.length === 0 && acceptedDonations.length === 0 ? (
          <div className="organ-history-empty">
            <div className="organ-history-empty-icon">
              <FileHeart size={30} />
            </div>

            <h2>No Organ Donations</h2>

            <p>
              There are currently no organ donation pledges
              recorded in the database.
            </p>

            <Link
              to="/organ-donation/register"
              className="organ-history-primary-button"
            >
              Register as Donor
              <FileHeart size={17} />
            </Link>
          </div>
        ) : (
          <>
            {/* SUMMARY */}
            <section className="organ-history-summary-grid">
              <div className="organ-history-summary-card">
                <div className="organ-history-summary-icon blue">
                  <FileHeart size={19} />
                </div>

                <div>
                  <span>Total Pledges</span>
                  <strong>{donations.length}</strong>
                </div>
              </div>

              <div className="organ-history-summary-card">
                <div className="organ-history-summary-icon green">
                  <CheckCircle2 size={19} />
                </div>

                <div>
                  <span>Active Pledges</span>
                  <strong>
                    {
                      donations.filter(
                        (item) => item.status === "active"
                      ).length
                    }
                  </strong>
                </div>
              </div>

              <div className="organ-history-summary-card">
                <div className="organ-history-summary-icon purple">
                  <HeartHandshake size={19} />
                </div>

                <div>
                  <span>Accepted / Fulfilled</span>
                  <strong>
{acceptedDonations.length}
                  </strong>
                </div>
              </div>

              <div className="organ-history-summary-card">
                <div className="organ-history-summary-icon teal">
                  <CalendarDays size={19} />
                </div>

                <div>
                  <span>Latest Acceptance</span>
                  <strong>
                    {formatDate(
                      acceptedDonations[0]?.accepted_at || donations[0]?.created_at
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {/* DONATION CARDS */}
            {donations.length > 0 && (
            <section className="organ-history-list-section">
              <div className="organ-history-section-header">
                <div>
                  <h2>Registered Organ Donations</h2>
                  <p>
                    Pledges currently stored in the
                    MedVisionRx database.
                  </p>
                </div>
              </div>

              <div className="organ-history-card-list">
                {donations.map((donation) => (
                  <article
                    key={donation.id}
                    className="organ-donation-card"
                  >
                    <div className="organ-donation-card-top">

                      <div className="organ-donation-avatar">
                        <UserRound size={22} />
                      </div>

                      <div className="organ-donation-main-info">
                        <h3>{donation.full_name || "Organ Donor"}</h3>

                        <p>
                          <MapPin size={13} />
                          {donation.city || "Location unavailable"},{" "}
                          {donation.state || ""}
                        </p>
                      </div>

                      <div className="organ-donation-blood">
                        {donation.blood_group}
                      </div>
                    </div>

                    <div className={`organ-donation-verification ${donation.status}`}>
                      {donation.status === "active" ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Clock3 size={15} />
                      )}

                      <strong>
                        {getStatusLabel(
                          donation.status
                        )}
                      </strong>
                    </div>

                    <div className="organ-donation-card-details">
                      <div>
                        <CalendarDays size={14} />
                        <span>Registered</span>
                        <strong>
                          {formatDate(
                            donation.created_at
                          )}
                        </strong>
                      </div>

                      <div>
                        <HeartHandshake size={14} />
                        <span>Donation Type</span>
                        <strong>
                          {getDonationTypeLabel(
                            donation.donation_type
                          )}
                        </strong>
                      </div>

                      <div>
                        <ShieldCheck size={14} />
                        <span>Eligibility</span>
                        <strong>
                          {donation.eligibility_status ===
                          "eligible"
                            ? "Screening passed"
                            : donation.eligibility_status ===
                                "medical_review"
                              ? "Medical review"
                              : "Not eligible"}
                        </strong>
                      </div>
                    </div>

                    <div className="organ-donation-organs">
                      {donation.organs.map((organ) => (
                        <span key={organ}>
                          {organ}
                        </span>
                      ))}
                    </div>

                    <div className="organ-donation-actions">
                      <button
                        type="button"
                        className="organ-contact-button"
                        onClick={() =>
                          handleContact(
                            donation.phone
                          )
                        }
                      >
                        <Phone size={15} />
                        Contact
                      </button>

                      <button
                        type="button"
                        className="organ-details-button"
                        onClick={() =>
                          setSelectedDonation(
                            donation
                          )
                        }
                      >
                        <Eye size={15} />
                        View Details
                      </button>

                      <button
                        type="button"
                        className="organ-delete-button"
                        onClick={() => {
                          setDeleteError("");
                          setDeleteTarget(
                            donation
                          );
                        }}
                        aria-label={`Delete ${donation.full_name || "Organ Donor"}`}
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            )}

            {/* ACCEPTED DONATIONS */}
            <section className="organ-history-list-section organ-accepted-section">
              <div className="organ-history-section-header">
                <div>
                  <h2>Accepted Donations</h2>
                  <p>Organ requirements that accepted your donor response.</p>
                </div>
                <span className="organ-accepted-count">
                  {acceptedDonations.length} accepted
                </span>
              </div>

              {acceptedError && (
                <div className="organ-accepted-error">
                  {acceptedError}
                </div>
              )}

              {acceptedDonations.length === 0 ? (
                <div className="organ-accepted-empty">
                  <Clock3 size={20} />
                  <div>
                    <strong>No accepted donations yet</strong>
                    <p>When a requester accepts your response, it will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="organ-accepted-list">
                  {acceptedDonations.map((item) => (
                    <article className="organ-accepted-card" key={item.id}>
                      <div className="organ-accepted-card-heading">
                        <div className="organ-accepted-icon">
                          <HeartHandshake size={21} />
                        </div>
                        <div className="organ-accepted-title">
                          <h3>{item.organ_required || item.organ || "Organ donation"}</h3>
                          <p>
                            {item.hospital_name || "Hospital not provided"}
                            {(item.hospital_city || item.hospital_state) && (
                              <> · {[item.hospital_city, item.hospital_state].filter(Boolean).join(", ")}</>
                            )}
                          </p>
                        </div>
                        <span className="organ-accepted-status">
                          <CheckCircle2 size={14} />
                          Accepted
                        </span>
                      </div>

                      <div className="organ-accepted-details">
                        <div>
                          <span>Accepted Date</span>
                          <strong>{formatDate(item.accepted_at)}</strong>
                        </div>
                        <div>
                          <span>Donation Type</span>
                          <strong>{getDonationTypeLabel(item.donation_type)}</strong>
                        </div>
                        <div>
                          <span>Blood Group</span>
                          <strong>{item.blood_group || "Not available"}</strong>
                        </div>
                        <div>
                          <span>Required Date</span>
                          <strong>{formatDate(item.required_date)}</strong>
                        </div>
                      </div>

                      <div className="organ-accepted-actions">
                        <button
                          type="button"
                          className="organ-accepted-contact-button"
                          onClick={() => {
                            const phone = item.requester_phone || item.contact_phone;
                            if (phone && phone.trim()) {
                              window.location.assign(`tel:${phone}`);
                            } else {
                              window.alert("The requester has not provided a contact phone number.");
                            }
                          }}
                        >
                          <Phone size={15} />
                          Contact Requester
                        </button>
                        <button
                          type="button"
                          className="organ-accepted-view-button"
                          onClick={() => setSelectedAcceptedDonation(item)}
                        >
                          <Eye size={15} />
                          View Details
                        </button>
                      </div>

                      <p className="organ-accepted-disclaimer">
                        Request accepted. This status records requester acceptance and does not mean
                        that a transplant has taken place.
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="organ-history-note">
              <ShieldCheck size={15} />

              <span>
                Donation information shown here is
                retrieved from the MedVisionRx database.
                Final medical suitability and
                transplantation decisions are made by
                authorized healthcare professionals.
              </span>
            </div>
          </>
        )}
      </div>

      {/* =====================================================
          VIEW DETAILS MODAL
          ===================================================== */}

      {selectedDonation && (
        <div
          className="organ-modal-overlay"
          onClick={() => setSelectedDonation(null)}
        >
          <div
            className="organ-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="organ-modal-header">
              <div>
                <span>ORGAN DONATION</span>
                <h2>Donation Details</h2>
              </div>

              <button
                type="button"
                className="organ-modal-close"
                onClick={() =>
                  setSelectedDonation(null)
                }
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="organ-modal-profile">
              <div className="organ-modal-avatar">
                <UserRound size={25} />
              </div>

              <div>
                <h3>
                  {selectedDonation.full_name || "Organ Donor"}
                </h3>

                <p>
                  <MapPin size={13} />
                  {selectedDonation.city || "Location unavailable"},{" "}
                  {selectedDonation.state || ""}
                </p>
              </div>

              <span className="organ-modal-blood">
                {selectedDonation.blood_group}
              </span>
            </div>

            <div className="organ-modal-grid">
              <div>
                <span>Donation Type</span>
                <strong>
                  {getDonationTypeLabel(
                    selectedDonation.donation_type
                  )}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {getStatusLabel(
                    selectedDonation.status
                  )}
                </strong>
              </div>

              <div>
                <span>Registered On</span>
                <strong>
                  {formatDate(
                    selectedDonation.created_at
                  )}
                </strong>
              </div>

              <div>
                <span>Eligibility</span>
                <strong>
                  {getEligibilityLabel(
                    selectedDonation.eligibility_status
                  )}
                </strong>
              </div>

              <div>
                <span>Gender</span>
                <strong>
                  {selectedDonation.gender}
                </strong>
              </div>

              <div>
                <span>Date of Birth</span>
                <strong>
                  {formatDate(
                    selectedDonation.date_of_birth
                  )}
                </strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>
                  {selectedDonation.phone || "Not available"}
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>
                  {selectedDonation.email || "Not available"}
                </strong>
              </div>

              <div className="full">
                <span>Address</span>
                <strong>
                  {selectedDonation.address},{" "}
                  {selectedDonation.city || "Location unavailable"},{" "}
                  {selectedDonation.state || ""} -{" "}
                  {selectedDonation.pincode}
                </strong>
              </div>

              <div className="full">
                <span>Organs / Tissues</span>

                <div className="organ-modal-organ-list">
                  {selectedDonation.organs.map(
                    (organ) => (
                      <span key={organ}>
                        {organ}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div>
                <span>Emergency Contact</span>
                <strong>
                  {selectedDonation.emergency_name || "Not available"}
                </strong>
              </div>

              <div>
                <span>Relationship</span>
                <strong>
                  {
                    selectedDonation.emergency_relationship
                  }
                </strong>
              </div>

              <div>
                <span>Emergency Phone</span>
                <strong>
                  {selectedDonation.emergency_phone || "Not available"}
                </strong>
              </div>
            </div>

            <div className="organ-modal-actions">
              <button
                type="button"
                className="organ-contact-button"
                onClick={() =>
                  handleContact(
                    selectedDonation.phone
                  )
                }
              >
                <Phone size={15} />
                Call Donor
              </button>

              <button
                type="button"
                className="organ-modal-secondary"
                onClick={() =>
                  setSelectedDonation(null)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      {deleteTarget && (
        <div
          className="organ-modal-overlay"
          onClick={() => {
            if (!isDeleting) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
        >
          <div
            className="organ-delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="organ-delete-icon">
              <Trash2 size={23} />
            </div>

            <h2>Delete Donation Pledge?</h2>

            <p>
              This will permanently delete the organ
              donation pledge for{" "}
              <strong>
                {deleteTarget.full_name}
              </strong>{" "}
              from the MedVisionRx database.
            </p>

            <p className="organ-delete-warning">
              This action cannot be undone.
            </p>

            {deleteError && (
              <div className="organ-delete-error">
                {deleteError}
              </div>
            )}

            <div className="organ-delete-actions">
              <button
                type="button"
                className="organ-modal-secondary"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="organ-delete-confirm"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                <Trash2 size={15} />
                {isDeleting
                  ? "Deleting..."
                  : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAcceptedDonation && (
        <div
          className="organ-modal-overlay"
          onClick={() => setSelectedAcceptedDonation(null)}
        >
          <div
            className="organ-details-modal organ-requester-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="organ-modal-header">
              <div>
                <span>ACCEPTED ORGAN REQUEST</span>
                <h2>Requester Contact Details</h2>
              </div>
              <button
                type="button"
                className="organ-modal-close"
                onClick={() => setSelectedAcceptedDonation(null)}
                aria-label="Close requester details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="organ-modal-grid">
              <div>
                <span>Requester / Contact Person</span>
                <strong>{selectedAcceptedDonation.requester_name || selectedAcceptedDonation.contact_name || "Not provided"}</strong>
              </div>
              <div>
                <span>Contact Phone</span>
                <strong>{selectedAcceptedDonation.requester_phone || selectedAcceptedDonation.contact_phone || "Not provided"}</strong>
              </div>
              <div>
                <span>Hospital</span>
                <strong>{selectedAcceptedDonation.hospital_name || "Not provided"}</strong>
              </div>
              <div>
                <span>Location</span>
                <strong>{[selectedAcceptedDonation.hospital_city, selectedAcceptedDonation.hospital_state].filter(Boolean).join(", ") || "Not provided"}</strong>
              </div>
              <div>
                <span>Required Organ</span>
                <strong>{selectedAcceptedDonation.organ_required || selectedAcceptedDonation.organ || "Not provided"}</strong>
              </div>
              <div>
                <span>Urgency</span>
                <strong>{selectedAcceptedDonation.urgency || "Not provided"}</strong>
              </div>
              <div>
                <span>Accepted Date</span>
                <strong>{formatDate(selectedAcceptedDonation.accepted_at)}</strong>
              </div>
              <div>
                <span>Required Date</span>
                <strong>{formatDate(selectedAcceptedDonation.required_date)}</strong>
              </div>
              {selectedAcceptedDonation.reason && (
                <div className="full">
                  <span>Request Reason</span>
                  <strong>{selectedAcceptedDonation.reason}</strong>
                </div>
              )}
            </div>

            <div className="organ-modal-actions">
              <button
                type="button"
                className="organ-contact-button"
                disabled={!((selectedAcceptedDonation.requester_phone || selectedAcceptedDonation.contact_phone || "").trim())}
                onClick={() => {
                  const phone = selectedAcceptedDonation.requester_phone || selectedAcceptedDonation.contact_phone;
                  if (phone) window.location.assign(`tel:${phone}`);
                }}
              >
                <Phone size={15} />
                Call Requester
              </button>
              <button
                type="button"
                className="organ-modal-secondary"
                onClick={() => setSelectedAcceptedDonation(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganDonationHistory;
