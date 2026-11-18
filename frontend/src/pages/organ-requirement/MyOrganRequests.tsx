import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";

import "./MyOrganRequests.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

interface OrganRequirement {
  id?: string;
  _id?: string;

  created_by_user_id?: string;
  user_id?: string;

  organ_required: string;
  donation_type?: string | null;
  blood_group?: string | null;

  units_required: number;
  original_units_required?: number;
  units_fulfilled?: number;
  remaining_units?: number;

  hospital_name: string;
  hospital_city: string;
  hospital_state: string;

  required_date: string;
  urgency: string;
  status: string;

  reason?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;

  created_at?: string;
  updated_at?: string;

  donor_responses?: unknown[];
}

interface ApiResponse {
  data?: OrganRequirement[];
  requirements?: OrganRequirement[];
  records?: OrganRequirement[];
}

function getId(
  item: OrganRequirement
): string {
  return item.id || item._id || "";
}

function normalize(
  value?: string | null
): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatOrgan(
  value?: string | null
): string {
  if (!value) {
    return "Organ";
  }

  return value
    .trim()
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase()
    );
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
      (letter) => letter.toUpperCase()
    );
}

function formatDate(
  value?: string | null
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
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getLocation(
  item: OrganRequirement
): string {
  const city =
    item.hospital_city?.trim() || "";

  const state =
    item.hospital_state?.trim() || "";

  if (city && state) {
    return `${city}, ${state}`;
  }

  return (
    city ||
    state ||
    "Location not specified"
  );
}

function getRequiredUnits(
  item: OrganRequirement
): number {
  return Number(
    item.original_units_required ??
      item.units_required ??
      0
  );
}

function getFulfilledUnits(
  item: OrganRequirement
): number {
  return Number(
    item.units_fulfilled || 0
  );
}

function getRemainingUnits(
  item: OrganRequirement
): number {
  if (
    typeof item.remaining_units ===
    "number"
  ) {
    return item.remaining_units;
  }

  return Math.max(
    getRequiredUnits(item) -
      getFulfilledUnits(item),
    0
  );
}

function getUrgencyClass(
  value?: string
): string {
  const urgency =
    normalize(value);

  if (urgency === "emergency") {
    return "my-organ-requests-emergency";
  }

  if (urgency === "urgent") {
    return "my-organ-requests-urgent";
  }

  return "my-organ-requests-normal";
}

function getStatusClass(
  value?: string
): string {
  const status =
    normalize(value);

  if (status === "fulfilled") {
    return "my-organ-requests-status-fulfilled";
  }

  if (status === "cancelled") {
    return "my-organ-requests-status-cancelled";
  }

  return "my-organ-requests-status-active";
}

function getStatusIcon(
  value?: string
) {
  const status =
    normalize(value);

  if (status === "fulfilled") {
    return <CheckCircle2 size={13} />;
  }

  if (status === "cancelled") {
    return <X size={13} />;
  }

  return <Clock3 size={13} />;
}

function getOrganEmoji(
  organ?: string | null
): string {
  const value =
    normalize(organ);

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

  if (value.includes("bone")) {
    return "🦴";
  }

  if (value.includes("skin")) {
    return "🖐️";
  }

  return "🫀";
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to view your organ requests.");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

function MyOrganRequests() {
  const navigate = useNavigate();

  const [requirements, setRequirements] =
    useState<OrganRequirement[]>(
      []
    );

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>("");

  const [searchText, setSearchText] =
    useState<string>("");

  const [statusFilter, setStatusFilter] =
    useState<string>("all");

  const [selectedRequirement, setSelectedRequirement] =
    useState<OrganRequirement | null>(
      null
    );

  /* ============================================================
     LOAD USER REQUESTS
     ============================================================ */

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/organ-requirements/my`,
        { method: "GET", headers }
      );

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          typeof data === "object" && data !== null && "detail" in data
            ? String((data as { detail?: unknown }).detail || "")
            : "";
        throw new Error(
          detail || `Unable to load your organ requests (HTTP ${response.status}).`
        );
      }

      let records: OrganRequirement[] = [];

      if (Array.isArray(data)) {
        records = data as OrganRequirement[];
      } else if (typeof data === "object" && data !== null) {
        const responseData = data as ApiResponse;
        if (Array.isArray(responseData.data)) {
          records = responseData.data;
        } else if (Array.isArray(responseData.requirements)) {
          records = responseData.requirements;
        } else if (Array.isArray(responseData.records)) {
          records = responseData.records;
        }
      }

      // The authenticated /my endpoint is authoritative for ownership.
      // Do not filter using a browser-stored development UUID.
      setRequirements(records);
    } catch (err) {
      console.error("My Organ Requests error:", err);
      setRequirements([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your organ requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for Firebase to restore the signed-in session before calling the API.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        void loadMyRequests();
      } else {
        setRequirements([]);
        setError("Please sign in to view your organ requests.");
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  /* ============================================================
     FILTER
     ============================================================ */

  const filteredRequirements =
    useMemo(() => {
      const query =
        searchText
          .trim()
          .toLowerCase();

      return requirements.filter(
        (item) => {
          const matchesStatus =
            statusFilter === "all" ||
            normalize(
              item.status
            ) ===
              normalize(
                statusFilter
              );

          const searchableText =
            `${item.organ_required || ""} ${
              item.hospital_name || ""
            } ${
              item.hospital_city || ""
            } ${
              item.hospital_state || ""
            } ${
              item.reason || ""
            }`.toLowerCase();

          const matchesSearch =
            !query ||
            searchableText.includes(
              query
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      requirements,
      statusFilter,
      searchText,
    ]);

  /* ============================================================
     STATS
     ============================================================ */

  const stats = useMemo(() => {
    const active =
      requirements.filter(
        (item) =>
          normalize(
            item.status
          ) === "active"
      ).length;

    const fulfilled =
      requirements.filter(
        (item) =>
          normalize(
            item.status
          ) === "fulfilled"
      ).length;

    const cancelled =
      requirements.filter(
        (item) =>
          normalize(
            item.status
          ) === "cancelled"
      ).length;

    const emergency =
      requirements.filter(
        (item) =>
          normalize(
            item.urgency
          ) === "emergency" &&
          normalize(
            item.status
          ) === "active"
      ).length;

    return {
      total: requirements.length,
      active,
      fulfilled,
      cancelled,
      emergency,
    };
  }, [requirements]);

  /* ============================================================
     CLEAR FILTERS
     ============================================================ */

  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("all");
  };

  const hasFilters =
    Boolean(
      searchText ||
        statusFilter !== "all"
    );

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="my-organ-requests-page">

      {/* ======================================================
          BREADCRUMB
          ====================================================== */}

      <div className="my-organ-requests-breadcrumb">

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

        <strong>
          My Organ Requests
        </strong>

      </div>

      {/* ======================================================
          HEADER
          ====================================================== */}

      <section className="my-organ-requests-header">

        <div>

          <span className="my-organ-requests-eyebrow">
            ORGAN REQUIREMENT
          </span>

          <h1>
            My Organ Requests
          </h1>

          <p>
            Manage the organ requirements
            you have submitted through
            MedVisionRx.
          </p>

        </div>

        <button
          type="button"
          className="my-organ-requests-create-button"
          onClick={() =>
            navigate(
              "/organ-requirement/create"
            )
          }
        >
          Create Organ Requirement
          <ArrowRight size={16} />
        </button>

      </section>

      {/* ======================================================
          STATS
          ====================================================== */}

      <section className="my-organ-requests-stats">

        <button
          type="button"
          className={
            statusFilter === "all"
              ? "my-organ-stat active"
              : "my-organ-stat"
          }
          onClick={() =>
            setStatusFilter(
              "all"
            )
          }
        >
          <span className="my-organ-stat-icon">
            <Users size={18} />
          </span>

          <span>
            <strong>
              {stats.total}
            </strong>

            <small>
              Total Requests
            </small>
          </span>
        </button>

        <button
          type="button"
          className={
            statusFilter === "active"
              ? "my-organ-stat active"
              : "my-organ-stat"
          }
          onClick={() =>
            setStatusFilter(
              "active"
            )
          }
        >
          <span className="my-organ-stat-icon">
            <Clock3 size={18} />
          </span>

          <span>
            <strong>
              {stats.active}
            </strong>

            <small>
              Active
            </small>
          </span>
        </button>

        <button
          type="button"
          className={
            statusFilter ===
            "fulfilled"
              ? "my-organ-stat active"
              : "my-organ-stat"
          }
          onClick={() =>
            setStatusFilter(
              "fulfilled"
            )
          }
        >
          <span className="my-organ-stat-icon">
            <CheckCircle2
              size={18}
            />
          </span>

          <span>
            <strong>
              {stats.fulfilled}
            </strong>

            <small>
              Fulfilled
            </small>
          </span>
        </button>

        <button
          type="button"
          className="my-organ-stat"
          onClick={() => {
            setStatusFilter(
              "active"
            );
            setSearchText(
              "emergency"
            );
          }}
        >
          <span className="my-organ-stat-icon">
            <AlertCircle
              size={18}
            />
          </span>

          <span>
            <strong>
              {stats.emergency}
            </strong>

            <small>
              Emergency
            </small>
          </span>
        </button>

      </section>

      {/* ======================================================
          SEARCH / FILTER
          ====================================================== */}

      <section className="my-organ-requests-filter">

        <div className="my-organ-requests-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search organ, hospital, city..."
            value={searchText}
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
          />

          {searchText && (
            <button
              type="button"
              onClick={() =>
                setSearchText("")
              }
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}

        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
        >
          <option value="all">
            All Status
          </option>

          <option value="active">
            Active
          </option>

          <option value="fulfilled">
            Fulfilled
          </option>

          <option value="cancelled">
            Cancelled
          </option>
        </select>

        {hasFilters && (
          <button
            type="button"
            className="my-organ-requests-clear"
            onClick={
              clearFilters
            }
          >
            <X size={15} />
            Clear
          </button>
        )}

        <button
          type="button"
          className="my-organ-requests-refresh"
          onClick={
            loadMyRequests
          }
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "my-organ-requests-spin"
                : ""
            }
          />
          Refresh
        </button>

      </section>

      {/* ======================================================
          RESULT HEADER
          ====================================================== */}

      <section className="my-organ-requests-result-header">

        <div>

          <h2>
            Your Requests
          </h2>

          <p>
            Showing{" "}
            <strong>
              {
                filteredRequirements.length
              }
            </strong>{" "}
            of{" "}
            <strong>
              {requirements.length}
            </strong>{" "}
            requests
          </p>

        </div>

      </section>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="my-organ-requests-error">

          <AlertCircle
            size={19}
          />

          <div>

            <strong>
              Unable to load your requests
            </strong>

            <span>
              {error}
            </span>

          </div>

          <button
            type="button"
            onClick={
              loadMyRequests
            }
          >
            Retry
          </button>

        </div>
      )}

      {/* ======================================================
          LOADING
          ====================================================== */}

      {loading && (
        <div className="my-organ-requests-loading">

          <RefreshCw
            size={25}
            className="my-organ-requests-spin"
          />

          <span>
            Loading your organ requests...
          </span>

        </div>
      )}

      {/* ======================================================
          EMPTY
          ====================================================== */}

      {!loading &&
        !error &&
        filteredRequirements.length ===
          0 && (
          <div className="my-organ-requests-empty">

            <div className="my-organ-requests-empty-icon">
              <Search size={28} />
            </div>

            <h3>
              {requirements.length ===
              0
                ? "No organ requests yet"
                : "No matching requests"}
            </h3>

            <p>
              {requirements.length ===
              0
                ? "Create an organ requirement when you need to submit a real request."
                : "Try changing your search or status filter."}
            </p>

            {requirements.length ===
              0 ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/organ-requirement/create"
                  )
                }
              >
                Create Organ Requirement
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  clearFilters
                }
              >
                Clear Filters
              </button>
            )}

          </div>
        )}

      {/* ======================================================
          REQUEST CARDS
          ====================================================== */}

      {!loading &&
        filteredRequirements.length >
          0 && (
          <section className="my-organ-requests-list">

            {filteredRequirements.map(
              (item) => {

                const requiredUnits =
                  getRequiredUnits(
                    item
                  );

                const fulfilledUnits =
                  getFulfilledUnits(
                    item
                  );

                const remainingUnits =
                  getRemainingUnits(
                    item
                  );

                const progress =
                  requiredUnits > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (fulfilledUnits /
                            requiredUnits) *
                            100
                        )
                      )
                    : 0;

                return (
                  <article
                    key={getId(item)}
                    className="my-organ-request-card"
                  >

                    {/* CARD ICON */}

                    <div className="my-organ-request-icon">
                      <span>
                        {getOrganEmoji(
                          item.organ_required
                        )}
                      </span>
                    </div>

                    {/* CARD CONTENT */}

                    <div className="my-organ-request-content">

                      <div className="my-organ-request-title-row">

                        <div>

                          <h3>
                            {formatOrgan(
                              item.organ_required
                            )}
                          </h3>

                          <span>
                            Created{" "}
                            {formatDate(
                              item.created_at
                            )}
                          </span>

                        </div>

                        <div className="my-organ-request-badges">

                          <span
                            className={`my-organ-request-status ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {getStatusIcon(
                              item.status
                            )}

                            {formatText(
                              item.status
                            )}
                          </span>

                          <span
                            className={`my-organ-request-urgency ${getUrgencyClass(
                              item.urgency
                            )}`}
                          >
                            {formatText(
                              item.urgency
                            )}
                          </span>

                        </div>

                      </div>

                      <div className="my-organ-request-hospital">

                        <Building2
                          size={15}
                        />

                        <strong>
                          {item.hospital_name ||
                            "Hospital not specified"}
                        </strong>

                      </div>

                      <div className="my-organ-request-location">

                        <MapPin
                          size={14}
                        />

                        <span>
                          {getLocation(
                            item
                          )}
                        </span>

                      </div>

                      <div className="my-organ-request-meta">

                        <span>
                          <strong>
                            Required:
                          </strong>{" "}
                          {requiredUnits}
                        </span>

                        <span>
                          <strong>
                            Fulfilled:
                          </strong>{" "}
                          {fulfilledUnits}
                        </span>

                        <span>
                          <strong>
                            Remaining:
                          </strong>{" "}
                          {remainingUnits}
                        </span>

                        {item.blood_group && (
                          <span>
                            <strong>
                              Blood:
                            </strong>{" "}
                            {
                              item.blood_group
                            }
                          </span>
                        )}

                        {item.donation_type && (
                          <span>
                            <strong>
                              Type:
                            </strong>{" "}
                            {formatText(
                              item.donation_type
                            )}
                          </span>
                        )}

                      </div>

                      {/* PROGRESS */}

                      <div className="my-organ-request-progress-section">

                        <div className="my-organ-request-progress-label">

                          <span>
                            Fulfilment
                          </span>

                          <strong>
                            {progress}%
                          </strong>

                        </div>

                        <div className="my-organ-request-progress-track">

                          <div
                            className="my-organ-request-progress-bar"
                            style={{
                              width: `${progress}%`,
                            }}
                          />

                        </div>

                      </div>

                      <div className="my-organ-request-date">

                        <CalendarDays
                          size={14}
                        />

                        Required by{" "}

                        <strong>
                          {formatDate(
                            item.required_date
                          )}
                        </strong>

                      </div>

                    </div>

                    {/* ACTIONS */}

                    <div className="my-organ-request-actions">

                      <button
                        type="button"
                        className="my-organ-request-details"
                        onClick={() =>
                          setSelectedRequirement(
                            item
                          )
                        }
                      >
                        View Details
                        <ArrowRight
                          size={15}
                        />
                      </button>

                      {getId(item) && (
                        <button
                          type="button"
                          className="my-organ-request-details"
                          onClick={() =>
                            navigate(
                              `/organ-requirement/donor-responses/${encodeURIComponent(
                                getId(item)
                              )}`
                            )
                          }
                        >
                          <Users size={15} />
                          Donor Responses
                        </button>
                      )}

                      {item.contact_phone && (
                        <a
                          href={`tel:${item.contact_phone}`}
                          className="my-organ-request-contact"
                        >
                          <Phone
                            size={15}
                          />
                          Contact
                        </a>
                      )}

                    </div>

                  </article>
                );
              }
            )}

          </section>
        )}

      {/* ======================================================
          INFORMATION
          ====================================================== */}

      {!loading &&
        !error &&
        requirements.length > 0 && (
          <div className="my-organ-requests-information">

            <ShieldCheck
              size={18}
            />

            <div>

              <strong>
                Your organ requirement records
              </strong>

              <span>
                These records are loaded from
                the MedVisionRx backend for the
                current browser user.
              </span>

            </div>

          </div>
        )}

      {/* ======================================================
          DETAILS MODAL
          ====================================================== */}

      {selectedRequirement && (
        <div
          className="my-organ-requests-modal-overlay"
          onClick={() =>
            setSelectedRequirement(
              null
            )
          }
        >

          <div
            className="my-organ-requests-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="my-organ-requests-modal-header">

              <div>

                <span className="my-organ-requests-eyebrow">
                  MY ORGAN REQUEST
                </span>

                <h2>
                  {formatOrgan(
                    selectedRequirement.organ_required
                  )}
                </h2>

              </div>

              <button
                type="button"
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

            <div className="my-organ-requests-modal-body">

              <div className="my-organ-requests-modal-status">

                <span
                  className={`my-organ-request-status ${getStatusClass(
                    selectedRequirement.status
                  )}`}
                >
                  {getStatusIcon(
                    selectedRequirement.status
                  )}

                  {formatText(
                    selectedRequirement.status
                  )}
                </span>

                <span
                  className={`my-organ-request-urgency ${getUrgencyClass(
                    selectedRequirement.urgency
                  )}`}
                >
                  {formatText(
                    selectedRequirement.urgency
                  )}
                </span>

              </div>

              <div className="my-organ-requests-detail-grid">

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
                    {getLocation(
                      selectedRequirement
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Required Units
                  </span>

                  <strong>
                    {getRequiredUnits(
                      selectedRequirement
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Fulfilled Units
                  </span>

                  <strong>
                    {getFulfilledUnits(
                      selectedRequirement
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Remaining Units
                  </span>

                  <strong>
                    {getRemainingUnits(
                      selectedRequirement
                    )}
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

                <div>
                  <span>
                    Donation Type
                  </span>

                  <strong>
                    {formatText(
                      selectedRequirement.donation_type
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Blood Group
                  </span>

                  <strong>
                    {selectedRequirement.blood_group ||
                      "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>
                    Contact Name
                  </span>

                  <strong>
                    {selectedRequirement.contact_name ||
                      "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>
                    Created
                  </span>

                  <strong>
                    {formatDateTime(
                      selectedRequirement.created_at
                    )}
                  </strong>
                </div>

              </div>

              {selectedRequirement.reason && (
                <div className="my-organ-requests-reason">

                  <span>
                    Reason
                  </span>

                  <p>
                    {
                      selectedRequirement.reason
                    }
                  </p>

                </div>
              )}

            </div>

            <div className="my-organ-requests-modal-footer">

              {selectedRequirement.contact_phone ? (
                <a
                  href={`tel:${selectedRequirement.contact_phone}`}
                  className="my-organ-requests-modal-call"
                >
                  <Phone size={16} />
                  Contact
                </a>
              ) : (
                <span className="my-organ-requests-no-contact">
                  Contact number not available
                </span>
              )}

              {getId(selectedRequirement) && (
                <button
                  type="button"
                  className="my-organ-requests-modal-close"
                  onClick={() => {
                    const requirementId =
                      getId(selectedRequirement);

                    setSelectedRequirement(null);

                    navigate(
                      `/organ-requirement/donor-responses/${encodeURIComponent(
                        requirementId
                      )}`
                    );
                  }}
                >
                  <Users size={15} />
                  Donor Responses
                </button>
              )}

              <button
                type="button"
                className="my-organ-requests-modal-close"
                onClick={() =>
                  setSelectedRequirement(
                    null
                  )
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          BACK
          ====================================================== */}

      <button
        type="button"
        className="my-organ-requests-back"
        onClick={() =>
          navigate(
            "/organ-requirement"
          )
        }
      >
        <ArrowLeft size={15} />
        Back to Organ Requirement
      </button>

    </div>
  );
}

export default MyOrganRequests;