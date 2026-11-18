import { useWebsiteAdmin } from "../../components/admin-access/WebsiteAdminContext";
import { signOutWebsiteAccount } from "../../components/admin-access/adminSession";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, FileText, Droplets, Heart, MapPin, Pill, ChevronDown, Moon, Sun, Mail, Phone, Pencil, UserRound, LogOut, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebase";
import { useTheme } from "../../context/useTheme";
import logo from "../../assets/medvisionrx-logo.png";
import prescriptionImage from "../prescription/assets/prescription-welcome.jpg";
import bloodDonationImage from "../../assets/blood-donation-welcome.jpg";
import bloodRequirementImage from "../../assets/home/blood-requirement-hero.png";
import organDonationImage from "../../assets/organ-donation-welcome.jpg";
import organRequirementImage from "../../assets/organ-requirement-welcome.jpg";
import medicineImage from "../../assets/medicine-service.jpg";
import "./Services.css";
const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const services = [
  {
    title: "Prescription Analyzer",
    description:
      "Upload prescription and understand medicine details.",
    image:
      prescriptionImage,
    icon: FileText,
    className: "prescription-card",
    path: "/prescription/dashboard",
    buttonText: "Open Analyzer",
  },
  {
    title: "Blood Donation",
    description:
      "Register as a blood donor and give life-saving blood.",
    image:
      bloodDonationImage,
    icon: Droplets,
    className: "blood-donation-card",
    path: "/blood-donation",
    buttonText: "Open Blood Donation",
  },
  {
    title: "Blood Requirement",
    description:
      "Find blood donors and nearby blood banks.",
    image:
      bloodRequirementImage,
    icon: MapPin,
    className: "blood-requirement-card",
    path: "/blood-requirement",
    buttonText: "Open Blood Requirement",
  },
  {
    title: "Organ Donation",
    description:
      "Pledge organs to give someone a second chance.",
    image:
      organDonationImage,
    icon: Heart,
    className: "organ-donation-card",
    path: "/organ-donation",
    buttonText: "Open Organ Donation",
  },
  {
    title: "Organ Requirement",
    description:
      "Search organ donors and verified medical centers.",
    image:
      organRequirementImage,
    icon: Heart,
    className: "organ-requirement-card",
    path: "/organ-requirement",
    buttonText: "Open Organ Requirement",
  },
  {
    title: "Medicine Recommender",
    description:
      "Search medicines by symptoms, explore details, side effects and trusted buying links.",
    image:
      medicineImage,
    icon: Pill,
    className: "medicine-recommender-card",
    path: "/medicine-recommender",
    buttonText: "Open Medicine Finder",
  },
];

const avatarOptions = [
    "https://api.dicebear.com/9.x/notionists/svg?seed=Aarohi&backgroundColor=f8d7e8",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Anaya&backgroundColor=ffe3b3",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Ishita&backgroundColor=fff0a6",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Myra&backgroundColor=d7f7ee",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Kiara&backgroundColor=fbd5c6",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Tara&backgroundColor=d9eaff",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Arjun&backgroundColor=e7d9ff",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Vivaan&backgroundColor=d5f3e5",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Reyansh&backgroundColor=ffe0d5",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Kabir&backgroundColor=dce8ff",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Aarav&backgroundColor=f8dfeb",
    "https://api.dicebear.com/9.x/notionists/svg?seed=Rudra&backgroundColor=e4f0ce",
    "https://api.dicebear.com/9.x/bottts/svg?seed=MedBotPink",
    "https://api.dicebear.com/9.x/bottts/svg?seed=MedBotGreen",
    "https://api.dicebear.com/9.x/bottts/svg?seed=MedBotYellow",
    "https://api.dicebear.com/9.x/bottts/svg?seed=MedBotBlue",
  ];

type UserProfile = { uid: string; fullName: string; email: string; phone: string; avatarId?: string; profileImageUrl?: string; };
export default function Services() {
  const {isAdmin}=useWebsiteAdmin();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState(avatarOptions[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      setUser(current); setProfile(null); setLoading(true); setError("");
      if (!current) { setLoading(false); return; }
      try {
        const token = await current.getIdToken();
        const response = await fetch(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("Unable to load your saved profile. Please try refreshing the page.");
        const result = await response.json();
        if (active && auth.currentUser?.uid === current.uid) setProfile(result.user);
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "Unable to load profile."); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setProfileOpen(false); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => { if (editing) editorRef.current?.showModal(); else editorRef.current?.close(); }, [editing]);
  const displayName = isAdmin ? "Admin" : profile?.fullName || user?.displayName || user?.email?.split("@")[0] || "Guest";
  const photo = isAdmin ? "/admin-avatar.svg" : profile?.profileImageUrl || profile?.avatarId || avatarOptions[7];
  const openEditor = () => {
    setName(profile?.fullName || user?.displayName || ""); setPhone(profile?.phone || "");
    setAvatar(profile?.avatarId || avatarOptions[7]); setEditError(""); setEditing(true); setProfileOpen(false);
  };
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault(); if (!user || busy) return;
    if (!name.trim() || !/^[+0-9()\s-]{7,20}$/.test(phone.trim())) { setEditError("Enter your full name and a valid phone number."); return; }
    setBusy(true); setEditError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/users/me`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name.trim(), phone: phone.trim(), profileImageUrl: "", avatarId: avatar }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Unable to save your profile.");
      setProfile(result.user || { uid: user.uid, email: user.email || "", fullName: name.trim(), phone: phone.trim(), avatarId: avatar, profileImageUrl: "" });
      setEditing(false); setNotice("Profile saved successfully.");
    } catch (reason) { setEditError(reason instanceof Error ? reason.message : "Unable to save your profile."); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    setBusy(true);
    try { await signOutWebsiteAccount(); navigate("/", { replace: true }); }
    catch { setError("Unable to log out. Please try again."); }
    finally { setBusy(false); }
  };
  return <div className="services-page">
    <header className="services-topbar">
      <div className="services-topbar-inner">
        <Link to="/" className="services-brand"><img src={logo} alt="MedVisionRx logo" /><span><strong>MedVision<span>Rx</span></strong><small>Healthcare Platform</small></span></Link>
        <div className="services-header-actions">
          <Link to="/" className="services-home">Home</Link>
          <button type="button" className="services-theme" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}</button>
          {user ? <div className="services-account" ref={profileRef}>
            <button type="button" className="services-account-trigger" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen} aria-controls="services-account-menu"><img src={photo} alt="" /><span><strong>{loading ? "Loading..." : displayName}</strong><small>{isAdmin ? "Administrator" : "Member"}</small></span><ChevronDown size={16} /></button>
            {profileOpen && <div className="services-account-menu" id="services-account-menu">
              <div className="services-account-summary"><img src={photo} alt="Your avatar" /><span><strong>{displayName}</strong><small>{isAdmin ? "Administrator" : "Member Account"}</small></span></div>
              <p><Mail size={17} /><span>{profile?.email || user.email}</span></p>{!isAdmin && <p><Phone size={17} /><span>{profile?.phone || "Not added yet"}</span></p>}
              {!isAdmin && <><button onClick={openEditor}><Pencil size={17} />Edit Profile</button><button onClick={openEditor}><UserRound size={17} />Change Avatar</button></>}
              <button className="services-logout" disabled={busy} onClick={logout}><LogOut size={17} />{busy ? "Logging out..." : "Logout"}</button>
            </div>}
          </div> : <Link className="services-home" to="/login">Log in</Link>}
        </div>
      </div>
    </header>
    <main className="services-content">
      <section className="services-intro"><span>MEDVISIONRX</span><p>{isAdmin ? "Welcome, Admin" : `Welcome back, ${displayName}`}</p><h1>Your health. Connected.</h1><div>Choose a service to get started.</div></section>
      {error && <div className="services-message services-error" role="alert">{error}</div>}
      {notice && <div className="services-message" role="status">{notice}</div>}
      <section className="services-cards" aria-label="Healthcare services">
        {services.map(({title, description, image, icon: Icon, className, path, buttonText}) => <article key={path} className={`service-card ${className}`}>
          <div className="service-image-frame"><img src={image} alt={title} loading="lazy" /></div>
          <div className="service-card-body"><div className="service-info"><span className="service-icon"><Icon size={26} strokeWidth={1.8} /></span><div><h2>{title}</h2><p>{description}</p></div></div>
          <Link to={path} className="service-button"><span>{buttonText}</span><ArrowRight size={19} /></Link></div>
        </article>)}
      </section>
    </main>
    <footer className="services-footer">MedVisionRx <span>?</span> Healthcare Platform</footer>
    <dialog ref={editorRef} className="services-editor" aria-labelledby="services-editor-title" onCancel={() => { if (!busy) setEditing(false); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) setEditing(false); }}>
      <form onSubmit={saveProfile}>
        <div className="services-editor-heading"><h2 id="services-editor-title">Edit Profile</h2><button type="button" onClick={() => setEditing(false)} disabled={busy} aria-label="Close profile editor"><X size={21} /></button></div>
        <p>Update your details and choose your avatar.</p>
        {editError && <div className="services-message services-error" role="alert">{editError}</div>}
        <fieldset disabled={busy}><label>Full name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
        <label>Email address<input value={profile?.email || user?.email || ""} readOnly type="email" /></label>
        <label>Phone number<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /></label>
        <fieldset className="services-avatar-options"><legend>Choose an avatar</legend>{avatarOptions.map((option, index) => <label key={option}><input type="radio" name="services-avatar" value={option} checked={avatar === option} onChange={() => setAvatar(option)} /><img src={option} alt={`Avatar ${index + 1}`} /></label>)}</fieldset>
        <button className="service-button" type="submit">{busy ? "Saving..." : "Save changes"}</button></fieldset>
      </form>
    </dialog>
  </div>;
}
