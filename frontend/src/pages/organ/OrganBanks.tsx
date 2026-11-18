import {
  Building2,
  ExternalLink,
  Filter,
  Globe,
  HeartPulse,
  Mail,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import "./OrganBanks.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

interface OrganBank {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  services: string[];
  verified: boolean;
}

interface RawOrganBank {
  id?: string;
  _id?: string;
  name?: string;
  facility_name?: string;
  hospital_name?: string;
  type?: string;
  facility_type?: string;
  centre_type?: string;
  city?: string;
  state?: string;
  address?: string;
  phone?: string;
  contact_phone?: string;
  email?: string;
  contact_email?: string;
  website?: string;
  services?: string[];
  verified?: boolean;
}

function normalizeOrganBank(
  item: RawOrganBank
): OrganBank {
  return {
    id: item.id || item._id || crypto.randomUUID(),
    name:
      item.name ||
      item.facility_name ||
      item.hospital_name ||
      "Organ Donation Centre",
    type:
      item.type ||
      item.facility_type ||
      item.centre_type ||
      "Organ Donation / Transplant Centre",
    city: item.city || "",
    state: item.state || "",
    address: item.address || "",
    phone:
      item.phone ||
      item.contact_phone ||
      "",
    email:
      item.email ||
      item.contact_email ||
      "",
    website: item.website || "",
    services: Array.isArray(item.services)
      ? item.services
      : [],
    verified:
      item.verified === undefined
        ? false
        : Boolean(item.verified),
  };
}

function buildMapUrl(bank: OrganBank) {
  const location = [
    bank.name,
    bank.address,
    bank.city,
    bank.state,
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location
  )}`;
}

function OrganBanks() {
  const [banks, setBanks] = useState<OrganBank[]>(
    []
  );

  const [loading, setLoading] =
    useState<boolean>(true);

  const [refreshing, setRefreshing] =
    useState<boolean>(false);

  const [error, setError] = useState<string>("");

  const [search, setSearch] =
    useState<string>("");

  const [stateFilter, setStateFilter] =
    useState<string>("all");

  const [cityFilter, setCityFilter] =
    useState<string>("all");

  const [typeFilter, setTypeFilter] =
    useState<string>("all");

  const [selectedBank, setSelectedBank] =
    useState<OrganBank | null>(null);

  const loadOrganBanks = async (
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/organ-banks/`
      );

      if (!response.ok) {
        throw new Error(
          `Organ Banks API returned ${response.status}`
        );
      }

      const data: unknown =
        await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid Organ Banks API response."
        );
      }

      const normalized = (
        data as RawOrganBank[]
      )
        .map(normalizeOrganBank)
        .filter((bank) => bank.name);

      setBanks(normalized);
    } catch (fetchError) {
      console.error(
        "Organ Banks API error:",
        fetchError
      );

      setBanks([]);

      setError(
        "Unable to load Organ Banks from the database. Please make sure the Organ Banks API is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadOrganBanks();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const states = useMemo(() => {
    return Array.from(
      new Set(
        banks
          .map((bank) => bank.state)
          .filter(Boolean)
      )
    ).sort();
  }, [banks]);

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        banks
          .filter(
            (bank) =>
              stateFilter === "all" ||
              bank.state === stateFilter
          )
          .map((bank) => bank.city)
          .filter(Boolean)
      )
    ).sort();
  }, [banks, stateFilter]);

  const types = useMemo(() => {
    return Array.from(
      new Set(
        banks
          .map((bank) => bank.type)
          .filter(Boolean)
      )
    ).sort();
  }, [banks]);

  const filteredBanks = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return banks.filter((bank) => {
      const searchableText = [
        bank.name,
        bank.type,
        bank.city,
        bank.state,
        bank.address,
        ...bank.services,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword ||
        searchableText.includes(keyword);

      const matchesState =
        stateFilter === "all" ||
        bank.state === stateFilter;

      const matchesCity =
        cityFilter === "all" ||
        bank.city === cityFilter;

      const matchesType =
        typeFilter === "all" ||
        bank.type === typeFilter;

      return (
        matchesSearch &&
        matchesState &&
        matchesCity &&
        matchesType
      );
    });
  }, [
    banks,
    search,
    stateFilter,
    cityFilter,
    typeFilter,
  ]);

  const clearFilters = () => {
    setSearch("");
    setStateFilter("all");
    setCityFilter("all");
    setTypeFilter("all");
  };

  const handleStateChange = (
    value: string
  ) => {
    setStateFilter(value);
    setCityFilter("all");
  };

  return (
    <div className="organ-banks-page">
      <div className="organ-banks-container">

        {/* PAGE HEADER */}

        <div className="organ-banks-header">
          <div className="organ-banks-title-row">

            <div className="organ-banks-title-icon">
              <HeartPulse size={24} />
            </div>

            <div>
              <h1>Organ Banks</h1>

              <p>
                Find organ donation, transplant and
                tissue facilities.
              </p>
            </div>

          </div>

          <button
            type="button"
            className="organ-banks-refresh"
            onClick={() =>
              void loadOrganBanks(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "organ-banks-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>

        {/* INFORMATION */}

        <div className="organ-banks-info">
          <ShieldCheck size={18} />

          <div>
            <strong>
              Organ facility directory
            </strong>

            <p>
              Facility information is loaded from
              the MedVisionRx Organ Banks service.
              Contact the facility directly for
              current availability and transplant
              services.
            </p>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="organ-banks-error">
            <span>{error}</span>
          </div>
        )}

        {/* FILTER CARD */}

        <section className="organ-banks-filter-card">

          <div className="organ-banks-filter-heading">

            <div>
              <h2>
                Find Organ Banks
              </h2>

              <p>
                Search by facility or location.
              </p>
            </div>

            <Filter size={19} />

          </div>

          <div className="organ-banks-filters">

            {/* SEARCH */}

            <div className="organ-banks-search">

              <Search size={18} />

              <input
                type="text"
                value={search}
                placeholder="Search facility, city or service..."
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}

            </div>

            {/* STATE */}

            <select
              value={stateFilter}
              onChange={(event) =>
                handleStateChange(
                  event.target.value
                )
              }
            >
              <option value="all">
                All States
              </option>

              {states.map((state) => (
                <option
                  key={state}
                  value={state}
                >
                  {state}
                </option>
              ))}
            </select>

            {/* CITY */}

            <select
              value={cityFilter}
              onChange={(event) =>
                setCityFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Cities
              </option>

              {cities.map((city) => (
                <option
                  key={city}
                  value={city}
                >
                  {city}
                </option>
              ))}
            </select>

            {/* TYPE */}

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Centre Types
              </option>

              {types.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>

            {/* CLEAR */}

            <button
              type="button"
              className="organ-banks-clear"
              onClick={clearFilters}
            >
              Clear
            </button>

          </div>
        </section>

        {/* RESULT COUNT */}

        <div className="organ-banks-results-header">

          <span>
            <strong>
              {filteredBanks.length}
            </strong>{" "}
            {filteredBanks.length === 1
              ? "facility"
              : "facilities"}{" "}
            found
          </span>

          <span>
            {banks.length} total records
          </span>

        </div>

        {/* LOADING */}

        {loading ? (
          <div className="organ-banks-loading">

            <RefreshCw
              size={28}
              className="organ-banks-spin"
            />

            <p>
              Loading Organ Banks...
            </p>

          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="organ-banks-empty">

            <Building2 size={40} />

            <h3>
              No organ banks found
            </h3>

            <p>
              There are no Organ Bank records
              matching your search.
            </p>

            <button
              type="button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>

          </div>
        ) : (
          <div className="organ-banks-grid">

            {filteredBanks.map((bank) => (
              <article
                key={bank.id}
                className="organ-bank-card"
              >

                {/* CARD HEADER */}

                <div className="organ-bank-card-top">

                  <div className="organ-bank-icon">
                    <Building2 size={22} />
                  </div>

                  <div className="organ-bank-heading">

                    <div className="organ-bank-name-row">

                      <h3>
                        {bank.name}
                      </h3>

                      {bank.verified && (
                        <span className="organ-bank-verified">
                          <ShieldCheck
                            size={13}
                          />
                          Verified
                        </span>
                      )}

                    </div>

                    <span className="organ-bank-type">
                      {bank.type}
                    </span>

                  </div>

                </div>

                {/* LOCATION */}

                <div className="organ-bank-location">

                  <MapPin size={17} />

                  <div>
                    <strong>
                      {bank.city ||
                        "Location unavailable"}
                      {bank.state
                        ? `, ${bank.state}`
                        : ""}
                    </strong>

                    {bank.address && (
                      <p>
                        {bank.address}
                      </p>
                    )}
                  </div>

                </div>

                {/* SERVICES */}

                {bank.services.length > 0 && (
                  <div className="organ-bank-services">

                    {bank.services
                      .slice(0, 5)
                      .map((service) => (
                        <span
                          key={service}
                          className="organ-bank-service"
                        >
                          {service}
                        </span>
                      ))}

                  </div>
                )}

                {/* CONTACT */}

                <div className="organ-bank-contact">

                  {bank.phone && (
                    <a
                      href={`tel:${bank.phone}`}
                      className="organ-bank-contact-item"
                    >
                      <Phone size={16} />
                      <span>
                        {bank.phone}
                      </span>
                    </a>
                  )}

                  {bank.email && (
                    <a
                      href={`mailto:${bank.email}`}
                      className="organ-bank-contact-item"
                    >
                      <Mail size={16} />
                      <span>
                        {bank.email}
                      </span>
                    </a>
                  )}

                </div>

                {/* ACTION BUTTONS */}

                <div className="organ-bank-actions">

                  {bank.phone ? (
                    <a
                      href={`tel:${bank.phone}`}
                      className="organ-bank-action primary"
                    >
                      <Phone size={16} />
                      Call
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="organ-bank-action disabled"
                      disabled
                    >
                      <Phone size={16} />
                      Call
                    </button>
                  )}

                  <a
                    href={buildMapUrl(bank)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="organ-bank-action"
                  >
                    <Navigation size={16} />
                    Map
                  </a>

                  {bank.website ? (
                    <a
                      href={bank.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="organ-bank-action"
                    >
                      <Globe size={16} />
                      Website
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="organ-bank-action disabled"
                      disabled
                    >
                      <Globe size={16} />
                      Website
                    </button>
                  )}

                </div>

                {/* DETAILS */}

                <button
                  type="button"
                  className="organ-bank-details-button"
                  onClick={() =>
                    setSelectedBank(bank)
                  }
                >
                  View Facility Details
                  <ExternalLink size={15} />
                </button>

              </article>
            ))}

          </div>
        )}

        {/* FOOTER */}

        <div className="organ-banks-footer-note">

          <ShieldCheck size={15} />

          <span>
            Always confirm facility details,
            transplant services and contact
            information directly with the
            healthcare organisation.
          </span>

        </div>

      </div>

      {/* DETAILS MODAL */}

      {selectedBank && (
        <div
          className="organ-banks-modal-overlay"
          onClick={() =>
            setSelectedBank(null)
          }
        >
          <div
            className="organ-banks-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="organ-banks-modal-header">

              <div>
                <span>
                  Facility Details
                </span>

                <h2>
                  {selectedBank.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedBank(null)
                }
                aria-label="Close"
              >
                <X size={20} />
              </button>

            </div>

            <div className="organ-banks-modal-content">

              <div className="organ-banks-modal-item">

                <Building2 size={18} />

                <div>
                  <span>
                    Centre Type
                  </span>

                  <strong>
                    {selectedBank.type}
                  </strong>
                </div>

              </div>

              <div className="organ-banks-modal-item">

                <MapPin size={18} />

                <div>
                  <span>
                    Location
                  </span>

                  <strong>
                    {selectedBank.city}
                    {selectedBank.state
                      ? `, ${selectedBank.state}`
                      : ""}
                  </strong>

                  {selectedBank.address && (
                    <p>
                      {selectedBank.address}
                    </p>
                  )}
                </div>

              </div>

              {selectedBank.phone && (
                <div className="organ-banks-modal-item">

                  <Phone size={18} />

                  <div>
                    <span>
                      Phone
                    </span>

                    <strong>
                      {selectedBank.phone}
                    </strong>
                  </div>

                </div>
              )}

              {selectedBank.email && (
                <div className="organ-banks-modal-item">

                  <Mail size={18} />

                  <div>
                    <span>
                      Email
                    </span>

                    <strong>
                      {selectedBank.email}
                    </strong>
                  </div>

                </div>
              )}

              {selectedBank.website && (
                <div className="organ-banks-modal-item">

                  <Globe size={18} />

                  <div>
                    <span>
                      Website
                    </span>

                    <strong>
                      {selectedBank.website}
                    </strong>
                  </div>

                </div>
              )}

              {selectedBank.services.length > 0 && (
                <div className="organ-banks-modal-services">

                  <span>
                    Services
                  </span>

                  <div>
                    {selectedBank.services.map(
                      (service) => (
                        <span key={service}>
                          {service}
                        </span>
                      )
                    )}
                  </div>

                </div>
              )}

            </div>

            <div className="organ-banks-modal-actions">

              <a
                href={buildMapUrl(
                  selectedBank
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="organ-bank-action primary"
              >
                <Navigation size={16} />
                Open Map
              </a>

              {selectedBank.phone && (
                <a
                  href={`tel:${selectedBank.phone}`}
                  className="organ-bank-action"
                >
                  <Phone size={16} />
                  Call
                </a>
              )}

              {selectedBank.website && (
                <a
                  href={selectedBank.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="organ-bank-action"
                >
                  <Globe size={16} />
                  Website
                </a>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default OrganBanks;