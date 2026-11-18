import { extractApiRows } from "../../utils/apiPayload";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Droplets,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import "./BloodSearch.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

type Urgency = "" | "normal" | "urgent" | "emergency";

interface BloodDonor {
  id: string;
  full_name: string;
  blood_group: BloodGroup;
  city?: string;
  state?: string;
  phone?: string;
  availability?: boolean;
  verification_status?: string;
  last_donation_date?: string | null;
  address?: string;
  pincode?: string;
  previous_donations?: number;
  total_donations?: number;
  [key: string]: unknown;
}

interface BloodRequirement {
  id?: string;
  blood_group?: BloodGroup;
  hospital_city?: string;
  hospital_state?: string;
  urgency?: string;
  status?: string;
}

const BLOOD_GROUPS: BloodGroup[] = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
];



function normalize(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

function BloodSearch() {
  const [bloodGroup, setBloodGroup] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("");

  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterWarning, setFilterWarning] = useState("");
  const [selectedDonor, setSelectedDonor] = useState<BloodDonor | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedDonorIds, setSavedDonorIds] = useState<Set<string>>(new Set());
  const [savingDonorId, setSavingDonorId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  const getAuthHeaders = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    const token = await user.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, []);

  const loadDonors = useCallback(async () => {
    setLoading(true);
    setError("");
    setFilterWarning("");

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/blood-donors/`, {
        method: "GET",
        headers,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          typeof payload?.detail === "string" ? payload.detail : "";
        throw new Error(
          detail || `Unable to load donors (HTTP ${response.status}).`
        );
      }

      const donorRows = extractApiRows<BloodDonor>(payload, [
        "donors",
        "data",
        "results",
      ]);
      setDonors(donorRows);

      // Load the current user's saved donor IDs so bookmark state is
      // consistent with My Requests and the Saved Donors page.
      const savedResponse = await fetch(
        `${API_BASE_URL}/api/blood-donors/saved`,
        { method: "GET", headers }
      );
      const savedPayload = await savedResponse.json().catch(() => null);
      if (!savedResponse.ok) {
        throw new Error(
          typeof savedPayload?.detail === "string"
            ? savedPayload.detail
            : `Unable to load saved donor status (HTTP ${savedResponse.status}).`
        );
      }
      const savedRows = Array.isArray(savedPayload?.donors)
        ? savedPayload.donors
        : [];
      setSavedDonorIds(
        new Set(savedRows.map((item: { id?: string }) => String(item.id || "")))
      );
      setHasSearched(true);
    } catch (err) {
      console.error("Blood donor loading error:", err);
      setDonors([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load blood donors. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        void loadDonors();
      } else {
        setDonors([]);
        setLoading(false);
        setError("Please sign in to view available blood donors.");
      }
    });

    return unsubscribe;
  }, [loadDonors]);

  const toggleSavedDonor = async (donor: BloodDonor) => {
    const donorId = String(donor.id || "").trim();
    if (!donorId) {
      setSaveError("This donor record does not contain a valid donor ID.");
      return;
    }

    const currentlySaved = savedDonorIds.has(donorId);
    try {
      setSavingDonorId(donorId);
      setSaveError("");
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/blood-donors/saved/${encodeURIComponent(donorId)}`,
        { method: currentlySaved ? "DELETE" : "POST", headers }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof payload?.detail === "string"
            ? payload.detail
            : `Unable to ${currentlySaved ? "remove" : "save"} donor (HTTP ${response.status}).`
        );
      }
      setSavedDonorIds((current) => {
        const next = new Set(current);
        if (currentlySaved) next.delete(donorId);
        else next.add(donorId);
        return next;
      });
    } catch (err) {
      console.error("Save donor error:", err);
      setSaveError(
        err instanceof Error ? err.message : "Unable to update saved donor."
      );
    } finally {
      setSavingDonorId(null);
    }
  };

  const availableDonors = useMemo(
    () => donors.filter((donor) => donor.availability !== false),
    [donors]
  );

  const filteredDonors = useMemo(() => {
    const searchLocation = normalize(location);

    return availableDonors.filter((donor) => {
      const groupMatches = !bloodGroup || donor.blood_group === bloodGroup;
      const donorLocation = `${donor.city || ""} ${donor.state || ""}`;
      const locationMatches =
        !searchLocation || normalize(donorLocation).includes(searchLocation);

      return groupMatches && locationMatches;
    });
  }, [availableDonors, bloodGroup, location]);

  /*
   * Urgency belongs to a blood requirement, not to a donor registration.
   * When an urgency is selected, the search uses active requirements as
   * matching criteria but still displays donor cards only.
   */
  const handleSearch = async () => {
    if (!urgency) {
      setFilterWarning("");
      setHasSearched(true);
      return;
    }

    setLoading(true);
    setError("");
    setFilterWarning("");

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/blood-requirements/?status=active`,
        { method: "GET", headers }
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          typeof payload?.detail === "string" ? payload.detail : "";
        throw new Error(
          detail || `Unable to apply urgency filter (HTTP ${response.status}).`
        );
      }

      const requirements = extractApiRows<BloodRequirement>(payload, [
        "requirements",
        "data",
        "results",
      ]).filter(
        (item) =>
          normalize(item.status) === "active" &&
          normalize(item.urgency) === urgency
      );

      const matchingGroups = new Set(
        requirements
          .filter((item) => !bloodGroup || item.blood_group === bloodGroup)
          .filter((item) => {
            if (!location.trim()) return true;
            const requestLocation =
              `${item.hospital_city || ""} ${item.hospital_state || ""}`;
            return normalize(requestLocation).includes(normalize(location));
          })
          .map((item) => item.blood_group)
          .filter(Boolean)
      );

      // A donor is relevant to the selected urgency when an active
      // requirement of that urgency exists for the donor's blood group.
      setFilterWarning(
        requirements.length === 0
          ? `There are no active ${urgency} blood requirements right now.`
          : ""
      );

      if (requirements.length === 0) {
        setHasSearched(true);
      } else {
        // Keep this derived set in state through the urgency match IDs.
        setUrgencyMatchedGroups(matchingGroups as Set<BloodGroup>);
        setHasSearched(true);
      }
    } catch (err) {
      console.error("Urgency filter error:", err);
      setFilterWarning(
        err instanceof Error
          ? err.message
          : "Unable to apply the urgency filter."
      );
      setUrgencyMatchedGroups(new Set());
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const [urgencyMatchedGroups, setUrgencyMatchedGroups] =
    useState<Set<BloodGroup> | null>(null);

  const displayedDonors = useMemo(() => {
    if (!urgency) return filteredDonors;
    if (!urgencyMatchedGroups) return [];
    return filteredDonors.filter((donor) =>
      urgencyMatchedGroups.has(donor.blood_group)
    );
  }, [filteredDonors, urgency, urgencyMatchedGroups]);

  const handleClear = () => {
    setBloodGroup("");
    setLocation("");
    setUrgency("");
    setUrgencyMatchedGroups(null);
    setFilterWarning("");
    setHasSearched(true);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not available";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getVerificationLabel = (status?: string) => {
    if (normalize(status) === "verified") return "Verified";
    if (normalize(status) === "pending") return "Verification pending";
    return "Verification status unavailable";
  };

  return (
    <div className="blood-search-page">
      <section className="blood-search-header">
        <div>
          <span className="blood-search-eyebrow">BLOOD DONATION</span>
          <h1>Find Blood Donors</h1>
          <p>
            Browse registered available donors and filter by blood group,
            location, and urgency.
          </p>
        </div>
        <div className="blood-search-live-tag">
          <span className="blood-search-live-dot" aria-hidden="true" />
          <span>Live Donor Registrations</span>
        </div>
      </section>

      <section className="blood-search-filter-card">
        <div className="blood-search-filter-grid">
          <div className="blood-search-field">
            <label htmlFor="blood-group">Blood Group</label>
            <div className="blood-search-input-wrapper">
              <Droplets size={17} />
              <select
                id="blood-group"
                value={bloodGroup}
                onChange={(event) => setBloodGroup(event.target.value)}
              >
                <option value="">All Blood Groups</option>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="blood-search-field">
            <label htmlFor="blood-location">Location</label>
            <div className="blood-search-input-wrapper">
              <MapPin size={17} />
              <input
                id="blood-location"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City or state"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSearch();
                }}
              />
            </div>
          </div>

          <div className="blood-search-field">
            <label htmlFor="blood-urgency">Urgency</label>
            <div className="blood-search-input-wrapper">
              <AlertCircle size={17} />
              <select
                id="blood-urgency"
                value={urgency}
                onChange={(event) => {
                  setUrgency(event.target.value as Urgency);
                  setUrgencyMatchedGroups(null);
                }}
              >
                <option value="">All Urgency Levels</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div className="blood-search-actions">
            <button
              type="button"
              className="blood-search-button"
              onClick={() => void handleSearch()}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw size={17} className="blood-search-spin" />
              ) : (
                <Search size={17} />
              )}
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              className="blood-search-clear-button"
              onClick={handleClear}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      <section className="blood-search-results-section">
        <div className="blood-search-tabs">
          <div className="blood-search-tab active">
            <UserRound size={17} />
            Available Donors
            <span>{displayedDonors.length}</span>
          </div>
        </div>

        {error && (
          <div className="blood-search-error">
            <AlertCircle size={19} />
            <span>{error}</span>
            <button type="button" onClick={() => void loadDonors()}>
              Retry
            </button>
          </div>
        )}

        {saveError && (
          <div className="blood-search-error" role="alert">
            <AlertCircle size={18} />
            <span>{saveError}</span>
            <button type="button" onClick={() => setSaveError("")}>Dismiss</button>
          </div>
        )}

        {filterWarning && !error && (
          <div className="blood-search-error">
            <AlertCircle size={18} />
            <span>{filterWarning}</span>
          </div>
        )}

        {loading && (
          <div className="blood-search-loading">
            <RefreshCw size={24} className="blood-search-spin" />
            <p>Loading registered blood donors...</p>
          </div>
        )}

        {!loading && !error && displayedDonors.length === 0 && (
          <div className="blood-search-empty">
            <div className="blood-search-empty-icon">
              <Droplets size={28} />
            </div>
            <h3>
              {hasSearched ? "No available donors found" : "Loading donors"}
            </h3>
            <p>
              {urgency
                ? "No available donor matches the selected blood group, location, and urgency criteria."
                : "No available donor records match the selected blood group and location."}
            </p>
          </div>
        )}

        {!loading && !error && displayedDonors.length > 0 && (
          <div className="blood-donor-grid">
            {displayedDonors.map((donor) => (
              <article key={donor.id} className="blood-donor-card">
                <div className="blood-donor-card-header">
                  <div className="blood-donor-avatar">
                    <UserRound size={22} />
                  </div>
                  <div className="blood-donor-title">
                    <h3>{donor.full_name || "Registered Donor"}</h3>
                    <div className="blood-donor-location">
                      <MapPin size={14} />
                      <span>
                        {[donor.city, donor.state].filter(Boolean).join(", ") ||
                          "Location not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="blood-donor-group">{donor.blood_group}</div>
                </div>

                <div className="blood-donor-verification">
                  <ShieldCheck size={16} />
                  <span>{getVerificationLabel(donor.verification_status)}</span>
                </div>

                <div className="blood-donor-details">
                  <div>
                    <CalendarDays size={15} />
                    <span>
                      Last donated: {formatDate(donor.last_donation_date)}
                    </span>
                  </div>
                  <div>
                    <CheckCircle2 size={15} />
                    <span>Currently available</span>
                  </div>
                </div>

                <div className="blood-donor-card-footer">
                  <button
                    type="button"
                    className={`blood-donor-save-button ${savedDonorIds.has(donor.id) ? "is-saved" : ""}`}
                    onClick={() => void toggleSavedDonor(donor)}
                    disabled={savingDonorId === donor.id}
                    aria-label={savedDonorIds.has(donor.id) ? "Unsave donor" : "Save donor"}
                    title={savedDonorIds.has(donor.id) ? "Remove from Saved Donors" : "Save donor"}
                  >
                    <Bookmark
                      size={16}
                      fill={savedDonorIds.has(donor.id) ? "currentColor" : "none"}
                    />
                    {savingDonorId === donor.id
                      ? "Saving..."
                      : savedDonorIds.has(donor.id) ? "Saved" : "Save"}
                  </button>
                  {donor.phone ? (
                    <a
                      href={`tel:${donor.phone}`}
                      className="blood-donor-contact"
                    >
                      <Phone size={16} />
                      Contact
                    </a>
                  ) : (
                    <span className="blood-donor-no-contact">
                      Contact details unavailable
                    </span>
                  )}
                  <button
                    type="button"
                    className="blood-donor-details-button"
                    onClick={() => setSelectedDonor(donor)}
                  >
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="blood-search-privacy-notice">
        <ShieldCheck size={18} />
        <p>
          MedVisionRx displays only donor information needed to connect people
          seeking blood with registered donors. Please use contact details
          responsibly.
        </p>
      </div>

      {selectedDonor && (
        <div
          className="blood-donor-modal-overlay"
          onClick={() => setSelectedDonor(null)}
        >
          <div
            className="blood-donor-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="blood-donor-modal-header">
              <div className="blood-donor-modal-heading">
                <div className="blood-donor-modal-avatar">
                  <UserRound size={24} />
                </div>
                <div>
                  <span className="blood-donor-modal-eyebrow">
                    DONOR DETAILS
                  </span>
                  <h2>{selectedDonor.full_name || "Registered Donor"}</h2>
                  <div className="blood-donor-modal-location">
                    <MapPin size={14} />
                    <span>
                      {[selectedDonor.city, selectedDonor.state]
                        .filter(Boolean)
                        .join(", ") || "Location not provided"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="blood-donor-modal-close"
                onClick={() => setSelectedDonor(null)}
                aria-label="Close donor details"
              >
                <X size={19} />
              </button>
            </div>

            <div className="blood-donor-modal-blood">
              <span>Blood Group</span>
              <strong>{selectedDonor.blood_group}</strong>
            </div>

            <div className="blood-donor-modal-grid">
              <div className="blood-donor-modal-detail">
                <div className="blood-donor-modal-detail-icon">
                  <ShieldCheck size={17} />
                </div>
                <div>
                  <span>Verification</span>
                  <strong>
                    {getVerificationLabel(selectedDonor.verification_status)}
                  </strong>
                </div>
              </div>
              <div className="blood-donor-modal-detail">
                <div className="blood-donor-modal-detail-icon">
                  <CalendarDays size={17} />
                </div>
                <div>
                  <span>Last Donation</span>
                  <strong>{formatDate(selectedDonor.last_donation_date)}</strong>
                </div>
              </div>
              <div className="blood-donor-modal-detail">
                <div className="blood-donor-modal-detail-icon">
                  <CheckCircle2 size={17} />
                </div>
                <div>
                  <span>Availability</span>
                  <strong>Currently available</strong>
                </div>
              </div>
            </div>

            <div className="blood-donor-modal-contact-section">
              <div>
                <h3>Contact Donor</h3>
                <p>
                  Contact information should only be used for legitimate blood
                  donation communication.
                </p>
              </div>
              {selectedDonor.phone ? (
                <a
                  href={`tel:${selectedDonor.phone}`}
                  className="blood-donor-modal-contact"
                >
                  <Phone size={17} />
                  Contact Donor
                </a>
              ) : (
                <span className="blood-donor-modal-no-contact">
                  Contact details unavailable
                </span>
              )}
            </div>

            <div className="blood-donor-modal-privacy">
              <ShieldCheck size={16} />
              <p>
                MedVisionRx displays only donor information needed for blood
                connection. Private medical and account information is not
                displayed here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BloodSearch;
