import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Globe,
  Navigation,
  RefreshCw,
  AlertCircle,
  Droplets,
} from "lucide-react";

import "./BloodBanks.css";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

interface BloodBank {
  id: string;
  name: string;
  organization?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  whatsapp_number?: string | null;
  email?: string | null;
  website_url?: string | null;
  opening_hours?: string | null;
  available_blood_groups?: string[];
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
}

function BloodBanks() {
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

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

      setBloodBanks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Blood bank fetch error:", err);
      setError(
        "Unable to load blood banks. Please make sure the backend server is running."
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

  const states = useMemo(() => {
    return Array.from(
      new Set(
        bloodBanks
          .map((bank) => bank.state)
          .filter(Boolean)
      )
    ).sort();
  }, [bloodBanks]);

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        bloodBanks
          .filter(
            (bank) =>
              !stateFilter ||
              bank.state.toLowerCase() === stateFilter.toLowerCase()
          )
          .map((bank) => bank.city)
          .filter(Boolean)
      )
    ).sort();
  }, [bloodBanks, stateFilter]);

  const filteredBanks = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return bloodBanks.filter((bank) => {
      const matchesSearch =
        !searchValue ||
        bank.name.toLowerCase().includes(searchValue) ||
        (bank.organization || "")
          .toLowerCase()
          .includes(searchValue) ||
        bank.address.toLowerCase().includes(searchValue) ||
        bank.city.toLowerCase().includes(searchValue) ||
        bank.state.toLowerCase().includes(searchValue);

      const matchesState =
        !stateFilter ||
        bank.state.toLowerCase() === stateFilter.toLowerCase();

      const matchesCity =
        !cityFilter ||
        bank.city.toLowerCase() === cityFilter.toLowerCase();

      return matchesSearch && matchesState && matchesCity;
    });
  }, [bloodBanks, search, stateFilter, cityFilter]);

  const clearFilters = () => {
    setSearch("");
    setStateFilter("");
    setCityFilter("");
  };

  const handleStateChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setStateFilter(event.target.value);
    setCityFilter("");
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/\s+/g, "");
  };

  const handleCall = (phone: string) => {
    window.location.assign(`tel:${formatPhone(phone)}`);
  };

  const handleWhatsApp = (number: string) => {
    const cleanedNumber = number.replace(/\D/g, "");

    if (!cleanedNumber) {
      return;
    }

    window.open(
      `https://wa.me/${cleanedNumber}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleWebsite = (website: string) => {
    let url = website.trim();

    if (!url) {
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleMap = (bank: BloodBank) => {
    let mapsUrl: string;

    if (
      typeof bank.latitude === "number" &&
      typeof bank.longitude === "number"
    ) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${bank.latitude},${bank.longitude}`;
    } else {
      const address = [
        bank.address,
        bank.city,
        bank.state,
        bank.pincode,
        "India",
      ]
        .filter(Boolean)
        .join(", ");

      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address
      )}`;
    }

    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="blood-banks-page">
      <div className="blood-banks-header">
        <div>
          <div className="blood-banks-title-row">
            <div className="blood-banks-title-icon">
              <Building2 size={24} />
            </div>

            <div>
              <h1>Blood Banks</h1>
              <p>
                Find blood banks and their contact information
                across India.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="blood-banks-refresh"
          onClick={fetchBloodBanks}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? "spin" : ""}
          />
          Refresh
        </button>
      </div>

            <div className="blood-donation-info-card">
        <div className="blood-donation-info-icon">
          <Droplets size={24} />
        </div>

        <div className="blood-donation-info-content">
          <h2>Whole Blood Donation Frequency</h2>

          <p>
            Donors should follow the recommended interval between
            whole-blood donations. The final decision is made by
            qualified blood-bank medical staff after screening.
          </p>

          <div className="blood-donation-frequency">
            <div className="frequency-item">
              <strong>Men</strong>
              <span>Every 90 days (3 months)</span>
            </div>

            <div className="frequency-item">
              <strong>Women</strong>
              <span>Every 120 days (4 months)</span>
            </div>
          </div>

          <small>
            Donation eligibility may depend on health, haemoglobin,
            previous donation date and other screening criteria.
          </small>
        </div>
      </div>

      <div className="blood-banks-stats">
        <div className="blood-bank-stat-card">
          <div className="blood-bank-stat-icon">
            <Building2 size={20} />
          </div>

          <div>
            <span>Total Blood Banks</span>
            <strong>{bloodBanks.length}</strong>
          </div>
        </div>

        <div className="blood-bank-stat-card">
          <div className="blood-bank-stat-icon">
            <MapPin size={20} />
          </div>

          <div>
            <span>States Covered</span>
            <strong>{states.length}</strong>
          </div>
        </div>

        <div className="blood-bank-stat-card">
          <div className="blood-bank-stat-icon">
            <Droplets size={20} />
          </div>

          <div>
            <span>Showing Results</span>
            <strong>{filteredBanks.length}</strong>
          </div>
        </div>
      </div>

      <div className="blood-bank-filters">
        <div className="blood-bank-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search blood bank, city, state or address..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={stateFilter}
          onChange={handleStateChange}
          className="blood-bank-select"
        >
          <option value="">All States</option>

          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        <select
          value={cityFilter}
          onChange={(event) =>
            setCityFilter(event.target.value)
          }
          className="blood-bank-select"
        >
          <option value="">All Cities</option>

          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        {(search || stateFilter || cityFilter) && (
          <button
            type="button"
            className="blood-bank-clear"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="blood-bank-error">
          <AlertCircle size={20} />

          <div>
            <strong>Unable to load blood banks</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="blood-bank-loading">
          <RefreshCw size={30} className="spin" />
          <p>Loading blood banks...</p>
        </div>
      ) : filteredBanks.length === 0 ? (
        <div className="blood-bank-empty">
          <div className="blood-bank-empty-icon">
            <Building2 size={30} />
          </div>

          <h2>No blood banks found</h2>

          <p>
            There are no active blood banks matching your
            current search or filters.
          </p>

          {(search || stateFilter || cityFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="blood-bank-empty-button"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="blood-bank-grid">
          {filteredBanks.map((bank) => (
            <article
              key={bank.id}
              className="blood-bank-card"
            >
              <div className="blood-bank-card-top">
                <div className="blood-bank-card-icon">
                  <Building2 size={23} />
                </div>

                <span className="blood-bank-active">
                  Active
                </span>
              </div>

              <div className="blood-bank-card-content">
                <h2>{bank.name}</h2>

                {bank.organization && (
                  <p className="blood-bank-organization">
                    {bank.organization}
                  </p>
                )}

                <div className="blood-bank-info">
                  <div className="blood-bank-info-row">
                    <MapPin size={17} />

                    <span>
                      {bank.address}
                      <br />
                      {bank.city}, {bank.state} -{" "}
                      {bank.pincode}
                    </span>
                  </div>

                  {bank.phone && (
                    <div className="blood-bank-info-row">
                      <Phone size={17} />

                      <span>{bank.phone}</span>
                    </div>
                  )}

                  {bank.opening_hours && (
                    <div className="blood-bank-info-row">
                      <span className="blood-bank-hours-dot" />

                      <span>
                        {bank.opening_hours}
                      </span>
                    </div>
                  )}
                </div>

                {bank.available_blood_groups &&
                  bank.available_blood_groups.length > 0 && (
                    <div className="blood-bank-groups">
                      {bank.available_blood_groups.map(
                        (group) => (
                          <span key={group}>
                            {group}
                          </span>
                        )
                      )}
                    </div>
                  )}
              </div>

              <div className="blood-bank-actions">
                {bank.phone && (
                  <button
                    type="button"
                    className="blood-action call"
                    onClick={() =>
                      handleCall(bank.phone)
                    }
                  >
                    <Phone size={16} />
                    Call
                  </button>
                )}

                {bank.whatsapp_number && (
                  <button
                    type="button"
                    className="blood-action whatsapp"
                    onClick={() =>
                      handleWhatsApp(
                        bank.whatsapp_number as string
                      )
                    }
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </button>
                )}

                {bank.website_url && (
                  <button
                    type="button"
                    className="blood-action website"
                    onClick={() =>
                      handleWebsite(
                        bank.website_url as string
                      )
                    }
                  >
                    <Globe size={16} />
                    Website
                  </button>
                )}

                <button
                  type="button"
                  className="blood-action map"
                  onClick={() => handleMap(bank)}
                >
                  <Navigation size={16} />
                  Map
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default BloodBanks;