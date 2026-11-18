import { extractApiRows } from "../../utils/apiPayload";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import "./OrganDonorResponses.css";
import { auth } from "../../firebase";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SAVED_DONORS_KEY = "medvisionrx_saved_organ_donors";
const SAVED_RECORDS_KEY = "medvisionrx_saved_organ_donor_records";

interface DonorResponse {
  donor_details?: OrganDonor | null;
  organ_donor?: OrganDonor | null;
  id?: string;
  _id?: string;
  response_id?: string;
  organ_donation_id?: string;
  donation_id?: string;
  donor_id?: string;
  status?: string;
  response_status?: string;
  created_at?: string;
  updated_at?: string;
  donor?: OrganDonor | null;
}

interface OrganDonor {
  id?: string;
  _id?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  gender?: string;
  blood_group?: string;
  bloodGroup?: string;
  phone?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  donation_type?: string;
  donationType?: string;
  organs?: string[];
  organ_types?: string[];
  donated_organs?: string[];
  status?: string;
  medical_status?: string;
  is_verified?: boolean;
  verified?: boolean;
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
  contact_name?: string;
  contact_phone?: string;
  donor_responses?: DonorResponse[];
}

interface ResponseWithDonor extends DonorResponse {
  donor?: OrganDonor | null;
}

async function getAuthHeaders() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in to continue.");
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

function getId(value: {
  id?: string;
  _id?: string;
  response_id?: string;
}): string {
  return value.id || value.response_id || value._id || "";
}



function getDonorName(donor?: OrganDonor | null): string {
  if (!donor) return "Organ Donor";

  return donor.full_name || donor.fullName || donor.name || "Organ Donor";
}

function getBloodGroup(donor?: OrganDonor | null): string {
  return donor?.blood_group || donor?.bloodGroup || "Not specified";
}

function getPhone(donor?: OrganDonor | null): string {
  return donor?.phone || donor?.contact_phone || "";
}

function getLocation(donor?: OrganDonor | null): string {
  if (!donor) return "Location not specified";

  const city = donor.city?.trim() || "";
  const state = donor.state?.trim() || "";

  if (city && state) return `${city}, ${state}`;

  return city || state || "Location not specified";
}

function getOrgans(donor?: OrganDonor | null): string[] {
  if (!donor) return [];

  if (Array.isArray(donor.organs)) return donor.organs;
  if (Array.isArray(donor.organ_types)) return donor.organ_types;
  if (Array.isArray(donor.donated_organs)) return donor.donated_organs;

  return [];
}

function formatText(value?: string | null): string {
  if (!value) return "Not specified";

  return value.trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string): string {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getOrganEmoji(organ?: string): string {
  const value = String(organ || "").toLowerCase();

  if (value.includes("heart")) return "❤️";
  if (value.includes("lung")) return "🫁";
  if (value.includes("kidney")) return "🫘";
  if (value.includes("liver")) return "🫀";
  if (value.includes("eye") || value.includes("cornea")) return "👁️";

  return "🫀";
}

function isVerified(donor?: OrganDonor | null): boolean {
  return donor?.is_verified === true || donor?.verified === true;
}

function extractResponses(data: unknown): DonorResponse[] {
  return extractApiRows<DonorResponse>(data, ["responses", "donors", "data", "records"]);
}

function OrganDonorResponses() {
  const navigate = useNavigate();

  const { requirementId } = useParams<{ requirementId: string }>();
  const [searchParams] = useSearchParams();

  const currentRequirementId =
    requirementId || searchParams.get("requirement") || "";

  const [requirement, setRequirement] =
    useState<OrganRequirement | null>(null);

  const [responses, setResponses] = useState<ResponseWithDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedResponse, setSelectedResponse] =
    useState<ResponseWithDonor | null>(null);

  const [processingId, setProcessingId] = useState("");
  const [message, setMessage] = useState("");

  // Load requirement and its donor responses using Firebase authentication.
  const loadResponses = useCallback(async () => {
    if (!currentRequirementId) {
      setError("Requirement ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const headers = await getAuthHeaders();

      const requirementResponse = await fetch(
        `${API_BASE_URL}/api/organ-requirements/${encodeURIComponent(
          currentRequirementId
        )}`,
        { headers }
      );

      const requirementData = await requirementResponse.json().catch(() => null);

      if (!requirementResponse.ok) {
        throw new Error(
          requirementData?.detail || "Unable to load the organ requirement."
        );
      }

      const requirementRecord =
        (requirementData?.requirement || requirementData) as OrganRequirement;

      setRequirement(requirementRecord);

      // This endpoint checks that the signed-in user owns the requirement.
      const responseResult = await fetch(
        `${API_BASE_URL}/api/organ-requirements/${encodeURIComponent(
          currentRequirementId
        )}/responses`,
        { headers }
      );

      const responseData = await responseResult.json().catch(() => null);

      if (!responseResult.ok) {
        throw new Error(
          responseData?.detail || "Unable to load donor responses."
        );
      }

      const rawResponses = extractResponses(responseData);

      // Some service versions return donor information separately.
      // If the response already contains donor information, use it.
      const responseRecords: ResponseWithDonor[] = rawResponses.map(
        (response: DonorResponse) => ({
          ...response,
          id:
            response.id ||
            response.response_id ||
            response._id,
          status:
            response.status ||
            response.response_status ||
            "pending",
          donor:
            response.donor ||
            response.donor_details ||
            response.organ_donor ||
            null,
        })
      );

      setResponses(responseRecords);
    } catch (err) {
      console.error("Organ donor responses error:", err);
      setRequirement(null);
      setResponses([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load donor responses."
      );
    } finally {
      setLoading(false);
    }
  }, [currentRequirementId]);

  useEffect(() => {
    // Wait for Firebase to restore the signed-in session before protected calls.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        void loadResponses();
      } else {
        setRequirement(null);
        setResponses([]);
        setError("Please sign in to view donor responses.");
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadResponses]);

  const counts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;

    responses.forEach((response) => {
      const status = String(
        response.status || "pending"
      ).toLowerCase();

      if (status === "accepted") accepted++;
      else if (status === "rejected") rejected++;
      else pending++;
    });

    return { pending, accepted, rejected };
  }, [responses]);

  // Accept a donor response.
  const acceptDonor = async (response: ResponseWithDonor) => {
    if (!currentRequirementId) return;

    const responseId = getId(response);

    if (!responseId) {
      setMessage("This donor response does not have a valid response ID.");
      return;
    }

    const donorName = getDonorName(response.donor);

    if (!window.confirm(`Accept ${donorName} for this organ requirement?`)) {
      return;
    }

    try {
      setProcessingId(responseId);
      setMessage("");

      const headers = await getAuthHeaders();

      const endpoint =
        `${API_BASE_URL}/api/organ-requirements/` +
        `${encodeURIComponent(currentRequirementId)}/responses/` +
        `${encodeURIComponent(responseId)}/accept`;

      const result = await fetch(endpoint, {
        method: "POST",
        headers,
      });

      const data = await result.json().catch(() => null);

      if (!result.ok) {
        throw new Error(data?.detail || "Unable to accept this donor.");
      }

      // Save accepted donor locally for the Saved Organ Donors page.
      if (response.donor) {
        try {
          const donorId = getId(response.donor);

          if (donorId) {
            const existingIds: string[] = JSON.parse(
              localStorage.getItem(SAVED_DONORS_KEY) || "[]"
            );

            localStorage.setItem(
              SAVED_DONORS_KEY,
              JSON.stringify(Array.from(new Set([...existingIds, donorId])))
            );

            const existingRecords: OrganDonor[] = JSON.parse(
              localStorage.getItem(SAVED_RECORDS_KEY) || "[]"
            );

            const updatedRecords = [
              response.donor,
              ...existingRecords.filter(
                (donor) => getId(donor) !== donorId
              ),
            ];

            localStorage.setItem(
              SAVED_RECORDS_KEY,
              JSON.stringify(updatedRecords)
            );
          }
        } catch (storageError) {
          console.error("Unable to save accepted donor locally:", storageError);
        }
      }

      setMessage(`${donorName} has been accepted successfully.`);
      setSelectedResponse(null);

      await loadResponses();
    } catch (err) {
      console.error("Accept donor error:", err);
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to accept this donor."
      );
    } finally {
      setProcessingId("");
    }
  };

  // Reject a donor response.
  const rejectDonor = async (response: ResponseWithDonor) => {
    if (!currentRequirementId) return;

    const responseId = getId(response);

    if (!responseId) {
      setMessage("This donor response does not have a valid response ID.");
      return;
    }

    const donorName = getDonorName(response.donor);

    if (!window.confirm(`Reject the response from ${donorName}?`)) {
      return;
    }

    try {
      setProcessingId(responseId);
      setMessage("");

      const headers = await getAuthHeaders();

      const endpoint =
        `${API_BASE_URL}/api/organ-requirements/` +
        `${encodeURIComponent(currentRequirementId)}/responses/` +
        `${encodeURIComponent(responseId)}/reject`;

      const result = await fetch(endpoint, {
        method: "POST",
        headers,
      });

      const data = await result.json().catch(() => null);

      if (!result.ok) {
        throw new Error(
          data?.detail || "Unable to reject this donor response."
        );
      }

      setMessage(`${donorName}'s response has been rejected.`);
      setSelectedResponse(null);

      await loadResponses();
    } catch (err) {
      console.error("Reject donor error:", err);
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to reject this donor response."
      );
    } finally {
      setProcessingId("");
    }
  };

  const openMap = (donor?: OrganDonor | null) => {
    if (!donor) return;

    const query = [donor.address || "", getLocation(donor)]
      .filter(Boolean)
      .join(", ");

    if (!query) return;

    const url =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query
      )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="organ-donor-responses-page">
        <div className="organ-donor-responses-loading">
          <Loader2
            size={27}
            className="organ-donor-responses-spin"
          />
          <span>Loading donor responses...</span>
        </div>
      </div>
    );
  }

  if (error || !requirement) {
    return (
      <div className="organ-donor-responses-page">
        <div className="organ-donor-responses-error-page">
          <div className="organ-donor-responses-error-icon">
            <AlertCircle size={31} />
          </div>
          <h2>Unable to Load Donor Responses</h2>
          <p>{error || "The requirement could not be loaded."}</p>
          <button
            type="button"
            onClick={() => navigate("/organ-requirement/my-requests")}
          >
            Back to My Requests
          </button>
        </div>
      </div>
    );
  }

  const remainingUnits =
    requirement.remaining_units ??
    Math.max(
      (requirement.original_units_required ??
        requirement.units_required ??
        0) - (requirement.units_fulfilled ?? 0),
      0
    );

  return (
    <div className="organ-donor-responses-page">
      <div className="organ-donor-responses-breadcrumb">
        <button type="button" onClick={() => navigate("/")}>Home</button>
        <ChevronRight size={14} />
        <button
          type="button"
          onClick={() => navigate("/organ-requirement")}
        >
          Organ Requirement
        </button>
        <ChevronRight size={14} />
        <button
          type="button"
          onClick={() => navigate("/organ-requirement/my-requests")}
        >
          My Requests
        </button>
        <ChevronRight size={14} />
        <strong>Donor Responses</strong>
      </div>

      <section className="organ-donor-responses-header">
        <div className="organ-donor-responses-header-main">
          <div className="organ-donor-responses-organ-icon">
            <span>{getOrganEmoji(requirement.organ_required)}</span>
          </div>

          <div>
            <span className="organ-donor-responses-eyebrow">
              ORGAN REQUIREMENT
            </span>
            <h1>Donor Responses</h1>
            <p>
              {formatText(requirement.organ_required)} required at{" "}
              {requirement.hospital_name || "Hospital"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="organ-donor-responses-refresh"
          onClick={() => void loadResponses()}
          disabled={loading}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </section>

      <section className="organ-donor-responses-requirement">
        <div className="organ-donor-responses-requirement-main">
          <div>
            <span>Requirement</span>
            <strong>{formatText(requirement.organ_required)}</strong>
          </div>
          <div>
            <span>Hospital</span>
            <strong>{requirement.hospital_name || "Not specified"}</strong>
          </div>
          <div>
            <span>Blood Group</span>
            <strong>{requirement.blood_group || "Not specified"}</strong>
          </div>
          <div>
            <span>Remaining Units</span>
            <strong>{remainingUnits}</strong>
          </div>
        </div>

        <div className="organ-donor-response-stats">
          <div className="pending">
            <Clock3 size={14} />
            <strong>{counts.pending}</strong>
            <span>Pending</span>
          </div>
          <div className="accepted">
            <CheckCircle2 size={14} />
            <strong>{counts.accepted}</strong>
            <span>Accepted</span>
          </div>
          <div className="rejected">
            <XCircle size={14} />
            <strong>{counts.rejected}</strong>
            <span>Rejected</span>
          </div>
        </div>
      </section>

      {message && (
        <div className="organ-donor-responses-message">
          <CheckCircle2 size={17} />
          <span>{message}</span>
        </div>
      )}

      {responses.length === 0 && (
        <div className="organ-donor-responses-empty">
          <div className="organ-donor-responses-empty-icon">
            <Heart size={29} />
          </div>
          <h3>No donor responses yet</h3>
          <p>
            Eligible organ donors have not responded to this requirement yet.
          </p>
          <button type="button" onClick={() => void loadResponses()}>
            <RefreshCw size={14} />
            Check Again
          </button>
        </div>
      )}

      {responses.length > 0 && (
        <section className="organ-donor-responses-list">
          {responses.map((response, index) => {
            const responseId = getId(response);
            const status = String(
              response.status || response.response_status || "pending"
            ).toLowerCase();

            const donor = response.donor;
            const donorName = getDonorName(donor);
            const phone = getPhone(donor);
            const organs = getOrgans(donor);

            const processing =
              Boolean(processingId) && processingId === responseId;

            return (
              <article
                key={responseId || `response-${index}`}
                className="organ-donor-response-card"
              >
                <div className="organ-donor-response-avatar">
                  <UserRound size={25} />
                </div>

                <div className="organ-donor-response-content">
                  <div className="organ-donor-response-title">
                    <div>
                      <h3>{donorName}</h3>
                      <span>Organ donor response</span>
                    </div>

                    <span
                      className={`organ-donor-response-status ${status}`}
                    >
                      {status === "accepted" ? (
                        <CheckCircle2 size={12} />
                      ) : status === "rejected" ? (
                        <XCircle size={12} />
                      ) : (
                        <Clock3 size={12} />
                      )}
                      {formatText(status)}
                    </span>
                  </div>

                  <div className="organ-donor-response-meta">
                    <span className="blood">{getBloodGroup(donor)}</span>
                    <span><MapPin size={13} /> {getLocation(donor)}</span>
                    <span>
                      {formatText(donor?.donation_type || donor?.donationType)}
                    </span>
                  </div>

                  {organs.length > 0 && (
                    <div className="organ-donor-response-organs">
                      <span>Donatable organs</span>
                      <div>
                        {organs.slice(0, 5).map((organ) => (
                          <span key={organ}>
                            {getOrganEmoji(organ)} {formatText(organ)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="organ-donor-response-verification">
                    {isVerified(donor) && (
                      <span><ShieldCheck size={13} /> Verified donor</span>
                    )}
                    {response.created_at && (
                      <span>Responded {formatDate(response.created_at)}</span>
                    )}
                  </div>
                </div>

                <div className="organ-donor-response-actions">
                  <button
                    type="button"
                    className="organ-donor-response-view"
                    onClick={() => setSelectedResponse(response)}
                  >
                    View Details <ChevronRight size={14} />
                  </button>

                  {phone && status === "pending" && (
                    <a
                      href={`tel:${phone}`}
                      className="organ-donor-response-call"
                    >
                      <Phone size={14} /> Contact
                    </a>
                  )}

                  {status === "pending" && (
                    <>
                      <button
                        type="button"
                        className="organ-donor-response-accept"
                        onClick={() => void acceptDonor(response)}
                        disabled={processing}
                      >
                        {processing ? (
                          <Loader2
                            size={14}
                            className="organ-donor-responses-spin"
                          />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Accept Donor
                      </button>

                      <button
                        type="button"
                        className="organ-donor-modal-reject"
                        onClick={() => void rejectDonor(response)}
                        disabled={processing}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <div className="organ-donor-responses-security">
        <ShieldCheck size={18} />
        <div>
          <strong>Donor verification</strong>
          <span>
            Review the donor information before accepting a response.
            Acceptance updates the requirement status through the backend.
          </span>
        </div>
      </div>

      <button
        type="button"
        className="organ-donor-responses-back"
        onClick={() => navigate("/organ-requirement/my-requests")}
      >
        <ArrowLeft size={15} />
        Back to My Requests
      </button>

      {selectedResponse && (
        <div
          className="organ-donor-responses-overlay"
          onClick={() => setSelectedResponse(null)}
        >
          <div
            className="organ-donor-responses-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="organ-donor-responses-modal-header">
              <div>
                <span className="organ-donor-responses-eyebrow">
                  DONOR RESPONSE
                </span>
                <h2>{getDonorName(selectedResponse.donor)}</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedResponse(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="organ-donor-responses-modal-body">
              <div className="organ-donor-modal-profile">
                <div className="organ-donor-modal-avatar">
                  <UserRound size={27} />
                </div>
                <div>
                  <strong>{getDonorName(selectedResponse.donor)}</strong>
                  {isVerified(selectedResponse.donor) && (
                    <span><ShieldCheck size={13} /> Verified donor</span>
                  )}
                </div>
              </div>

              <div className="organ-donor-modal-grid">
                <div>
                  <span>Blood Group</span>
                  <strong>{getBloodGroup(selectedResponse.donor)}</strong>
                </div>
                <div>
                  <span>Gender</span>
                  <strong>{formatText(selectedResponse.donor?.gender)}</strong>
                </div>
                <div>
                  <span>Location</span>
                  <strong>{getLocation(selectedResponse.donor)}</strong>
                </div>
                <div>
                  <span>Donation Type</span>
                  <strong>
                    {formatText(
                      selectedResponse.donor?.donation_type ||
                      selectedResponse.donor?.donationType
                    )}
                  </strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>{getPhone(selectedResponse.donor) || "Not available"}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{selectedResponse.donor?.email || "Not available"}</strong>
                </div>
                <div className="full">
                  <span>Address</span>
                  <strong>{selectedResponse.donor?.address || "Not available"}</strong>
                </div>
                <div>
                  <span>Response Status</span>
                  <strong>
                    {formatText(
                      selectedResponse.status ||
                      selectedResponse.response_status ||
                      "pending"
                    )}
                  </strong>
                </div>
              </div>

              {getOrgans(selectedResponse.donor).length > 0 && (
                <div className="organ-donor-modal-organs">
                  <span>Donatable Organs</span>
                  <div>
                    {getOrgans(selectedResponse.donor).map((organ) => (
                      <span key={organ}>
                        {getOrganEmoji(organ)} {formatText(organ)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="organ-donor-responses-modal-footer">
              {getPhone(selectedResponse.donor) && (
                <a
                  href={`tel:${getPhone(selectedResponse.donor)}`}
                  className="organ-donor-modal-call"
                >
                  <Phone size={15} /> Call Donor
                </a>
              )}

              <button
                type="button"
                className="organ-donor-modal-map"
                onClick={() => openMap(selectedResponse.donor)}
              >
                <MapPin size={15} /> View Location
              </button>

              {String(
                selectedResponse.status ||
                selectedResponse.response_status ||
                "pending"
              ).toLowerCase() === "pending" && (
                <>
                  <button
                    type="button"
                    className="organ-donor-modal-reject"
                    onClick={() => void rejectDonor(selectedResponse)}
                    disabled={processingId === getId(selectedResponse)}
                  >
                    <XCircle size={15} /> Reject
                  </button>

                  <button
                    type="button"
                    className="organ-donor-modal-accept"
                    onClick={() => void acceptDonor(selectedResponse)}
                    disabled={processingId === getId(selectedResponse)}
                  >
                    {processingId === getId(selectedResponse) ? (
                      <Loader2
                        size={15}
                        className="organ-donor-responses-spin"
                      />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    Accept This Donor
                  </button>
                </>
              )}

              <button
                type="button"
                className="organ-donor-modal-close"
                onClick={() => setSelectedResponse(null)}
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

export default OrganDonorResponses;
