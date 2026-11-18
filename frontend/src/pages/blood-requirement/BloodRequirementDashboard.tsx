import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  Activity,
  ArrowRight,
  Droplets,
  HeartPulse,
  Plus,
  ShieldCheck,
} from "lucide-react";

import "./BloodRequirementDashboard.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const BLOOD_IMAGE =
  "https://cdnx.premiumread.com/?f=jpg&q=100&t=6&url=https%3A%2F%2Fwww.malaymail.com%2Fmalaymail%2Fuploads%2Fimages%2F2026%2F01%2F07%2F318701.jpg&w=1000";

interface BloodRequirement {
  id: string;
  blood_group: string;
  units_required: number;
  hospital_name: string;
  hospital_city: string;
  hospital_state: string;
  required_date: string;
  urgency: "normal" | "urgent" | "emergency";
  status: string;
  created_at: string;
}

function BloodRequirementDashboard() {
  const [requirements, setRequirements] = useState<BloodRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("there");

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/blood-requirements/?status=active`
      );

      if (!response.ok) {
        throw new Error("Unable to fetch blood requirements");
      }

      const data = await response.json();
      setRequirements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Blood requirement dashboard error:", err);
      setError("Unable to load blood requirements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchRequirements();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  useEffect(() => {
    try {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) {
          setUsername("there");
          return;
        }

        const displayName = user.displayName?.trim();
        const emailName = user.email?.split("@")[0]?.trim();
        setUsername(displayName || emailName || "there");
      });

      return unsubscribe;
    } catch (err) {
      console.warn("Unable to read signed-in profile:", err);
      return undefined;
    }
  }, []);

  const emergencyCount = requirements.filter(
    (item) => item.urgency === "emergency"
  ).length;

  const urgentCount = requirements.filter(
    (item) => item.urgency === "urgent"
  ).length;

  const normalCount = requirements.filter(
    (item) => item.urgency === "normal"
  ).length;

  const recentRequirements = requirements.slice(0, 5);

  return (
    <div className="blood-requirement-dashboard">
      <section className="blood-requirement-welcome-card">
        <div className="blood-requirement-welcome-copy">
          <span className="blood-requirement-welcome-kicker">
            <Droplets size={15} />
            BLOOD REQUIREMENT SERVICE
          </span>
          <h2>
            Welcome <span>{username}!</span>
          </h2>
          <p>
            Every drop can make a difference. Find blood requirements,
            connect with nearby blood banks, and help patients get the
            support they need.
          </p>
        </div>
        <div className="blood-requirement-welcome-image">
          <img
            src={BLOOD_IMAGE}
            alt="Blood donation bag in a medical setting"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
      </section>

      <section className="blood-requirement-page-header">
        <div className="blood-requirement-page-header-content">
          <span className="blood-requirement-eyebrow">
            BLOOD REQUIREMENT
          </span>
          <h1>Find Blood When It Matters</h1>
          <p>
            Search active blood requirements, find nearby blood banks,
            and connect with available donors.
          </p>
        </div>

        <Link
          to="/blood-requirement/search"
          className="blood-requirement-primary-button"
        >
          <Droplets size={18} />
          Search Blood
        </Link>
      </section>

      <section className="blood-requirement-stats-grid">
        <div className="blood-requirement-stat-card">
          <div className="blood-requirement-stat-icon blue">
            <Droplets size={21} />
          </div>
          <div className="blood-requirement-stat-content">
            <span>Active Requirements</span>
            <strong>{requirements.length}</strong>
          </div>
        </div>

        <div className="blood-requirement-stat-card">
          <div className="blood-requirement-stat-icon red">
            <Activity size={21} />
          </div>
          <div className="blood-requirement-stat-content">
            <span>Emergency</span>
            <strong>{emergencyCount}</strong>
          </div>
        </div>

        <div className="blood-requirement-stat-card">
          <div className="blood-requirement-stat-icon orange">
            <Activity size={21} />
          </div>
          <div className="blood-requirement-stat-content">
            <span>Urgent</span>
            <strong>{urgentCount}</strong>
          </div>
        </div>

        <div className="blood-requirement-stat-card">
          <div className="blood-requirement-stat-icon green">
            <ShieldCheck size={21} />
          </div>
          <div className="blood-requirement-stat-content">
            <span>Normal</span>
            <strong>{normalCount}</strong>
          </div>
        </div>
      </section>

      <section className="blood-requirement-list-section">
        <div className="blood-requirement-section-header">
          <div>
            <h2>Active Blood Requirements</h2>
            <p>Current requirements available in the system.</p>
          </div>
          <Link
            to="/blood-requirement/search"
            className="blood-requirement-view-all"
          >
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading && (
          <div className="blood-requirement-empty-state">
            <div className="blood-requirement-empty-icon">
              <Droplets size={30} />
            </div>
            <h3>Loading blood requirements...</h3>
            <p>Please wait while we load the latest requirements.</p>
          </div>
        )}

        {!loading && error && (
          <div className="blood-requirement-empty-state">
            <div className="blood-requirement-empty-icon">
              <Activity size={30} />
            </div>
            <h3>Unable to load requirements</h3>
            <p>{error}</p>
            <button
              type="button"
              className="blood-requirement-secondary-button"
              onClick={fetchRequirements}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && recentRequirements.length === 0 && (
          <div className="blood-requirement-empty-state">
            <div className="blood-requirement-empty-icon">
              <Droplets size={30} />
            </div>
            <h3>No active blood requirements</h3>
            <p>
              There are currently no active blood requirements available
              in the system.
            </p>
            <Link
              to="/blood-requirement/my-requests"
              className="blood-requirement-create-button"
            >
              <Plus size={17} />
              Create Requirement
            </Link>
          </div>
        )}

        {!loading && !error && recentRequirements.length > 0 && (
          <div className="blood-requirement-list">
            {recentRequirements.map((requirement) => (
              <div
                key={requirement.id}
                className="blood-requirement-item"
              >
                <div className="blood-requirement-item-left">
                  <div className="blood-group-badge">
                    {requirement.blood_group}
                  </div>
                  <div>
                    <h3>{requirement.hospital_name}</h3>
                    <p>
                      {requirement.hospital_city},{" "}
                      {requirement.hospital_state}
                    </p>
                  </div>
                </div>

                <div className="blood-requirement-item-middle">
                  <span>
                    {requirement.units_required}{" "}
                    {requirement.units_required === 1 ? "unit" : "units"}
                  </span>
                  <small>
                    Required by{" "}
                    {new Date(
                      requirement.required_date
                    ).toLocaleDateString()}
                  </small>
                </div>

                <div className="blood-requirement-item-right">
                  <span
                    className={`urgency-badge ${requirement.urgency}`}
                  >
                    {requirement.urgency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="blood-requirement-info-card">
        <div className="blood-requirement-info-icon">
          <HeartPulse size={22} />
        </div>
        <div className="blood-requirement-info-content">
          <h3>Help connect blood donors with patients</h3>
          <p>
            Blood requirements are displayed using information submitted
            through MedVisionRx. Personal requester information is kept
            private.
          </p>
        </div>
        <Link
          to="/blood-requirement/search"
          className="blood-requirement-info-link"
        >
          Find Blood
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}

export default BloodRequirementDashboard;
