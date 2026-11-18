import { isRecord, extractApiRows } from "../../utils/apiPayload";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Hospital,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  X,
} from "lucide-react";

import "./OrganRequests.css";
import { auth } from "../../firebase";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const ORGAN_OPTIONS = [
  "Kidneys", "Liver", "Heart", "Lungs", "Pancreas",
  "Intestine", "Corneas", "Skin", "Bone", "Heart Valves",
];

interface DonorResponse {
  donor_id?: string;
  organ_donation_id?: string;
  response_id?: string;
  response_status?: string;
  status?: string;
}

interface Requirement {
  id: string;
  organ_required: string;
  donation_type?: string;
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
  reason?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  status: string;
  donor_responses?: DonorResponse[];
  response_id?: string | null;
  response_status?: string;
  donor_status?: string;
}

interface DonorProfile {
  id?: string;
  _id?: string;
  status?: string;
  organs?: string[];
  pledged_organs?: string[];
  donation_type?: string;
}

type ApiResponse = {
  detail?: string;
  message?: string;
  data?: unknown;
  requirements?: unknown;
  records?: unknown;
};

async function getAuthHeaders(includeJson = false) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in to continue.");
  }

  const token = await user.getIdToken();

  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`,
  };
}

const getString = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const getId = (value: unknown): string => {
  if (isRecord(value)) return getString(value.id || value._id || value.$oid || "");
  return getString(value);
};

const normalize = (value: unknown): string =>
  getString(value).trim().toLowerCase();

const dateText = (value?: string): string => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const urgencyLabel = (value?: string): string => {
  switch (normalize(value)) {
    case "emergency": return "Emergency";
    case "urgent": return "Urgent";
    default: return "Normal";
  }
};

const urgencyClass = (value?: string): string => {
  const urgency = normalize(value);
  return ["emergency", "urgent"].includes(urgency)
    ? urgency
    : "normal";
};

const donationTypeLabel = (value?: string): string => {
  switch (normalize(value)) {
    case "living": return "Living Donation";
    case "deceased":
    case "donation after death": return "Donation After Death";
    default: return "Donation Type Not Specified";
  }
};

const remaining = (item: Requirement): number => {
  if (typeof item.remaining_units === "number") {
    return Math.max(item.remaining_units, 0);
  }

  return Math.max(
    (item.original_units_required ?? item.units_required ?? 0) -
      (item.units_fulfilled ?? 0),
    0
  );
};

type RequirementRow = Partial<Requirement> & { _id?: string; requirement_id?: string; organ?: string; organ_name?: string; hospital?: string; city?: string; state?: string; needed_by?: string; requirement?: RequirementRow };
const extractRows = (data: unknown): RequirementRow[] => extractApiRows<RequirementRow>(data, ["data", "requirements", "records", "items"]);

const getErrorMessage = (
  data: ApiResponse | null,
  fallback: string
): string => {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  return fallback;
};

function OrganRequests() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [organ, setOrgan] = useState("");
  const [type, setType] = useState("");
  const [urgency, setUrgency] = useState("");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Requirement | null>(null);
  const [details, setDetails] = useState<Requirement | null>(null);

  // Load the signed-in user's donor profile.
  const loadDonorProfile = useCallback(async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        setDonorProfile(null);
        return;
      }

      const headers = await getAuthHeaders();

      const response = await fetch(
        `${API_BASE_URL}/api/organ-donations/by-user/${encodeURIComponent(user.uid)}`,
        { headers }
      );

      if (response.status === 404) {
        setDonorProfile(null);
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to load donor profile."));
      }

      const donor = data?.data || data?.donor || data;

      if (!donor || typeof donor !== "object") {
        setDonorProfile(null);
        return;
      }

      const donorId = getId(donor);

      if (donorId) {
        localStorage.setItem("medvisionrx_organ_donor_id", donorId);
      }

      setDonorProfile(donor);
    } catch (err) {
      console.error("Organ donor profile error:", err);
      setDonorProfile(null);
    }
  }, []);

  // Load public active requirements.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await loadDonorProfile();

      const response = await fetch(
        `${API_BASE_URL}/api/organ-requirements/?status=active`
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to load organ requirements.")
        );
      }

      const rows = extractRows(data);

      const mapped: Requirement[] = rows
        .map((row: RequirementRow): Requirement | null => {
          const requirement = row?.requirement || row;

          const id =
            row?.requirement_id ||
            requirement?.id ||
            requirement?._id;

          if (!id) return null;

          const responses: DonorResponse[] =
            Array.isArray(requirement?.donor_responses)
              ? requirement.donor_responses
              : [];

          const donorId =
            localStorage.getItem("medvisionrx_organ_donor_id") || "";

          const existingResponse = responses.find((item) =>
            [item.donor_id, item.organ_donation_id]
              .some((value) => getString(value) === donorId)
          );

          const status =
            existingResponse?.response_status ||
            existingResponse?.status ||
            "not_responded";

          return {
            ...requirement,
            id: String(id),
            organ_required:
              requirement.organ_required ||
              requirement.organ ||
              requirement.organ_name ||
              "",
            donation_type: requirement.donation_type || "",
            units_required: Number(requirement.units_required ?? 1),
            hospital_name:
              requirement.hospital_name ||
              requirement.hospital ||
              "Hospital not specified",
            hospital_city:
              requirement.hospital_city || requirement.city || "",
            hospital_state:
              requirement.hospital_state || requirement.state || "",
            required_date:
              requirement.required_date || requirement.needed_by || "",
            urgency: requirement.urgency || "normal",
            status: requirement.status || "active",
            donor_responses: responses,
            response_id:
              row?.response_id || existingResponse?.response_id || null,
            response_status: row?.response_status || status,
            donor_status: row?.response_status || status,
          };
        })
        .filter((item): item is Requirement => item !== null);

      setRequirements(mapped);
    } catch (err) {
      console.error("Organ requests loading error:", err);
      setRequirements([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load organ requests."
      );
    } finally {
      setLoading(false);
    }
  }, [loadDonorProfile]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requirements.filter((item) => {
      const organMatches =
        !organ || normalize(item.organ_required) === normalize(organ);

      const typeMatches =
        !type || normalize(item.donation_type) === normalize(type);

      const urgencyMatches =
        !urgency || normalize(item.urgency) === normalize(urgency);

      const searchMatches =
        !query ||
        [
          item.organ_required,
          item.hospital_name,
          item.hospital_city,
          item.hospital_state,
          item.blood_group,
          item.reason,
          item.contact_name,
        ]
          .map(getString)
          .join(" ")
          .toLowerCase()
          .includes(query);

      return organMatches && typeMatches && urgencyMatches && searchMatches;
    });
  }, [requirements, organ, type, urgency, search]);

  const responseStatus = (item: Requirement): string =>
    normalize(
      item.response_status || item.donor_status || "not_responded"
    );

  const donorCanRespond = (
    item: Requirement
  ): { ok: boolean; reason: string } => {
    if (!donorProfile) {
      return {
        ok: false,
        reason: "Your organ donor registration was not found. Please register first.",
      };
    }

    if (normalize(donorProfile.status || "active") !== "active") {
      return {
        ok: false,
        reason: "Your organ donor registration is not active.",
      };
    }

    const pledgedOrgans = [
      ...(Array.isArray(donorProfile.organs) ? donorProfile.organs : []),
      ...(Array.isArray(donorProfile.pledged_organs)
        ? donorProfile.pledged_organs
        : []),
    ].map(normalize);

    const requestedOrgan = normalize(item.organ_required);

    // Allow singular/plural forms to match.
    const organMatches = pledgedOrgans.some(
      (value) =>
        value === requestedOrgan ||
        value.replace(/s$/, "") === requestedOrgan.replace(/s$/, "")
    );

    if (!organMatches) {
      return {
        ok: false,
        reason: `Your donor registration does not include ${item.organ_required}.`,
      };
    }

    const donorType = normalize(donorProfile.donation_type);
    const requirementType = normalize(item.donation_type);

    if (
      donorType &&
      requirementType &&
      donorType !== requirementType
    ) {
      return {
        ok: false,
        reason: "Your donation type does not match this requirement.",
      };
    }

    return { ok: true, reason: "" };
  };

  // Donor submits a response.
  const respond = async () => {
    if (!selected || sending) return;

    const eligibility = donorCanRespond(selected);

    if (!eligibility.ok) {
      setMessage(eligibility.reason);
      setSelected(null);
      return;
    }

    setSending(true);
    setMessage("");
    setError("");

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in to respond.");
      }

      const headers = await getAuthHeaders(true);

      // Use the donor profile already loaded for this signed-in account.
      let donorId =
        getId(donorProfile) ||
        localStorage.getItem("medvisionrx_organ_donor_id") ||
        "";

      // Refresh the profile using the authenticated user's Firebase UID.
      const lookup = await fetch(
        `${API_BASE_URL}/api/organ-donations/by-user/${encodeURIComponent(user.uid)}`,
        { headers: await getAuthHeaders() }
      );

      const lookupData = await lookup.json().catch(() => null);

      if (lookup.ok) {
        const donor = lookupData?.data || lookupData?.donor || lookupData;
        donorId = getId(donor) || donorId;

        if (donor) setDonorProfile(donor);

        if (donorId) {
          localStorage.setItem("medvisionrx_organ_donor_id", donorId);
        }
      }

      if (!donorId) {
        throw new Error(
          "Your organ donor registration was not found. Please register first."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/organ-requirements/${encodeURIComponent(
          selected.id
        )}/responses`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            requirement_id: selected.id,
            organ_donation_id: donorId,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const detail = getErrorMessage(
          data,
          "Unable to submit your response."
        );

        if (response.status === 409) {
          setMessage(detail);
          setSelected(null);
          await load();
          return;
        }

        throw new Error(detail);
      }

      setMessage(
        "Your response has been submitted successfully. The requester can now review it."
      );
      setSelected(null);
      await load();
    } catch (err) {
      console.error("Organ response error:", err);
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to submit your response."
      );
    } finally {
      setSending(false);
    }
  };

  const clear = () => {
    setOrgan("");
    setType("");
    setUrgency("");
    setSearch("");
  };

  const callRequester = (phone?: string | null) => {
    if (phone) window.location.assign(`tel:${phone}`);
  };

  const renderResponseButton = (
    item: Requirement,
    inModal = false
  ) => {
    const status = responseStatus(item);
    const eligibility = donorCanRespond(item);

    if (status === "accepted") {
      return (
        <button className="responded-btn" disabled>
          <CheckCircle2 size={14} /> Accepted
        </button>
      );
    }

    if (status === "pending") {
      return (
        <button className="responded-btn" disabled>
          <Clock3 size={14} /> Pending
        </button>
      );
    }

    if (status === "donated") {
      return (
        <button className="responded-btn" disabled>
          <CheckCircle2 size={14} /> Donated
        </button>
      );
    }

    if (!eligibility.ok) {
      return (
        <button
          className="responded-btn"
          disabled
          title={eligibility.reason}
        >
          <AlertCircle size={14} /> Not Eligible
        </button>
      );
    }

    return (
      <button
        className="respond-btn"
        disabled={remaining(item) <= 0}
        onClick={() => {
          if (inModal) setDetails(null);
          setSelected(item);
        }}
      >
        <HeartHandshake size={14} />
        {status === "rejected"
          ? "Respond Again"
          : inModal
            ? "Respond to Request"
            : "Respond"}
      </button>
    );
  };

  return (
    <div className="organ-requests-page">
      <section className="organ-requests-header">
        <div className="organ-title">
          <div className="organ-title-icon">
            <HeartHandshake size={23} />
          </div>
          <div>
            <span>ORGAN DONATION</span>
            <h1>Organ Requests</h1>
            <p>
              Find active organ requirements and respond to patients in need.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="organ-refresh"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </section>

      {error && (
        <div className="organ-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>
            Try Again
          </button>
        </div>
      )}

      {message && (
        <div className="organ-alert success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Close message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="organ-filters">
        <label>
          Organ / Tissue
          <select value={organ} onChange={(e) => setOrgan(e.target.value)}>
            <option value="">All Organs / Tissues</option>
            {ORGAN_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Donation Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Donation Types</option>
            <option value="living">Living Donation</option>
            <option value="deceased">Donation After Death</option>
          </select>
        </label>

        <label>
          Urgency
          <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="">All Urgency</option>
            <option value="emergency">Emergency</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
        </label>

        <label className="search-label">
          Search Hospital / Location
          <div className="search-box">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organ, hospital or city..."
            />
          </div>
        </label>

        <button type="button" className="clear-btn" onClick={clear}>
          Clear
        </button>
      </section>

      <div className="organ-toolbar">
        <span><strong>{filtered.length}</strong> active organ requests</span>
        <span className="live"><i /> Live database results</span>
      </div>

      {loading ? (
        <div className="organ-state">
          <div className="loader" />
          <h3>Loading organ requests...</h3>
          <p>Fetching active requirements from MedVisionRx.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="organ-state">
          <div className="empty-icon"><HeartHandshake size={31} /></div>
          <h3>No active organ requests</h3>
          <p>There are currently no organ requirements matching your filters.</p>
          <button type="button" className="primary-btn" onClick={clear}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="organ-grid">
          {filtered.map((item) => (
            <article
              className={`organ-card ${urgencyClass(item.urgency)}`}
              key={item.id}
            >
              <div className="card-top">
                <div className="organ-name">
                  <div className="organ-icon"><HeartHandshake size={18} /></div>
                  <div>
                    <strong>{item.organ_required}</strong>
                    <span>{donationTypeLabel(item.donation_type)}</span>
                  </div>
                </div>
                <b className={`urgency ${urgencyClass(item.urgency)}`}>
                  {urgencyLabel(item.urgency)}
                </b>
              </div>

              <div className="hospital">
                <Hospital size={18} />
                <div>
                  <h3>{item.hospital_name}</h3>
                  <p>
                    <MapPin size={14} />
                    {item.hospital_city || "City not specified"}
                    {item.hospital_state ? `, ${item.hospital_state}` : ""}
                  </p>
                </div>
              </div>

              <div className="details">
                <div><span>Units Required</span><strong>{item.units_required}</strong></div>
                <div><span>Remaining</span><strong>{remaining(item)}</strong></div>
                <div><span>Required Date</span><strong>{dateText(item.required_date)}</strong></div>
              </div>

              <div className="meta">
                <span><CalendarDays size={14} /> {dateText(item.required_date)}</span>
                <span><Clock3 size={14} /> {urgencyLabel(item.urgency)}</span>
                {item.blood_group && (
                  <span><UserCheck size={14} /> {item.blood_group}</span>
                )}
              </div>

              {item.reason && (
                <div className="reason">
                  <span>Requirement</span>
                  <p>{item.reason}</p>
                </div>
              )}

              <div className="card-footer">
                <span className="status">
                  <CheckCircle2 size={14} />
                  {responseStatus(item) === "accepted"
                    ? "Accepted"
                    : responseStatus(item) === "pending"
                      ? "Pending"
                      : responseStatus(item) === "donated"
                        ? "Donated"
                        : "Active"}
                </span>

                <div className="actions">
                  {item.contact_phone && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => callRequester(item.contact_phone)}
                    >
                      <Phone size={14} /> Call
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setDetails(item)}
                  >
                    View Details
                  </button>
                  {renderResponseButton(item)}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {details && (
        <div className="backdrop" onMouseDown={() => setDetails(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <header>
              <div>
                <small>ORGAN REQUIREMENT</small>
                <h2>Request Details</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetails(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </header>

            <main>
              <div className="highlight">
                <HeartHandshake size={22} />
                <div>
                  <strong>{details.organ_required}</strong>
                  <span>{donationTypeLabel(details.donation_type)}</span>
                </div>
              </div>

              <div className="detail-grid">
                <div><span>Hospital</span><strong>{details.hospital_name}</strong></div>
                <div><span>Location</span><strong>{details.hospital_city}, {details.hospital_state}</strong></div>
                <div><span>Units Required</span><strong>{details.units_required}</strong></div>
                <div><span>Remaining</span><strong>{remaining(details)}</strong></div>
                <div><span>Required Date</span><strong>{dateText(details.required_date)}</strong></div>
                <div><span>Urgency</span><strong>{urgencyLabel(details.urgency)}</strong></div>
                {details.blood_group && (
                  <div><span>Blood Group</span><strong>{details.blood_group}</strong></div>
                )}
                {details.contact_name && (
                  <div><span>Contact Person</span><strong>{details.contact_name}</strong></div>
                )}
              </div>

              {details.reason && (
                <div className="reason">
                  <span>Reason / Requirement</span>
                  <p>{details.reason}</p>
                </div>
              )}
            </main>

            <footer>
              {details.contact_phone && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => callRequester(details.contact_phone)}
                >
                  <Phone size={14} /> Call Requester
                </button>
              )}
              {renderResponseButton(details, true)}
            </footer>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="backdrop"
          onMouseDown={() => {
            if (!sending) setSelected(null);
          }}
        >
          <div
            className="modal confirm"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon"><HeartHandshake size={27} /></div>
            <h2>Respond to this request?</h2>
            <p>
              You are responding to the <strong>{selected.organ_required}</strong>
              {" "}requirement at <strong>{selected.hospital_name}</strong>.
            </p>

            <div className="confirm-grid">
              <div>
                <span>Location</span>
                <strong>{selected.hospital_city}, {selected.hospital_state}</strong>
              </div>
              <div>
                <span>Required Date</span>
                <strong>{dateText(selected.required_date)}</strong>
              </div>
              <div>
                <span>Urgency</span>
                <strong>{urgencyLabel(selected.urgency)}</strong>
              </div>
            </div>

            <div className="notice">
              <AlertCircle size={16} />
              <span>
                Your response is sent to the requester for review. It does not
                mean that an organ donation has already taken place.
              </span>
            </div>

            <div className="confirm-actions">
              <button
                type="button"
                className="secondary-btn"
                disabled={sending}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="respond-btn"
                disabled={sending}
                onClick={() => void respond()}
              >
                {sending ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <HeartHandshake size={15} />
                    Confirm Response
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

export default OrganRequests;
