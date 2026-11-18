import { useWebsiteAdmin } from "../../components/admin-access/WebsiteAdminContext";
import { signOutWebsiteAccount } from "../../components/admin-access/adminSession";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebase";
import medvisionRxLogo from "../../assets/medvisionrx-logo.png";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";

import {
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  LogOut,
  Mail,
  Phone,
  Droplets,
  Home,
  LayoutDashboard,
  Menu,
  Search,
  Bookmark,
  ClipboardList,
  X,
  Info,
  Headphones,
  ShieldCheck,
  BookOpen,
  Pencil,
  Save,
  XCircle,
} from "lucide-react";

import ThemeToggle from "../../components/common/ThemeToggle";

import "./BloodRequirementLayout.css";

type UserProfile = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  profileImageUrl?: string;
  avatarId?: string;
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function BloodRequirementLayout() {
  const {isAdmin}=useWebsiteAdmin();
  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Edit profile
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [profilePreview, setProfilePreview] = useState("");
  const [editError, setEditError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      setFirebaseUser(user);
      setProfile(null);
      setProfileError("");
      setProfileLoading(true);

      if (!user) {
        setProfileLoading(false);
        navigate("/", { replace: true });
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/users/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Your profile was not found. Please complete your user profile.");
          }
          throw new Error(`Unable to load profile (${response.status}).`);
        }

        const result = await response.json();
        if (active) setProfile(result.user ?? result);
      } catch (error) {
        if (active) {
          setProfileError(error instanceof Error ? error.message : "Unable to load your profile.");
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await signOutWebsiteAccount();
      setProfileOpen(false);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      window.alert("Unable to log out. Please try again.");
    } finally {
      setLogoutLoading(false);
    }
  };

  const displayName = isAdmin ? "Admin" : profile?.fullName || firebaseUser?.displayName || "User";
  const displayEmail = profile?.email || firebaseUser?.email || "Email not available";
  const displayPhone = profile?.phone || "Not provided";
  const profilePhoto = isAdmin ? "/admin-avatar.svg" : (profile?.profileImageUrl || profile?.avatarId || "");

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
        fullName: cleanName,
        email: profile?.email || firebaseUser.email || "",
        phone: cleanPhone,
        profileImageUrl: imageUrl,
        avatarId,
      };
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

  // =====================================================
  // PAGE NAME
  // =====================================================

  const getPageName = () => {
    if (location.pathname === "/blood-requirement") {
      return "Dashboard";
    }

    if (location.pathname.includes("/search")) {
      return "Search Blood";
    }

    if (
      location.pathname.includes(
        "/nearby-blood-banks"
      )
    ) {
      return "Nearby Blood Banks";
    }

    if (
      location.pathname.includes("/my-requests")
    ) {
      return "My Requests";
    }

    if (
      location.pathname.includes("/saved-donors")
    ) {
      return "Saved Donors";
    }

    if (
      location.pathname.includes("/eligibility")
    ) {
      return "Eligibility";
    }

    if (
      location.pathname.includes("/guidelines")
    ) {
      return "Guidelines";
    }

    if (
      location.pathname.includes("/about")
    ) {
      return "About MedVisionRx";
    }

    if (
      location.pathname.includes("/contact")
    ) {
      return "Contact Support";
    }

    return "Blood Requirement";
  };

  // =====================================================
  // CLOSE MOBILE SIDEBAR
  // =====================================================

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  // =====================================================
  // GO TO SERVICES
  // =====================================================


  return (
    <div
      className={`blood-requirement-layout ${
        sidebarCollapsed
          ? "blood-requirement-layout-collapsed"
          : ""
      }`}
    >
      {/* =================================================
          MOBILE OVERLAY
          ================================================= */}

      {mobileSidebarOpen && (
        <button
          type="button"
          className="blood-requirement-overlay"
          onClick={closeMobileSidebar}
          aria-label="Close sidebar"
        />
      )}

      {/* =================================================
          SIDEBAR
          ================================================= */}

      <aside
        className={`blood-requirement-sidebar ${
          mobileSidebarOpen
            ? "blood-requirement-sidebar-open"
            : ""
        } ${
          sidebarCollapsed
            ? "blood-requirement-sidebar-collapsed"
            : ""
        }`}
      >
        {/* =================================================
            BRAND
            ================================================= */}

        <div className="blood-requirement-brand">
          <Link
            to="/services"
            className="blood-requirement-brand-link"
            onClick={closeMobileSidebar}
            onMouseDown={(event) =>
              event.preventDefault()
            }
            title={
              sidebarCollapsed
                ? "MedVisionRx"
                : undefined
            }
          >
            <div className="blood-requirement-brand-icon">
              <img
                src={medvisionRxLogo}
                alt="MedVisionRx logo"
                className="blood-requirement-brand-logo"
              />
            </div>

            {!sidebarCollapsed && (
              <div className="blood-requirement-brand-text">
                <strong>
                  MedVisionRx
                </strong>

                <span>
                  Healthcare Platform
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            className="blood-requirement-mobile-close"
            onClick={closeMobileSidebar}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================================
            SERVICE
            ================================================= */}

        {!sidebarCollapsed && (
          <div className="blood-requirement-service">
            <div className="blood-requirement-service-icon blood-requirement-service-icon-photo">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Bloodbags.jpg"
                alt="Blood bags for blood requirement service"
                loading="eager"
                title="Blood bags photo by Antonio, CC BY-SA 2.0 — Wikimedia Commons"
              />
            </div>

            <div>
              <span>
                SERVICE
              </span>

              <strong>
                Blood Requirement
              </strong>
            </div>
          </div>
        )}

        {/* =================================================
            NAVIGATION
            ================================================= */}

        <nav className="blood-requirement-navigation">
          {!sidebarCollapsed && (
            <p className="blood-requirement-nav-title">
              BLOOD REQUIREMENT
            </p>
          )}

          {/* Dashboard */}

          <NavLink
            to="/blood-requirement"
            end
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "Dashboard"
                : undefined
            }
            className={({ isActive }) =>
              `blood-requirement-nav-link ${
                isActive
                  ? "blood-requirement-nav-link-active"
                  : ""
              }`
            }
          >
            <LayoutDashboard size={18} />

            {!sidebarCollapsed && (
              <span>
                Dashboard
              </span>
            )}
          </NavLink>

          {/* Search Blood */}

          <NavLink
            to="/blood-requirement/search"
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "Search Blood"
                : undefined
            }
            className={({ isActive }) =>
              `blood-requirement-nav-link ${
                isActive
                  ? "blood-requirement-nav-link-active"
                  : ""
              }`
            }
          >
            <Search size={18} />

            {!sidebarCollapsed && (
              <span>
                Search Blood
              </span>
            )}
          </NavLink>

          {/* Nearby Blood Banks */}

          <NavLink
            to="/blood-requirement/nearby-blood-banks"
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "Nearby Blood Banks"
                : undefined
            }
            className={({ isActive }) =>
              `blood-requirement-nav-link ${
                isActive
                  ? "blood-requirement-nav-link-active"
                  : ""
              }`
            }
          >
            <Droplets size={18} />

            {!sidebarCollapsed && (
              <span>
                Nearby Blood Banks
              </span>
            )}
          </NavLink>

          {/* My Requests */}

          <NavLink
            to="/blood-requirement/my-requests"
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "My Requests"
                : undefined
            }
            className={({ isActive }) =>
              `blood-requirement-nav-link ${
                isActive
                  ? "blood-requirement-nav-link-active"
                  : ""
              }`
            }
          >
            <ClipboardList size={18} />

            {!sidebarCollapsed && (
              <span>
                My Requests
              </span>
            )}
          </NavLink>

          {/* Saved Donors */}

          <NavLink
            to="/blood-requirement/saved-donors"
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "Saved Donors"
                : undefined
            }
            className={({ isActive }) =>
              `blood-requirement-nav-link ${
                isActive
                  ? "blood-requirement-nav-link-active"
                  : ""
              }`
            }
          >
            <Bookmark size={18} />

            {!sidebarCollapsed && (
              <span>
                Saved Donors
              </span>
            )}
          </NavLink>

          {/* Eligibility */}

          <NavLink
            to="/blood-requirement/eligibility"
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "Eligibility"
                : undefined
            }
            className={({ isActive }) =>
              `blood-requirement-nav-link ${
                isActive
                  ? "blood-requirement-nav-link-active"
                  : ""
              }`
            }
          >
            <ShieldCheck size={18} />

            {!sidebarCollapsed && (
              <span>
                Eligibility
              </span>
            )}
          </NavLink>

          {/* Guidelines */}

          <NavLink
            to="/blood-requirement/guidelines"
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "Guidelines"
                : undefined
            }
            className={({ isActive }) =>
              `blood-requirement-nav-link ${
                isActive
                  ? "blood-requirement-nav-link-active"
                  : ""
              }`
            }
          >
            <BookOpen size={18} />

            {!sidebarCollapsed && (
              <span>
                Guidelines
              </span>
            )}
          </NavLink>
        </nav>

        {/* =================================================
            BOTTOM NAVIGATION
            ================================================= */}

        <div className="blood-requirement-sidebar-bottom">
          <div className="blood-requirement-sidebar-divider" />

          {/* Home */}

          <Link
            to="/services"
            className="blood-requirement-bottom-link"
            onClick={closeMobileSidebar}
            onMouseDown={(event) =>
              event.preventDefault()
            }
            title={
              sidebarCollapsed
                ? "Home"
                : undefined
            }
          >
            <Home size={17} />

            {!sidebarCollapsed && (
              <span>
                Home
              </span>
            )}
          </Link>

          {/* About */}

          <NavLink
            to="/blood-requirement/about"
            className={({ isActive }) =>
              `blood-requirement-bottom-link ${
                isActive
                  ? "blood-requirement-bottom-link-active"
                  : ""
              }`
            }
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "About MedVisionRx"
                : undefined
            }
          >
            <Info size={17} />

            {!sidebarCollapsed && (
              <span>
                About MedVisionRx
              </span>
            )}
          </NavLink>

          {/* Contact */}

          <NavLink
            to="/blood-requirement/contact"
            className={({ isActive }) =>
              `blood-requirement-bottom-link ${
                isActive
                  ? "blood-requirement-bottom-link-active"
                  : ""
              }`
            }
            onClick={closeMobileSidebar}
            title={
              sidebarCollapsed
                ? "Contact Support"
                : undefined
            }
          >
            <Headphones size={17} />

            {!sidebarCollapsed && (
              <span>
                Contact Support
              </span>
            )}
          </NavLink>

          {/* =================================================
              COLLAPSE / MOVE BUTTON
              ================================================= */}

          <button
            type="button"
            className="blood-requirement-collapse-button"
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
                  ? "blood-requirement-collapse-arrow"
                  : "blood-requirement-collapse-arrow blood-requirement-collapse-arrow-open"
              }
            />
          </button>
        </div>
      </aside>

      {/* =================================================
          MAIN AREA
          ================================================= */}

      <div className="blood-requirement-main">
        {/* =================================================
            TOPBAR
            ================================================= */}

        <header className="blood-requirement-topbar">
          <div className="blood-requirement-breadcrumb">
            {/* Mobile Menu */}

            <button
              type="button"
              className="blood-requirement-mobile-menu"
              onClick={() =>
                setMobileSidebarOpen(true)
              }
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            {/* Home */}

            <Link
              to="/services"
              className="blood-requirement-breadcrumb-home"
              onMouseDown={(event) =>
                event.preventDefault()
              }
            >
              <Home size={15} />

              <span>
                Home
              </span>
            </Link>

            <ChevronRight size={14} />

            <span>
              Blood Requirement
            </span>

            <ChevronRight size={14} />

            <strong>
              {getPageName()}
            </strong>
          </div>

          {/* =================================================
              TOPBAR ACTIONS
              ================================================= */}

          <div className="blood-requirement-topbar-actions">
            <ThemeToggle />

            <div className="blood-requirement-profile-wrapper" ref={profileRef}>
              <button
                type="button"
                className="blood-requirement-user"
                onClick={() => setProfileOpen((previous) => !previous)}
                aria-expanded={profileOpen}
                aria-label="Open user profile"
              >
                <div className="blood-requirement-user-avatar">
                  {profilePhoto ? <img src={profilePhoto} alt="Profile" /> : <CircleUserRound size={22} />}
                </div>
                <div className="blood-requirement-user-info">
                  <strong>{profileLoading ? "Loading..." : displayName}</strong>
                  <span>{isAdmin ? "Administrator" : "Requester"}</span>
                </div>
                <ChevronDown
                  size={15}
                  className={`blood-requirement-profile-chevron ${
                    profileOpen ? "blood-requirement-profile-chevron-open" : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="blood-requirement-profile-dropdown">
                  <div className="blood-requirement-profile-heading">
                    <div className="blood-requirement-profile-large-avatar">
                      {profilePhoto ? <img src={profilePhoto} alt="Profile" /> : <CircleUserRound size={27} />}
                    </div>
                    <div className="blood-requirement-profile-heading-text">
                      <strong>{displayName}</strong>
                      <span>{isAdmin ? "Administrator" : "Requester Account"}</span>
                    </div>
                  </div>

                  <div className="blood-requirement-profile-details">
                    <div className="blood-requirement-profile-detail">
                      <Mail size={16} />
                      <span>{displayEmail}</span>
                    </div>
                    {!isAdmin && (<div className="blood-requirement-profile-detail">
                      <Phone size={16} />
                      <span>{displayPhone}</span>
                    </div>)}
                    {profile?.location && (
                      <div className="blood-requirement-profile-detail">
                        <Home size={16} />
                        <span>{profile.location}</span>
                      </div>
                    )}
                  </div>

                  {profileError && (
                    <p className="blood-requirement-profile-error">{profileError}</p>
                  )}

                  {!isAdmin && (<button
                    type="button"
                    className="blood-requirement-edit-button"
                    onClick={openEditProfile}
                  >
                    <Pencil size={15} />
                    Edit Profile
                  </button>)}

                  <button
                    type="button"
                    className="blood-requirement-logout-button"
                    onClick={handleLogout}
                    disabled={logoutLoading || !firebaseUser}
                  >
                    <LogOut size={16} />
                    {logoutLoading ? "Logging out..." : "Logout"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
            ================================================= */}

        <main className="blood-requirement-content">
          {saveMessage && (
            <div className="blood-requirement-save-success" role="status">
              {saveMessage}
              <button type="button" onClick={() => setSaveMessage("")} aria-label="Dismiss message">×</button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {editProfileOpen && (
        <div
          className="blood-requirement-edit-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingProfile) {
              setEditProfileOpen(false);
            }
          }}
        >
          <section
            className="blood-requirement-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="blood-edit-profile-title"
          >
            <div className="blood-requirement-edit-header">
              <div>
                <span>ACCOUNT SETTINGS</span>
                <h2 id="blood-edit-profile-title">Edit Profile</h2>
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

            <div className="blood-requirement-edit-avatar-area avatar-only">
              <div className="blood-requirement-edit-preview">
                <img src={profilePreview || avatarOptions[0]} alt="Selected avatar" />
              </div>
              <small>Choose a cartoon avatar below. Your selection is saved to your account.</small>
            </div>

            <div className="blood-requirement-avatar-picker">
              <strong>Or choose an avatar</strong>
              <div className="blood-requirement-avatar-options">
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
                    aria-label={`Choose avatar ${index + 1}`}
                    title={index >= 12 ? "Robot avatar" : "Cartoon avatar"}
                  >
                    <img src={avatar} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>

            <label className="blood-requirement-edit-field">
              Full name
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                maxLength={100}
                autoComplete="name"
              />
            </label>

            <label className="blood-requirement-edit-field">
              Email address
              <input value={displayEmail} readOnly />
            </label>

            <label className="blood-requirement-edit-field">
              Phone number
              <input
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                maxLength={20}
                autoComplete="tel"
              />
            </label>

            {editError && (
              <p className="blood-requirement-edit-error" role="alert">{editError}</p>
            )}

            <div className="blood-requirement-edit-actions">
              <button
                type="button"
                className="blood-requirement-edit-cancel"
                onClick={() => setEditProfileOpen(false)}
                disabled={savingProfile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="blood-requirement-edit-save"
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

export default BloodRequirementLayout;