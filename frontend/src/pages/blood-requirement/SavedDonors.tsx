import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  Droplets,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import "./SavedDonors.css";
import { auth } from "../../firebase";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

interface BloodDonor {
  id: string;
  full_name: string;
  blood_group: BloodGroup;
  city?: string;
  state?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  availability?: boolean;
  verification_status?: string;
  last_donation_date?: string | null;
}

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to view your saved donors.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

function SavedDonors() {
  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [search, setSearch] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchDonors = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/blood-donors/saved`, { headers });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail || "Unable to load saved donors.");
      setDonors(Array.isArray(data?.donors) ? data.donors : []);
    } catch (err) {
      console.error("Saved donors error:", err);
      setDonors([]);
      setError(err instanceof Error ? err.message : "Unable to load saved donors. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchDonors();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchDonors]);

  const unsaveDonor = async (donor: BloodDonor) => {
    if (!window.confirm(`Remove ${donor.full_name} from Saved Donors?`)) return;
    try {
      setRemovingId(donor.id);
      setError("");
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/blood-donors/saved/${encodeURIComponent(donor.id)}`, {
        method: "DELETE", headers,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail || "Unable to remove this donor.");
      setDonors((current) => current.filter((item) => item.id !== donor.id));
      setSuccess(`${donor.full_name} removed from Saved Donors.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove this donor.");
    } finally {
      setRemovingId(null);
    }
  };

  const filteredDonors = useMemo(() => {
    const term = search.trim().toLowerCase();
    return donors.filter((donor) => {
      const matchesText = !term || [donor.full_name, donor.city, donor.state, donor.blood_group]
        .some((value) => String(value || "").toLowerCase().includes(term));
      return matchesText && (!bloodGroup || donor.blood_group === bloodGroup);
    });
  }, [donors, search, bloodGroup]);

  const formatDate = (value?: string | null) => {
    if (!value) return "Not available";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const verificationText = (value?: string) => {
    if (value === "verified") return "Verified donor";
    if (value === "pending") return "Verification pending";
    return "Verification status unavailable";
  };

  return (
    <div className="saved-donors-page">
      <section className="saved-donors-header">
        <div className="saved-donors-header-content">
          <span className="saved-donors-eyebrow">BLOOD REQUIREMENT</span>
          <h1>Saved Donors</h1>
          <p>Keep track of donors you may want to contact for future blood requirements.</p>
        </div>
        <button type="button" className="saved-donors-refresh" onClick={fetchDonors} disabled={loading}>
          <RefreshCw size={15} className={loading ? "saved-donors-spin" : ""} />
          <span>Refresh</span>
        </button>
      </section>

      {success && <div className="saved-donors-success" role="status">{success}</div>}
      <section className="saved-donors-filter-card">
        <div className="saved-donors-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search donor or location..." /></div>
        <select value={bloodGroup} onChange={(event) => setBloodGroup(event.target.value)} className="saved-donors-blood-select">
          <option value="">All Blood Groups</option>
          {(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as BloodGroup[]).map((group) => <option key={group} value={group}>{group}</option>)}
        </select>
      </section>

      <div className="saved-donors-summary-box"><div className="saved-donors-summary"><strong>{loading ? "—" : filteredDonors.length}</strong><span>{filteredDonors.length === 1 ? "saved donor" : "saved donors"}</span></div></div>

      {error && <div className="saved-donors-error"><span>{error}</span><button type="button" onClick={fetchDonors}>Retry</button></div>}
      {loading && <div className="saved-donors-empty"><RefreshCw size={25} className="saved-donors-spin" /><p>Loading saved donors...</p></div>}
      {!loading && !error && filteredDonors.length === 0 && <div className="saved-donors-empty"><div className="saved-donors-empty-icon"><Bookmark size={29} /></div><h3>{donors.length ? "No donors match your filters" : "No saved donors yet"}</h3><p>{donors.length ? "Try changing your search or blood group filter." : "Save a donor from Search Blood or My Requests and they will appear here."}</p></div>}

      {!loading && filteredDonors.length > 0 && <section className="saved-donors-grid">
        {filteredDonors.map((donor) => <article key={donor.id} className="saved-donor-card">
          <div className="saved-donor-header">
            <div className="saved-donor-avatar"><UserRound size={20} /></div>
            <div className="saved-donor-name"><h2>{donor.full_name || "Blood Donor"}</h2><div className="saved-donor-location"><MapPin size={13} /><span>{[donor.city, donor.state].filter(Boolean).join(", ") || "Location not available"}</span></div></div>
            <span className="saved-donor-blood-group">{donor.blood_group}</span>
          </div>
          <div className="saved-donor-verification"><ShieldCheck size={15} /><span>{verificationText(donor.verification_status)}</span></div>
          <div className="saved-donor-information">
            <div><CalendarDays size={15} /><span>Last donation: {formatDate(donor.last_donation_date)}</span></div>
            <div><Droplets size={15} /><span>{donor.availability ? "Currently available" : "Currently unavailable"}</span></div>
          </div>
          <div className="saved-donor-actions">
            {donor.phone ? <a href={`tel:${donor.phone}`} className="saved-donor-contact"><Phone size={14} /><span>Contact</span></a> : <span className="saved-donor-no-phone">Contact unavailable</span>}
            <button type="button" className="saved-donor-remove" onClick={() => unsaveDonor(donor)} disabled={removingId === donor.id} aria-label="Unsave donor" title="Remove from Saved Donors">
              <Bookmark size={14} fill="currentColor" /><span>{removingId === donor.id ? "Removing..." : "Unsave"}</span>
            </button>
          </div>
        </article>)}
      </section>}

      <div className="saved-donors-notice"><ShieldCheck size={18} /><p>Donor contact information should only be used for legitimate blood-requirement communication. Saved donors are private to your signed-in account.</p></div>
    </div>
  );
}

export default SavedDonors;
