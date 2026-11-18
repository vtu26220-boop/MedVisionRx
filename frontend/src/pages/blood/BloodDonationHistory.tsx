import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebase";
import {
  CheckCircle2,
  Clock3,
  Droplets,
  Eye,
  MapPin,
  Phone,
  RefreshCw,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";

import "./BloodDonationHistory.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

interface DonationRecord {
  id: string;
  donor_id: string;
  blood_requirement_id?: string;
  blood_group?: string;
  units?: number;
  status?: string;
  response_status?: string;
  donation_date?: string | null;
  responded_at?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  created_at?: string | null;

  request_hospital_name?: string | null;
  request_hospital_city?: string | null;
  request_hospital_state?: string | null;
  request_required_date?: string | null;
  request_urgency?: string | null;
  requester_name?: string | null;
  requester_phone?: string | null;

  donor_address?: string | null;
  donor_city?: string | null;
  donor_state?: string | null;
  donor_pincode?: string | null;
}

interface DonationHistoryResponse {
  donor_id: string;
  donor_name?: string | null;
  blood_group?: string | null;
  total_donations?: number;
  donations?: DonationRecord[];
  responses?: DonationRecord[];
}

function BloodDonationHistory() {
  const [history, setHistory] =
    useState<DonationHistoryResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedDonation, setSelectedDonation] =
    useState<DonationRecord | null>(
      null
    );

  const [deletingId, setDeletingId] =
    useState("");

  const formatDate = (
    value?: string | null
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
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

  const formatDateTime = (
    value?: string | null
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const fetchHistory = async (currentUser: User | null = auth.currentUser) => {
    try {
      setLoading(true);
      setError("");

      if (!currentUser) {
        setHistory(null);
        setError("Not authenticated. Please sign in again.");
        return;
      }

      const idToken = await currentUser.getIdToken();

      // Resolve the donor profile using the authenticated Firebase UID.
      const donorResponse = await fetch(
        `${API_BASE_URL}/api/blood-donors/by-user/${encodeURIComponent(
          currentUser.uid
        )}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const donorData = await donorResponse.json().catch(() => null);

      if (!donorResponse.ok) {
        throw new Error(
          typeof donorData?.detail === "string"
            ? donorData.detail
            : "Unable to find your blood donor profile. Please register as a donor first."
        );
      }

      const donorId = donorData?.id || donorData?._id;

      if (!donorId) {
        throw new Error(
          "Your blood donor profile was not found. Please register as a donor first."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/blood-donors/${encodeURIComponent(
          String(donorId)
        )}/donations`,
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
            : "Unable to load donation history."
        );
      }

      setHistory(data);
    } catch (err) {
      console.error("Donation history error:", err);
      setHistory(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load donation history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;

      if (!currentUser) {
        setHistory(null);
        setError("Not authenticated. Please sign in again.");
        setLoading(false);
        return;
      }

      await fetchHistory(currentUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const deleteDonation =
    async (
      donation: DonationRecord
    ) => {
      const confirmed =
        window.confirm(
          "Remove this donation record?"
        );

      if (!confirmed) {
        return;
      }

      setDeletingId(
        donation.id
      );

      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          throw new Error("Not authenticated. Please sign in again.");
        }

        const idToken = await currentUser.getIdToken();

        const response =
          await fetch(
            `${API_BASE_URL}/api/blood-donors/donations/${encodeURIComponent(
              donation.id
            )}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          throw new Error(
            typeof data?.detail ===
              "string"
              ? data.detail
              : "Unable to remove the record."
          );
        }

        setSelectedDonation(null);
        await fetchHistory(currentUser);
      } catch (err) {
        console.error(
          "Delete donation error:",
          err
        );

        window.alert(
          err instanceof Error
            ? err.message
            : "Unable to remove the record."
        );
      } finally {
        setDeletingId("");
      }
    };

  const actualDonations =
    history?.donations || [];

  const responses =
    history?.responses || [];

  return (
    <div className="blood-donation-history-page">
      <div className="blood-history-header">
        <div>
          <span className="blood-history-eyebrow">
            BLOOD DONATION
          </span>

          <h1>
            My Donations
          </h1>

          <p>
            View your accepted blood donations
            and blood request responses.
          </p>
        </div>

        <button
          type="button"
          className="blood-history-refresh"
          onClick={() => fetchHistory()}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "blood-history-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {error && (
        <div className="blood-history-error">
          <span>
            {error}
          </span>
        </div>
      )}

      {!loading && history && (
        <div className="blood-history-summary">
          <div>
            <span>
              Donor
            </span>

            <strong>
              {history.donor_name ||
                "Blood Donor"}
            </strong>
          </div>

          <div>
            <span>
              Blood Group
            </span>

            <strong>
              {history.blood_group ||
                "—"}
            </strong>
          </div>

          <div>
            <span>
              Actual Donations
            </span>

            <strong>
              {history.total_donations ??
                actualDonations.length}
            </strong>
          </div>
        </div>
      )}

      {loading && (
        <div className="blood-history-loading">
          <RefreshCw
            size={23}
            className="blood-history-spin"
          />

          <span>
            Loading your donation history...
          </span>
        </div>
      )}

      {!loading &&
        !error &&
        actualDonations.length ===
          0 && (
          <div className="blood-history-empty">
            <div className="blood-history-empty-icon">
              <Droplets size={27} />
            </div>

            <h3>
              No completed donations yet
            </h3>

            <p>
              Accepted blood donations will
              appear here.
            </p>
          </div>
        )}

      {!loading &&
        actualDonations.length >
          0 && (
          <section className="blood-history-section">
            <div className="blood-history-section-heading">
              <div>
                <span>
                  COMPLETED
                </span>

                <h2>
                  Blood Donations
                </h2>
              </div>

              <strong>
                {actualDonations.length}
              </strong>
            </div>

            <div className="blood-history-grid">
              {actualDonations.map(
                (donation) => (
                  <article
                    key={
                      donation.id
                    }
                    className="blood-history-card"
                  >
                    <div className="blood-history-card-top">
                      <div className="blood-history-group">
                        <Droplets
                          size={20}
                        />

                        <span>
                          {
                            donation.blood_group
                          }
                        </span>
                      </div>

                      <span className="blood-history-accepted">
                        <CheckCircle2
                          size={14}
                        />
                        Accepted
                      </span>
                    </div>

                    <div className="blood-history-card-body">
                      <h3>
                        {donation.request_hospital_name ||
                          "Blood Requirement"}
                      </h3>

                      <div className="blood-history-location">
                        <MapPin
                          size={15}
                        />

                        <span>
                          {[
                            donation.request_hospital_city,
                            donation.request_hospital_state,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              ", "
                            ) ||
                            "Location not available"}
                        </span>
                      </div>

                      <div className="blood-history-info-grid">
                        <div>
                          <span>
                            Donated
                          </span>

                          <strong>
                            {formatDate(
                              donation.donation_date ||
                                donation.accepted_at
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Units
                          </span>

                          <strong>
                            {donation.units ||
                              1}
                          </strong>
                        </div>
                      </div>

                      <div className="blood-history-requester">
                        <UserCheck
                          size={15}
                        />

                        <span>
                          Requester:{" "}
                          <strong>
                            {donation.requester_name ||
                              "Not available"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="blood-history-card-actions">
                      <button
                        type="button"
                        className="blood-history-view-button"
                        onClick={() =>
                          setSelectedDonation(
                            donation
                          )
                        }
                      >
                        <Eye size={15} />
                        View Details
                      </button>

                      <button
                        type="button"
                        className="blood-history-delete-button"
                        onClick={() =>
                          deleteDonation(
                            donation
                          )
                        }
                        disabled={
                          deletingId ===
                          donation.id
                        }
                      >
                        {deletingId ===
                        donation.id ? (
                          <RefreshCw
                            size={15}
                            className="blood-history-spin"
                          />
                        ) : (
                          <Trash2
                            size={15}
                          />
                        )}

                        Remove
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        )}

      {responses.length >
        0 && (
        <section className="blood-history-section blood-history-response-section">
          <div className="blood-history-section-heading">
            <div>
              <span>
                RESPONSES
              </span>

              <h2>
                My Blood Request Responses
              </h2>
            </div>

            <strong>
              {responses.length}
            </strong>
          </div>

          <div className="blood-history-grid">
            {responses.map(
              (response) => {
                const isPending =
                  String(
                    response.status ||
                      ""
                  ).toLowerCase() ===
                  "pending";

                return (
                  <article
                    key={
                      response.id
                    }
                    className="blood-history-card response"
                  >
                    <div className="blood-history-card-top">
                      <div className="blood-history-group">
                        <Droplets
                          size={20}
                        />

                        <span>
                          {
                            response.blood_group
                          }
                        </span>
                      </div>

                      <span
                        className={
                          isPending
                            ? "blood-history-response-status pending"
                            : "blood-history-response-status rejected"
                        }
                      >
                        {isPending ? (
                          <>
                            <Clock3
                              size={
                                14
                              }
                            />
                            Pending
                          </>
                        ) : (
                          <>
                            <X
                              size={
                                14
                              }
                            />
                            Rejected
                          </>
                        )}
                      </span>
                    </div>

                    <div className="blood-history-card-body">
                      <h3>
                        {response.request_hospital_name ||
                          "Blood Requirement"}
                      </h3>

                      <div className="blood-history-location">
                        <MapPin
                          size={15}
                        />

                        <span>
                          {[
                            response.request_hospital_city,
                            response.request_hospital_state,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              ", "
                            ) ||
                            "Location not available"}
                        </span>
                      </div>

                      <div className="blood-history-pending-message">
                        {isPending
                          ? "Accepted by you — awaiting requester selection."
                          : "This donor response was not selected for the requirement."}
                      </div>

                      {response.requester_phone && (
                        <button
                          type="button"
                          className="blood-history-response-call"
                          onClick={() => {
                            const phone =
                              response.requester_phone?.replace(
                                /[^\d+]/g,
                                ""
                              );

                            if (
                              phone
                            ) {
                              window.location.assign(`tel:${phone}`);
                            }
                          }}
                        >
                          <Phone
                            size={
                              15
                            }
                          />
                          Contact Requester
                        </button>
                      )}
                    </div>

                    <div className="blood-history-response-date">
                      Responded{" "}
                      {formatDateTime(
                        response.responded_at
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </section>
      )}

      {selectedDonation && (
        <div
          className="blood-history-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedDonation(
                null
              );
            }
          }}
        >
          <div className="blood-history-details-modal">
            <div className="blood-history-details-header">
              <div>
                <span>
                  BLOOD DONATION
                </span>

                <h2>
                  Donation Details
                </h2>
              </div>

              <button
                type="button"
                className="blood-history-modal-close"
                onClick={() =>
                  setSelectedDonation(
                    null
                  )
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className="blood-history-details-content">
              <div className="blood-history-detail-group">
                <Droplets
                  size={19}
                />

                {
                  selectedDonation.blood_group ||
                  "—"
                }
              </div>

              <div className="blood-history-details-grid">
                <div>
                  <span>
                    Hospital / Blood Bank
                  </span>

                  <strong>
                    {selectedDonation.request_hospital_name ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Location
                  </span>

                  <strong>
                    {[
                      selectedDonation.request_hospital_city,
                      selectedDonation.request_hospital_state,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ", "
                      ) || "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Donation Date
                  </span>

                  <strong>
                    {formatDate(
                      selectedDonation.donation_date ||
                        selectedDonation.accepted_at
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Accepted At
                  </span>

                  <strong>
                    {formatDateTime(
                      selectedDonation.accepted_at
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Units
                  </span>

                  <strong>
                    {
                      selectedDonation.units ||
                      1
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Requester
                  </span>

                  <strong>
                    {
                      selectedDonation.requester_name ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Requester Contact
                  </span>

                  <strong>
                    {
                      selectedDonation.requester_phone ||
                      "—"
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Required Date
                  </span>

                  <strong>
                    {formatDate(
                      selectedDonation.request_required_date
                    )}
                  </strong>
                </div>

                <div className="blood-history-full-detail">
                  <span>
                    Donor Address
                  </span>

                  <strong>
                    {[
                      selectedDonation.donor_address,
                      selectedDonation.donor_city,
                      selectedDonation.donor_state,
                      selectedDonation.donor_pincode,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ", "
                      ) || "—"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="blood-history-details-footer">
              <button
                type="button"
                className="blood-history-delete-button"
                onClick={() =>
                  deleteDonation(
                    selectedDonation
                  )
                }
                disabled={
                  deletingId ===
                  selectedDonation.id
                }
              >
                <Trash2 size={15} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BloodDonationHistory;