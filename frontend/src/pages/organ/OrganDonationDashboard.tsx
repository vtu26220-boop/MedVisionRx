type RawDonation = Partial<OrganDonation> & Partial<Record<"createdAt" | "registered_at" | "registeredAt" | "registration_date" | "registrationDate" | "date" | "pledge_status" | "donationType" | "pledge_type" | "fullName" | "donor_name" | "donorName", string>> & {
 _id?: string; address?: { city?: string; state?: string }; eligibilityStatus?: OrganDonation["eligibility_status"];
 organs_tissues?: string[]; organsTissues?: string[]; selected_organs?: string[]; selectedOrgans?: string[]; organs_selected?: string[]; organ?: string;
};
import { isRecord } from "../../utils/apiPayload";
import welcomePhoto from "../../assets/organ-donation-welcome.jpg";
import ServiceWelcomeCard from "../../components/common/ServiceWelcomeCard";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileHeart,
  Heart,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { Link } from "react-router-dom";

import "./OrganDonationDashboard.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

interface OrganDonation {
  id: string;
  full_name: string;
  city: string;
  state: string;
  donation_type: "deceased" | "living";
  organs: string[];
  eligibility_status: "eligible" | "not_eligible" | "medical_review";
  status: "active" | "inactive" | "cancelled";
  created_at: string;
}

function formatDate(dateString?: string) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}



function getDonationTypeLabel(type: OrganDonation["donation_type"]) {
  return type === "living"
    ? "Living Donation"
    : "Donation After Death";
}

function getOrganSummary(organs: string[]) {
  if (!organs?.length) {
    return "Not specified";
  }

  if (organs.length <= 2) {
    return organs.join(", ");
  }

  return `${organs.slice(0, 2).join(", ")} +${organs.length - 2} more`;
}

function OrganDonationDashboard() {
  const [donations, setDonations] = useState<OrganDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserName, setCurrentUserName] = useState("User");

  // Load the signed-in user's name from the same authenticated profile
  // endpoint used by the Blood Donation service.
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isMounted) {
          setCurrentUserName("User");
          setDonations([]);
          setLoading(false);
        }
        return;
      }

      const firebaseFallback =
        user.displayName?.trim() ||
        user.email?.split("@")[0] ||
        "User";

      if (isMounted) {
        setCurrentUserName(firebaseFallback);
        setLoading(true);
        setError("");
      }

      try {
        const token = await user.getIdToken();
        const profileResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (profileResponse.ok) {
          const profileResult = await profileResponse.json();
          const fullName =
            profileResult?.user?.fullName ||
            profileResult?.user?.full_name ||
            profileResult?.fullName ||
            profileResult?.full_name ||
            firebaseFallback;

          if (isMounted && typeof fullName === "string" && fullName.trim()) {
            setCurrentUserName(fullName.trim());
          }
        }

        // Prefer the MedVisionRx database user ID saved by the app.
        // Firebase UID is used as a fallback for deployments where it is
        // also the ID accepted by the by-user endpoint.
        // Firebase UID is the owner ID stored in the organ_donations collection.
// Do not prefer the old localStorage UUID.
const userId = user.uid;

// Keep the stored IDs synchronized with the signed-in Firebase account.
localStorage.setItem("medvisionrx_dev_user_id", userId);
localStorage.setItem("medvisionrx_user_id", userId);

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

        if (!response.ok) {
          if (response.status === 404) {
            if (isMounted) setDonations([]);
            return;
          }

          throw new Error(
            `Unable to load organ donation dashboard data. Server returned ${response.status}.`
          );
        }

        const rawData: unknown = await response.json();
        const payload = isRecord(rawData) ? rawData : {};
        const nested = isRecord(payload.data) ? payload.data : {};
        let records: RawDonation[] = [];

        const candidates = [
          rawData,
          payload.data,
          payload.donations,
          payload.records,
          payload.pledges,
          payload.items,
          nested.donations,
          nested.records,
          nested.pledges,
        ];

        const arrayResult = candidates.find(Array.isArray);
        if (arrayResult) {
          records = arrayResult as RawDonation[];
        } else if (rawData && typeof rawData === "object" && (payload.id || payload._id)) {
          records = [payload as RawDonation];
        }

        const normalizedRecords: OrganDonation[] = records
          .filter((item) => item && (item.id || item._id))
          .map((item: RawDonation) => {
            const createdAt =
              item.created_at ||
              item.createdAt ||
              item.registered_at ||
              item.registeredAt ||
              item.registration_date ||
              item.registrationDate ||
              item.date ||
              "";

            const rawStatus = String(item.status || item.pledge_status || "active").toLowerCase();
            const rawType = String(
              item.donation_type || item.donationType || item.pledge_type || "deceased"
            ).toLowerCase();

            return {
              ...item,
              id: String(item.id ?? item._id),
              full_name:
                item.full_name ||
                item.fullName ||
                item.donor_name ||
                item.donorName ||
                firebaseFallback,
              city: item.city || item.address?.city || "",
              state: item.state || item.address?.state || "",
              donation_type: rawType.includes("living") ? "living" : "deceased",
              organs: Array.isArray(item.organs)
                ? item.organs
                : Array.isArray(item.organs_tissues)
                  ? item.organs_tissues
                  : Array.isArray(item.organsTissues)
                    ? item.organsTissues
                    : Array.isArray(item.selected_organs)
                      ? item.selected_organs
                      : Array.isArray(item.selectedOrgans)
                        ? item.selectedOrgans
                        : Array.isArray(item.organs_selected)
                          ? item.organs_selected
                          : item.organ
                            ? [String(item.organ)]
                            : [],
              eligibility_status: item.eligibility_status || item.eligibilityStatus || "medical_review",
              status: ["active", "inactive", "cancelled"].includes(rawStatus)
                ? rawStatus
                : rawStatus.includes("cancel")
                  ? "cancelled"
                  : rawStatus.includes("inactive")
                    ? "inactive"
                    : "active",
              created_at: createdAt,
            } as OrganDonation;
          })
          .sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
          });

        if (isMounted) {
          setDonations(normalizedRecords);
        }
      } catch (fetchError) {
        console.error("Organ donation dashboard API error:", fetchError);
        if (isMounted) {
          setError("Unable to load organ donation dashboard data. Please check your connection and try again.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const latestDonation = donations[0] ?? null;
  const totalPledges = donations.length;
  const activePledges = donations.filter(
    (donation) => String(donation.status).toLowerCase() === "active"
  ).length;

  // This counts the organ/tissue selections across all saved pledges.
  const totalDonations = donations.reduce(
    (total, donation) => total + (Array.isArray(donation.organs) ? donation.organs.length : 0),
    0
  );

  const registeredDate = donations.reduce<string | undefined>((earliest, donation) => {
    if (!donation.created_at) return earliest;
    if (!earliest) return donation.created_at;
    return new Date(donation.created_at).getTime() < new Date(earliest).getTime()
      ? donation.created_at
      : earliest;
  }, undefined);

  const recentPledges = donations.slice(0, 8);

  if (loading) {
    return (
      <div className="organ-dashboard-page">
        <div className="organ-dashboard-container">
          <div className="organ-dashboard-loading">
            <div className="organ-dashboard-loading-spinner" />
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organ-dashboard-page">
        <div className="organ-dashboard-container">
          <div className="organ-dashboard-error">
            <ShieldCheck size={30} />

            <h2>Dashboard data unavailable</h2>

            <p>{error}</p>

            <button
              type="button"
              className="organ-dashboard-outline-button"
              onClick={() => window.location.reload()}
            >
              Try Again
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="organ-dashboard-page">
      <div className="organ-dashboard-container">

        {/* PAGE HEADER */}
        <div className="organ-dashboard-page-header">
          


        </div>

        {/* WELCOME BANNER */}
      <ServiceWelcomeCard
        service="ORGAN DONATION SERVICE"
        name={currentUserName}
        description={latestDonation ? "Thank you for giving hope. Manage your organ donation pledge and stay connected with patients who need support." : "Give the gift of life. Register your organ donation pledge and take the first step towards helping patients in need."}
        image={welcomePhoto}
        imageAlt="A kidney transplant surgical team caring for a patient"
        tone="donation"
        icon={<HeartHandshake size={15} />}
      />

        {/* REAL DATABASE STATISTICS */}
        <section className="organ-dashboard-stats">

          <div className="organ-dashboard-stat">
            <div className="organ-dashboard-stat-icon blue">
              <FileHeart size={20} />
            </div>

            <div>
              <span>Total Pledges</span>

              <strong>{totalPledges}</strong>

              <small>
                Registered organ pledges
              </small>
            </div>
          </div>

          <div className="organ-dashboard-stat">
            <div className="organ-dashboard-stat-icon green">
              <ShieldCheck size={20} />
            </div>

            <div>
              <span>Active Pledges</span>

              <strong>{activePledges}</strong>

              <small>
                Currently active
              </small>
            </div>
          </div>

          <div className="organ-dashboard-stat">
            <div className="organ-dashboard-stat-icon purple">
              <Users size={20} />
            </div>

            <div>
              <span>Donations</span>

              <strong>{totalDonations}</strong>

              <small>
                Organs and tissues pledged
              </small>
            </div>
          </div>

          <div className="organ-dashboard-stat">
            <div className="organ-dashboard-stat-icon teal">
              <CalendarDays size={20} />
            </div>

            <div>
              <span>Registered Date</span>

              <strong>
                {registeredDate ? formatDate(registeredDate) : "—"}
              </strong>

              <small>
                First pledge registration
              </small>
            </div>
          </div>

        </section>

        {/* MAIN CONTENT */}
        <section className="organ-dashboard-content-grid">

          {/* RECENT PLEDGES */}
          <div className="organ-dashboard-card">
            <div className="organ-dashboard-card-header">
              <div>
                <h3>Recent Donation </h3>

                <p>
                  Latest organ donation registrations
                  from the database.
                </p>
              </div>

              <FileHeart size={20} />
            </div>

            {recentPledges.length === 0 ? (
              <div className="organ-dashboard-empty">
                <FileHeart size={28} />

                <strong>No donation pledges yet</strong>

                <p>
                  No organ donation registrations are
                  currently available.
                </p>

                <Link
                  to="/organ-donation/register"
                  className="organ-dashboard-small-button"
                >
                  Register as Donor
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="organ-dashboard-table-wrapper">
                <table className="organ-dashboard-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Donor</th>
                      <th>Organs / Tissues</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentPledges.map((donation) => (
                      <tr key={donation.id}>
                        <td>
                          {formatDate(
                            donation.created_at
                          )}
                        </td>

                        <td>
                          <strong>
                            {donation.full_name || currentUserName}
                          </strong>
                        </td>

                        <td>
                          {getOrganSummary(
                            donation.organs
                          )}
                        </td>

                        <td>
                          {getDonationTypeLabel(
                            donation.donation_type
                          )}
                        </td>

                        <td>
                          <span className="organ-dashboard-location">
                            <MapPin size={13} />
                            {[donation.city, donation.state].filter(Boolean).join(", ") || "—"}
                          </span>
                        </td>

                        <td>
                          <span className={`organ-dashboard-status ${String(donation.status || "active").toLowerCase()}`}>
                            {donation.status || "active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {recentPledges.length > 0 && (
              <div className="organ-dashboard-card-footer">
                <Link
                  to="/organ-donation/history"
                  className="organ-dashboard-footer-link"
                >
                  View My Donation Pledge
                  <ChevronRight size={15} />
                </Link>
              </div>
            )}
          </div>

        </section>

        {/* QUICK ACTIONS */}
        <section className="organ-dashboard-card organ-dashboard-quick-card">
          <div className="organ-dashboard-card-header">
            <div>
              <h3>Quick Actions</h3>

              <p>
                Manage organ donation information.
              </p>
            </div>

            <HeartHandshake size={20} />
          </div>

          <div className="organ-dashboard-actions-grid">

            <Link
              to="/organ-donation/register"
              className="organ-dashboard-action"
            >
              <div className="organ-dashboard-action-icon">
                <FileHeart size={18} />
              </div>

              <div>
                <strong>Register as Donor</strong>

                <span>
                  Submit a new organ donation pledge.
                </span>
              </div>

              <ChevronRight size={16} />
            </Link>

            <Link
              to="/organ-donation/history"
              className="organ-dashboard-action"
            >
              <div className="organ-dashboard-action-icon">
                <Clock3 size={18} />
              </div>

              <div>
                <strong>My Donation Pledge</strong>

                <span>
                  View your registered pledge information.
                </span>
              </div>

              <ChevronRight size={16} />
            </Link>

            <Link
              to="/organ-donation/eligibility"
              className="organ-dashboard-action"
            >
              <div className="organ-dashboard-action-icon">
                <ShieldCheck size={18} />
              </div>

              <div>
                <strong>Eligibility</strong>

                <span>
                  Review organ donation eligibility information.
                </span>
              </div>

              <ChevronRight size={16} />
            </Link>

            <Link
              to="/organ-donation/organ-banks"
              className="organ-dashboard-action"
            >
              <div className="organ-dashboard-action-icon">
                <Users size={18} />
              </div>

              <div>
                <strong>Organ Banks</strong>

                <span>
                  Find verified organ donation facilities.
                </span>
              </div>

              <ChevronRight size={16} />
            </Link>

          </div>
        </section>

        {/* INFORMATION */}
        <section className="organ-dashboard-bottom">

          <div className="organ-dashboard-card organ-dashboard-information">

            <div className="organ-dashboard-card-header">
              <div>
                <h3>Organ Donation Information</h3>

                <p>
                  Important information for registered
                  donors.
                </p>
              </div>

              <Heart size={20} />
            </div>

            <div className="organ-dashboard-information-grid">

              <div className="organ-dashboard-information-item">
                <div className="organ-dashboard-information-icon">
                  <Heart size={18} />
                </div>

                <div>
                  <strong>Support patients in need</strong>

                  <p>
                    Organ donation can help patients who
                    require transplantation.
                  </p>
                </div>
              </div>

              <div className="organ-dashboard-information-item">
                <div className="organ-dashboard-information-icon">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <strong>Medical review matters</strong>

                  <p>
                    Final medical suitability and donation
                    procedures are handled by authorized
                    healthcare professionals.
                  </p>
                </div>
              </div>

              <div className="organ-dashboard-information-item">
                <div className="organ-dashboard-information-icon">
                  <FileHeart size={18} />
                </div>

                <div>
                  <strong>Keep your pledge updated</strong>

                  <p>
                    Accurate donor information helps keep
                    your registration useful when required.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* FOOTER NOTE */}
        <div className="organ-dashboard-note">
          <ShieldCheck size={15} />

          <span>
            Organ donation registration information is handled
            confidentially. Final medical suitability and
            donation procedures are determined by authorized
            medical and transplant professionals.
          </span>
        </div>

      </div>
    </div>
  );
}

export default OrganDonationDashboard;
