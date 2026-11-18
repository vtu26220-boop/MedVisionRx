import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import "./NearbyOrganBanks.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

interface OrganBank {
  id?: string;
  _id?: string;

  name?: string;
  facility_name?: string;
  hospital_name?: string;

  centre_type?: string;
  center_type?: string;
  facility_type?: string;
  type?: string;

  address?: string;
  address_line?: string;
  full_address?: string;

  city?: string;
  state?: string;
  pincode?: string;
  postal_code?: string;

  phone?: string;
  phone_number?: string;
  contact_phone?: string;

  email?: string;
  website?: string;
  website_url?: string;

  organs?: string[];
  services?: string[];
  transplant_services?: string[];

  verified?: boolean;
  is_verified?: boolean;

  description?: string;

  latitude?: number;
  longitude?: number;

  location?: {
    latitude?: number;
    longitude?: number;
  };

  created_at?: string;
  updated_at?: string;
}

interface ApiResponse {
  data?: OrganBank[];
  records?: OrganBank[];
  items?: OrganBank[];
  results?: OrganBank[];

  total?: number;
  count?: number;
}

function getId(bank: OrganBank): string {
  return bank.id || bank._id || "";
}

function getName(bank: OrganBank): string {
  return (
    bank.name ||
    bank.facility_name ||
    bank.hospital_name ||
    "Organ Bank"
  );
}

function getCentreType(bank: OrganBank): string {
  return (
    bank.centre_type ||
    bank.center_type ||
    bank.facility_type ||
    bank.type ||
    "Organ Transplant Centre"
  );
}

function getAddress(bank: OrganBank): string {
  return (
    bank.address ||
    bank.address_line ||
    bank.full_address ||
    ""
  );
}

function getCity(bank: OrganBank): string {
  return bank.city || "";
}

function getState(bank: OrganBank): string {
  return bank.state || "";
}

function getPincode(bank: OrganBank): string {
  return (
    bank.pincode ||
    bank.postal_code ||
    ""
  );
}

function getPhone(bank: OrganBank): string {
  return (
    bank.phone ||
    bank.phone_number ||
    bank.contact_phone ||
    ""
  );
}

function getWebsite(bank: OrganBank): string {
  return (
    bank.website ||
    bank.website_url ||
    ""
  );
}

function getServices(bank: OrganBank): string[] {
  const values =
    bank.organs ||
    bank.services ||
    bank.transplant_services ||
    [];

  if (Array.isArray(values)) {
    return values.filter(
      (value) =>
        typeof value === "string" &&
        value.trim() !== ""
    );
  }

  return [];
}

function isVerified(bank: OrganBank): boolean {
  return (
    bank.verified === true ||
    bank.is_verified === true
  );
}

function getLatitude(bank: OrganBank) {
  return (
    bank.latitude ??
    bank.location?.latitude
  );
}

function getLongitude(bank: OrganBank) {
  return (
    bank.longitude ??
    bank.location?.longitude
  );
}

function getLocationText(bank: OrganBank): string {
  const city = getCity(bank);
  const state = getState(bank);

  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || "Location not specified";
}

function getFullAddress(bank: OrganBank): string {
  const address = getAddress(bank);
  const location = getLocationText(bank);
  const pincode = getPincode(bank);

  return [
    address,
    location,
    pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

function normalizeWebsite(
  website: string
): string {
  if (!website) {
    return "";
  }

  if (
    website.startsWith("http://") ||
    website.startsWith("https://")
  ) {
    return website;
  }

  return `https://${website}`;
}

function getMapUrl(bank: OrganBank): string {
  const latitude = getLatitude(bank);
  const longitude = getLongitude(bank);

  if (
    typeof latitude === "number" &&
    typeof longitude === "number"
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  const query = getFullAddress(bank) || getName(bank);

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
}

function extractRecords(
  data: unknown
): OrganBank[] {
  if (Array.isArray(data)) {
    return data as OrganBank[];
  }

  if (
    typeof data === "object" &&
    data !== null
  ) {
    const response = data as ApiResponse;

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.records)) {
      return response.records;
    }

    if (Array.isArray(response.items)) {
      return response.items;
    }

    if (Array.isArray(response.results)) {
      return response.results;
    }
  }

  return [];
}

function NearbyOrganBanks() {
  const [banks, setBanks] =
    useState<OrganBank[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedState, setSelectedState] =
    useState("");

  const [selectedCity, setSelectedCity] =
    useState("");

  const [selectedCentreType, setSelectedCentreType] =
    useState("");

  const [selectedBank, setSelectedBank] =
    useState<OrganBank | null>(null);

  const loadBanks = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/organ-banks/`
      );

      const data: unknown =
        await response.json();

      if (!response.ok) {
        let message =
          "Unable to load organ banks.";

        if (
          typeof data === "object" &&
          data !== null &&
          "detail" in data
        ) {
          const detail = (
            data as {
              detail?: unknown;
            }
          ).detail;

          if (
            typeof detail === "string"
          ) {
            message = detail;
          }
        }

        throw new Error(message);
      }

      setBanks(
        extractRecords(data)
      );
    } catch (err) {
      console.error(
        "Organ banks loading error:",
        err
      );

      setBanks([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load organ banks."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadBanks();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const states = useMemo(() => {
    return Array.from(
      new Set(
        banks
          .map((bank) =>
            getState(bank).trim()
          )
          .filter(Boolean)
      )
    ).sort();
  }, [banks]);

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        banks
          .filter((bank) => {
            if (!selectedState) {
              return true;
            }

            return (
              getState(bank).toLowerCase() ===
              selectedState.toLowerCase()
            );
          })
          .map((bank) =>
            getCity(bank).trim()
          )
          .filter(Boolean)
      )
    ).sort();
  }, [banks, selectedState]);

  const centreTypes = useMemo(() => {
    return Array.from(
      new Set(
        banks
          .map((bank) =>
            getCentreType(bank).trim()
          )
          .filter(Boolean)
      )
    ).sort();
  }, [banks]);

  const filteredBanks = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return banks.filter((bank) => {
      const name =
        getName(bank).toLowerCase();

      const city =
        getCity(bank).toLowerCase();

      const state =
        getState(bank).toLowerCase();

      const address =
        getAddress(bank).toLowerCase();

      const type =
        getCentreType(bank).toLowerCase();

      const services =
        getServices(bank)
          .join(" ")
          .toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        city.includes(query) ||
        state.includes(query) ||
        address.includes(query) ||
        type.includes(query) ||
        services.includes(query);

      const matchesState =
        !selectedState ||
        state ===
          selectedState.toLowerCase();

      const matchesCity =
        !selectedCity ||
        city ===
          selectedCity.toLowerCase();

      const matchesCentreType =
        !selectedCentreType ||
        type ===
          selectedCentreType.toLowerCase();

      return (
        matchesSearch &&
        matchesState &&
        matchesCity &&
        matchesCentreType
      );
    });
  }, [
    banks,
    search,
    selectedState,
    selectedCity,
    selectedCentreType,
  ]);

  const clearFilters = () => {
    setSearch("");
    setSelectedState("");
    setSelectedCity("");
    setSelectedCentreType("");
  };

  const handleStateChange = (
    value: string
  ) => {
    setSelectedState(value);
    setSelectedCity("");
  };

  const callBank = (
    bank: OrganBank
  ) => {
    const phone = getPhone(bank);

    if (!phone) {
      return;
    }

    window.location.assign(`tel:${phone}`);
  };

  const openMap = (
    bank: OrganBank
  ) => {
    window.open(
      getMapUrl(bank),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openWebsite = (
    bank: OrganBank
  ) => {
    const website =
      getWebsite(bank);

    if (!website) {
      return;
    }

    window.open(
      normalizeWebsite(website),
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="nearby-organ-banks-page">

      {/* ======================================================
          TOP INFORMATION
          ====================================================== */}

      <div className="nearby-organ-banks-info">

        <ShieldCheck size={17} />

        <span>
          Facility information is loaded from
          the MedVisionRx Organ Banks service.
          Contact the facility directly for
          current availability and transplant
          services.
        </span>

      </div>

      {/* ======================================================
          SEARCH
          ====================================================== */}

      <section className="nearby-organ-banks-search-card">

        <div className="nearby-organ-banks-search-header">

          <div>
            <h1>
              Find Organ Banks
            </h1>

            <p>
              Search by facility or location.
            </p>
          </div>

          <div className="nearby-organ-banks-filter-icon">
            <Navigation size={21} />
          </div>

        </div>

        <div className="nearby-organ-banks-filters">

          {/* SEARCH */}

          <div className="nearby-organ-banks-search-input">

            <Search size={17} />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search facility, city or service..."
            />

          </div>

          {/* STATE */}

          <div className="nearby-organ-banks-select">

            <select
              value={selectedState}
              onChange={(event) =>
                handleStateChange(
                  event.target.value
                )
              }
            >
              <option value="">
                All States
              </option>

              {states.map(
                (state) => (
                  <option
                    key={state}
                    value={state}
                  >
                    {state}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={15}
            />

          </div>

          {/* CITY */}

          <div className="nearby-organ-banks-select">

            <select
              value={selectedCity}
              onChange={(event) =>
                setSelectedCity(
                  event.target.value
                )
              }
            >
              <option value="">
                All Cities
              </option>

              {cities.map(
                (city) => (
                  <option
                    key={city}
                    value={city}
                  >
                    {city}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={15}
            />

          </div>

          {/* CENTRE TYPE */}

          <div className="nearby-organ-banks-select">

            <select
              value={
                selectedCentreType
              }
              onChange={(event) =>
                setSelectedCentreType(
                  event.target.value
                )
              }
            >
              <option value="">
                All Centre Types
              </option>

              {centreTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={15}
            />

          </div>

          {/* CLEAR */}

          <button
            type="button"
            className="nearby-organ-banks-clear"
            onClick={
              clearFilters
            }
          >
            Clear
          </button>

        </div>

      </section>

      {/* ======================================================
          RESULT HEADER
          ====================================================== */}

      <div className="nearby-organ-banks-result-header">

        <div>
          <strong>
            {filteredBanks.length}
          </strong>

          <span>
            facilities found
          </span>
        </div>

        <span>
          {banks.length} total records
        </span>

      </div>

      {/* ======================================================
          LOADING
          ====================================================== */}

      {loading && (
        <div className="nearby-organ-banks-loading">

          <Loader2
            size={27}
            className="nearby-organ-banks-spin"
          />

          <span>
            Loading organ facilities...
          </span>

        </div>
      )}

      {/* ======================================================
          ERROR
          ====================================================== */}

      {!loading && error && (
        <div className="nearby-organ-banks-error">

          <XCircle size={25} />

          <div>
            <strong>
              Unable to load organ banks
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={loadBanks}
          >
            Try Again
          </button>

        </div>
      )}

      {/* ======================================================
          EMPTY
          ====================================================== */}

      {!loading &&
        !error &&
        filteredBanks.length === 0 && (
          <div className="nearby-organ-banks-empty">

            <Building2 size={31} />

            <h2>
              No facilities found
            </h2>

            <p>
              Try changing your search or
              clearing the filters.
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
            >
              Clear Filters
            </button>

          </div>
        )}

      {/* ======================================================
          FACILITY GRID
          ====================================================== */}

      {!loading &&
        !error &&
        filteredBanks.length > 0 && (
          <div className="nearby-organ-banks-grid">

            {filteredBanks.map(
              (bank, index) => {

                const phone =
                  getPhone(bank);

                const website =
                  getWebsite(bank);

                const services =
                  getServices(bank);

                return (
                  <article
                    className="nearby-organ-bank-card"
                    key={
                      getId(bank) ||
                      `${getName(bank)}-${index}`
                    }
                  >

                    {/* CARD HEADER */}

                    <div className="nearby-organ-bank-card-header">

                      <div className="nearby-organ-bank-icon">
                        <Building2
                          size={22}
                        />
                      </div>

                      <div className="nearby-organ-bank-title">

                        <div className="nearby-organ-bank-name-row">

                          <h2>
                            {getName(
                              bank
                            )}
                          </h2>

                          {isVerified(
                            bank
                          ) && (
                            <span className="nearby-organ-bank-verified">

                              <ShieldCheck
                                size={12}
                              />

                              Verified

                            </span>
                          )}

                        </div>

                        <p>
                          {getCentreType(
                            bank
                          )}
                        </p>

                      </div>

                    </div>

                    {/* LOCATION */}

                    <div className="nearby-organ-bank-location">

                      <MapPin
                        size={16}
                      />

                      <div>

                        <strong>
                          {getLocationText(
                            bank
                          )}
                        </strong>

                        {getAddress(
                          bank
                        ) && (
                          <span>
                            {getAddress(
                              bank
                            )}

                            {getPincode(
                              bank
                            ) &&
                              `, ${getPincode(
                                bank
                              )}`}
                          </span>
                        )}

                      </div>

                    </div>

                    {/* SERVICES */}

                    {services.length >
                      0 && (
                      <div className="nearby-organ-bank-services">

                        {services
                          .slice(0, 3)
                          .map(
                            (
                              service
                            ) => (
                              <span
                                key={
                                  service
                                }
                              >
                                {service}
                              </span>
                            )
                          )}

                      </div>
                    )}

                    {/* PHONE */}

                    {phone && (
                      <div className="nearby-organ-bank-phone">

                        <Phone
                          size={15}
                        />

                        <span>
                          {phone}
                        </span>

                      </div>
                    )}

                    {/* DIVIDER */}

                    <div className="nearby-organ-bank-divider" />

                    {/* ACTIONS */}

                    <div className="nearby-organ-bank-actions">

                      <button
                        type="button"
                        className="nearby-organ-bank-call"
                        onClick={() =>
                          callBank(
                            bank
                          )
                        }
                        disabled={!phone}
                      >
                        <Phone
                          size={14}
                        />
                        Call
                      </button>

                      <button
                        type="button"
                        className="nearby-organ-bank-map"
                        onClick={() =>
                          openMap(
                            bank
                          )
                        }
                      >
                        <Navigation
                          size={14}
                        />
                        Map
                      </button>

                      <button
                        type="button"
                        className="nearby-organ-bank-website"
                        onClick={() =>
                          openWebsite(
                            bank
                          )
                        }
                        disabled={
                          !website
                        }
                      >
                        <Globe
                          size={14}
                        />
                        Website
                      </button>

                    </div>

                    {/* DETAILS */}

                    <button
                      type="button"
                      className="nearby-organ-bank-details"
                      onClick={() =>
                        setSelectedBank(
                          bank
                        )
                      }
                    >
                      View Facility Details
                      <ExternalLink
                        size={13}
                      />
                    </button>

                  </article>
                );
              }
            )}

          </div>
        )}

      {/* ======================================================
          DETAILS MODAL
          ====================================================== */}

      {selectedBank && (
        <div
          className="nearby-organ-bank-modal-overlay"
          onClick={() =>
            setSelectedBank(
              null
            )
          }
        >

          <div
            className="nearby-organ-bank-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="nearby-organ-bank-modal-header">

              <div className="nearby-organ-bank-modal-title">

                <div className="nearby-organ-bank-icon">
                  <Building2
                    size={22}
                  />
                </div>

                <div>

                  <span>
                    ORGAN FACILITY
                  </span>

                  <h2>
                    {getName(
                      selectedBank
                    )}
                  </h2>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedBank(
                    null
                  )
                }
                aria-label="Close"
              >
                <X size={18} />
              </button>

            </div>

            <div className="nearby-organ-bank-modal-body">

              <div className="nearby-organ-bank-modal-status">

                {isVerified(
                  selectedBank
                ) && (
                  <span>
                    <CheckCircle2
                      size={13}
                    />
                    Verified Facility
                  </span>
                )}

                <span>
                  {getCentreType(
                    selectedBank
                  )}
                </span>

              </div>

              <div className="nearby-organ-bank-detail-section">

                <h3>
                  Location
                </h3>

                <div className="nearby-organ-bank-detail-location">

                  <MapPin
                    size={17}
                  />

                  <div>

                    <strong>
                      {getLocationText(
                        selectedBank
                      )}
                    </strong>

                    <span>
                      {getFullAddress(
                        selectedBank
                      ) ||
                        "Address not available"}
                    </span>

                  </div>

                </div>

              </div>

              {getServices(
                selectedBank
              ).length > 0 && (
                <div className="nearby-organ-bank-detail-section">

                  <h3>
                    Services
                  </h3>

                  <div className="nearby-organ-bank-modal-services">

                    {getServices(
                      selectedBank
                    ).map(
                      (service) => (
                        <span
                          key={service}
                        >
                          {service}
                        </span>
                      )
                    )}

                  </div>

                </div>
              )}

              <div className="nearby-organ-bank-detail-section">

                <h3>
                  Contact
                </h3>

                <div className="nearby-organ-bank-contact-grid">

                  <div>

                    <Phone size={15} />

                    <div>

                      <span>
                        Phone
                      </span>

                      <strong>
                        {getPhone(
                          selectedBank
                        ) ||
                          "Not available"}
                      </strong>

                    </div>

                  </div>

                  <div>

                    <Globe size={15} />

                    <div>

                      <span>
                        Website
                      </span>

                      <strong>
                        {getWebsite(
                          selectedBank
                        ) ||
                          "Not available"}
                      </strong>

                    </div>

                  </div>

                </div>

              </div>

              {selectedBank.description && (
                <div className="nearby-organ-bank-detail-section">

                  <h3>
                    About Facility
                  </h3>

                  <p className="nearby-organ-bank-description">
                    {
                      selectedBank.description
                    }
                  </p>

                </div>
              )}

            </div>

            <div className="nearby-organ-bank-modal-footer">

              <button
                type="button"
                className="nearby-organ-bank-call"
                onClick={() =>
                  callBank(
                    selectedBank
                  )
                }
                disabled={
                  !getPhone(
                    selectedBank
                  )
                }
              >
                <Phone
                  size={15}
                />
                Call
              </button>

              <button
                type="button"
                className="nearby-organ-bank-map"
                onClick={() =>
                  openMap(
                    selectedBank
                  )
                }
              >
                <Navigation
                  size={15}
                />
                Open Map
              </button>

              <button
                type="button"
                className="nearby-organ-bank-website"
                onClick={() =>
                  openWebsite(
                    selectedBank
                  )
                }
                disabled={
                  !getWebsite(
                    selectedBank
                  )
                }
              >
                <Globe
                  size={15}
                />
                Website
              </button>

              <button
                type="button"
                className="nearby-organ-bank-modal-close"
                onClick={() =>
                  setSelectedBank(
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

export default NearbyOrganBanks;