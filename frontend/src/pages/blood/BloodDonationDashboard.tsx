import welcomePhoto from "../../assets/blood-donation-welcome.jpg";
import ServiceWelcomeCard from "../../components/common/ServiceWelcomeCard";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Droplets,
  Eye,
  Heart,
  MapPin,
  Pencil,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";

import "./BloodDonationDashboard.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

/* ============================================================
   TYPES
   ============================================================ */

interface LatestDonor {
  id: string;
  full_name: string;
  blood_group: string | null;
  city: string | null;
  state: string | null;
  availability: boolean;
  created_at: string;
  previous_donations: number;
  last_donation_date: string | null;
}

interface BloodDonor {
  id: string;
  user_id?: string | null;
  full_name: string;
  blood_group: string | null;
  city: string | null;
  state: string | null;
  availability: boolean;
  verification_status?: string | null;
  created_at: string;
  previous_donations?: number;
  last_donation_date?: string | null;
}

interface DashboardStats {
  total_donors: number;
  available_donors: number;
  blood_group_counts: Record<string, number>;
  registrations_by_month: {
    month: string;
    count: number;
  }[];
  latest_donor: LatestDonor | null;
}

interface DonationRecord {
  id: string;
  donor_id: string;
  donation_date?: string | null;
  units?: number | null;
  units_donated?: number | null;
  hospital_name?: string | null;
  blood_bank?: string | null;
  hospital?: string | null;
  status?: string | null;
}

/* ============================================================
   HELPERS
   ============================================================ */

function formatDate(
  dateString: string | null | undefined
) {
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

function formatLocation(
  city: string | null | undefined,
  state: string | null | undefined
) {
  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || "—";
}

function formatStatus(
  verificationStatus: string | null | undefined,
  availability: boolean
) {
  if (verificationStatus) {
    return verificationStatus;
  }

  return availability ? "Available" : "Unavailable";
}

/* ============================================================
   COMPONENT
   ============================================================ */

function BloodDonationDashboard() {
  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [donors, setDonors] =
    useState<BloodDonor[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [myDonations, setMyDonations] =
    useState<DonationRecord[]>([]);

  const [selectedDonor, setSelectedDonor] =
    useState<BloodDonor | null>(null);

  const [currentDonor, setCurrentDonor] =
    useState<BloodDonor | null>(null);

  const [welcomeName, setWelcomeName] =
    useState("there");

  /* ==========================================================
     FETCH REAL DATA
     ========================================================== */

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isMounted) {
          setError("Please log in to view your blood donation dashboard.");
          setLoading(false);
          setStats(null);
          setDonors([]);
          setCurrentDonor(null);
          setMyDonations([]);
        }
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setError("");
          setWelcomeName(
            user.displayName?.trim() ||
              user.email?.split("@")[0] ||
              "there"
          );
        }

        const userId = user.uid;
        const token = await user.getIdToken();
        const authHeaders = {
          Authorization: `Bearer ${token}`,
        };

        const dashboardUrl =
          `${API_BASE_URL}/api/blood-donors/dashboard/stats?user_id=${encodeURIComponent(userId)}`;

        const [dashboardResponse, donorsResponse, currentDonorResponse] =
          await Promise.all([
            fetch(dashboardUrl, { headers: authHeaders }),
            fetch(`${API_BASE_URL}/api/blood-donors/`, { headers: authHeaders }),
            fetch(
              `${API_BASE_URL}/api/blood-donors/by-user/${encodeURIComponent(userId)}`,
              { headers: authHeaders }
            ),
          ]);

        if (!dashboardResponse.ok) {
          throw new Error(
            dashboardResponse.status === 401
              ? "Your session could not be verified. Please log in again."
              : "Unable to load dashboard statistics."
          );
        }

        if (!donorsResponse.ok) {
          throw new Error("Unable to load donor registrations.");
        }

        const dashboardData: DashboardStats = await dashboardResponse.json();
        const donorData: BloodDonor[] = await donorsResponse.json();

        let exactDonor: BloodDonor | null = null;
        if (currentDonorResponse.ok) {
          exactDonor = await currentDonorResponse.json();
        } else if (currentDonorResponse.status !== 404) {
          throw new Error(
            currentDonorResponse.status === 401
              ? "Your session could not be verified. Please log in again."
              : "Unable to load your donor profile."
          );
        }

        if (!isMounted) return;

        setStats(dashboardData);
        setDonors(donorData);
        setCurrentDonor(exactDonor);

        if (exactDonor?.id) {
          localStorage.setItem("medvisionrx_blood_donor_id", exactDonor.id);

          const donationsResponse = await fetch(
            `${API_BASE_URL}/api/blood-donors/${encodeURIComponent(exactDonor.id)}/donations`,
            { headers: authHeaders }
          );

          if (donationsResponse.ok) {
            const donationData = await donationsResponse.json();
            const records = Array.isArray(donationData?.donations)
              ? donationData.donations
              : Array.isArray(donationData)
                ? donationData
                : [];
            if (isMounted) setMyDonations(records);
          } else if (donationsResponse.status === 401) {
            throw new Error("Your session could not be verified. Please log in again.");
          } else {
            if (isMounted) setMyDonations([]);
          }
        } else {
          localStorage.removeItem("medvisionrx_blood_donor_id");
          if (isMounted) setMyDonations([]);
        }
      } catch (err) {
        console.error("Blood Donation Dashboard Error:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load dashboard data."
          );
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

  /* ==========================================================
     LATEST DONOR
     ========================================================== */

  const latestDonor =
    currentDonor ?? stats?.latest_donor ?? null;

  /* ==========================================================
     RECENT DONOR REGISTRATIONS
     REAL DATA FROM MONGODB
     ========================================================== */

  const recentDonors = useMemo(() => {
    return [...donors]
      .sort((a, b) => {
        const dateA = new Date(
          a.created_at
        ).getTime();

        const dateB = new Date(
          b.created_at
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [donors]);

  /* ==========================================================
     BLOOD GROUP DISTRIBUTION
     ========================================================== */


  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <div className="blood-dashboard-page">
        <div className="blood-dashboard-loading">
          <div className="blood-dashboard-spinner" />

          <p>
            Loading blood donation dashboard...
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     ERROR
     ========================================================== */

  if (error) {
    return (
      <div className="blood-dashboard-page">
        <div className="blood-dashboard-error">

          <Droplets size={30} />

          <h2>
            Unable to load dashboard
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
          >
            Try Again
          </button>

        </div>
      </div>
    );
  }

  /* ==========================================================
     MAIN DASHBOARD
     ========================================================== */

  return (
    <div className="blood-dashboard-page">

      <div className="blood-dashboard-container">

        {/* ====================================================
            HERO
            ==================================================== */}

      <ServiceWelcomeCard
        service="BLOOD DONATION SERVICE"
        name={welcomeName}
        description="Every donation brings hope. Manage your blood donation registrations, connect with patients, and help save lives."
        image={welcomePhoto}
        imageAlt="A volunteer donating blood with healthcare staff"
        tone="blood"
        icon={<Droplets size={15} />}
      />

        {/* ====================================================
            STATS
            ==================================================== */}

        <section className="blood-dashboard-stats">

          <div className="blood-dashboard-stat">

            <div className="blood-dashboard-stat-icon red">
              <Users size={19} />
            </div>

            <div>
              <span>
                Total Registered
              </span>

              <strong>
                {stats?.total_donors ?? 0}
              </strong>

              <small>
                Registered donors
              </small>
            </div>

          </div>

          <div className="blood-dashboard-stat">

            <div className="blood-dashboard-stat-icon green">
              <Heart size={19} />
            </div>

            <div>
              <span>
                Available Donors
              </span>

              <strong>
                {stats?.available_donors ?? 0}
              </strong>

              <small>
                Currently available
              </small>
            </div>

          </div>

          <div className="blood-dashboard-stat">

            <div className="blood-dashboard-stat-icon blue">
              <Droplets size={19} />
            </div>

            <div>
              <span>
                Your Blood Group
              </span>

              <strong>
                {latestDonor?.blood_group ||
                  "—"}
              </strong>

              <small>
                Registered
              </small>
            </div>

          </div>

          <div className="blood-dashboard-stat">

            <div className="blood-dashboard-stat-icon purple">
              <CalendarDays size={19} />
            </div>

            <div>
              <span>
                Registered Since
              </span>

              <strong>
                {formatDate(
                  latestDonor?.created_at
                )}
              </strong>

              <small>
                Registration date
              </small>
            </div>

          </div>

        </section>

        {/* ====================================================
            MAIN CONTENT
            ==================================================== */}

        <section className="blood-dashboard-main-grid">

          {/* ==================================================
              RECENT DONOR REGISTRATIONS
              ================================================== */}

          <div className="blood-dashboard-card">

            <div className="blood-dashboard-card-header">

              <div>
                <h2>
                  Recent Donor Registrations
                </h2>

                <p>
                  Latest blood donor registrations
                  from the database.
                </p>
              </div>

              <Droplets
                size={18}
                className="blood-dashboard-header-icon"
              />

            </div>

            {recentDonors.length > 0 ? (

              <div className="blood-dashboard-registration-list">

                {recentDonors.map((donor) => {
                  const storedDonorId =
                    localStorage.getItem(
                      "medvisionrx_blood_donor_id"
                    );

                  const isCurrentUser =
                    Boolean(
                      (currentDonor?.id &&
                        donor.id === currentDonor.id) ||
                      (!currentDonor &&
                        storedDonorId &&
                        donor.id === storedDonorId)
                    );

                  return (
                    <div
                      className="blood-dashboard-donor-card"
                      key={donor.id}
                    >
                      <div className="blood-dashboard-donor-card-top">
                        <div className="blood-dashboard-donor-identity">
                          <div className="blood-dashboard-donor-avatar">
                            <UserPlus size={17} />
                          </div>

                          <div className="blood-dashboard-donor-name-wrap">
                            <strong>
                              {donor.full_name || "Donor"}
                            </strong>

                            <span className="blood-dashboard-donor-location">
                              <MapPin size={11} />
                              {formatLocation(
                                donor.city,
                                donor.state
                              )}
                            </span>
                          </div>
                        </div>

                        <span className="blood-dashboard-donor-blood-group">
                          {donor.blood_group || "—"}
                        </span>
                      </div>

                      <div
                        className={
                          donor.verification_status &&
                          donor.verification_status.toLowerCase() !==
                            "verified"
                            ? "blood-dashboard-donor-verification pending"
                            : "blood-dashboard-donor-verification"
                        }
                      >
                        <ShieldCheck size={13} />

                        <span>
                          {formatStatus(
                            donor.verification_status,
                            donor.availability
                          )}
                        </span>
                      </div>

                      <div className="blood-dashboard-donor-details">
                        <div>
                          <CalendarDays size={13} />
                          <span>
                            Last donation:{" "}
                            <strong>
                              {formatDate(
                                donor.last_donation_date
                              ) === "—"
                                ? "Not available"
                                : formatDate(
                                    donor.last_donation_date
                                  )}
                            </strong>
                          </span>
                        </div>

                        <div>
                          <Droplets size={13} />
                          <span>
                            Currently{" "}
                            <strong>
                              {donor.availability
                                ? "available"
                                : "unavailable"}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="blood-dashboard-donor-actions">
                        <button
                          type="button"
                          className="blood-dashboard-donor-view-button"
                          style={{
                            position: "relative",
                            zIndex: 2,
                            pointerEvents: "auto",
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelectedDonor({
                              ...donor,
                            });
                          }}
                        >
                          <Eye size={14} />
                          View Details
                        </button>

                        {isCurrentUser && (
                          <Link
                            to="/blood-donation/register"
                            className="blood-dashboard-donor-edit-button"
                          >
                            <Pencil size={14} />
                            Edit
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>


            ) : (

              <div className="blood-dashboard-empty">

                <Droplets size={28} />

                <h3>
                  No donor registrations
                </h3>

                <p>
                  Donor registrations will
                  appear here when they are
                  stored in the database.
                </p>

              </div>

            )}

          </div>

          {/* ==================================================
              MY DONATIONS
              ================================================== */}

          <div className="blood-dashboard-card">
            <div className="blood-dashboard-card-header">
              <div>
                <h2>
                  My Donations
                </h2>

                <p>
                  Your actual blood donation records.
                </p>
              </div>

              <Clock3
                size={18}
                className="blood-dashboard-header-icon"
              />
            </div>

            {myDonations.length > 0 ? (
              <div className="blood-dashboard-table-wrap">
                <table className="blood-dashboard-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>UNITS</th>
                      <th>LOCATION</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {myDonations.map((donation) => (
                      <tr key={donation.id}>
                        <td>
                          {formatDate(
                            donation.donation_date
                          )}
                        </td>

                        <td>
                          {donation.units ??
                            donation.units_donated ??
                            "—"}
                        </td>

                        <td>
                          <span className="blood-dashboard-location">
                            <MapPin size={11} />

                            {donation.hospital_name ||
                              donation.blood_bank ||
                              donation.hospital ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          <span className="blood-dashboard-status active">
                            {donation.status || "Recorded"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="blood-dashboard-empty">
                <Clock3 size={28} />

                <h3>
                  No donations yet
                </h3>

                <p>
                  Your donation will appear here only
                  after you choose to donate blood from
                  an active blood request.
                </p>
              </div>
            )}
          </div>

        </section>

        {/* ====================================================
            QUICK ACTIONS
            ==================================================== */}

        <section className="blood-dashboard-card">

          <div className="blood-dashboard-card-header">

            <div>
              <h2>
                Quick Actions
              </h2>

              <p>
                Manage your blood donation
                information.
              </p>
            </div>

            <Heart
              size={18}
              className="blood-dashboard-header-icon"
            />

          </div>

          <div className="blood-dashboard-quick-actions">

            <Link
              to="/blood-donation/register"
              className="blood-dashboard-action"
            >

              <div className="blood-dashboard-action-icon">
                <UserPlus size={18} />
              </div>

              <div>
                <strong>
                  {currentDonor
                    ? "Edit Donor Information"
                    : "Register as Donor"}
                </strong>

                <span>
                  {currentDonor
                    ? "Update your existing blood donor profile."
                    : "Submit your blood donation information."}
                </span>
              </div>

              <ChevronRight size={15} />

            </Link>

            <Link
              to="/blood-donation/donations"
              className="blood-dashboard-action"
            >

              <div className="blood-dashboard-action-icon">
                <Clock3 size={18} />
              </div>

              <div>
                <strong>
                  My Donations
                </strong>

                <span>
                  View your actual donation
                  history and records.
                </span>
              </div>

              <ChevronRight size={15} />

            </Link>

            <Link
              to="/blood-donation/eligibility"
              className="blood-dashboard-action"
            >

              <div className="blood-dashboard-action-icon">
                <ShieldCheck size={18} />
              </div>

              <div>
                <strong>
                  Eligibility
                </strong>

                <span>
                  Review blood donation
                  eligibility information.
                </span>
              </div>

              <ChevronRight size={15} />

            </Link>

            <Link
              to="/blood-donation/banks"
              className="blood-dashboard-action"
            >

              <div className="blood-dashboard-action-icon">
                <Droplets size={18} />
              </div>

              <div>
                <strong>
                  Blood Banks
                </strong>

                <span>
                  Find registered blood banks
                  and facilities.
                </span>
              </div>

              <ChevronRight size={15} />

            </Link>

          </div>

        </section>

        {/* ====================================================
            BLOOD DONATION INFORMATION
            ==================================================== */}

        <section className="blood-dashboard-card">

          <div className="blood-dashboard-card-header">

            <div>
              <h2>
                Blood Donation Information
              </h2>

              <p>
                Important information for
                registered donors.
              </p>
            </div>

            <Heart
              size={18}
              className="blood-dashboard-header-icon"
            />

          </div>

          <div className="blood-dashboard-info-grid">

            <div className="blood-dashboard-info-item">

              <div className="blood-dashboard-info-icon">
                <Heart size={18} />
              </div>

              <div>
                <strong>
                  Support patients in need
                </strong>

                <p>
                  Blood donations help maintain
                  supplies for patients who require
                  transfusion.
                </p>
              </div>

            </div>

            <div className="blood-dashboard-info-item">

              <div className="blood-dashboard-info-icon">
                <ShieldCheck size={18} />
              </div>

              <div>
                <strong>
                  Medical screening matters
                </strong>

                <p>
                  Final donation eligibility is
                  determined through appropriate
                  blood-bank screening.
                </p>
              </div>

            </div>

            <div className="blood-dashboard-info-item">

              <div className="blood-dashboard-info-icon">
                <Droplets size={18} />
              </div>

              <div>
                <strong>
                  Keep information updated
                </strong>

                <p>
                  Accurate blood group, availability
                  and contact information helps
                  coordinate requirements.
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            FOOTER NOTE
            ==================================================== */}

        <div className="blood-dashboard-note">

          <ShieldCheck size={14} />

          <span>
            Registration and screening information
            is handled confidentially. Final
            eligibility is determined by authorized
            blood-bank medical staff.
          </span>

        </div>

        {selectedDonor && (
          <div
            className="blood-dashboard-modal-backdrop"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              pointerEvents: "auto",
            }}
            onClick={() => setSelectedDonor(null)}
          >
            <div
              className="blood-dashboard-details-modal"
              style={{
                position: "relative",
                zIndex: 10000,
                pointerEvents: "auto",
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="blood-dashboard-modal-header">
                <div>
                  <span>
                    BLOOD DONOR
                  </span>

                  <h2>
                    Donor Details
                  </h2>
                </div>

                <button
                  type="button"
                  className="blood-dashboard-modal-close"
                  aria-label="Close donor details"
                  onClick={() =>
                    setSelectedDonor(null)
                  }
                >
                  <X size={18} />
                </button>
              </div>

              <div className="blood-dashboard-details-grid">

                <div>
                  <span>Full Name</span>
                  <strong>
                    {selectedDonor.full_name || "—"}
                  </strong>
                </div>

                <div>
                  <span>Blood Group</span>
                  <strong>
                    {selectedDonor.blood_group || "—"}
                  </strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>
                    {formatLocation(
                      selectedDonor.city,
                      selectedDonor.state
                    )}
                  </strong>
                </div>

                <div>
                  <span>Registration Date</span>
                  <strong>
                    {formatDate(
                      selectedDonor.created_at
                    )}
                  </strong>
                </div>

                <div>
                  <span>Availability</span>
                  <strong>
                    {selectedDonor.availability
                      ? "Available"
                      : "Unavailable"}
                  </strong>
                </div>

                <div>
                  <span>Verification</span>
                  <strong>
                    {selectedDonor.verification_status ||
                      "—"}
                  </strong>
                </div>

              </div>

              {currentDonor?.id === selectedDonor.id && (
                <Link
                  to="/blood-donation/register"
                  className="blood-dashboard-modal-edit"
                  onClick={() =>
                    setSelectedDonor(null)
                  }
                >
                  <Pencil size={15} />
                  Edit Donor Information
                </Link>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default BloodDonationDashboard;