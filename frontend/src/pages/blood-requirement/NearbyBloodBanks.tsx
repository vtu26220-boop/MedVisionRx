import { useEffect, useMemo, useState } from "react";

import {
  Building2,
  Droplets,
  ExternalLink,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import "./NearbyBloodBanks.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

interface BloodBank {
  id: string;
  name: string;
  address?: string;
  city: string;
  state: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
];

function NearbyBloodBanks() {
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);

  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // FETCH BLOOD BANKS
  // =====================================================

  const fetchBloodBanks = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/blood-banks/`
      );

      if (!response.ok) {
        throw new Error("Unable to fetch blood banks");
      }

      const data: BloodBank[] = await response.json();

      setBloodBanks(data);
    } catch (err) {
      console.error("Blood bank error:", err);

      setBloodBanks([]);

      setError(
        "Unable to load blood banks. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchBloodBanks();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  // =====================================================
  // ACTIVE BLOOD BANKS
  // =====================================================

  const activeBloodBanks = useMemo(() => {
    return bloodBanks.filter(
      (bank) => bank.is_active
    );
  }, [bloodBanks]);

  // =====================================================
  // AVAILABLE CITIES
  // =====================================================

  const availableCities = useMemo(() => {
    const cities = activeBloodBanks
      .filter(
        (bank) =>
          !state ||
          bank.state?.toLowerCase() ===
            state.toLowerCase()
      )
      .map((bank) => bank.city)
      .filter(Boolean);

    return Array.from(
      new Set(cities)
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [activeBloodBanks, state]);

  // =====================================================
  // FILTERED RESULTS
  // =====================================================

  const filteredBanks = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return activeBloodBanks.filter((bank) => {
      const matchesSearch =
        !searchValue ||
        bank.name
          ?.toLowerCase()
          .includes(searchValue) ||
        bank.city
          ?.toLowerCase()
          .includes(searchValue) ||
        bank.state
          ?.toLowerCase()
          .includes(searchValue) ||
        bank.address
          ?.toLowerCase()
          .includes(searchValue);

      const matchesState =
        !state ||
        bank.state?.toLowerCase() ===
          state.toLowerCase();

      const matchesCity =
        !city ||
        bank.city?.toLowerCase() ===
          city.toLowerCase();

      return (
        matchesSearch &&
        matchesState &&
        matchesCity
      );
    });
  }, [
    activeBloodBanks,
    search,
    state,
    city,
  ]);

  // =====================================================
  // STATE CHANGE
  // =====================================================

  const handleStateChange = (
    value: string
  ) => {
    setState(value);

    // Reset city when state changes
    setCity("");
  };

  // =====================================================
  // MAP URL
  // =====================================================

  const getMapUrl = (
    bank: BloodBank
  ) => {
    if (
      typeof bank.latitude === "number" &&
      typeof bank.longitude === "number"
    ) {
      return `https://www.google.com/maps/search/?api=1&query=${bank.latitude},${bank.longitude}`;
    }

    const address = [
      bank.name,
      bank.address,
      bank.city,
      bank.state,
      bank.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  };

  // =====================================================
  // STATES COUNT
  // =====================================================

  const statesCovered = useMemo(() => {
    return new Set(
      activeBloodBanks
        .map((bank) => bank.state)
        .filter(Boolean)
    ).size;
  }, [activeBloodBanks]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="nearby-blood-banks-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <section className="nearby-blood-banks-header">
        <div>
          <span className="nearby-blood-banks-eyebrow">
            BLOOD REQUIREMENT
          </span>

          <h1>
            Nearby Blood Banks
          </h1>

          <p>
            Find active blood banks and blood
            collection centres by city or state.
          </p>
        </div>

        <button
          type="button"
          className="nearby-blood-banks-refresh"
          onClick={fetchBloodBanks}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "nearby-blood-banks-spin"
                : ""
            }
          />

          Refresh
        </button>
      </section>

      {/* =================================================
          BLOOD DONATION FREQUENCY
          ================================================= */}

      <section className="nearby-blood-banks-frequency">

        <div className="nearby-blood-banks-frequency-icon">
          <Droplets size={22} />
        </div>

        <div className="nearby-blood-banks-frequency-content">

          <h2>
            Whole Blood Donation Frequency
          </h2>

          <p>
            Donors should follow the recommended
            interval between whole-blood donations.
            The final decision is made by qualified
            blood-bank medical staff after screening.
          </p>

          <div className="nearby-blood-banks-frequency-options">

            <div className="frequency-option">
              <strong>
                Men
              </strong>

              <span>
                Every 90 days (3 months)
              </span>
            </div>

            <div className="frequency-option">
              <strong>
                Women
              </strong>

              <span>
                Every 120 days (4 months)
              </span>
            </div>

          </div>

          <small>
            Donation eligibility may depend on
            health, haemoglobin, previous donation
            date and other screening criteria.
          </small>

        </div>

      </section>

      {/* =================================================
          STATISTICS
          ================================================= */}

      <section className="nearby-blood-banks-stats">

        <div className="nearby-blood-banks-stat-card">

          <div className="nearby-blood-banks-stat-icon">
            <Building2 size={21} />
          </div>

          <div>
            <span>
              Total Blood Banks
            </span>

            <strong>
              {loading
                ? "—"
                : activeBloodBanks.length}
            </strong>
          </div>

        </div>

        <div className="nearby-blood-banks-stat-card">

          <div className="nearby-blood-banks-stat-icon">
            <MapPin size={21} />
          </div>

          <div>
            <span>
              States Covered
            </span>

            <strong>
              {loading
                ? "—"
                : statesCovered}
            </strong>
          </div>

        </div>

        <div className="nearby-blood-banks-stat-card">

          <div className="nearby-blood-banks-stat-icon">
            <Droplets size={21} />
          </div>

          <div>
            <span>
              Showing Results
            </span>

            <strong>
              {loading
                ? "—"
                : filteredBanks.length}
            </strong>
          </div>

        </div>

      </section>

      {/* =================================================
          FILTERS
          ================================================= */}

      <section className="nearby-blood-banks-filter-card">

        <div className="nearby-blood-banks-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search blood bank, city, state or address..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

        <select
          value={state}
          onChange={(event) =>
            handleStateChange(
              event.target.value
            )
          }
          className="nearby-blood-banks-filter-select"
        >
          <option value="">
            All States
          </option>

          {INDIAN_STATES.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

        <select
          value={city}
          onChange={(event) =>
            setCity(event.target.value)
          }
          className="nearby-blood-banks-filter-select"
        >
          <option value="">
            All Cities
          </option>

          {availableCities.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

      </section>

      {/* =================================================
          SUMMARY
          ================================================= */}

      <div className="nearby-blood-banks-summary">

        <div>
          <strong>
            {loading
              ? "—"
              : filteredBanks.length}
          </strong>

          <span>
            {filteredBanks.length === 1
              ? "blood bank found"
              : "blood banks found"}
          </span>
        </div>

        <span>
          Showing active blood-bank records
          from MedVisionRx
        </span>

      </div>

      {/* =================================================
          ERROR
          ================================================= */}

      {error && (
        <div className="nearby-blood-banks-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={fetchBloodBanks}
          >
            Retry
          </button>

        </div>
      )}

      {/* =================================================
          LOADING
          ================================================= */}

      {loading && (
        <div className="nearby-blood-banks-loading">

          <RefreshCw
            size={25}
            className="nearby-blood-banks-spin"
          />

          <p>
            Loading blood banks...
          </p>

        </div>
      )}

      {/* =================================================
          EMPTY
          ================================================= */}

      {!loading &&
        !error &&
        filteredBanks.length === 0 && (
          <div className="nearby-blood-banks-empty">

            <div className="nearby-blood-banks-empty-icon">
              <Building2 size={30} />
            </div>

            <h3>
              No blood banks found
            </h3>

            <p>
              No blood bank matches your current
              search or filter.
            </p>

          </div>
        )}

      {/* =================================================
          BLOOD BANK GRID
          ================================================= */}

      {!loading &&
        filteredBanks.length > 0 && (
          <section className="nearby-blood-banks-grid">

            {filteredBanks.map((bank) => (
              <article
                key={bank.id}
                className="nearby-blood-bank-card"
              >

                {/* CARD HEADER */}

                <div className="nearby-blood-bank-card-header">

                  <div className="nearby-blood-bank-icon">
                    <Building2 size={21} />
                  </div>

                  <div className="nearby-blood-bank-title">
                    <span className="nearby-blood-bank-status">
                      <span />
                      Active
                    </span>

                    <h2>
                      {bank.city}
                    </h2>

                    <p>
                      {bank.name}
                    </p>
                  </div>

                </div>

                {/* LOCATION */}

                <div className="nearby-blood-bank-location">

                  <MapPin size={17} />

                  <div>

                    {bank.address && (
                      <p>
                        {bank.address}
                      </p>
                    )}

                    <p>
                      {bank.city},{" "}
                      {bank.state}
                      {bank.pincode
                        ? ` - ${bank.pincode}`
                        : ""}
                    </p>

                  </div>

                </div>

                {/* PHONE */}

                {bank.phone && (
                  <div className="nearby-blood-bank-phone">

                    <Phone size={16} />

                    <span>
                      {bank.phone}
                    </span>

                  </div>
                )}

                {/* ACTIONS */}

                <div className="nearby-blood-bank-actions">

                  {bank.phone ? (
                    <a
                      href={`tel:${bank.phone}`}
                      className="nearby-blood-bank-call"
                    >
                      <Phone size={15} />

                      Call
                    </a>
                  ) : (
                    <span className="nearby-blood-bank-no-contact">
                      Phone unavailable
                    </span>
                  )}

                  <a
                    href={getMapUrl(bank)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nearby-blood-bank-map"
                  >
                    <MapPin size={15} />

                    Map
                  </a>

                </div>

                {/* WEBSITE */}

                {bank.website && (
                  <a
                    href={bank.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nearby-blood-bank-website"
                  >
                    <span>
                      <ExternalLink size={13} />
                      Visit Website
                    </span>
                  </a>
                )}

              </article>
            ))}

          </section>
        )}

      {/* =================================================
          INFO
          ================================================= */}

      <div className="nearby-blood-banks-info">

        <ShieldCheck size={18} />

        <p>
          Blood-bank information shown here comes
          from the MedVisionRx blood-bank database.
          Availability of specific blood groups should
          be confirmed directly with the blood bank
          before visiting.
        </p>

      </div>

    </div>
  );
}

export default NearbyBloodBanks;