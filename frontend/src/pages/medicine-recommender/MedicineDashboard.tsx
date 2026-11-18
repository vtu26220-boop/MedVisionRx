import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import "./MedicineDashboard.css";

interface Medicine {
  id?: string | number;
  _id?: string | number;

  name?: string;
  brand_name?: string;
  generic_name?: string;

  strength?: string;
  dosage_form?: string;
  category?: string;

  image_url?: string;
  description?: string;

  uses?: string[];

  age_restrictions?: {
    children?: string;
    adults?: string;
    elderly?: string;
  };

  dosage_information?: {
    general?: string;
    children?: string;
    adults?: string;
    maximum_dose?: string;
  };

  warnings?: string[];
  side_effects?: string[];
  contraindications?: string[];

  storage?: string;

  buying_links?: Array<{
    pharmacy: string;
    url: string;
  }>;

  information_source?: string;
  verified?: boolean;
  last_verified?: string;

  created_at?: string;
  updated_at?: string;
}

interface MedicineApiResponse {
  items: Medicine[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface MedicineDashboardProps {
  onViewDetails?: (medicine: Medicine) => void;
  onBuyOptions?: (medicine: Medicine) => void;
}

type ModalType = "details" | "buying" | null;

const healthIssues = [
  { name: "Fever", icon: "🌡️" },
  { name: "BP", icon: "🩺" },
  { name: "Sugar", icon: "🩸" },
  { name: "Headache", icon: "🧠" },
  { name: "Cold", icon: "🤧" },
  { name: "Cough", icon: "😷" },
  { name: "Acidity", icon: "🤢" },
  { name: "Allergy", icon: "🤧" },
];

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const HERO_IMAGE_ONE =
  "/images/medicine-illustration-1.png";

const HERO_IMAGE_TWO =
  "/images/medicine-illustration-2.png";

export default function MedicineDashboard({
  onViewDetails,
  onBuyOptions,
}: MedicineDashboardProps) {
  const [search, setSearch] = useState("");
  const [selectedIssue, setSelectedIssue] = useState("");

  const [databaseMedicines, setDatabaseMedicines] =
    useState<Medicine[]>([]);

  const [totalMedicines, setTotalMedicines] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalType, setModalType] =
    useState<ModalType>(null);

  const [selectedMedicine, setSelectedMedicine] =
    useState<Medicine | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const initialLoadCompleted =
    useRef(false);

  /* ============================================================
     LOAD MEDICINES
  ============================================================ */

  const loadMedicines = async (
    searchTerm = "",
  ) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("limit", "5000");

      const cleanSearch = searchTerm.trim();

      if (cleanSearch) {
        params.set("search", cleanSearch);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/medicine-catalogue/?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(
          `Medicine API returned ${response.status}.`,
        );
      }

      const data: MedicineApiResponse =
        await response.json();

      if (!data || !Array.isArray(data.items)) {
        throw new Error(
          "Invalid response received from medicine API.",
        );
      }

      setDatabaseMedicines(data.items);

      setTotalMedicines(
        typeof data.total === "number"
          ? data.total
          : data.items.length,
      );
    } catch (err) {
      console.error(
        "Failed to load medicines:",
        err,
      );

      setDatabaseMedicines([]);
      setTotalMedicines(0);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load medicines.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    if (initialLoadCompleted.current) {
      return;
    }

    initialLoadCompleted.current = true;

    void loadMedicines();

    // Intentionally run only once.
  }, []);

  /* ============================================================
     SEARCH
  ============================================================ */

  const handleSearch = async () => {
    setSelectedIssue("");

    await loadMedicines(search.trim());
  };

  const handleSearchKeyDown = async (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    await handleSearch();
  };

  /* ============================================================
     COMMON HEALTH ISSUE
  ============================================================ */

  const handleIssueClick = async (
    issue: string,
  ) => {
    if (selectedIssue === issue) {
      setSelectedIssue("");
      setSearch("");

      await loadMedicines();

      return;
    }

    setSelectedIssue(issue);
    setSearch("");

    await loadMedicines(issue);
  };

  /* ============================================================
     CLEAR
  ============================================================ */

  const clearFilters = async () => {
    setSearch("");
    setSelectedIssue("");

    await loadMedicines();
  };

  /* ============================================================
     REFRESH
  ============================================================ */

  const handleRefresh = async () => {
    const activeSearch =
      selectedIssue || search.trim();

    await loadMedicines(activeSearch);
  };

  /* ============================================================
     GET FULL MEDICINE DETAILS
  ============================================================ */

  const fetchMedicineDetails = async (
    medicine: Medicine,
  ): Promise<Medicine> => {
    const medicineId =
      medicine.id ?? medicine._id;

    if (
      medicineId === undefined ||
      medicineId === null ||
      String(medicineId).trim() === ""
    ) {
      return medicine;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/medicine-catalogue/${encodeURIComponent(
        String(medicineId),
      )}`,
    );

    if (!response.ok) {
      throw new Error(
        `Medicine details API returned ${response.status}.`,
      );
    }

    const data: Medicine =
      await response.json();

    return data;
  };

  /* ============================================================
     OPEN DETAILS
  ============================================================ */

  const openDetails = async (
    medicine: Medicine,
  ) => {
    setSelectedMedicine(medicine);
    setModalType("details");
    setDetailsLoading(true);

    onViewDetails?.(medicine);

    try {
      const fullMedicine =
        await fetchMedicineDetails(medicine);

      setSelectedMedicine(fullMedicine);
    } catch (err) {
      console.error(
        "Failed to load medicine details:",
        err,
      );
      // Keep the card data visible if the detail request fails.
    } finally {
      setDetailsLoading(false);
    }
  };

  /* ============================================================
     OPEN BUYING OPTIONS
  ============================================================ */

  const openBuyingOptions = (
    medicine: Medicine,
  ) => {
    setSelectedMedicine(medicine);
    setModalType("buying");

    onBuyOptions?.(medicine);
  };

  /* ============================================================
     CLOSE MODAL
  ============================================================ */

  const closeModal = () => {
    setModalType(null);
    setSelectedMedicine(null);
    setDetailsLoading(false);
  };

  /* ============================================================
     ESC + BODY SCROLL
  ============================================================ */

  useEffect(() => {
    if (!modalType) {
      document.body.style.overflow = "";
      return;
    }

    const handleEscape = (
      event: globalThis.KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );

      document.body.style.overflow = "";
    };
  }, [modalType]);

  /* ============================================================
     DATE FORMAT
  ============================================================ */

  const formatDate = (
    value?: string,
  ) => {
    if (!value) {
      return "Not provided";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    );
  };

  /* ============================================================
     MEDICINE NAME
  ============================================================ */

  const getMedicineName = (
    medicine: Medicine,
  ) => {
    return (
      medicine.name ??
      medicine.brand_name ??
      "Unnamed Medicine"
    );
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <>
      <div className="medicine-dashboard-page">
        <div className="medicine-dashboard-content">

          {/* ==================================================
              HERO
          ================================================== */}

          <section className="medicine-hero">

  <div className="medicine-hero-content">

    <h1>
      Medicine{" "}
      <span>Recommender</span>
    </h1>

    

  </div>

  {/* MANUALLY ADDED MEDICINE IMAGES */}

  <div className="medicine-hero-images">

    <img
      src={HERO_IMAGE_ONE}
      alt="Medicine bottles and tablets"
      className="medicine-hero-image medicine-hero-image-one"
    />

    <img
      src={HERO_IMAGE_TWO}
      alt="Medicines and pharmaceutical products"
      className="medicine-hero-image medicine-hero-image-two"
    />

  </div>

</section>


          {/* ==================================================
              SEARCH
          ================================================== */}

          <div className="medicine-search-row">

            <div className="medicine-search-box">

              <span className="medicine-search-icon">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                onKeyDown={
                  handleSearchKeyDown
                }
                placeholder="Search for fever, bp, sugar, headache, medicine name..."
                aria-label="Search medicines"
              />

              {search && (
                <button
                  type="button"
                  className="medicine-clear-search"
                  onClick={
                    clearFilters
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

              <button
                type="button"
                className="medicine-search-button"
                onClick={
                  handleSearch
                }
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : "Search"}
              </button>

            </div>

            <button
              type="button"
              className="medicine-refresh-button"
              onClick={
                handleRefresh
              }
              disabled={loading}
              title="Refresh medicines"
            >
              <span>⟳</span>
              <span>Refresh</span>
            </button>

          </div>


          {/* ==================================================
              COMMON HEALTH ISSUES
          ================================================== */}

          <section className="medicine-issues-section">

            <div className="medicine-section-title">
              <h2>
                Common Health Issues
              </h2>
            </div>

            <div className="medicine-issues-list">

              {healthIssues.map(
                (issue) => (
                  <button
                    key={issue.name}
                    type="button"
                    className={`medicine-issue-button ${
                      selectedIssue ===
                      issue.name
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleIssueClick(
                        issue.name,
                      )
                    }
                    disabled={loading}
                  >
                    <span>
                      {issue.icon}
                    </span>

                    <span>
                      {issue.name}
                    </span>
                  </button>
                ),
              )}

            </div>

          </section>


          {/* ==================================================
              MEDICINE LIST
          ================================================== */}

          <section className="medicine-list-section">

            <div className="medicine-list-header">

              <h2>
                {search
                  ? "Search Results"
                  : selectedIssue
                  ? `${selectedIssue} Medicines`
                  : "All Medicines"}

                <span>
                  ({totalMedicines})
                </span>
              </h2>

              <div className="medicine-list-actions">

                <button
                  type="button"
                  className="medicine-list-refresh"
                  onClick={
                    handleRefresh
                  }
                  disabled={loading}
                >
                  <span>⟳</span>
                  <span>
                    Refresh
                  </span>
                </button>

                <small>
                  Scroll to explore medicines
                </small>

              </div>

            </div>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <div className="medicine-empty-state">

                <div className="medicine-empty-icon error">
                  !
                </div>

                <h3>
                  Unable to load medicines
                </h3>

                <p>
                  {error}
                </p>

                <button
                  type="button"
                  className="medicine-reset-button"
                  onClick={() =>
                    loadMedicines(
                      selectedIssue ||
                      search.trim(),
                    )
                  }
                >
                  Try Again
                </button>

              </div>
            )}


            {/* ==================================================
                LOADING
            ================================================== */}

            {!error &&
              loading && (
                <div className="medicine-empty-state">

                  <div className="medicine-empty-icon loading">
                    ⟳
                  </div>

                  <h3>
                    Loading medicines...
                  </h3>

                  <p>
                    Fetching medicine records
                    from the database.
                  </p>

                </div>
              )}


            {/* ==================================================
                EMPTY
            ================================================== */}

            {!error &&
              !loading &&
              databaseMedicines.length ===
                0 && (
                <div className="medicine-empty-state">

                  <div className="medicine-empty-icon">
                    ⌕
                  </div>

                  <h3>
                    {search ||
                    selectedIssue
                      ? "No matching medicines found"
                      : "No medicines added yet"}
                  </h3>

                  <p>
                    {search ||
                    selectedIssue
                      ? "No database records match your current search or health issue."
                      : "Medicine records added to the database will appear here."}
                  </p>

                  {(search ||
                    selectedIssue) && (
                    <button
                      type="button"
                      className="medicine-reset-button"
                      onClick={
                        clearFilters
                      }
                    >
                      Clear Filters
                    </button>
                  )}

                </div>
              )}


            {/* ==================================================
                MEDICINE CARDS
            ================================================== */}

            {!error &&
              !loading &&
              databaseMedicines.length >
                0 && (
                <div className="medicine-grid">

                  {databaseMedicines.map(
                    (medicine) => {

                      const medicineKey =
                        medicine.id ??
                        medicine._id ??
                        `${medicine.name ?? "medicine"}-${medicine.generic_name ?? ""}`;

                      const medicineName =
                        getMedicineName(
                          medicine,
                        );

                      const genericName =
                        medicine.generic_name ??
                        "";

                      const description =
                        medicine.description ??
                        "Not provided in database.";

                      const uses =
                        Array.isArray(
                          medicine.uses,
                        )
                          ? medicine.uses
                          : [];

                      return (
                        <article
                          key={medicineKey}
                          className="medicine-card"
                        >

                          {/* CARD IMAGE */}

                          <div className="medicine-card-image">

                            {medicine.image_url ? (
                              <img
                                src={
                                  medicine.image_url
                                }
                                alt={
                                  medicineName
                                }
                                loading="lazy"
                                onError={(
                                  event,
                                ) => {
                                  event.currentTarget.style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <div className="medicine-no-image">
                                💊
                              </div>
                            )}

                          </div>


                          {/* CARD BODY */}

                          <div className="medicine-card-body">

                            <h3
                              title={
                                medicineName
                              }
                            >
                              {
                                medicineName
                              }
                            </h3>

                            {genericName && (
                              <p className="medicine-generic">
                                {
                                  genericName
                                }
                              </p>
                            )}

                            <p className="medicine-description">
                              {
                                description
                              }
                            </p>


                            {/* USES */}

                            <div className="medicine-card-tags">

                              {uses.length >
                              0 ? (
                                uses
                                  .slice(
                                    0,
                                    2,
                                  )
                                  .map(
                                    (
                                      use,
                                    ) => (
                                      <span
                                        key={
                                          use
                                        }
                                      >
                                        {
                                          use
                                        }
                                      </span>
                                    ),
                                  )
                              ) : medicine.category ? (
                                <span>
                                  {
                                    medicine.category
                                  }
                                </span>
                              ) : null}

                            </div>


                            {/* BUTTONS */}

                            <div className="medicine-card-buttons">

                              <button
                                type="button"
                                className="medicine-details-button"
                                onClick={() =>
                                  openDetails(
                                    medicine,
                                  )
                                }
                              >
                                View Details
                              </button>

                              <button
                                type="button"
                                className="medicine-buy-button"
                                onClick={() =>
                                  openBuyingOptions(
                                    medicine,
                                  )
                                }
                              >
                                Buying Options
                              </button>

                            </div>

                          </div>

                        </article>
                      );
                    },
                  )}

                </div>
              )}

          </section>

        </div>
      </div>


      {/* ========================================================
          MODAL BACKDROP
      ======================================================== */}

      {modalType &&
        selectedMedicine && (
          <div
            className="medicine-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeModal();
              }
            }}
          >

            {/* ==================================================
                VIEW DETAILS MODAL
            ================================================== */}

            {modalType ===
              "details" && (
              <div
                className="medicine-modal medicine-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="medicine-details-title"
              >

                <div className="medicine-modal-header">

                  <div>
                    <h2 id="medicine-details-title">
                      Medicine Details
                    </h2>

                    <p>
                      Complete medicine information
                    </p>
                  </div>

                  <button
                    type="button"
                    className="medicine-modal-close"
                    onClick={
                      closeModal
                    }
                    aria-label="Close details"
                  >
                    ×
                  </button>

                </div>


                <div className="medicine-modal-scroll">

                  {/* TOP MEDICINE INFO */}

                  <div className="medicine-details-top">

                    <div className="medicine-details-image">

                      {selectedMedicine.image_url ? (
                        <img
                          src={
                            selectedMedicine.image_url
                          }
                          alt={
                            getMedicineName(
                              selectedMedicine,
                            )
                          }
                        />
                      ) : (
                        <div className="medicine-details-no-image">
                          💊
                        </div>
                      )}

                    </div>

                    <div className="medicine-details-identity">

                      <h3>
                        {
                          getMedicineName(
                            selectedMedicine,
                          )
                        }
                      </h3>

                      {selectedMedicine.generic_name && (
                        <p>
                          {
                            selectedMedicine.generic_name
                          }
                        </p>
                      )}

                      <div className="medicine-detail-pills">

                        {selectedMedicine.strength && (
                          <span>
                            {
                              selectedMedicine.strength
                            }
                          </span>
                        )}

                        {selectedMedicine.dosage_form && (
                          <span>
                            {
                              selectedMedicine.dosage_form
                            }
                          </span>
                        )}

                        {selectedMedicine.category && (
                          <span>
                            {
                              selectedMedicine.category
                            }
                          </span>
                        )}

                      </div>

                    </div>

                  </div>


                  {detailsLoading && (
                    <div className="medicine-detail-loading">
                      Loading latest medicine details...
                    </div>
                  )}


                  {/* BASIC INFORMATION + DESCRIPTION */}

                  <div className="medicine-details-grid">

                    <section className="medicine-detail-section">

                      <h3>
                        Basic Information
                      </h3>

                      <div className="medicine-info-list">

                        <div>
                          <span>
                            Brand Name
                          </span>

                          <strong>
                            {
                              selectedMedicine.brand_name ??
                              "Not provided"
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Generic Name
                          </span>

                          <strong>
                            {
                              selectedMedicine.generic_name ??
                              "Not provided"
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Strength
                          </span>

                          <strong>
                            {
                              selectedMedicine.strength ??
                              "Not provided"
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Dosage Form
                          </span>

                          <strong>
                            {
                              selectedMedicine.dosage_form ??
                              "Not provided"
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Category
                          </span>

                          <strong>
                            {
                              selectedMedicine.category ??
                              "Not provided"
                            }
                          </strong>
                        </div>

                      </div>

                    </section>


                    <section className="medicine-detail-section">

                      <h3>
                        Description
                      </h3>

                      <p className="medicine-long-text">
                        {
                          selectedMedicine.description ??
                          "Not provided in database."
                        }
                      </p>

                    </section>

                  </div>


                  {/* USES */}

                  <section className="medicine-detail-section full">

                    <h3>
                      Uses
                    </h3>

                    {Array.isArray(
                      selectedMedicine.uses,
                    ) &&
                    selectedMedicine.uses.length >
                      0 ? (
                      <div className="medicine-use-pills">

                        {selectedMedicine.uses.map(
                          (use) => (
                            <span
                              key={use}
                            >
                              {use}
                            </span>
                          ),
                        )}

                      </div>
                    ) : (
                      <p className="medicine-muted">
                        Not provided in database.
                      </p>
                    )}

                  </section>


                  {/* DOSAGE + AGE */}

                  <div className="medicine-details-grid">

                    <section className="medicine-detail-section">

                      <h3>
                        Dosage Information
                      </h3>

                      <div className="medicine-text-stack">

                        {selectedMedicine.dosage_information?.general && (
                          <div>
                            <strong>
                              General
                            </strong>

                            <p>
                              {
                                selectedMedicine
                                  .dosage_information
                                  .general
                              }
                            </p>
                          </div>
                        )}

                        {selectedMedicine.dosage_information?.children && (
                          <div>
                            <strong>
                              Children
                            </strong>

                            <p>
                              {
                                selectedMedicine
                                  .dosage_information
                                  .children
                              }
                            </p>
                          </div>
                        )}

                        {selectedMedicine.dosage_information?.adults && (
                          <div>
                            <strong>
                              Adults
                            </strong>

                            <p>
                              {
                                selectedMedicine
                                  .dosage_information
                                  .adults
                              }
                            </p>
                          </div>
                        )}

                        {selectedMedicine.dosage_information?.maximum_dose && (
                          <div className="medicine-warning-line">
                            <strong>
                              Maximum Dose
                            </strong>

                            <p>
                              {
                                selectedMedicine
                                  .dosage_information
                                  .maximum_dose
                              }
                            </p>
                          </div>
                        )}

                        {!selectedMedicine
                          .dosage_information
                          ?.general &&
                          !selectedMedicine
                            .dosage_information
                            ?.children &&
                          !selectedMedicine
                            .dosage_information
                            ?.adults &&
                          !selectedMedicine
                            .dosage_information
                            ?.maximum_dose && (
                            <p className="medicine-muted">
                              Not provided in database.
                            </p>
                          )}

                      </div>

                    </section>


                    <section className="medicine-detail-section">

                      <h3>
                        Age Restrictions
                      </h3>

                      <div className="medicine-text-stack">

                        {selectedMedicine.age_restrictions?.children && (
                          <div>
                            <strong>
                              Children
                            </strong>

                            <p>
                              {
                                selectedMedicine
                                  .age_restrictions
                                  .children
                              }
                            </p>
                          </div>
                        )}

                        {selectedMedicine.age_restrictions?.adults && (
                          <div>
                            <strong>
                              Adults
                            </strong>

                            <p>
                              {
                                selectedMedicine
                                  .age_restrictions
                                  .adults
                              }
                            </p>
                          </div>
                        )}

                        {selectedMedicine.age_restrictions?.elderly && (
                          <div>
                            <strong>
                              Elderly
                            </strong>

                            <p>
                              {
                                selectedMedicine
                                  .age_restrictions
                                  .elderly
                              }
                            </p>
                          </div>
                        )}

                        {!selectedMedicine
                          .age_restrictions
                          ?.children &&
                          !selectedMedicine
                            .age_restrictions
                            ?.adults &&
                          !selectedMedicine
                            .age_restrictions
                            ?.elderly && (
                            <p className="medicine-muted">
                              Not provided in database.
                            </p>
                          )}

                      </div>

                    </section>

                  </div>


                  {/* WARNINGS / SIDE EFFECTS / CONTRAINDICATIONS */}

                  <div className="medicine-details-grid three">

                    <section className="medicine-detail-section warning-section">

                      <h3>
                        Warnings
                      </h3>

                      {selectedMedicine.warnings &&
                      selectedMedicine.warnings.length >
                        0 ? (
                        <ul>
                          {selectedMedicine.warnings.map(
                            (item) => (
                              <li key={item}>
                                {item}
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="medicine-muted">
                          Not provided in database.
                        </p>
                      )}

                    </section>


                    <section className="medicine-detail-section">

                      <h3>
                        Side Effects
                      </h3>

                      {selectedMedicine.side_effects &&
                      selectedMedicine.side_effects.length >
                        0 ? (
                        <ul>
                          {selectedMedicine.side_effects.map(
                            (item) => (
                              <li key={item}>
                                {item}
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="medicine-muted">
                          Not provided in database.
                        </p>
                      )}

                    </section>


                    <section className="medicine-detail-section contraindication-section">

                      <h3>
                        Contraindications
                      </h3>

                      {selectedMedicine.contraindications &&
                      selectedMedicine.contraindications.length >
                        0 ? (
                        <ul>
                          {selectedMedicine.contraindications.map(
                            (item) => (
                              <li key={item}>
                                {item}
                              </li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="medicine-muted">
                          Not provided in database.
                        </p>
                      )}

                    </section>

                  </div>


                  {/* STORAGE / SOURCE / VERIFICATION */}

                  <div className="medicine-bottom-info">

                    <div>
                      <strong>
                        Storage
                      </strong>

                      <p>
                        {
                          selectedMedicine.storage ??
                          "Not provided"
                        }
                      </p>
                    </div>

                    <div>
                      <strong>
                        Information Source
                      </strong>

                      <p>
                        {
                          selectedMedicine.information_source ??
                          "Not provided"
                        }
                      </p>
                    </div>

                    <div>
                      <strong>
                        Verified
                      </strong>

                      <span
                        className={
                          selectedMedicine.verified
                            ? "medicine-verified yes"
                            : "medicine-verified"
                        }
                      >
                        {
                          selectedMedicine.verified
                            ? "Yes"
                            : "No"
                        }
                      </span>
                    </div>

                    <div>
                      <strong>
                        Last Verified
                      </strong>

                      <p>
                        {formatDate(
                          selectedMedicine.last_verified,
                        )}
                      </p>
                    </div>

                  </div>

                </div>

              </div>
            )}


            {/* ==================================================
                BUYING OPTIONS MODAL
            ================================================== */}

            {modalType ===
              "buying" && (
              <div
                className="medicine-modal medicine-buying-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="medicine-buying-title"
              >

                <div className="medicine-modal-header">

                  <div>
                    <h2 id="medicine-buying-title">
                      Buying Options
                    </h2>

                    <p>
                      Buying links stored for this
                      medicine
                    </p>
                  </div>

                  <button
                    type="button"
                    className="medicine-modal-close"
                    onClick={
                      closeModal
                    }
                    aria-label="Close buying options"
                  >
                    ×
                  </button>

                </div>


                <div className="medicine-modal-scroll">

                  {/* MEDICINE SUMMARY */}

                  <div className="medicine-buy-summary">

                    <div className="medicine-buy-image">

                      {selectedMedicine.image_url ? (
                        <img
                          src={
                            selectedMedicine.image_url
                          }
                          alt={
                            getMedicineName(
                              selectedMedicine,
                            )
                          }
                        />
                      ) : (
                        <div>
                          💊
                        </div>
                      )}

                    </div>

                    <div>

                      <h3>
                        {
                          getMedicineName(
                            selectedMedicine,
                          )
                        }
                      </h3>

                      {selectedMedicine.generic_name && (
                        <p>
                          {
                            selectedMedicine.generic_name
                          }
                        </p>
                      )}

                      <span>
                        {
                          selectedMedicine.strength ??
                          ""
                        }

                        {selectedMedicine.strength &&
                        selectedMedicine.dosage_form
                          ? " • "
                          : ""}

                        {
                          selectedMedicine.dosage_form ??
                          ""
                        }
                      </span>

                    </div>

                  </div>


                  {/* BUYING LINKS */}

                  {selectedMedicine.buying_links &&
                  selectedMedicine.buying_links.length >
                    0 ? (
                    <div className="medicine-retailer-list">

                      {selectedMedicine.buying_links.map(
                        (
                          link,
                          index,
                        ) => {

                          const safeUrl =
                            typeof link.url ===
                            "string"
                              ? link.url.trim()
                              : "";

                          return (
                            <div
                              className="medicine-retailer-row"
                              key={`${link.pharmacy}-${index}-${safeUrl}`}
                            >

                              <div className="medicine-retailer-number">
                                {index + 1}
                              </div>

                              <div className="medicine-retailer-name">

                                <strong>
                                  {
                                    link.pharmacy ||
                                    "Pharmacy"
                                  }
                                </strong>

                                <span>
                                  Stored buying link
                                </span>

                              </div>


                              {safeUrl ? (
                                <a
                                  href={safeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="medicine-buy-now"
                                  aria-label={`Buy ${getMedicineName(
                                    selectedMedicine,
                                  )} from ${
                                    link.pharmacy ||
                                    "pharmacy"
                                  }`}
                                >
                                  Buy Now
                                  <span>
                                    ↗
                                  </span>
                                </a>
                              ) : (
                                <span className="medicine-invalid-link">
                                  Invalid Link
                                </span>
                              )}

                            </div>
                          );
                        },
                      )}

                    </div>
                  ) : (
                    <div className="medicine-no-buying-links">

                      <div>
                        ↗
                      </div>

                      <h3>
                        No buying links available
                      </h3>

                      <p>
                        No buying links have been
                        stored for this medicine in
                        the database.
                      </p>

                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        )}

    </>
  );
}