import welcomePhoto from "../../assets/organ-requirement-welcome.jpg";
import ServiceWelcomeCard from "../../components/common/ServiceWelcomeCard";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Heart,
  HeartPulse,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";

import "./OrganRequirementDashboard.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/* ============================================================
   TYPES
   ============================================================ */

interface OrganRequirement {
  id?: string;
  _id?: string;

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
}

/* ============================================================
   ORGAN IMAGE URLS
   Internet images - no local image files required
   ============================================================ */

const ORGAN_IMAGES: Record<string, string> = {
  heart:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Human_heart.png",

  lungs:
    "https://commons.wikimedia.org/wiki/Special:FilePath/The_human_lungs.png",

  kidneys:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Kidneys.gif",

  liver:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Liver_(transparent).png",

  pancreas:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Pancreas.png",

  intestine:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Intestine.png",

  corneas:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Cornea.png",

  skin:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Human_skin.png",

  bone:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Human_bone.png",

  "heart valves":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Heart.png",
};

/* ============================================================
   ORGAN FALLBACK ICONS
   ============================================================ */

const ORGAN_ICONS: Record<string, string> = {
  heart: "❤️",
  lungs: "🫁",
  kidneys: "🫘",
  liver: "🫀",
  pancreas: "🩷",
  intestine: "🧬",
  corneas: "👁️",
  skin: "🖐️",
  bone: "🦴",
  "heart valves": "❤️",
};

/* ============================================================
   HELPERS
   ============================================================ */

function normalizeOrgan(value: string = "") {
  return value.trim().toLowerCase();
}

function getOrganImage(organ: string) {
  const normalized = normalizeOrgan(organ);

  const match = Object.keys(ORGAN_IMAGES).find(
    (key) =>
      normalized === key ||
      normalized.includes(key) ||
      key.includes(normalized)
  );

  return match ? ORGAN_IMAGES[match] : null;
}

function getOrganIcon(organ: string) {
  const normalized = normalizeOrgan(organ);

  const match = Object.keys(ORGAN_ICONS).find(
    (key) =>
      normalized === key ||
      normalized.includes(key) ||
      key.includes(normalized)
  );

  return match ? ORGAN_ICONS[match] : "🫀";
}

function formatOrganName(value: string) {
  if (!value) {
    return "Organ";
  }

  return value
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDonationType(value?: string | null) {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getLocation(requirement: OrganRequirement) {
  const city = requirement.hospital_city?.trim() || "";
  const state = requirement.hospital_state?.trim() || "";

  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || "Location not specified";
}

function getRequiredUnits(requirement: OrganRequirement) {
  return Number(
    requirement.original_units_required ??
      requirement.units_required ??
      0
  );
}

function getFulfilledUnits(requirement: OrganRequirement) {
  return Number(requirement.units_fulfilled ?? 0);
}

function getRemainingUnits(requirement: OrganRequirement) {
  if (
    typeof requirement.remaining_units === "number"
  ) {
    return requirement.remaining_units;
  }

  return Math.max(
    getRequiredUnits(requirement) -
      getFulfilledUnits(requirement),
    0
  );
}

function getUrgencyClass(urgency: string = "") {
  const value = urgency.toLowerCase();

  if (value === "emergency") {
    return "organ-urgency-emergency";
  }

  if (value === "urgent") {
    return "organ-urgency-urgent";
  }

  return "organ-urgency-normal";
}

function formatUrgency(urgency?: string) {
  if (!urgency) {
    return "Normal";
  }

  return urgency
    .charAt(0)
    .toUpperCase() +
    urgency.slice(1).toLowerCase();
}

/* ============================================================
   ORGAN IMAGE COMPONENT
   ============================================================ */

function OrganImage({
  organ,
}: {
  organ: string;
}) {
  const [imageError, setImageError] =
    useState(false);

  const image = getOrganImage(organ);

  if (!image || imageError) {
    return (
      <div className="organ-dashboard-organ-fallback">
        {getOrganIcon(organ)}
      </div>
    );
  }

  return (
    <div className="organ-dashboard-organ-image">
      <img
        src={image}
        alt={`${organ} illustration`}
        onError={() => setImageError(true)}
      />
    </div>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */

interface StatCardProps {
  label: string;
  value: number | null;
  type: "active" | "emergency" | "urgent" | "normal";
  icon: React.ReactNode;
}

function StatCard({
  label,
  value,
  type,
  icon,
}: StatCardProps) {
  return (
    <div
      className={`organ-dashboard-stat-card organ-dashboard-stat-${type}`}
    >
      <div className="organ-dashboard-stat-icon">
        {icon}
      </div>

      <div className="organ-dashboard-stat-content">
        <span>{label}</span>
        <strong>{value ?? "?"}</strong>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

function OrganRequirementDashboard() {
  const navigate = useNavigate();

  const [requesterName, setRequesterName] = useState("there");

  // Load the name belonging to the currently signed-in Firebase account.
  useEffect(() => {
    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isActive) return;

      // Clear the previous account's name while the new account loads.
      setRequesterName("there");

      if (!user) return;

      const firebaseName =
        user.displayName || user.email?.split("@")[0] || "there";

      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isActive || auth.currentUser?.uid !== user.uid) return;

        if (response.ok) {
          const result = await response.json();
          const profile = result?.user || result?.profile || result;

          const name =
            profile?.fullName ||
            profile?.full_name ||
            profile?.name ||
            profile?.displayName ||
            firebaseName;

          setRequesterName(name);
          return;
        }
      } catch (profileError) {
        console.error("Unable to load requester name:", profileError);
      }

      if (isActive && auth.currentUser?.uid === user.uid) {
        setRequesterName(firebaseName);
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const [showAllRequirements, setShowAllRequirements] = useState(false);

  const [requirements, setRequirements] =
    useState<OrganRequirement[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ==========================================================
     FETCH REAL DATA
     ========================================================== */

  const loadRequirements = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/organ-requirements/?status=active`,
        { signal, cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load organ requirements. Server returned ${response.status}.`
        );
      }

      const data = await response.json();

      let records: OrganRequirement[] = [];

      if (Array.isArray(data)) {
        records = data;
      } else if (
        Array.isArray(data?.requirements)
      ) {
        records = data.requirements;
      } else if (
        Array.isArray(data?.records)
      ) {
        records = data.records;
      } else if (
        Array.isArray(data?.data)
      ) {
        records = data.data;
      }

      else {
        throw new Error("The server returned an unexpected requirements response.");
      }

      setRequirements(records.filter((item) => String(item.status).trim().toLowerCase() === "active").map((item) => ({
        ...item,
        status: "active",
        urgency: String(item.urgency || "normal").trim().toLowerCase(),
      })));
    } catch (err) {
      if (signal?.aborted) return;
      console.error(
        "Organ Requirement Dashboard:",
        err
      );

      setRequirements([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load organ requirements."
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      void loadRequirements(controller.signal);
    };
    refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadRequirements]);

  /* ==========================================================
     STATISTICS
     ========================================================== */

  const statistics = useMemo(() => {
    const active = requirements.filter(
      (item) =>
        String(item.status).toLowerCase() ===
        "active"
    );

    const emergency = active.filter(
      (item) =>
        String(item.urgency).toLowerCase() ===
        "emergency"
    );

    const urgent = active.filter(
      (item) =>
        String(item.urgency).toLowerCase() ===
        "urgent"
    );

    const normal = active.filter(
      (item) =>
        !["emergency", "urgent"].includes(
          String(item.urgency).toLowerCase()
        )
    );

    return {
      active: active.length,
      emergency: emergency.length,
      urgent: urgent.length,
      normal: normal.length,
    };
  }, [requirements]);

  /* ==========================================================
     SORT REQUIREMENTS
     ========================================================== */

  const displayedRequirements =
    useMemo(() => {
      const urgencyPriority: Record<
        string,
        number
      > = {
        emergency: 1,
        urgent: 2,
        normal: 3,
      };

      return [...requirements]
        .sort((a, b) => {
          const urgencyA =
            urgencyPriority[
              String(a.urgency).toLowerCase()
            ] ?? 3;

          const urgencyB =
            urgencyPriority[
              String(b.urgency).toLowerCase()
            ] ?? 3;

          if (urgencyA !== urgencyB) {
            return urgencyA - urgencyB;
          }

          const dateA = new Date(
            a.required_date
          ).getTime();

          const dateB = new Date(
            b.required_date
          ).getTime();

          return dateA - dateB;
        })
        .slice(0, showAllRequirements ? undefined : 6);
    }, [requirements, showAllRequirements]);

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="organ-dashboard-page">

      {/* ======================================================
          WELCOME CARD
          ====================================================== */}

      <ServiceWelcomeCard
        service="ORGAN REQUIREMENT SERVICE"
        name={requesterName}
        description="Find the support you need. Manage organ requests, connect with registered donors and nearby organ banks, and stay supported throughout your journey."
        image={welcomePhoto}
        imageAlt="Hospital surgical team providing specialist patient care"
        tone="requirement"
        icon={<HeartPulse size={15} />}
      />

      {/* ======================================================
          HERO
          ====================================================== */}

      <section className="organ-dashboard-hero">

        <div className="organ-dashboard-hero-content">

          <span className="organ-dashboard-eyebrow">
            ORGAN REQUIREMENT
          </span>

          <h2>
            Find Organ Support When It Matters
          </h2>

          <p>
            Search active organ requirements,
            find nearby organ banks, and connect
            with registered organ donors.
          </p>

        </div>

        <button
          type="button"
          className="organ-dashboard-search-button"
          onClick={() =>
            navigate(
              "/organ-requirement/search"
            )
          }
        >
          <Search size={18} />
          Search Organ
        </button>

      </section>

      {/* ======================================================
          STATISTICS
          ====================================================== */}

      <section className="organ-dashboard-stat-grid">

        <StatCard
          label="Active Requirements"
          value={loading || error ? null : statistics.active}
          type="active"
          icon={<HeartPulse size={21} />}
        />

        <StatCard
          label="Emergency"
          value={loading || error ? null : statistics.emergency}
          type="emergency"
          icon={<Siren size={21} />}
        />

        <StatCard
          label="Urgent"
          value={loading || error ? null : statistics.urgent}
          type="urgent"
          icon={<AlertCircle size={21} />}
        />

        <StatCard
          label="Normal"
          value={loading || error ? null : statistics.normal}
          type="normal"
          icon={<ShieldCheck size={21} />}
        />

      </section>

      {/* ======================================================
          ACTIVE REQUIREMENTS HEADER
          ====================================================== */}

      <section className="organ-dashboard-section-header">

        <div>
          <h2>
            Active Organ Requirements
          </h2>

          <p>
            Current requirements available in
            the system.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAllRequirements((value) => !value)}
          aria-expanded={showAllRequirements}
          className="organ-dashboard-view-all"
        >
          {showAllRequirements ? "Show Less" : "View All"}
          <ArrowRight size={16} />
        </button>

      </section>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="organ-dashboard-error">

          <AlertCircle size={19} />

          <div>
            <strong>
              Unable to load organ requirements
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => void loadRequirements()}
          >
            Try Again
          </button>

        </div>
      )}

      {/* ======================================================
          LOADING
          ====================================================== */}

      {loading && (
        <div className="organ-dashboard-loading">

          <RefreshCw
            size={25}
            className="organ-dashboard-spinner"
          />

          <span>
            Loading real organ requirements...
          </span>

        </div>
      )}

      {/* ======================================================
          NO DATA
          ====================================================== */}

      {!loading &&
        !error &&
        requirements.length === 0 && (
          <div className="organ-dashboard-empty">

            <div className="organ-dashboard-empty-icon">
              <HeartPulse size={35} />
            </div>

            <h3>
              No active organ requirements
            </h3>

            <p>
              There are currently no active organ
              requirements available in MedVisionRx.
            </p>

            <button
              type="button"
              className="organ-dashboard-create-button"
              onClick={() =>
                navigate(
                  "/organ-requirement/my-requests"
                )
              }
            >
              <Plus size={18} />
              Create Organ Requirement
            </button>

          </div>
        )}

      {/* ======================================================
          REQUIREMENT LIST
          ====================================================== */}

      {!loading &&
        displayedRequirements.length > 0 && (
          <section className="organ-dashboard-requirement-list">

            {displayedRequirements.map(
              (requirement) => {
                const requirementId =
                  requirement.id ||
                  requirement._id;

                const requiredUnits =
                  getRequiredUnits(
                    requirement
                  );

                const fulfilledUnits =
                  getFulfilledUnits(
                    requirement
                  );

                const remainingUnits =
                  getRemainingUnits(
                    requirement
                  );

                return (
                  <article
                    key={requirementId}
                    className="organ-dashboard-requirement-card"
                  >

                    {/* ORGAN */}

                    <div className="organ-dashboard-card-organ">

                      <OrganImage
                        organ={
                          requirement.organ_required
                        }
                      />

                    </div>

                    {/* MAIN */}

                    <div className="organ-dashboard-card-main">

                      <div className="organ-dashboard-card-top">

                        <div className="organ-dashboard-organ-name">

                          <strong>
                            {formatOrganName(
                              requirement.organ_required
                            )}
                          </strong>

                          <span
                            className={`organ-dashboard-urgency ${getUrgencyClass(
                              requirement.urgency
                            )}`}
                          >
                            {formatUrgency(
                              requirement.urgency
                            )}
                          </span>

                        </div>

                        <div className="organ-dashboard-card-units">

                          <strong>
                            {requiredUnits}{" "}
                            {requiredUnits === 1
                              ? "unit"
                              : "units"}
                          </strong>

                          <span>
                            Required by{" "}
                            {formatDate(
                              requirement.required_date
                            )}
                          </span>

                        </div>

                      </div>

                      <div className="organ-dashboard-hospital">

                        <Building2 size={16} />

                        <strong>
                          {
                            requirement.hospital_name ||
                            "Hospital not specified"
                          }
                        </strong>

                      </div>

                      <div className="organ-dashboard-location">

                        <MapPin size={15} />

                        <span>
                          {getLocation(
                            requirement
                          )}
                        </span>

                      </div>

                      <div className="organ-dashboard-card-meta">

                        {requirement.donation_type && (
                          <span>
                            Donation:{" "}
                            <strong>
                              {formatDonationType(
                                requirement.donation_type
                              )}
                            </strong>
                          </span>
                        )}

                        {requirement.blood_group && (
                          <span>
                            Blood Group:{" "}
                            <strong>
                              {
                                requirement.blood_group
                              }
                            </strong>
                          </span>
                        )}

                        <span>
                          Fulfilled:{" "}
                          <strong>
                            {fulfilledUnits}
                          </strong>
                        </span>

                        <span>
                          Remaining:{" "}
                          <strong>
                            {remainingUnits}
                          </strong>
                        </span>

                      </div>

                    </div>

                    {/* STATUS */}

                    <div className="organ-dashboard-card-status">

                      <span
                        className={`organ-dashboard-urgency ${getUrgencyClass(
                          requirement.urgency
                        )}`}
                      >
                        {formatUrgency(
                          requirement.urgency
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/organ-requirement/search?requirement=${encodeURIComponent(
                              requirementId || ""
                            )}`
                          )
                        }
                        className="organ-dashboard-details-button"
                      >
                        View Details
                        <ArrowRight size={15} />
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </section>
        )}

      {/* ======================================================
          CONNECT BANNER
          ====================================================== */}

      <section className="organ-dashboard-connect-banner">

        <div className="organ-dashboard-connect-icon">
          <Heart size={21} />
        </div>

        <div className="organ-dashboard-connect-content">

          <strong>
            Help connect organ donors with patients
          </strong>

          <p>
            Organ requirements are displayed using
            information submitted through MedVisionRx.
            Personal requester information is kept private.
          </p>

        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/organ-requirement/search"
            )
          }
        >
          Find Organ
          <ArrowRight size={16} />
        </button>

      </section>

    </div>
  );
}

export default OrganRequirementDashboard;