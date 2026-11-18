import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Eye,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Siren,
  X,
} from "lucide-react";

import { auth } from "../../firebase";

import "./BloodRequests.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

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
  created_at: string;
  reason?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  updated_at?: string | null;
  donor_responses?: Array<{
    donor_id?: string;
    donation_id?: string;
    status?: string;
  }>;
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

function BloodRequests() {
  const [requirements, setRequirements] = useState<
    BloodRequirement[]
  >([]);

  const [selectedBloodGroup, setSelectedBloodGroup] =
    useState("");

  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [selectedRequirement, setSelectedRequirement] =
    useState<BloodRequirement | null>(null);

  const [donateRequirement, setDonateRequirement] =
    useState<BloodRequirement | null>(null);

  const [donating, setDonating] = useState(false);

  const [currentDonorId, setCurrentDonorId] = useState("");

  const [donateMessage, setDonateMessage] = useState("");

  const fetchRequirements = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.append("status", "active");

      if (selectedBloodGroup) {
        params.append(
          "blood_group",
          selectedBloodGroup
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/blood-requirements/?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to fetch blood requirements"
        );
      }

      const data: BloodRequirement[] =
        await response.json();

      setRequirements(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Blood requirements error:",
        err
      );

      setRequirements([]);

      setError(
        "Unable to load blood requirements. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedBloodGroup]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchRequirements();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchRequirements]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setCurrentDonorId("");

        if (!user) {
          return;
        }

        try {
          const idToken = await user.getIdToken();

          const donorResponse = await fetch(
            `${API_BASE_URL}/api/blood-donors/by-user/${encodeURIComponent(
              user.uid
            )}`,
            {
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            }
          );

          if (!donorResponse.ok) {
            if (donorResponse.status !== 404) {
              console.error(
                "Unable to load current blood donor profile:",
                donorResponse.status
              );
            }
            return;
          }

          const donor = await donorResponse.json();

          if (donor?.id) {
            setCurrentDonorId(donor.id);
          }
        } catch (err) {
          console.error(
            "Unable to load current blood donor profile:",
            err
          );
        }
      }
    );

    return unsubscribe;
  }, []);

  const filteredRequirements = useMemo(() => {
    const search = searchText
      .trim()
      .toLowerCase();

    if (!search) {
      return requirements;
    }

    return requirements.filter(
      (requirement) =>
        [
          requirement.hospital_name,
          requirement.hospital_city,
          requirement.hospital_state,
          requirement.blood_group,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search)
        )
    );
  }, [requirements, searchText]);

  const formatDate = (
    dateString: string
  ) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getUrgencyLabel = (
    urgency: Urgency
  ) => {
    switch (urgency) {
      case "emergency":
        return "Emergency";

      case "urgent":
        return "Urgent";

      default:
        return "Normal";
    }
  };

  const handleContact = (
    requirement: BloodRequirement
  ) => {
    if (!requirement.contact_phone) {
      setSelectedRequirement(
        requirement
      );

      setDonateMessage(
        "The requester contact number is not available in the current API response."
      );

      return;
    }

    const phone =
      requirement.contact_phone.replace(
        /[^\d+]/g,
        ""
      );

    if (phone) {
      window.location.assign(`tel:${phone}`);
    }
  };

  const handleDonateClick = (
    requirement: BloodRequirement
  ) => {
    setDonateMessage("");

    setDonateRequirement(
      requirement
    );
  };

  const confirmDonation = async () => {
    if (!donateRequirement) {
      return;
    }

    setDonating(true);
    setDonateMessage("");

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "Please sign in to respond to a blood requirement."
        );
      }

      const idToken = await user.getIdToken();

      const donorResponse = await fetch(
        `${API_BASE_URL}/api/blood-donors/by-user/${encodeURIComponent(
          user.uid
        )}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!donorResponse.ok) {
        if (donorResponse.status === 404) {
          throw new Error(
            "Your blood donor profile was not found. Please register as a donor first."
          );
        }

        throw new Error(
          "Unable to verify your blood donor profile. Please try again."
        );
      }

      const donor = await donorResponse.json();
      const donorId = donor?.id;

      if (!donorId) {
        throw new Error(
          "Your blood donor profile was not found. Please register as a donor first."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/blood-donors/${encodeURIComponent(
          donorId
        )}/donations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            donor_id: donorId,
            blood_requirement_id: donateRequirement.id,
            blood_group: donateRequirement.blood_group,
            units: 1,
            donation_date: new Date()
              .toISOString()
              .split("T")[0],
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        if (
          response.status === 422 &&
          Array.isArray(data?.detail)
        ) {
          const validationMessage =
            data.detail
              .map(
                (item: { loc?: (string | number)[]; msg?: string }) => {
                  const location =
                    Array.isArray(
                      item?.loc
                    )
                      ? item.loc.join(".")
                      : "field";

                  return `${location}: ${
                    item?.msg ||
                    "Invalid value"
                  }`;
                }
              )
              .join(" | ");

          throw new Error(
            validationMessage ||
              "The donation information is invalid."
          );
        }

        throw new Error(
          typeof data?.detail ===
            "string"
            ? data.detail
            : "Unable to respond to this blood requirement."
        );
      }

      setDonateRequirement(
        null
      );

      window.location.assign("/blood-donation/donations");
    } catch (err) {
      console.error(
        "Blood donation response error:",
        err
      );

      setDonateMessage(
        err instanceof Error
          ? err.message
          : "Unable to respond to this blood requirement."
      );
    } finally {
      setDonating(false);
    }
  };

  const hasCurrentDonorResponded = (
    requirement: BloodRequirement
  ) => {
    if (!currentDonorId) {
      return false;
    }

    return Boolean(
      requirement.donor_responses?.some(
        (response) =>
          response.donor_id === currentDonorId &&
          ["pending", "accepted"].includes(
            String(response.status || "").toLowerCase()
          )
      )
    );
  };

  return (
    <div className="blood-requests-page">
      <div className="blood-requests-header">
        <div className="blood-requests-title-row">
          <div className="blood-requests-title-icon">
            <Droplets size={22} />
          </div>

          <div>
            <h1>Blood Requests</h1>

            <p>
              Find active blood requirements
              and help patients in need.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="blood-refresh-button"
          onClick={fetchRequirements}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "blood-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      <section className="blood-request-filters">
        <div className="blood-filter-group">
          <label htmlFor="blood-group-filter">
            Blood Group
          </label>

          <select
            id="blood-group-filter"
            value={selectedBloodGroup}
            onChange={(event) =>
              setSelectedBloodGroup(
                event.target.value
              )
            }
          >
            <option value="">
              All Blood Groups
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
        </div>

        <div className="blood-filter-group blood-search-group">
          <label htmlFor="blood-request-search">
            Search Hospital / Location
          </label>

          <div className="blood-search-wrapper">
            <Search size={18} />

            <input
              id="blood-request-search"
              type="text"
              placeholder="Search hospital, city or state..."
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="blood-request-error">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={fetchRequirements}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        filteredRequirements.length ===
          0 && (
          <div className="blood-empty-state">
            <div className="blood-empty-icon">
              <Droplets size={28} />
            </div>

            <h3>
              No blood requests found
            </h3>

            <p>
              There are currently no active
              blood requirements matching
              your search.
            </p>
          </div>
        )}

      {loading && (
        <div className="blood-loading-state">
          <RefreshCw
            size={24}
            className="blood-spin"
          />

          <p>
            Loading blood requests...
          </p>
        </div>
      )}

      {!loading &&
        filteredRequirements.length >
          0 && (
          <div className="blood-request-grid">
            {filteredRequirements.map(
              (requirement) => (
                <article
                  key={requirement.id}
                  className="blood-request-card"
                >
                  <div className="blood-request-card-top">
                    <div className="blood-group-large">
                      <Droplets size={20} />

                      <span>
                        {
                          requirement.blood_group
                        }
                      </span>
                    </div>

                    <span
                      className={`blood-urgency-badge ${requirement.urgency}`}
                    >
                      {requirement.urgency ===
                        "emergency" && (
                        <Siren
                          size={13}
                        />
                      )}

                      {getUrgencyLabel(
                        requirement.urgency
                      )}
                    </span>
                  </div>

                  <div className="blood-request-card-content">
                    <h3>
                      {
                        requirement.hospital_name
                      }
                    </h3>

                    <div className="blood-request-location">
                      <MapPin size={15} />

                      <span>
                        {
                          requirement.hospital_city
                        }
                        ,{" "}
                        {
                          requirement.hospital_state
                        }
                      </span>
                    </div>

                    <div className="blood-request-info-row">
                      <div>
                        <CalendarDays
                          size={15}
                        />

                        <span>
                          Required
                        </span>

                        <strong>
                          {formatDate(
                            requirement.required_date
                          )}
                        </strong>
                      </div>

                      <div>
                        <Droplets
                          size={15}
                        />

                        <span>
                          Units
                        </span>

                        <strong>
                          {
                            requirement.units_required
                          }
                        </strong>
                      </div>
                    </div>

                    {requirement.reason && (
                      <p className="blood-request-reason">
                        {
                          requirement.reason
                        }
                      </p>
                    )}
                  </div>

                  <div className="blood-request-card-footer">
                    <span className="blood-active-status">
                      <span className="blood-status-dot" />
                      Active Request
                    </span>
                  </div>

                  <div className="blood-request-actions">
                    <button
                      type="button"
                      className="blood-request-view-button"
                      onClick={() =>
                        setSelectedRequirement(
                          requirement
                        )
                      }
                    >
                      <Eye size={15} />

                      View Details

                      <ChevronRight
                        size={14}
                      />
                    </button>

                    <div className="blood-request-action-row">
                      <button
                        type="button"
                        className="blood-request-contact-button"
                        onClick={() =>
                          handleContact(
                            requirement
                          )
                        }
                      >
                        <Phone
                          size={15}
                        />

                        Contact
                      </button>

                      <button
                        type="button"
                        className={
                          hasCurrentDonorResponded(
                            requirement
                          )
                            ? "blood-request-donate-button accepted"
                            : "blood-request-donate-button"
                        }
                        onClick={() => {
                          if (
                            !hasCurrentDonorResponded(
                              requirement
                            )
                          ) {
                            handleDonateClick(
                              requirement
                            );
                          }
                        }}
                        disabled={hasCurrentDonorResponded(
                          requirement
                        )}
                      >
                        <CheckCircle2
                          size={15}
                        />

                        {hasCurrentDonorResponded(
                          requirement
                        )
                          ? "Accepted"
                          : "Donate Blood"}
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}

      {selectedRequirement && (
        <div
          className="blood-request-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedRequirement(
                null
              );
            }
          }}
        >
          <div
            className="blood-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="blood-request-details-title"
          >
            <div className="blood-request-modal-header">
              <div>
                <span className="blood-modal-eyebrow">
                  BLOOD REQUIREMENT
                </span>

                <h2 id="blood-request-details-title">
                  Request Details
                </h2>
              </div>

              <button
                type="button"
                className="blood-modal-close"
                onClick={() =>
                  setSelectedRequirement(
                    null
                  )
                }
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div className="blood-modal-badge-row">
              <div className="blood-group-badge">
                <Droplets size={18} />

                {
                  selectedRequirement.blood_group
                }
              </div>

              <div
                className={`blood-urgency-badge ${selectedRequirement.urgency}`}
              >
                {getUrgencyLabel(
                  selectedRequirement.urgency
                )}
              </div>
            </div>

            <div className="blood-modal-units">
              <strong>
                {
                  selectedRequirement.units_required
                }
              </strong>

              <span>
                {selectedRequirement.units_required ===
                1
                  ? "unit required"
                  : "units required"}
              </span>
            </div>

            <div className="blood-modal-details">
              <div>
                <span>
                  Hospital
                </span>

                <strong>
                  {
                    selectedRequirement.hospital_name
                  }
                </strong>
              </div>

              <div>
                <span>
                  Location
                </span>

                <strong>
                  {
                    selectedRequirement.hospital_city
                  }
                  ,{" "}
                  {
                    selectedRequirement.hospital_state
                  }
                </strong>
              </div>

              <div>
                <span>
                  Required Date
                </span>

                <strong>
                  {formatDate(
                    selectedRequirement.required_date
                  )}
                </strong>
              </div>

              {selectedRequirement.contact_name && (
                <div>
                  <span>
                    Contact Person
                  </span>

                  <strong>
                    {
                      selectedRequirement.contact_name
                    }
                  </strong>
                </div>
              )}

              {selectedRequirement.reason && (
                <div className="blood-modal-full-row">
                  <span>
                    Reason
                  </span>

                  <strong>
                    {
                      selectedRequirement.reason
                    }
                  </strong>
                </div>
              )}
            </div>

            <div className="blood-modal-actions">
              <button
                type="button"
                className="blood-request-contact-button"
                onClick={() =>
                  handleContact(
                    selectedRequirement
                  )
                }
              >
                <Phone size={16} />

                Contact
              </button>

              <button
                type="button"
                className={
                  hasCurrentDonorResponded(
                    selectedRequirement
                  )
                    ? "blood-request-donate-button accepted"
                    : "blood-request-donate-button"
                }
                onClick={() => {
                  if (
                    !hasCurrentDonorResponded(
                      selectedRequirement
                    )
                  ) {
                    setSelectedRequirement(
                      null
                    );

                    handleDonateClick(
                      selectedRequirement
                    );
                  }
                }}
                disabled={hasCurrentDonorResponded(
                  selectedRequirement
                )}
              >
                <CheckCircle2 size={16} />

                {hasCurrentDonorResponded(
                  selectedRequirement
                )
                  ? "Accepted"
                  : "Donate Blood"}
              </button>
            </div>

            {donateMessage && (
              <div className="blood-request-inline-message">
                <AlertCircle size={16} />

                {donateMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {donateRequirement && (
        <div
          className="blood-request-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !donating
            ) {
              setDonateRequirement(
                null
              );
            }
          }}
        >
          <div
            className="blood-request-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="donate-confirm-title"
          >
            <div className="blood-confirm-icon">
              <Droplets size={24} />
            </div>

            <h2 id="donate-confirm-title">
              Donate Blood?
            </h2>

            <p>
              You are choosing to donate{" "}
              <strong>
                {
                  donateRequirement.blood_group
                }
              </strong>{" "}
              blood for{" "}
              <strong>
                {
                  donateRequirement.hospital_name
                }
              </strong>
              .
            </p>

            <div className="blood-confirm-summary">
              <div>
                <span>
                  Blood Group
                </span>

                <strong>
                  {
                    donateRequirement.blood_group
                  }
                </strong>
              </div>

              <div>
                <span>
                  Units Requested
                </span>

                <strong>
                  {
                    donateRequirement.units_required
                  }
                </strong>
              </div>

              <div>
                <span>
                  Required Date
                </span>

                <strong>
                  {formatDate(
                    donateRequirement.required_date
                  )}
                </strong>
              </div>
            </div>

            <p className="blood-confirm-note">
              Only confirm if you genuinely
              intend to contact the requester or
              blood centre and proceed through the
              required medical screening. Your
              donor record will not be changed by
              registration alone.
            </p>

            {donateMessage && (
              <div className="blood-request-inline-message error">
                <AlertCircle size={16} />

                {donateMessage}
              </div>
            )}

            <div className="blood-confirm-actions">
              <button
                type="button"
                className="blood-confirm-cancel"
                onClick={() => {
                  if (!donating) {
                    setDonateRequirement(
                      null
                    );

                    setDonateMessage(
                      ""
                    );
                  }
                }}
                disabled={donating}
              >
                Cancel
              </button>

              <button
                type="button"
                className="blood-confirm-donate"
                onClick={
                  confirmDonation
                }
                disabled={donating}
              >
                {donating ? (
                  <>
                    <span className="blood-button-spinner" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={16}
                    />
                    Confirm Donation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BloodRequests;