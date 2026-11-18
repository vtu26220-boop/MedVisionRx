import { useWebsiteAdmin } from "../../components/admin-access/WebsiteAdminContext";
import { signOutWebsiteAccount } from "../../components/admin-access/adminSession";
import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Home,
  LayoutDashboard,
  Menu,
  Moon,
  Sun,
  X,
  Info,
  Headphones,
  FileUp,
  History,
  BookOpen,
  ChevronDown,
  ChevronUp,
  UserRound,
  Mail,
  Phone,
  LogOut,
  Pencil,
  Save,
  XCircle,
} from "lucide-react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";

import "./PrescriptionLayout.css";

import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebase";
import { useTheme } from "../../context/useTheme";
import medvisionRxLogo from "../../assets/medvisionrx-logo.png";
import prescriptionServicePhoto from "./assets/prescription-service.jpg";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

type UserProfile = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatarId?: string;
  profileImageUrl?: string;
};


function PrescriptionLayout() {
  const {isAdmin}=useWebsiteAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";
  const pageName = location.pathname.endsWith("/upload") ? "Upload Prescription" : location.pathname.endsWith("/about") ? "About Prescription Analyzer" : location.pathname.endsWith("/contact") ? "Contact Support" : location.pathname.endsWith("/health-guidelines") ? "Guidelines" : location.pathname.includes("history") ? "History" : location.pathname.endsWith("/dashboard") || location.pathname === "/prescription" ? "Dashboard" : "Analyze Prescription";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };



  // Logged-in Firebase account and matching MongoDB profile.
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  // Profile editor
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [profilePreview, setProfilePreview] = useState("");
  const [editError, setEditError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editProfileOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".prescription-edit-modal");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingProfile) setEditProfileOpen(false);
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [editProfileOpen, savingProfile]);

  useEffect(() => {
    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isActive) return;

      setFirebaseUser(user);
      setProfileOpen(false);
      setEditProfileOpen(false);
      setSaveMessage("");

      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      // Clear the previous account immediately. This prevents one user's
      // name/details from remaining visible while another account loads.
      setProfile(null);
      setProfileLoading(true);

      const fallbackName =
        user.displayName || user.email?.split("@")[0] || "User";

      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/users/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!isActive || auth.currentUser?.uid !== user.uid) return;

        if (response.ok) {
          const data = await response.json();
          const userData = data?.user || data;

          if (userData) {
            setProfile({
              uid: userData.uid || user.uid,
              fullName:
                userData.fullName ||
                userData.full_name ||
                userData.name ||
                userData.displayName ||
                fallbackName,
              email: userData.email || user.email || "",
              phone: userData.phone || userData.phone_number || "",
              role: "Member",
              avatarId: userData.avatarId || "",
              profileImageUrl: userData.profileImageUrl || "",
            });
            setProfileLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Unable to load logged-in user profile:", error);
      }

      if (!isActive || auth.currentUser?.uid !== user.uid) return;

      // Fallback is specific to the currently authenticated Firebase user.
      setProfile({
        uid: user.uid,
        fullName: fallbackName,
        email: user.email || "",
        phone: "",
        role: "Member",
      });
      setProfileLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOutWebsiteAccount();
      setProfileOpen(false);
      navigate("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const displayName = isAdmin ? "Admin" : profile?.fullName || firebaseUser?.displayName || "User";
  const displayEmail = profile?.email || firebaseUser?.email || "Email not available";
  const profilePhoto = isAdmin ? "/admin-avatar.svg" : (profile?.profileImageUrl || (profile?.avatarId?.startsWith("https://") ? profile.avatarId : "") || firebaseUser?.photoURL || "");

  // Friendly illustrated cartoon avatars (people and robots). The selected
  // avatar URL is stored in MongoDB as avatarId; no photo upload is used.
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

  const openEditProfile = () => {
    setEditName(profile?.fullName || firebaseUser?.displayName || "");
    setEditPhone(profile?.phone || "");
    const avatar = profile?.avatarId || avatarOptions[0];
    setSelectedAvatar(avatar);
    setProfilePreview(profile?.profileImageUrl || avatar);
    setEditError("");
    setEditProfileOpen(true);
    setProfileOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!firebaseUser || savingProfile) return;
    const cleanName = editName.trim();
    const cleanPhone = editPhone.trim();

    if (!cleanName || !cleanPhone) {
      setEditError("Full name and phone number are required.");
      return;
    }
    if (!/^[+0-9()\s-]{7,20}$/.test(cleanPhone)) {
      setEditError("Enter a valid phone number.");
      return;
    }

    setSavingProfile(true);
    setEditError("");

    try {
      // Avatar-only profile: no file upload or Firebase Storage request.
      const imageUrl = "";
      const avatarId = selectedAvatar || avatarOptions[0];

      const token = await firebaseUser.getIdToken();
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);

      let response: Response;
      try {
        response = await fetch(`${API_URL}/api/users/me`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: cleanName,
            phone: cleanPhone,
            profileImageUrl: imageUrl,
            avatarId,
          }),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || `Profile save failed (${response.status}).`);
      }

      const updatedProfile: UserProfile = {
        ...(profile || { uid: firebaseUser.uid, email: displayEmail }),
        uid: firebaseUser.uid,
        role: "Member",
        fullName: cleanName,
        email: profile?.email || firebaseUser.email || "",
        phone: cleanPhone,
        profileImageUrl: imageUrl,
        avatarId,
      };
      if (auth.currentUser?.uid !== firebaseUser.uid) return;
      setProfile(result.user ? { ...updatedProfile, ...result.user } : updatedProfile);
      setSaveMessage("Profile saved successfully.");
      setEditProfileOpen(false);
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Saving took too long. Check that the backend is running and PATCH /api/users/me is enabled."
          : error instanceof Error
            ? error.message
            : "Unable to save your profile.";
      setEditError(message);
    } finally {
      setSavingProfile(false);
    }
  };


  return (
    <div
      className={`prescription-layout ${
        sidebarCollapsed ? "prescription-layout-collapsed" : ""
      } ${darkMode ? "prescription-dark" : "prescription-light"}`}
    >
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <button
          type="button"
          className="prescription-overlay"
          onClick={closeMobileSidebar}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`prescription-sidebar ${
          mobileSidebarOpen ? "prescription-sidebar-open" : ""
        } ${
          sidebarCollapsed ? "prescription-sidebar-collapsed" : ""
        }`}
      >
        {/* Brand */}
        <div className="prescription-brand">
          <Link
            to="/services"
            className="prescription-brand-link"
            onClick={closeMobileSidebar}
            title={sidebarCollapsed ? "MedVisionRx" : undefined}
          >
            <div className="prescription-brand-icon">
              <img src={medvisionRxLogo} alt="MedVisionRx logo" />
            </div>

            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <div className="prescription-brand-text">
                <strong>MedVisionRx</strong>
                <span>Healthcare Platform</span>
              </div>
            )}
          </Link>

          <button
            type="button"
            className="prescription-mobile-close"
            onClick={closeMobileSidebar}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Service card */}
        {(!sidebarCollapsed || mobileSidebarOpen) && (
          <div className="prescription-service">
            <div className="prescription-service-icon">
              <img src={prescriptionServicePhoto} alt="A clinician writing a prescription" />
            </div>

            <div className="prescription-service-info">
              <span>SERVICE</span>
              <strong>Prescription Analyzer</strong>
            </div>
          </div>
        )}

        {/* Dashboard navigation */}
        <nav className="prescription-navigation">
          {(!sidebarCollapsed || mobileSidebarOpen) && (
            <p className="prescription-nav-title">
              PRESCRIPTION ANALYZER
            </p>
          )}

          <NavLink
            to="/prescription/dashboard"
            end
            onClick={closeMobileSidebar}
            title={sidebarCollapsed ? "Dashboard" : undefined}
            className={({ isActive }) =>
              `prescription-nav-link ${
                isActive ? "prescription-nav-link-active" : ""
              }`
            }
          >
            <LayoutDashboard size={18} />

            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <span>Dashboard</span>
            )}
          </NavLink>
          {[
            { path: "/prescription/upload", label: "Upload Prescription", icon: FileUp },
            { path: "/prescription/history", label: "History", icon: History },
            { path: "/prescription/health-guidelines", label: "Guidelines", icon: BookOpen },
          ].map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} onClick={closeMobileSidebar} title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) => `prescription-nav-link ${isActive ? "prescription-nav-link-active" : ""}`}>
              <Icon size={18} />
              {(!sidebarCollapsed || mobileSidebarOpen) && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar links directly below Dashboard */}
        <div className="prescription-sidebar-bottom">
          <div className="prescription-sidebar-divider" />

          {/* Home */}
          <Link
            to="/services"
            className="prescription-bottom-link"
            onClick={closeMobileSidebar}
            title={sidebarCollapsed ? "Home" : undefined}
          >
            <Home size={17} />

            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <span>Home</span>
            )}
          </Link>

          {/* About */}
          <Link
           to="/prescription/about"
            className="prescription-bottom-link"
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "About Prescription Analyzer"
                : undefined
            }
          >
            <Info size={17} />

            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <span>About</span>
            )}
          </Link>

          {/* Contact */}
          <Link
            to="/prescription/contact"
            className="prescription-bottom-link"
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "Contact Support"
                : undefined
            }
          >
            <Headphones size={17} />

            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <span>Contact Support</span>
            )}
          </Link>

          {/* Collapse */}
          <button
            type="button"
            className="prescription-collapse-button"
            onClick={() =>
              setSidebarCollapsed(
                (previous) => !previous
              )
            }
            aria-label={
              sidebarCollapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            title={
              sidebarCollapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            <ChevronRight
              size={18}
              className={
                sidebarCollapsed
                  ? "prescription-collapse-arrow"
                  : "prescription-collapse-arrow prescription-collapse-arrow-open"
              }
            />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="prescription-main">
        {/* Topbar */}
        <header className="prescription-topbar">
          <div className="prescription-breadcrumb">
            <button
              type="button"
              className="prescription-mobile-menu"
              onClick={() =>
                setMobileSidebarOpen(true)
              }
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <Link
              to="/services"
              className="prescription-breadcrumb-home"
            >
              <Home size={15} />
              <span>Home</span>
            </Link>

            <ChevronRight size={14} />

            <Link to="/prescription">Prescription Analyzer</Link>

            <ChevronRight size={14} />

            <strong>{pageName}</strong>
          </div>

          {/* Topbar actions */}
          <div className="prescription-topbar-actions">
            {/* Theme toggle */}
            <button
              type="button"
              className="prescription-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={
                darkMode
                  ? "Light mode"
                  : "Dark mode"
              }
            >
              {darkMode ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>

            {/* REAL LOGGED-IN USER PROFILE */}
            <div className="prescription-profile-wrap" ref={profileRef}>
              <button
                type="button"
                className="prescription-user"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Open user profile"
              >
                <span className="prescription-user-avatar">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" />
                  ) : (
                    <UserRound size={21} />
                  )}
                </span>

                <span className="prescription-user-info">
                  <strong>
                    {profileLoading ? "Loading..." : displayName}
                  </strong>
                  <span>{isAdmin ? "Administrator" : "Member"}</span>
                </span>

                {profileOpen ? (
                  <ChevronUp className="prescription-profile-chevron" size={16} />
                ) : (
                  <ChevronDown className="prescription-profile-chevron" size={16} />
                )}
              </button>

              {profileOpen && (
                <div className="prescription-profile-dropdown">
                  <div className="prescription-profile-heading">
                    <span className="prescription-dropdown-avatar">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" />
                      ) : (
                        <UserRound size={25} />
                      )}
                    </span>
                    <span className="prescription-profile-title">
                      <strong>{displayName}</strong>
                      <span>{isAdmin ? "Administrator" : "Member Account"}</span>
                    </span>
                  </div>

                  <div className="prescription-profile-details">
                    <div>
                      <Mail size={16} />
                      <span>{profile?.email || firebaseUser?.email || "Email not available"}</span>
                    </div>
                    {!isAdmin && (<div>
                      <Phone size={16} />
                      <span>{profile?.phone || "Phone number not available"}</span>
                    </div>)}
                  </div>

                  {!isAdmin && (<button type="button" className="prescription-edit-button" onClick={openEditProfile} disabled={!firebaseUser || profileLoading}>
                    <Pencil size={16} /> Edit Profile
                  </button>)}

                  <button
                    type="button"
                    className="prescription-signout-button"
                    onClick={handleSignOut}
                    disabled={!firebaseUser}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Nested page content */}
        <main className="prescription-content">
          {saveMessage && (
            <div className="prescription-save-success" role="status">
              {saveMessage}
              <button type="button" onClick={() => setSaveMessage("")} aria-label="Dismiss message">?</button>
            </div>
          )}
          <Outlet context={{ displayName }} />
        </main>
      </div>

      {editProfileOpen && (
        <div
          className="prescription-edit-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingProfile) {
              setEditProfileOpen(false);
            }
          }}
        >
          <section
            className="prescription-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prescription-edit-profile-title"
          >
            <div className="prescription-edit-header">
              <div>
                <span>ACCOUNT SETTINGS</span>
                <h2 id="prescription-edit-profile-title">Edit Profile</h2>
              </div>
              <button
                type="button"
                onClick={() => !savingProfile && setEditProfileOpen(false)}
                aria-label="Close edit profile"
                disabled={savingProfile}
              >
                <XCircle size={21} />
              </button>
            </div>

            <div className="prescription-edit-avatar-area avatar-only">
              <div className="prescription-edit-preview">
                <img src={profilePreview || avatarOptions[0]} alt="Selected avatar" />
              </div>
              <small>Choose a cartoon avatar below. Your selection is saved to your account.</small>
            </div>

            <div className="prescription-avatar-picker">
              <strong>Choose an avatar</strong>
              <div className="prescription-avatar-options">
                {avatarOptions.map((avatar, index) => (
                  <button
                    type="button"
                    key={avatar}
                    className={selectedAvatar === avatar ? "selected" : ""}
                    onClick={() => {
                      setSelectedAvatar(avatar);
                      setProfilePreview(avatar);
                      setEditError("");
                    }}
                    disabled={savingProfile}
                    aria-pressed={selectedAvatar === avatar}
                    aria-label={`Choose avatar ${index + 1}`}
                    title={index >= 12 ? "Robot avatar" : "Cartoon avatar"}
                  >
                    <img src={avatar} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>

            <label className="prescription-edit-field">
              Full name
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                maxLength={100}
                disabled={savingProfile}
                autoComplete="name"
              />
            </label>

            <label className="prescription-edit-field">
              Email address
              <input value={displayEmail} readOnly />
            </label>

            <label className="prescription-edit-field">
              Phone number
              <input
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                maxLength={20}
                type="tel"
                disabled={savingProfile}
                autoComplete="tel"
              />
            </label>

            {editError && (
              <p className="prescription-edit-error" role="alert">{editError}</p>
            )}

            <div className="prescription-edit-actions">
              <button
                type="button"
                className="prescription-edit-cancel"
                onClick={() => setEditProfileOpen(false)}
                disabled={savingProfile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="prescription-edit-save"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                <Save size={16} />
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default PrescriptionLayout;