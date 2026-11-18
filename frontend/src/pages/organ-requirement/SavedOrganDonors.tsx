import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronRight,
  Heart,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./SavedOrganDonors.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SAVED_DONORS_KEY =
  "medvisionrx_saved_organ_donors";

const SAVED_RECORDS_KEY =
  "medvisionrx_saved_organ_donor_records";

interface OrganDonor {
  id?: string;
  _id?: string;

  full_name?: string;
  fullName?: string;
  name?: string;

  gender?: string;

  blood_group?: string;
  bloodGroup?: string;

  date_of_birth?: string;
  dob?: string;

  phone?: string;
  contact_phone?: string;

  email?: string;

  address?: string;
  city?: string;
  state?: string;
  pincode?: string;

  donation_type?: string;
  donationType?: string;

  organs?: string[];
  organ_types?: string[];
  donated_organs?: string[];

  status?: string;
  medical_status?: string;

  is_verified?: boolean;
  verified?: boolean;

  created_at?: string;
  updated_at?: string;
}

interface ApiResponse {
  data?: OrganDonor[];
  donors?: OrganDonor[];
  records?: OrganDonor[];
}

/* ============================================================
   HELPERS
============================================================ */

function getId(
  donor: OrganDonor
): string {
  return (
    donor.id ||
    donor._id ||
    ""
  );
}

function getName(
  donor: OrganDonor
): string {
  return (
    donor.full_name ||
    donor.fullName ||
    donor.name ||
    "Organ Donor"
  );
}

function getBloodGroup(
  donor: OrganDonor
): string {
  return (
    donor.blood_group ||
    donor.bloodGroup ||
    "Not specified"
  );
}

function getPhone(
  donor: OrganDonor
): string {
  return (
    donor.phone ||
    donor.contact_phone ||
    ""
  );
}

function getDonationType(
  donor: OrganDonor
): string {
  return (
    donor.donation_type ||
    donor.donationType ||
    "Not specified"
  );
}

function getOrganList(
  donor: OrganDonor
): string[] {
  if (Array.isArray(donor.organs)) {
    return donor.organs;
  }

  if (
    Array.isArray(
      donor.organ_types
    )
  ) {
    return donor.organ_types;
  }

  if (
    Array.isArray(
      donor.donated_organs
    )
  ) {
    return donor.donated_organs;
  }

  return [];
}

function getLocation(
  donor: OrganDonor
): string {
  const city =
    donor.city?.trim() || "";

  const state =
    donor.state?.trim() || "";

  if (city && state) {
    return `${city}, ${state}`;
  }

  return (
    city ||
    state ||
    "Location not specified"
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
      (letter) =>
        letter.toUpperCase()
    );
}

function formatOrgan(
  value: string
): string {
  return value
    .trim()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function getVerification(
  donor: OrganDonor
): boolean {
  return (
    donor.is_verified === true ||
    donor.verified === true
  );
}

function getOrganEmoji(
  organ?: string
): string {
  const value =
    String(organ || "")
      .toLowerCase();

  if (
    value.includes("heart")
  ) {
    return "❤️";
  }

  if (
    value.includes("lung")
  ) {
    return "🫁";
  }

  if (
    value.includes("kidney")
  ) {
    return "🫘";
  }

  if (
    value.includes("liver")
  ) {
    return "🫀";
  }

  if (
    value.includes("eye") ||
    value.includes("cornea")
  ) {
    return "👁️";
  }

  return "🫀";
}

/* ============================================================
   LOCAL STORAGE
============================================================ */

function loadSavedIds(): string[] {
  try {
    const stored =
      localStorage.getItem(
        SAVED_DONORS_KEY
      );

    if (!stored) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (
          value
        ): value is string =>
          typeof value === "string"
      );
    }

    return [];
  } catch {
    return [];
  }
}

function saveSavedIds(
  ids: string[]
) {
  localStorage.setItem(
    SAVED_DONORS_KEY,
    JSON.stringify(ids)
  );
}

function loadSavedDonorRecords():
  OrganDonor[] {
  try {
    const stored =
      localStorage.getItem(
        SAVED_RECORDS_KEY
      );

    if (!stored) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed as OrganDonor[];
    }

    return [];
  } catch {
    return [];
  }
}

/* ============================================================
   COMPONENT
============================================================ */

function SavedOrganDonors() {
  const navigate = useNavigate();

  const [donors, setDonors] =
    useState<OrganDonor[]>([]);

  const [savedIds, setSavedIds] =
    useState<string[]>(
      loadSavedIds
    );

  const [savedDonorRecords, setSavedDonorRecords] =
    useState<OrganDonor[]>(
      loadSavedDonorRecords
    );

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>("");

  const [searchText, setSearchText] =
    useState<string>("");

  const [selectedDonor, setSelectedDonor] =
    useState<OrganDonor | null>(
      null
    );

  /* ============================================================
     LOAD REAL ORGAN DONORS
  ============================================================ */

  const loadDonors = async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * Saved donors are user-selected records. Do not depend on the
       * complete donor directory being returned successfully. The
       * accepted/saved donor records are also persisted locally so the
       * page continues to work when the directory endpoint is filtered.
       */
      const currentSavedIds =
        loadSavedIds();

      const currentLocalRecords =
        loadSavedDonorRecords();

      if (currentSavedIds.length === 0) {
        setDonors([]);
        setSavedIds([]);
        setSavedDonorRecords(
          currentLocalRecords
        );
        return;
      }

      const localById =
        new Map<string, OrganDonor>();

      currentLocalRecords.forEach(
        (donor) => {
          const id = getId(donor);

          if (id) {
            localById.set(id, donor);
          }
        }
      );

      /*
       * First try the normal donor collection endpoint. This keeps the
       * page compatible with the existing backend while filtering the
       * response to only the IDs the current user actually saved.
       */
      let apiRecords: OrganDonor[] = [];

      const response = await fetch(
        `${API_BASE_URL}/api/organ-donations/`
      );

      if (response.ok) {
        const data: unknown =
          await response.json();

        if (Array.isArray(data)) {
          apiRecords = data as OrganDonor[];
        } else if (
          typeof data === "object" &&
          data !== null
        ) {
          const responseData =
            data as ApiResponse;

          if (Array.isArray(responseData.data)) {
            apiRecords = responseData.data;
          } else if (
            Array.isArray(responseData.donors)
          ) {
            apiRecords = responseData.donors;
          } else if (
            Array.isArray(responseData.records)
          ) {
            apiRecords = responseData.records;
          }
        }
      }

      const savedApiRecords =
        apiRecords.filter((donor) =>
          currentSavedIds.includes(
            getId(donor)
          )
        );

      /*
       * API data wins when available; locally stored accepted donor
       * records fill any gaps (for example immediately after accepting
       * a donor response before the backend directory is refreshed).
       */
      const mergedById =
        new Map<string, OrganDonor>();

      savedApiRecords.forEach((donor) => {
        const id = getId(donor);

        if (id) {
          mergedById.set(id, donor);
        }
      });

      currentSavedIds.forEach((id) => {
        const localRecord =
          localById.get(id);

        if (
          localRecord &&
          !mergedById.has(id)
        ) {
          mergedById.set(
            id,
            localRecord
          );
        }
      });

      setSavedIds(currentSavedIds);
      setSavedDonorRecords(
        currentLocalRecords
      );
      setDonors(
        Array.from(
          mergedById.values()
        )
      );
    } catch (err) {
      console.error(
        "Saved Organ Donors error:",
        err
      );

      /*
       * If the API is temporarily unavailable, keep the saved donor
       * records already stored locally instead of showing a blank page.
       */
      setDonors([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load saved organ donors."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadDonors();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  /* ============================================================
     MERGE SAVED DONORS
  ============================================================ */

  const savedDonors =
    useMemo(() => {
      const apiSavedDonors =
        donors.filter(
          (donor) => {
            const donorId =
              getId(donor);

            return (
              donorId &&
              savedIds.includes(
                donorId
              )
            );
          }
        );

      /*
       * Only show records whose IDs are in the saved-ID list.
       * Some other pages cache a donor's own registration record in
       * SAVED_RECORDS_KEY; that cache alone must NOT make the donor
       * appear as a saved donor.
       */
      const savedLocalDonors =
        savedDonorRecords.filter((donor) => {
          const donorId = getId(donor);
          return donorId && savedIds.includes(donorId);
        });

      const merged = [
        ...apiSavedDonors,
        ...savedLocalDonors,
      ];

      const unique =
        new Map<string, OrganDonor>();

      merged.forEach((donor) => {
        const id = getId(donor);
        if (id) {
          // Prefer the latest record encountered for each saved donor.
          unique.set(id, donor);
        }
      });

      return Array.from(unique.values());
    }, [
      donors,
      savedIds,
      savedDonorRecords,
    ]);

  /* ============================================================
     SEARCH
  ============================================================ */

  const filteredDonors =
    useMemo(() => {
      const query =
        searchText
          .trim()
          .toLowerCase();

      if (!query) {
        return savedDonors;
      }

      return savedDonors.filter(
        (donor) => {
          const searchableText = [
            getName(donor),
            getBloodGroup(donor),
            getLocation(donor),
            getDonationType(donor),
            ...getOrganList(donor),
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            query
          );
        }
      );
    }, [
      savedDonors,
      searchText,
    ]);

  /* ============================================================
     REMOVE SAVED DONOR
  ============================================================ */

  const removeSavedDonor = (
    donorId: string
  ) => {
    const updatedIds =
      savedIds.filter(
        (id) =>
          id !== donorId
      );

    setSavedIds(updatedIds);

    saveSavedIds(
      updatedIds
    );

    const updatedRecords =
      savedDonorRecords.filter(
        (donor) =>
          getId(donor) !==
          donorId
      );

    setSavedDonorRecords(
      updatedRecords
    );

    localStorage.setItem(
      SAVED_RECORDS_KEY,
      JSON.stringify(
        updatedRecords
      )
    );

    if (
      selectedDonor &&
      getId(selectedDonor) ===
        donorId
    ) {
      setSelectedDonor(null);
    }
  };

  /* ============================================================
     MAP
  ============================================================ */

  const openMap = (
    donor: OrganDonor
  ) => {
    const query = [
      getName(donor),
      donor.address || "",
      getLocation(donor),
    ]
      .filter(Boolean)
      .join(", ");

    const url =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="saved-organ-donors-page">

      {/* HEADER */}

      <section className="saved-organ-donors-header">

        <div>

          <span className="saved-organ-donors-eyebrow">
            ORGAN REQUIREMENT
          </span>

          <h1>
            Saved Organ Donors
          </h1>

          <p>
            Quickly access organ donors
            that you have saved for
            future reference.
          </p>

        </div>


      </section>

      {/* SEARCH */}

      <section className="saved-organ-donors-filter">

        <div className="saved-organ-donors-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search saved donors, organ, blood group or location..."
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

        <button
          type="button"
          className="saved-organ-donors-refresh"
          onClick={loadDonors}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "saved-organ-donors-spin"
                : ""
            }
          />

          Refresh
        </button>

      </section>

      {/* ERROR */}

      {error && (
        <div className="saved-organ-donors-error">

          <ShieldCheck size={19} />

          <div>

            <strong>
              Unable to load donor records
            </strong>

            <span>
              {error}
            </span>

          </div>

          <button
            type="button"
            onClick={loadDonors}
          >
            Retry
          </button>

        </div>
      )}

      {/* LOADING */}

      {loading && (
        <div className="saved-organ-donors-loading">

          <RefreshCw
            size={25}
            className="saved-organ-donors-spin"
          />

          <span>
            Loading real organ donor
            records...
          </span>

        </div>
      )}

      {/* EMPTY */}

      {!loading &&
        !error &&
        filteredDonors.length ===
          0 && (
          <div className="saved-organ-donors-empty">

            <div className="saved-organ-donors-empty-icon">
              <Heart size={29} />
            </div>

            <h3>
              {savedDonors.length ===
              0
                ? "No saved organ donors"
                : "No matching saved donors"}
            </h3>

            <p>
              {savedDonors.length ===
              0
                ? "Save donors from the organ donor search or response pages to access them here."
                : "Try a different search term."}
            </p>

            {savedDonors.length ===
            0 ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/organ-requirement/search"
                  )
                }
              >
                Find Organ Donors
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setSearchText("")
                }
              >
                Clear Search
              </button>
            )}

          </div>
        )}

      {/* DONOR CARDS */}

      {!loading &&
        filteredDonors.length >
          0 && (
          <section className="saved-organ-donors-list">

            {filteredDonors.map(
              (donor) => {

                const donorId =
                  getId(donor);

                const organs =
                  getOrganList(
                    donor
                  );

                const phone =
                  getPhone(donor);

                return (
                  <article
                    key={donorId}
                    className="saved-organ-donor-card"
                  >

                    {/* ICON */}

                    <div className="saved-organ-donor-avatar">

                      <UserRound
                        size={24}
                      />

                    </div>

                    {/* CONTENT */}

                    <div className="saved-organ-donor-content">

                      <div className="saved-organ-donor-title">

                        <div>

                          <h3>
                            {getName(
                              donor
                            )}
                          </h3>

                          <span>
                            Organ donor
                          </span>

                        </div>

                        {getVerification(
                          donor
                        ) && (
                          <span className="saved-organ-donor-verified">

                            <ShieldCheck
                              size={13}
                            />

                            Verified

                          </span>
                        )}

                      </div>

                      <div className="saved-organ-donor-meta">

                        <span className="saved-organ-donor-blood">
                          {getBloodGroup(
                            donor
                          )}
                        </span>

                        <span>
                          <MapPin
                            size={13}
                          />

                          {getLocation(
                            donor
                          )}
                        </span>

                        <span>
                          {formatText(
                            getDonationType(
                              donor
                            )
                          )}
                        </span>

                      </div>

                      {organs.length >
                        0 && (
                        <div className="saved-organ-donor-organs">

                          <span>
                            Donatable organs
                          </span>

                          <div>

                            {organs
                              .slice(
                                0,
                                5
                              )
                              .map(
                                (
                                  organ
                                ) => (
                                  <span
                                    key={
                                      organ
                                    }
                                  >
                                    {
                                      getOrganEmoji(
                                        organ
                                      )
                                    }{" "}
                                    {formatOrgan(
                                      organ
                                    )}
                                  </span>
                                )
                              )}

                          </div>

                        </div>
                      )}

                    </div>

                    {/* ACTIONS */}

                    <div className="saved-organ-donor-actions">

                      <button
                        type="button"
                        className="saved-organ-donor-details"
                        onClick={() =>
                          setSelectedDonor(
                            donor
                          )
                        }
                      >
                        View Details
                        <ChevronRight
                          size={15}
                        />
                      </button>

                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="saved-organ-donor-call"
                        >
                          <Phone
                            size={14}
                          />
                          Contact
                        </a>
                      )}

                      <button
                        type="button"
                        className="saved-organ-donor-remove"
                        onClick={() =>
                          removeSavedDonor(
                            donorId
                          )
                        }
                      >
                        Remove
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </section>
        )}

      {/* INFORMATION */}

      {!loading &&
        !error &&
        savedDonors.length > 0 && (
          <div className="saved-organ-donors-information">

            <ShieldCheck size={18} />

            <div>

              <strong>
                Saved donor records
              </strong>

              <span>
                Donor information is loaded
                from the MedVisionRx organ
                donation service. Saved donor
                selections are kept in this
                browser.
              </span>

            </div>

          </div>
        )}

      {/* DETAILS MODAL */}

      {selectedDonor && (
        <div
          className="saved-organ-donors-modal-overlay"
          onClick={() =>
            setSelectedDonor(null)
          }
        >

          <div
            className="saved-organ-donors-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="saved-organ-donors-modal-header">

              <div>

                <span className="saved-organ-donors-eyebrow">
                  SAVED ORGAN DONOR
                </span>

                <h2>
                  {getName(
                    selectedDonor
                  )}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDonor(null)
                }
                aria-label="Close"
              >
                <X size={19} />
              </button>

            </div>

            <div className="saved-organ-donors-modal-body">

              <div className="saved-organ-donor-modal-profile">

                <div className="saved-organ-donor-modal-avatar">
                  <UserRound
                    size={27}
                  />
                </div>

                <div>

                  <strong>
                    {getName(
                      selectedDonor
                    )}
                  </strong>

                  {getVerification(
                    selectedDonor
                  ) && (
                    <span>

                      <ShieldCheck
                        size={13}
                      />

                      Verified donor

                    </span>
                  )}

                </div>

              </div>

              <div className="saved-organ-donor-detail-grid">

                <div>
                  <span>
                    Blood Group
                  </span>

                  <strong>
                    {getBloodGroup(
                      selectedDonor
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Gender
                  </span>

                  <strong>
                    {formatText(
                      selectedDonor.gender
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Location
                  </span>

                  <strong>
                    {getLocation(
                      selectedDonor
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Donation Type
                  </span>

                  <strong>
                    {formatText(
                      getDonationType(
                        selectedDonor
                      )
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Phone
                  </span>

                  <strong>
                    {getPhone(
                      selectedDonor
                    ) ||
                      "Not available"}
                  </strong>
                </div>

                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {selectedDonor.email ||
                      "Not available"}
                  </strong>
                </div>

                <div>
                  <span>
                    Address
                  </span>

                  <strong>
                    {selectedDonor.address ||
                      "Not available"}
                  </strong>
                </div>

                <div>
                  <span>
                    Status
                  </span>

                  <strong>
                    {formatText(
                      selectedDonor.status ||
                        selectedDonor.medical_status
                    )}
                  </strong>
                </div>

              </div>

              {getOrganList(
                selectedDonor
              ).length > 0 && (
                <div className="saved-organ-donor-modal-organs">

                  <span>
                    Donatable Organs
                  </span>

                  <div>

                    {getOrganList(
                      selectedDonor
                    ).map(
                      (organ) => (
                        <span
                          key={organ}
                        >
                          {getOrganEmoji(
                            organ
                          )}{" "}
                          {formatOrgan(
                            organ
                          )}
                        </span>
                      )
                    )}

                  </div>

                </div>
              )}

            </div>

            <div className="saved-organ-donors-modal-footer">

              {getPhone(
                selectedDonor
              ) && (
                <a
                  href={`tel:${getPhone(
                    selectedDonor
                  )}`}
                  className="saved-organ-donors-modal-call"
                >
                  <Phone size={16} />
                  Call Donor
                </a>
              )}

              <button
                type="button"
                className="saved-organ-donors-modal-map"
                onClick={() =>
                  openMap(
                    selectedDonor
                  )
                }
              >
                <MapPin size={16} />
                View Location
              </button>

              <button
                type="button"
                className="saved-organ-donors-modal-remove"
                onClick={() =>
                  removeSavedDonor(
                    getId(
                      selectedDonor
                    )
                  )
                }
              >
                Remove
              </button>

              <button
                type="button"
                className="saved-organ-donors-modal-close"
                onClick={() =>
                  setSelectedDonor(
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


    </div>
  );
}

export default SavedOrganDonors;