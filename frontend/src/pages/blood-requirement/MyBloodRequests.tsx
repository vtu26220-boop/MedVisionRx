import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  Bookmark,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Eye,
  MapPin,
  Phone,
  Plus,
  UserCheck,
  RefreshCw,
  Trash2,
  User,
  X,
} from "lucide-react";

import "./MyBloodRequests.css";
import { auth } from "../../firebase";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function getFirebaseAuthHeaders(includeJsonContentType = false) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in to continue.");
  }

  const idToken = await user.getIdToken();

  return {
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${idToken}`,
  };
}

type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

type Urgency = "normal" | "urgent" | "emergency";

type RequestStatus =
  | "pending"
  | "accepted"
  | "fulfilled"
  | "cancelled"
  | "expired";

interface BloodRequirement {
  id: string;
  blood_group: BloodGroup;
  units_required: number;
  hospital_name: string;
  hospital_city: string;
  hospital_state: string;
  required_date: string;
  urgency: Urgency;
  status: string;

  reason?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;

  created_at: string;
  updated_at?: string | null;

  units_fulfilled?: number | null;
  remaining_units?: number | null;

  donor_responses?: Array<{
    donation_id?: string;
    donor_id?: string;
    donor_name?: string;
    blood_group?: string;
    status?: string;
    units?: number;
    responded_at?: string;
    accepted_at?: string;
  }>;
}

interface DonorResponse {
  donation_id: string;
  donor_id: string;
  donor_name: string;
  blood_group: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  weight_kg?: number | null;
  availability?: boolean | null;
  verification_status?: string | null;
  donation_date?: string | null;
  units?: number | null;
  status: string;
  responded_at?: string | null;
  accepted_at?: string | null;
}

const BLOOD_GROUPS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

function getLocalToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string) {
  if (!value) return "";

  // Handles:
  // 2026-09-28
  // 2026-09-28T00:00:00
  // 2026-09-28T00:00:00.000Z
  return value.substring(0, 10);
}

function getRequestStatus(requirement: BloodRequirement): RequestStatus {
  const requiredDate = normalizeDate(requirement.required_date);
  const today = getLocalToday();

  if (requiredDate && requiredDate < today) {
    return "expired";
  }

  const backendStatus = String(requirement.status || "").toLowerCase();

  if (backendStatus === "fulfilled") {
    return "fulfilled";
  }

  if (backendStatus === "cancelled") {
    return "cancelled";
  }

  const hasAcceptedDonor = Boolean(
    requirement.donor_responses?.some(
      (response) =>
        String(response.status || "").toLowerCase() === "accepted"
    )
  );

  if (hasAcceptedDonor) {
    return "accepted";
  }

  return "pending";
}

function getRemainingUnits(requirement: BloodRequirement) {
  if (
    typeof requirement.remaining_units === "number" &&
    requirement.remaining_units >= 0
  ) {
    return requirement.remaining_units;
  }

  const fulfilled =
    typeof requirement.units_fulfilled === "number"
      ? requirement.units_fulfilled
      : 0;

  return Math.max(requirement.units_required - fulfilled, 0);
}

function MyBloodRequests() {
  const [requirements, setRequirements] = useState<BloodRequirement[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">("");
  const [unitsRequired, setUnitsRequired] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");

  const [hospitalName, setHospitalName] = useState("");
  const [hospitalCity, setHospitalCity] = useState("");
  const [hospitalState, setHospitalState] = useState("");
  const [requiredDate, setRequiredDate] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [reason, setReason] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedDonorRequirement, setSelectedDonorRequirement] =
    useState<BloodRequirement | null>(null);

  const [donorResponses, setDonorResponses] =
    useState<DonorResponse[]>([]);

  const [loadingDonors, setLoadingDonors] = useState(false);
  const [acceptingDonorId, setAcceptingDonorId] =
    useState<string | null>(null);
  const [donorModalError, setDonorModalError] = useState("");
  const [savedDonorIds, setSavedDonorIds] = useState<Set<string>>(new Set());
  const [savingDonorId, setSavingDonorId] = useState<string | null>(null);

  const today = getLocalToday();

  const fetchSavedDonorIds = useCallback(async () => {
    try {
      const headers = await getFirebaseAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/blood-donors/saved`, {
        headers,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to load saved donors.");
      }
      const rows = Array.isArray(data?.donors) ? data.donors : [];
      setSavedDonorIds(new Set(rows.map((item: { id?: string }) => String(item.id))));
    } catch (err) {
      console.error("Saved donor status error:", err);
    }
  }, []);

  const toggleSavedDonor = async (donor: DonorResponse) => {
    const donorId = String(donor.donor_id || "").trim();
    if (!donorId) {
      setDonorModalError("This donor record does not contain a valid donor ID.");
      return;
    }

    const isSaved = savedDonorIds.has(donorId);
    try {
      setSavingDonorId(donorId);
      setDonorModalError("");
      const headers = await getFirebaseAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/blood-donors/saved/${encodeURIComponent(donorId)}`,
        { method: isSaved ? "DELETE" : "POST", headers }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || "Unable to update saved donor.");
      }
      setSavedDonorIds((current) => {
        const next = new Set(current);
        if (isSaved) next.delete(donorId);
        else next.add(donorId);
        return next;
      });
      setSuccess(isSaved ? "Donor removed from Saved Donors." : "Donor added to Saved Donors.");
    } catch (err) {
      setDonorModalError(err instanceof Error ? err.message : "Unable to update saved donor.");
    } finally {
      setSavingDonorId(null);
    }
  };

  /*
   * Load every request created by the signed-in user.
   * The /my endpoint is scoped by the verified Firebase UID.
   * Do not remove expired, fulfilled, or cancelled records: they are history,
   * and accepted donor contact details must remain available.
   */
  const fetchMyRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const authHeaders = await getFirebaseAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/blood-requirements/my`,
        { headers: authHeaders }
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        let message = "Unable to fetch your blood requirements.";

        if (Array.isArray(responseData?.detail)) {
          message = responseData.detail
            .map((item: { msg?: string }) => item.msg)
            .filter(Boolean)
            .join(", ");
        } else if (responseData?.detail) {
          message = responseData.detail;
        }

        throw new Error(message);
      }

      const data: BloodRequirement[] = Array.isArray(responseData)
        ? responseData
        : [];

      setRequirements(data);
    } catch (err) {
      console.error("My blood requests error:", err);
      setRequirements([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load blood requirements. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchMyRequests();
fetchSavedDonorIds();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchMyRequests, fetchSavedDonorIds]);

  // Refresh the derived expiry badge periodically without removing history.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setRequirements((current) => [...current]);
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const pendingCount = useMemo(
    () =>
      requirements.filter(
        (requirement) => getRequestStatus(requirement) === "pending"
      ).length,
    [requirements]
  );

  const fulfilledCount = useMemo(
    () =>
      requirements.filter(
        (requirement) => getRequestStatus(requirement) === "fulfilled"
      ).length,
    [requirements]
  );

  const loadDonorResponses = async (
    requirement: BloodRequirement
  ) => {
    try {
      setLoadingDonors(true);
      setDonorModalError("");
      setSelectedDonorRequirement(requirement);

      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in to view donor responses.");
      }

      const idToken = await user.getIdToken();
      const query = `?user_id=${encodeURIComponent(user.uid)}`;

      const response = await fetch(
        `${API_BASE_URL}/api/blood-donors/requirements/${encodeURIComponent(
          requirement.id
        )}/donors${query}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to load donor responses."
        );
      }

      setDonorResponses(
        Array.isArray(data?.donors)
          ? data.donors
          : []
      );
    } catch (err) {
      console.error(
        "Load donor responses error:",
        err
      );

      setDonorResponses([]);

      setDonorModalError(
        err instanceof Error
          ? err.message
          : "Unable to load donor responses."
      );
    } finally {
      setLoadingDonors(false);
    }
  };

  const handleAcceptDonor = async (
    donor: DonorResponse
  ) => {
    if (!selectedDonorRequirement) {
      return;
    }

    const confirmed = window.confirm(
      `Accept ${donor.donor_name} as the donor for this blood requirement?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setAcceptingDonorId(donor.donation_id);
      setDonorModalError("");

      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in to accept a donor.");
      }

      const idToken = await user.getIdToken();
      const query = `?user_id=${encodeURIComponent(user.uid)}`;

      const response = await fetch(
        `${API_BASE_URL}/api/blood-donors/donations/${encodeURIComponent(
          donor.donation_id
        )}/accept${query}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Unable to accept this donor."
        );
      }

      setSuccess(
        `${donor.donor_name} has been accepted for this blood requirement.`
      );

      await fetchMyRequests();

      // Refresh the donor list so the selected donor changes
      // from pending to accepted immediately.
      await loadDonorResponses(
        selectedDonorRequirement
      );
    } catch (err) {
      console.error(
        "Accept donor error:",
        err
      );

      setDonorModalError(
        err instanceof Error
          ? err.message
          : "Unable to accept this donor."
      );
    } finally {
      setAcceptingDonorId(null);
    }
  };

  const getDonorStatusLabel = (status: string) => {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "accepted") {
      return "Accepted";
    }

    if (normalized === "rejected") {
      return "Rejected";
    }

    return "Waiting for selection";
  };

  const resetForm = () => {
    setBloodGroup("");
    setUnitsRequired("");
    setUrgency("normal");

    setHospitalName("");
    setHospitalCity("");
    setHospitalState("");
    setRequiredDate("");

    setContactName("");
    setContactPhone("");
    setReason("");

    setError("");
  };

  const handleCreateRequirement = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!bloodGroup) {
      setError("Please select a blood group.");
      return;
    }

    const units = Number(unitsRequired);

    if (
      !unitsRequired ||
      !Number.isInteger(units) ||
      units < 1 ||
      units > 20
    ) {
      setError("Units required must be between 1 and 20.");
      return;
    }

    if (!hospitalName.trim()) {
      setError("Please enter the hospital name.");
      return;
    }

    if (!hospitalCity.trim()) {
      setError("Please enter the hospital city.");
      return;
    }

    if (!hospitalState.trim()) {
      setError("Please enter the hospital state.");
      return;
    }

    if (!requiredDate) {
      setError("Please select the required date.");
      return;
    }

    if (requiredDate < today) {
      setError("Required date cannot be in the past.");
      return;
    }

    if (!contactName.trim()) {
      setError("Please enter the contact person's name.");
      return;
    }

    const cleanedPhone = contactPhone.replace(/\s+/g, "");

    if (!cleanedPhone) {
      setError("Please enter the contact phone number.");
      return;
    }

    if (!/^\d+$/.test(cleanedPhone)) {
      setError("Contact phone must contain digits only.");
      return;
    }

    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      setError(
        "Contact phone must contain between 10 and 15 digits."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        blood_group: bloodGroup,
        units_required: units,
        hospital_name: hospitalName.trim(),
        hospital_city: hospitalCity.trim(),
        hospital_state: hospitalState.trim(),
        required_date: requiredDate,
        urgency,
        reason: reason.trim() || null,

        // These are required so donors can contact the requester
        // after accepting a blood request.
        contact_name: contactName.trim(),
        contact_phone: cleanedPhone,
      };

      const authHeaders = await getFirebaseAuthHeaders(true);

      const response = await fetch(
        `${API_BASE_URL}/api/blood-requirements/`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        let message = "Unable to create blood requirement.";

        if (Array.isArray(responseData?.detail)) {
          message = responseData.detail
            .map((item: { msg?: string }) => item.msg)
            .filter(Boolean)
            .join(", ");
        } else if (responseData?.detail) {
          message = responseData.detail;
        }

        throw new Error(message);
      }

      setSuccess(
        "Blood requirement created successfully. It is now pending donor response."
      );

      resetForm();
      setShowForm(false);

      await fetchMyRequests();
    } catch (err) {
      console.error("Create blood requirement error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create blood requirement."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (requirementId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this blood requirement?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const authHeaders = await getFirebaseAuthHeaders();

      const response = await fetch(
        `${API_BASE_URL}/api/blood-requirements/${requirementId}`,
        {
          method: "DELETE",
          headers: authHeaders,
        }
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          responseData?.detail ||
            "Unable to delete blood requirement."
        );
      }

      setSuccess("Blood requirement deleted successfully.");

      await fetchMyRequests();
    } catch (err) {
      console.error("Delete blood requirement error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete blood requirement."
      );
    }
  };

  const formatDate = (dateString: string) => {
    const normalized = normalizeDate(dateString);

    if (!normalized) {
      return "—";
    }

    const date = new Date(`${normalized}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getUrgencyClass = (value: string) => {
    if (value === "emergency") {
      return "emergency";
    }

    if (value === "urgent") {
      return "urgent";
    }

    return "normal";
  };

  const getStatusClass = (status: RequestStatus) => {
    if (status === "accepted") {
      return "accepted";
    }

    if (status === "fulfilled") {
      return "fulfilled";
    }

    if (status === "cancelled") {
      return "cancelled";
    }

    if (status === "expired") {
      return "expired";
    }

    return "pending";
  };

  const getStatusLabel = (status: RequestStatus) => {
    if (status === "accepted") {
      return "Donor Response Received";
    }

    if (status === "fulfilled") {
      return "Fulfilled";
    }

    if (status === "cancelled") {
      return "Cancelled";
    }

    if (status === "expired") {
      return "Expired";
    }

    return "Pending";
  };

  return (
    <div className="my-blood-requests-page">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="my-blood-requests-header">
        <div>
          <span className="my-blood-requests-eyebrow">
            BLOOD REQUIREMENT
          </span>

          <h1>My Blood Requests</h1>

          <p>
            Create and manage blood requirements for patients.
          </p>
        </div>

        <button
          type="button"
          className="my-blood-requests-create-button"
          onClick={() => {
            setShowForm(true);
            setError("");
            setSuccess("");
          }}
        >
          <Plus size={18} />
          Create Blood Requirement
        </button>
      </section>

      {/* ======================================================
          SUCCESS MESSAGE
      ====================================================== */}

      {success && (
        <div className="my-blood-requests-success">
          <CheckCircle2 size={18} />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Close success message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ======================================================
          ERROR MESSAGE
      ====================================================== */}

      {error && (
        <div className="my-blood-requests-error">
          <AlertCircle size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close error message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ======================================================
          CREATE BLOOD REQUIREMENT FORM
      ====================================================== */}

      {showForm && (
        <section className="my-blood-request-form-card">
          <div className="my-blood-request-form-header">
            <div>
              <span className="my-blood-request-form-eyebrow">
                NEW REQUEST
              </span>

              <h2>Create Blood Requirement</h2>

              <p>
                Enter the details required to find suitable blood
                donors.
              </p>
            </div>

            <button
              type="button"
              className="my-blood-request-close"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              aria-label="Close form"
            >
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleCreateRequirement}>
            {/* ==================================================
                BLOOD DETAILS
            ================================================== */}

            <div className="my-blood-request-form-section">
              <div className="my-blood-request-section-title">
                <Droplets size={17} />

                <div>
                  <h3>Blood Requirement Details</h3>
                  <p>Specify the blood needed for the patient.</p>
                </div>
              </div>

              <div className="my-blood-request-form-grid">
                <div className="my-blood-request-field">
                  <label htmlFor="request-blood-group">
                    Blood Group <span>*</span>
                  </label>

                  <div className="my-blood-request-input">
                    <Droplets size={16} />

                    <select
                      id="request-blood-group"
                      value={bloodGroup}
                      onChange={(event) =>
                        setBloodGroup(
                          event.target.value as BloodGroup
                        )
                      }
                      required
                    >
                      <option value="">
                        Select Blood Group
                      </option>

                      {BLOOD_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="my-blood-request-field">
                  <label htmlFor="units-required">
                    Units Required <span>*</span>
                  </label>

                  <div className="my-blood-request-input">
                    <Droplets size={16} />

                    <input
                      id="units-required"
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      value={unitsRequired}
                      onChange={(event) =>
                        setUnitsRequired(event.target.value)
                      }
                      placeholder="Example: 2"
                      required
                    />
                  </div>

                  <small className="my-blood-request-help">
                    Maximum 20 units per request.
                  </small>
                </div>

                <div className="my-blood-request-field">
                  <label htmlFor="request-urgency">
                    Urgency <span>*</span>
                  </label>

                  <select
                    id="request-urgency"
                    value={urgency}
                    onChange={(event) =>
                      setUrgency(
                        event.target.value as Urgency
                      )
                    }
                    className="my-blood-request-normal-select"
                    required
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">
                      Emergency
                    </option>
                  </select>
                </div>

                <div className="my-blood-request-field">
                  <label htmlFor="required-date">
                    Required Date <span>*</span>
                  </label>

                  <div className="my-blood-request-input">
                    <CalendarDays size={16} />

                    <input
                      id="required-date"
                      type="date"
                      value={requiredDate}
                      min={today}
                      onChange={(event) =>
                        setRequiredDate(event.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================
                HOSPITAL DETAILS
            ================================================== */}

            <div className="my-blood-request-form-section">
              <div className="my-blood-request-section-title">
                <MapPin size={17} />

                <div>
                  <h3>Hospital Details</h3>
                  <p>
                    Enter where the blood is required.
                  </p>
                </div>
              </div>

              <div className="my-blood-request-form-grid">
                <div className="my-blood-request-field full-width">
                  <label htmlFor="hospital-name">
                    Hospital Name <span>*</span>
                  </label>

                  <div className="my-blood-request-input">
                    <ClipboardList size={16} />

                    <input
                      id="hospital-name"
                      type="text"
                      value={hospitalName}
                      onChange={(event) =>
                        setHospitalName(event.target.value)
                      }
                      placeholder="Enter hospital name"
                      maxLength={150}
                      required
                    />
                  </div>
                </div>

                <div className="my-blood-request-field">
                  <label htmlFor="hospital-city">
                    City <span>*</span>
                  </label>

                  <div className="my-blood-request-input">
                    <MapPin size={16} />

                    <input
                      id="hospital-city"
                      type="text"
                      value={hospitalCity}
                      onChange={(event) =>
                        setHospitalCity(event.target.value)
                      }
                      placeholder="Enter city"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div className="my-blood-request-field">
                  <label htmlFor="hospital-state">
                    State <span>*</span>
                  </label>

                  <div className="my-blood-request-input">
                    <MapPin size={16} />

                    <input
                      id="hospital-state"
                      type="text"
                      value={hospitalState}
                      onChange={(event) =>
                        setHospitalState(event.target.value)
                      }
                      placeholder="Enter state"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================
                CONTACT DETAILS
            ================================================== */}

            <div className="my-blood-request-form-section">
              <div className="my-blood-request-section-title">
                <User size={17} />

                <div>
                  <h3>Contact Details</h3>
                  <p>
                    This information is shared with a donor only
                    after the donor accepts your request.
                  </p>
                </div>
              </div>

              <div className="my-blood-request-contact-warning">
                <Phone size={15} />
                <span>
                  Your contact details are stored with the request
                  and are not shown on the public search card.
                </span>
              </div>

              <div className="my-blood-request-form-grid">
                <div className="my-blood-request-field">
                  <label htmlFor="contact-name">
                    Contact Name <span>*</span>
                  </label>

                  <div className="my-blood-request-input">
                    <User size={16} />

                    <input
                      id="contact-name"
                      type="text"
                      value={contactName}
                      onChange={(event) =>
                        setContactName(event.target.value)
                      }
                      placeholder="Contact person's name"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div className="my-blood-request-field">
                  <label htmlFor="contact-phone">
                    Contact Phone <span>*</span>
                  </label>

                  <div className="my-blood-request-input">
                    <Phone size={16} />

                    <input
                      id="contact-phone"
                      type="tel"
                      inputMode="numeric"
                      value={contactPhone}
                      onChange={(event) =>
                        setContactPhone(
                          event.target.value.replace(/\D/g, "")
                        )
                      }
                      placeholder="10-digit phone number"
                      minLength={10}
                      maxLength={15}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================
                ADDITIONAL INFORMATION
            ================================================== */}

            <div className="my-blood-request-form-section">
              <div className="my-blood-request-section-title">
                <ClipboardList size={17} />

                <div>
                  <h3>Additional Information</h3>
                  <p>
                    Add an optional reason for the blood requirement.
                  </p>
                </div>
              </div>

              <div className="my-blood-request-field full-width">
                <label htmlFor="request-reason">
                  Reason{" "}
                  <span className="optional">(Optional)</span>
                </label>

                <textarea
                  id="request-reason"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="Example: Surgery, accident, medical treatment..."
                  maxLength={500}
                  rows={4}
                />

                <small className="my-blood-request-help">
                  Maximum 500 characters.
                </small>
              </div>
            </div>

            {/* ==================================================
                FORM ACTIONS
            ================================================== */}

            <div className="my-blood-request-form-actions">
              <button
                type="button"
                className="my-blood-request-cancel"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="my-blood-request-submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="my-blood-request-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Submit Requirement
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ======================================================
          REQUEST SUMMARY
      ====================================================== */}

      <section className="my-blood-request-summary">
        <div className="my-blood-request-summary-card">
          <div className="my-blood-request-summary-icon pending">
            <ClipboardList size={19} />
          </div>

          <div>
            <span>Pending Requests</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div className="my-blood-request-summary-card">
          <div className="my-blood-request-summary-icon fulfilled">
            <CheckCircle2 size={19} />
          </div>

          <div>
            <span>Fulfilled Requests</span>
            <strong>{fulfilledCount}</strong>
          </div>
        </div>

        <div className="my-blood-request-summary-card">
          <div className="my-blood-request-summary-icon active">
            <Droplets size={19} />
          </div>

          <div>
            <span>Total Visible</span>
            <strong>{requirements.length}</strong>
          </div>
        </div>
      </section>

      {/* ======================================================
          ACTIVE REQUIREMENTS
      ====================================================== */}

      <section className="my-blood-requests-list-section">
        <div className="my-blood-requests-list-header">
          <div>
            <span className="my-blood-request-list-eyebrow">
              REQUESTS
            </span>

            <h2>All My Blood Requests</h2>

            <p>
              View active requests, accepted donors, and your complete request history.
              Expired and fulfilled requests remain available for reference.
            </p>
          </div>

          <button
            type="button"
            className="my-blood-requests-refresh"
            onClick={fetchMyRequests}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={
                loading ? "my-blood-request-spin" : ""
              }
            />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="my-blood-requests-empty">
            <RefreshCw
              size={25}
              className="my-blood-request-spin"
            />

            <p>Loading blood requirements...</p>
          </div>
        ) : requirements.length === 0 ? (
          <div className="my-blood-requests-empty">
            <div className="my-blood-requests-empty-icon">
              <ClipboardList size={30} />
            </div>

            <h3>No blood requirements yet</h3>

            <p>
              Create a blood requirement to start receiving donor responses.
              Your requests and accepted donor history will remain available here.
            </p>

            <button
              type="button"
              className="my-blood-requests-empty-button"
              onClick={() => {
                setShowForm(true);
                setError("");
                setSuccess("");
              }}
            >
              <Plus size={16} />
              Create Requirement
            </button>
          </div>
        ) : (
          <div className="my-blood-requests-grid">
            {requirements.map((requirement) => {
              const status = getRequestStatus(requirement);
              const remainingUnits =
                getRemainingUnits(requirement);

              return (
                <article
                  key={requirement.id}
                  className={`my-blood-request-card ${getStatusClass(
                    status
                  )}`}
                >
                  <div className="my-blood-request-card-top">
                    <div className="my-blood-request-group">
                      <Droplets size={18} />
                      <strong>{requirement.blood_group}</strong>
                    </div>

                    <div className="my-blood-request-card-top-actions">
                      <span
                        className={`my-blood-request-urgency ${getUrgencyClass(
                          requirement.urgency
                        )}`}
                      >
                        {requirement.urgency}
                      </span>

                      {(requirement.donor_responses || [])
                        .filter(
                          (response) =>
                            String(response.status || "").toLowerCase() === "accepted" &&
                            Boolean(response.donor_id)
                        )
                        .map((response, index) => {
                          const donorId = String(response.donor_id);
                          const isSaved = savedDonorIds.has(donorId);

                          return (
                            <button
                              key={response.donation_id || donorId || index}
                              type="button"
                              className={`my-blood-request-card-save ${isSaved ? "is-saved" : ""}`}
                              onClick={() =>
                                toggleSavedDonor({
                                  donor_id: donorId,
                                  donation_id: response.donation_id || "",
                                  donor_name: response.donor_name || "Blood Donor",
                                  blood_group: response.blood_group || requirement.blood_group,
                                  status: response.status || "accepted",
                                } as DonorResponse)
                              }
                              disabled={savingDonorId === donorId}
                              aria-label={`${isSaved ? "Remove" : "Save"} ${response.donor_name || "donor"} ${isSaved ? "from" : "to"} Saved Donors`}
                              title={`${isSaved ? "Unsave" : "Save"} ${response.donor_name || "donor"}`}
                            >
                              <Bookmark
                                size={16}
                                fill={isSaved ? "currentColor" : "none"}
                              />
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <h3>{requirement.hospital_name}</h3>

                  <div className="my-blood-request-location">
                    <MapPin size={15} />

                    <span>
                      {requirement.hospital_city},{" "}
                      {requirement.hospital_state}
                    </span>
                  </div>

                  <div className="my-blood-request-details">
                    <div>
                      <span>Units Required</span>
                      <strong>{requirement.units_required}</strong>
                    </div>

                    <div>
                      <span>Required Date</span>
                      <strong>
                        {formatDate(requirement.required_date)}
                      </strong>
                    </div>

                    <div>
                      <span>Remaining</span>
                      <strong>{remainingUnits}</strong>
                    </div>
                  </div>

                  <div className="my-blood-request-contact-row">
                    <div>
                      <span>Contact</span>
                      <strong>
                        {requirement.contact_name || "Not provided"}
                      </strong>
                    </div>

                    {requirement.contact_phone ? (
                      <a
                        href={`tel:${requirement.contact_phone}`}
                        className="my-blood-request-call"
                      >
                        <Phone size={14} />
                        Call
                      </a>
                    ) : (
                      <span className="my-blood-request-no-phone">
                        Phone unavailable
                      </span>
                    )}
                  </div>

                  <div className="my-blood-request-response-row">
                    <div className="my-blood-request-response-count">
                      <UserCheck size={15} />
                      <span>
                        {requirement.donor_responses?.length || 0} donor
                        {requirement.donor_responses?.length === 1 ? "" : "s"} responded
                      </span>
                    </div>

                    {(requirement.donor_responses?.length || 0) > 0 && (
                      <button
                        type="button"
                        className="my-blood-request-view-donors"
                        onClick={() => loadDonorResponses(requirement)}
                      >
                        <Eye size={14} />
                        View Donors & Contact
                      </button>
                    )}
                  </div>

                  {(requirement.donor_responses || []).some(
                    (response) =>
                      String(response.status || "").toLowerCase() === "accepted"
                  ) && (
                    <div className="my-blood-request-accepted-preview">
                      <div className="my-blood-request-accepted-preview-title">
                        <CheckCircle2 size={15} />
                        <strong>Accepted Donors</strong>
                      </div>
                      <div className="my-blood-request-accepted-preview-names">
                        {(requirement.donor_responses || [])
                          .filter(
                            (response) =>
                              String(response.status || "").toLowerCase() === "accepted"
                          )
                          .map((response, index) => (
                            <span className="my-blood-request-accepted-donor-chip" key={response.donation_id || response.donor_id || index}>
                              {response.donor_name || "Accepted donor"}
                            </span>
                          ))}
                      </div>
                      <small>
                        Accepted donor records stay here after this request is fulfilled or expires.
                        Open “View Donors & Contact” to call them.
                      </small>
                    </div>
                  )}

                  <div className="my-blood-request-card-footer">
                    <span
                      className={`my-blood-request-status ${getStatusClass(
                        status
                      )}`}
                    >
                      <CheckCircle2 size={14} />
                      {getStatusLabel(status)}
                    </span>

                    <button
                      type="button"
                      className="my-blood-request-delete"
                      onClick={() =>
                        handleDelete(requirement.id)
                      }
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================================
          ACCEPTED / RESPONDING DONORS MODAL
      ====================================================== */}

      {selectedDonorRequirement && (
        <div
          className="my-blood-request-donors-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !acceptingDonorId
            ) {
              setSelectedDonorRequirement(null);
              setDonorResponses([]);
              setDonorModalError("");
            }
          }}
        >
          <div
            className="my-blood-request-donors-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accepted-donors-title"
          >
            <div className="my-blood-request-donors-header">
              <div>
                <span className="my-blood-request-list-eyebrow">
                  DONOR RESPONSES
                </span>

                <h2 id="accepted-donors-title">
                  View Donor Responses
                </h2>

                <p>
                  Review donors who responded to this blood
                  requirement, contact them, and select the donor
                  you want to accept.
                </p>
              </div>

              <button
                type="button"
                className="my-blood-request-close"
                onClick={() => {
                  if (!acceptingDonorId) {
                    setSelectedDonorRequirement(null);
                    setDonorResponses([]);
                    setDonorModalError("");
                  }
                }}
                aria-label="Close donor responses"
              >
                <X size={19} />
              </button>
            </div>

            <div className="my-blood-request-donor-request-summary">
              <div>
                <span>Blood Group</span>
                <strong>
                  {selectedDonorRequirement.blood_group}
                </strong>
              </div>

              <div>
                <span>Hospital</span>
                <strong>
                  {selectedDonorRequirement.hospital_name}
                </strong>
              </div>

              <div>
                <span>Remaining Units</span>
                <strong>
                  {getRemainingUnits(selectedDonorRequirement)}
                </strong>
              </div>
            </div>

            {donorModalError && (
              <div className="my-blood-request-error">
                <AlertCircle size={17} />
                <span>{donorModalError}</span>
              </div>
            )}

            {loadingDonors ? (
              <div className="my-blood-request-donors-loading">
                <RefreshCw
                  size={23}
                  className="my-blood-request-spin"
                />
                <p>Loading donor responses...</p>
              </div>
            ) : donorResponses.length === 0 ? (
              <div className="my-blood-request-donors-empty">
                <UserCheck size={30} />
                <h3>No donor responses yet</h3>
                <p>
                  Donors who respond to this requirement will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="my-blood-request-donors-list">
                {donorResponses.map((donor) => {
                  const donorStatus =
                    String(donor.status || "pending").toLowerCase();

                  return (
                    <article
                      className="my-blood-request-donor-item"
                      key={donor.donation_id}
                    >
                      <div className="my-blood-request-donor-item-top">
                        <div className="my-blood-request-donor-identity">
                          <div className="my-blood-request-donor-avatar">
                            <UserCheck size={19} />
                          </div>

                          <div>
                            <h3>{donor.donor_name || "Blood Donor"}</h3>
                            <p>
                              {donor.blood_group || "—"} blood group
                            </p>
                          </div>
                        </div>

                        <span
                          className={`my-blood-request-donor-status ${donorStatus}`}
                        >
                          <CheckCircle2 size={13} />
                          {getDonorStatusLabel(donorStatus)}
                        </span>
                      </div>

                      <div className="my-blood-request-donor-info-grid">
                        <div>
                          <span>Phone</span>
                          <strong>
                            {donor.phone || "Not available"}
                          </strong>
                        </div>

                        <div>
                          <span>Email</span>
                          <strong>
                            {donor.email || "Not available"}
                          </strong>
                        </div>

                        <div>
                          <span>Address</span>
                          <strong>
                            {[
                              donor.address,
                              donor.city,
                              donor.state,
                              donor.pincode,
                            ]
                              .filter(Boolean)
                              .join(", ") || "Not available"}
                          </strong>
                        </div>

                        <div>
                          <span>Weight</span>
                          <strong>
                            {donor.weight_kg
                              ? `${donor.weight_kg} kg`
                              : "Not available"}
                          </strong>
                        </div>

                        <div>
                          <span>Availability</span>
                          <strong>
                            {donor.availability === true
                              ? "Available"
                              : donor.availability === false
                              ? "Unavailable"
                              : "Not available"}
                          </strong>
                        </div>

                        <div>
                          <span>Verification</span>
                          <strong>
                            {donor.verification_status || "Not available"}
                          </strong>
                        </div>
                      </div>

                      <div className="my-blood-request-donor-actions">
                        {donor.donor_id && (
                          <button
                            type="button"
                            className={`my-blood-request-save-donor ${savedDonorIds.has(donor.donor_id) ? "is-saved" : ""}`}
                            onClick={() => toggleSavedDonor(donor)}
                            disabled={savingDonorId === donor.donor_id}
                            aria-label={savedDonorIds.has(donor.donor_id) ? "Unsave donor" : "Save donor"}
                            title={savedDonorIds.has(donor.donor_id) ? "Remove from Saved Donors" : "Save donor"}
                          >
                            <Bookmark size={14} fill={savedDonorIds.has(donor.donor_id) ? "currentColor" : "none"} />
                            {savingDonorId === donor.donor_id
                              ? "Saving..."
                              : savedDonorIds.has(donor.donor_id) ? "Saved" : "Save"}
                          </button>
                        )}
                        {donor.phone && (
                          <a
                            href={`tel:${donor.phone}`}
                            className="my-blood-request-donor-call"
                          >
                            <Phone size={14} />
                            Call Donor
                          </a>
                        )}

                        {donorStatus === "pending" &&
                          getRequestStatus(selectedDonorRequirement) !== "expired" &&
                          getRequestStatus(selectedDonorRequirement) !== "fulfilled" &&
                          getRequestStatus(selectedDonorRequirement) !== "cancelled" && (
                          <button
                            type="button"
                            className="my-blood-request-accept-donor"
                            onClick={() =>
                              handleAcceptDonor(donor)
                            }
                            disabled={
                              acceptingDonorId === donor.donation_id
                            }
                          >
                            {acceptingDonorId === donor.donation_id ? (
                              <>
                                <RefreshCw
                                  size={14}
                                  className="my-blood-request-spin"
                                />
                                Accepting...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} />
                                Accept This User
                              </>
                            )}
                          </button>
                        )}

                        {donorStatus === "pending" &&
                          ["expired", "fulfilled", "cancelled"].includes(
                            getRequestStatus(selectedDonorRequirement)
                          ) && (
                            <span className="my-blood-request-accepted-label">
                              This request is closed. You can still view donor details and contact accepted donors.
                            </span>
                          )}

                        {donorStatus === "accepted" && (
                          <span className="my-blood-request-accepted-label">
                            <CheckCircle2 size={14} />
                            This donor is accepted
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================
          PRIVACY NOTICE
      ====================================================== */}

      <div className="my-blood-requests-notice">
        <AlertCircle size={18} />

        <p>
          Requester contact information is stored with the blood
          requirement. It should not be displayed on public search
          cards. Donors can use the contact information after
          accepting a matching blood request.
        </p>
      </div>
    </div>
  );
}

export default MyBloodRequests;
