import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarDays, ChevronDown, Heart, Mail, MapPin, Phone, RefreshCw, Search, ShieldCheck, UserRound, X, Bookmark, BookmarkCheck } from "lucide-react";

import "./SearchOrgan.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const SAVED_DONORS_KEY = "medvisionrx_saved_organ_donors";
const SAVED_RECORDS_KEY = "medvisionrx_saved_organ_donor_records";

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
  age?: number | string;
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
  availability?: string;
  availability_status?: string;
  is_available?: boolean;
  medical_status?: string;
  is_verified?: boolean;
  verified?: boolean;
  created_at?: string;
  updated_at?: string;
  last_donated?: string;
  profile_image?: string;
  photo_url?: string;
}

interface ApiResponse {
  data?: OrganDonor[];
  donors?: OrganDonor[];
  records?: OrganDonor[];
}

function getId(donor: OrganDonor): string {
  return String(donor.id || donor._id || "");
}

function getName(donor: OrganDonor): string {
  return donor.full_name || donor.fullName || donor.name || "Organ Donor";
}

function getPhone(donor: OrganDonor): string {
  return donor.phone || donor.contact_phone || "";
}

function getEmail(donor: OrganDonor): string {
  return donor.email || "";
}

function getBloodGroup(donor: OrganDonor): string {
  return donor.blood_group || donor.bloodGroup || "Not specified";
}

function getDonationType(donor: OrganDonor): string {
  return donor.donation_type || donor.donationType || "Not specified";
}

function getOrganList(donor: OrganDonor): string[] {
  if (Array.isArray(donor.organs)) return donor.organs;
  if (Array.isArray(donor.organ_types)) return donor.organ_types;
  if (Array.isArray(donor.donated_organs)) return donor.donated_organs;
  return [];
}

function getLocation(donor: OrganDonor): string {
  const city = donor.city?.trim() || "";
  const state = donor.state?.trim() || "";
  const address = donor.address?.trim() || "";
  if (city && state) return `${city}, ${state}`;
  return city || state || address || "Location not specified";
}

function isVerified(donor: OrganDonor): boolean {
  return donor.is_verified === true || donor.verified === true;
}

function getAvailability(donor: OrganDonor): string {
  if (donor.is_available === false) return "Currently unavailable";
  return donor.availability_status || donor.availability || donor.status || "Registered";
}

function formatText(value?: string | null): string {
  if (!value) return "Not specified";
  return value.trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string): string {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calculateAge(donor: OrganDonor): string {
  if (donor.age !== undefined && donor.age !== null && String(donor.age).trim()) {
    return String(donor.age);
  }
  const dob = donor.date_of_birth || donor.dob;
  if (!dob) return "Not specified";
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return "Not specified";
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age--;
  return age >= 0 ? String(age) : "Not specified";
}

function readSavedIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_DONORS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function readSavedRecords(): OrganDonor[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_RECORDS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed as OrganDonor[] : [];
  } catch {
    return [];
  }
}

function unwrapDonors(payload: unknown): OrganDonor[] {
  if (Array.isArray(payload)) return payload as OrganDonor[];
  if (payload && typeof payload === "object") {
    const data = payload as ApiResponse;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.donors)) return data.donors;
    if (Array.isArray(data.records)) return data.records;
  }
  return [];
}

function SearchOrgan() {
  
  const [donors, setDonors] = useState<OrganDonor[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(readSavedIds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [organFilter, setOrganFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedDonor, setSelectedDonor] = useState<OrganDonor | null>(null);

  const loadDonors = async () => {
    try {
      setLoading(true);
      setError("");
      // This existing public endpoint returns active organ-donation registrations.
      const response = await fetch(`${API_BASE_URL}/api/organ-donations/`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || `Unable to load registered donors (${response.status}).`);
      }
      const rows = unwrapDonors(payload).filter((donor) => {
        const status = String(donor.status || "active").toLowerCase();
        return !["inactive", "cancelled", "canceled", "deleted", "rejected"].includes(status);
      });
      setDonors(rows);
    } catch (err) {
      console.error("Search Organ donor directory:", err);
      setError(err instanceof Error ? err.message : "Unable to load registered organ donors.");
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadDonors();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const organOptions = useMemo(
    () => Array.from(new Set(donors.flatMap(getOrganList))).filter(Boolean).sort(),
    [donors]
  );

  const filteredDonors = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return donors.filter((donor) => {
      const organs = getOrganList(donor);
      const text = [
        getName(donor),
        getBloodGroup(donor),
        getLocation(donor),
        getDonationType(donor),
        getEmail(donor),
        ...organs,
      ].join(" ").toLowerCase();

      return (
        (!query || text.includes(query)) &&
        (!organFilter || organs.some((organ) => organ.toLowerCase() === organFilter.toLowerCase())) &&
        (!locationFilter || getLocation(donor).toLowerCase().includes(locationFilter.toLowerCase())) &&
        (!typeFilter || getDonationType(donor).toLowerCase() === typeFilter.toLowerCase())
      );
    });
  }, [donors, searchText, organFilter, locationFilter, typeFilter]);

  const toggleSaved = (donor: OrganDonor) => {
    const id = getId(donor);
    if (!id) return;

    const currentIds = readSavedIds();
    const currentRecords = readSavedRecords();
    const alreadySaved = currentIds.includes(id);
    const nextIds = alreadySaved
      ? currentIds.filter((savedId) => savedId !== id)
      : [...currentIds, id];
    const nextRecords = alreadySaved
      ? currentRecords.filter((record) => getId(record) !== id)
      : [...currentRecords.filter((record) => getId(record) !== id), donor];

    localStorage.setItem(SAVED_DONORS_KEY, JSON.stringify(nextIds));
    localStorage.setItem(SAVED_RECORDS_KEY, JSON.stringify(nextRecords));
    setSavedIds(nextIds);
  };

  const clearFilters = () => {
    setSearchText("");
    setOrganFilter("");
    setLocationFilter("");
    setTypeFilter("");
  };

  return (
    <div className="search-organ-page">
      {/* The Organ Requirement layout already displays the breadcrumb. */}

      <section className="search-organ-header">
        <div>
          <span className="search-organ-eyebrow">ORGAN REQUIREMENT</span>
          <h1>Find Organ Donors</h1>
          <p>Explore registered organ donors, review their pledged organs, and connect using their available contact details.</p>
        </div>
        <div className="search-organ-live-tag">
  <span className="search-organ-live-dot"></span>
  <span>Live Donor Registrations</span>
</div>
      </section>

      <section className="search-organ-filter-panel">
        <div className="search-organ-filter-grid search-organ-donor-filters">
          <label className="search-organ-field">
            <span>Organ / Tissue</span>
            <div className="search-organ-select-wrapper">
              <Heart size={15} />
              <select value={organFilter} onChange={(event) => setOrganFilter(event.target.value)}>
                <option value="">All Organs</option>
                {organOptions.map((organ) => <option key={organ} value={organ}>{formatText(organ)}</option>)}
              </select>
              <ChevronDown size={14} />
            </div>
          </label>

          <label className="search-organ-field">
            <span>Donation Type</span>
            <div className="search-organ-select-wrapper">
              <ShieldCheck size={15} />
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">All Types</option>
                <option value="living">Living</option>
                <option value="deceased">Deceased</option>
              </select>
              <ChevronDown size={14} />
            </div>
          </label>

          <label className="search-organ-field">
            <span>Location</span>
            <div className="search-organ-input-wrapper">
              <MapPin size={15} />
              <input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="City or state" />
            </div>
          </label>
        </div>

        <div className="search-organ-search-row">
          <div className="search-organ-main-search">
            <Search size={17} />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search donor name, organ, blood group or location..."
            />
          </div>
          {(searchText || organFilter || locationFilter || typeFilter) && (
            <button type="button" className="search-organ-clear-button" onClick={clearFilters}>
              <X size={16} /> Clear
            </button>
          )}
        </div>
      </section>

      <section className="search-organ-results-header">
        <div>
          <h2>Registered Organ Donors</h2>
          <p>Showing <strong>{filteredDonors.length}</strong> of <strong>{donors.length}</strong> donor registrations</p>
        </div>
        <button type="button" className="search-organ-refresh" onClick={loadDonors} disabled={loading}>
          <RefreshCw size={15} className={loading ? "search-organ-refresh-spin" : ""} />
          Refresh
        </button>
      </section>

      {error && (
        <div className="search-organ-error">
          <AlertCircle size={19} />
          <div><strong>Unable to load organ donors</strong><span>{error}</span></div>
          <button type="button" onClick={loadDonors}>Retry</button>
        </div>
      )}

      {loading && (
        <div className="search-organ-loading">
          <RefreshCw size={25} className="search-organ-refresh-spin" />
          <span>Loading registered organ donors...</span>
        </div>
      )}

      {!loading && !error && filteredDonors.length === 0 && (
        <div className="search-organ-empty">
          <div className="search-organ-empty-icon"><Search size={29} /></div>
          <h3>{donors.length === 0 ? "No registered organ donors found" : "No matching donors found"}</h3>
          <p>{donors.length === 0 ? "Active organ donor registrations will appear here when people register." : "Try changing your search or filters."}</p>
          {(searchText || organFilter || locationFilter || typeFilter) && (
            <button type="button" onClick={clearFilters}>Clear Filters</button>
          )}
        </div>
      )}

      {!loading && filteredDonors.length > 0 && (
        <section className="search-organ-card-list search-organ-donor-list">
          {filteredDonors.map((donor) => {
            const id = getId(donor);
            const saved = savedIds.includes(id);
            const phone = getPhone(donor);
            const email = getEmail(donor);
            const organs = getOrganList(donor);
            const availableText = getAvailability(donor);
            const unavailable = donor.is_available === false ||
              ["inactive", "unavailable", "cancelled", "canceled"].includes(availableText.toLowerCase());

            return (
              <article className="search-organ-card search-organ-donor-card" key={id || getName(donor)}>
                <div className="search-organ-donor-card-top">
                  <div className="search-organ-donor-identity">
                    <div className="search-organ-donor-avatar">
                      {donor.profile_image || donor.photo_url
                        ? <img src={donor.profile_image || donor.photo_url} alt={getName(donor)} />
                        : <UserRound size={25} />}
                    </div>
                    <div className="search-organ-donor-name">
                      <h3>{getName(donor)}</h3>
                      <span>{formatText(donor.gender)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`search-organ-save-button ${saved ? "is-saved" : ""}`}
                    onClick={() => toggleSaved(donor)}
                    aria-label={saved ? "Remove saved donor" : "Save donor"}
                    title={saved ? "Remove from Saved Organ Donors" : "Save donor"}
                  >
                    {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                    {saved ? "Saved" : "Save"}
                  </button>
                </div>

                <div className="search-organ-donor-badges">
                  <span className="search-organ-blood-badge">{getBloodGroup(donor)}</span>
                  <span className={`search-organ-availability ${unavailable ? "unavailable" : "available"}`}>
                    <span />{formatText(availableText)}
                  </span>
                  {isVerified(donor) && (
                    <span className="search-organ-verified"><ShieldCheck size={13} /> Verified</span>
                  )}
                </div>

                <div className="search-organ-donor-organs">
                  <span className="search-organ-detail-label">Pledged organs / tissues</span>
                  <div className="search-organ-organ-chips">
                    {organs.length > 0
                      ? organs.map((organ) => <span key={organ}>{formatText(organ)}</span>)
                      : <span>Not specified</span>}
                  </div>
                </div>

                <div className="search-organ-donor-info-grid">
                  <div><MapPin size={15} /><span>{getLocation(donor)}</span></div>
                  <div><ShieldCheck size={15} /><span>{formatText(getDonationType(donor))}</span></div>
                  <div><UserRound size={15} /><span>Age: {calculateAge(donor)}</span></div>
                  {donor.last_donated && <div><CalendarDays size={15} /><span>Last donated: {formatDate(donor.last_donated)}</span></div>}
                </div>

                <div className="search-organ-donor-contact-preview">
                  {phone && <a href={`tel:${phone}`}><Phone size={14} />{phone}</a>}
                  {email && <a href={`mailto:${email}`}><Mail size={14} />{email}</a>}
                  {!phone && !email && <span>Contact details are not available in this registration.</span>}
                </div>

                <div className="search-organ-card-actions">
                  <button type="button" className="search-organ-details-button" onClick={() => setSelectedDonor(donor)}>
                    View Details <ArrowRight size={15} />
                  </button>
                  {phone && <a href={`tel:${phone}`} className="search-organ-call-button"><Phone size={15} /> Contact</a>}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <div className="search-organ-information">
        <ShieldCheck size={18} />
        <div>
          <strong>Organ donor information</strong>
          <span>Donor details are displayed from active registrations. Please verify medical suitability and consent through the appropriate transplant authority before taking any action.</span>
        </div>
      </div>

      {selectedDonor && (
        <div className="search-organ-modal-overlay" onClick={() => setSelectedDonor(null)}>
          <div className="search-organ-modal" onClick={(event) => event.stopPropagation()}>
            <div className="search-organ-modal-header">
              <div>
                <span className="search-organ-eyebrow">REGISTERED ORGAN DONOR</span>
                <h2>{getName(selectedDonor)}</h2>
              </div>
              <button type="button" onClick={() => setSelectedDonor(null)} aria-label="Close details"><X size={19} /></button>
            </div>

            <div className="search-organ-modal-body">
              <div className="search-organ-modal-status-row">
                <span className="search-organ-blood-badge">{getBloodGroup(selectedDonor)}</span>
                <span className="search-organ-availability available"><span />{formatText(getAvailability(selectedDonor))}</span>
                {isVerified(selectedDonor) && <span className="search-organ-verified"><ShieldCheck size={13} /> Verified</span>}
              </div>

              <div className="search-organ-detail-grid">
                <div><span>Full Name</span><strong>{getName(selectedDonor)}</strong></div>
                <div><span>Age</span><strong>{calculateAge(selectedDonor)}</strong></div>
                <div><span>Gender</span><strong>{formatText(selectedDonor.gender)}</strong></div>
                <div><span>Blood Group</span><strong>{getBloodGroup(selectedDonor)}</strong></div>
                <div><span>Organs / Tissues</span><strong>{getOrganList(selectedDonor).map(formatText).join(", ") || "Not specified"}</strong></div>
                <div><span>Donation Type</span><strong>{formatText(getDonationType(selectedDonor))}</strong></div>
                <div><span>Location</span><strong>{getLocation(selectedDonor)}</strong></div>
                <div><span>Address</span><strong>{selectedDonor.address || "Not specified"}</strong></div>
                <div><span>Phone</span><strong>{getPhone(selectedDonor) || "Not provided"}</strong></div>
                <div><span>Email</span><strong>{getEmail(selectedDonor) || "Not provided"}</strong></div>
                <div><span>Registration Status</span><strong>{formatText(selectedDonor.status || "Active")}</strong></div>
                <div><span>Last Donated</span><strong>{formatDate(selectedDonor.last_donated)}</strong></div>
                <div><span>Registered On</span><strong>{formatDate(selectedDonor.created_at)}</strong></div>
              </div>

              {selectedDonor.medical_status && (
                <div className="search-organ-reason">
                  <span>Medical information</span>
                  <p>{selectedDonor.medical_status}</p>
                </div>
              )}
            </div>

            <div className="search-organ-modal-footer">
              <button
                type="button"
                className="search-organ-details-button"
                onClick={() => toggleSaved(selectedDonor)}
              >
                {savedIds.includes(getId(selectedDonor)) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                {savedIds.includes(getId(selectedDonor)) ? "Saved" : "Save Donor"}
              </button>
              {getPhone(selectedDonor) && (
                <a className="search-organ-modal-call" href={`tel:${getPhone(selectedDonor)}`}><Phone size={15} /> Contact Donor</a>
              )}
              <button type="button" className="search-organ-modal-close" onClick={() => setSelectedDonor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



export default SearchOrgan;
