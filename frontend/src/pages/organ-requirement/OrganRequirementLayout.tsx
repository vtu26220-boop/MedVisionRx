import { useWebsiteAdmin } from "../../components/admin-access/WebsiteAdminContext";
import { signOutWebsiteAccount } from "../../components/admin-access/adminSession";
import {
  Outlet,
  NavLink,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  BookOpen,
  Building2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Home,
  Info,
  Menu,
  Mail,
  Phone,
  LogOut,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Pencil,
  Save,
  XCircle,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebase";

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

import { useTheme } from "../../context/useTheme";

import "./OrganRequirementLayout.css";
import medvisionRxLogo from "../../assets/medvisionrx-logo.png";

function OrganRequirementLayout() {
  const {isAdmin}=useWebsiteAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  const { theme, toggleTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
    const dialog = document.querySelector<HTMLElement>(".organ-requirement-edit-modal");
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
              role: "Requester",
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
        role: "Requester",
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

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
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
        role: "Requester",
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

  // =====================================================
  // CLOSE MOBILE MENU
  // =====================================================

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  // =====================================================
  // PAGE NAME
  // =====================================================

  const getPageName = () => {
    const path = location.pathname;

    if (path === "/organ-requirement") {
      return "Dashboard";
    }

    if (path.endsWith("/search")) {
      return "Search Organ";
    }

    if (path.endsWith("/nearby-organ-banks")) {
      return "Nearby Organ Banks";
    }

    if (path.endsWith("/my-requests")) {
      return "My Requests";
    }

    if (path.endsWith("/saved-organ-donors")) {
      return "Saved Donors";
    }

    if (path.endsWith("/eligibility")) {
      return "Eligibility";
    }

    if (path.endsWith("/guidelines")) {
      return "Guidelines";
    }

    if (path.endsWith("/create")) {
      return "Create Requirement";
    }

    if (path.includes("/details/")) {
      return "Requirement Details";
    }

    if (path.includes("/donor-responses/")) {
      return "Donor Responses";
    }

    if (path.includes("/about")) {
      return "About MedVisionRx";
    }

    if (path.includes("/contact")) {
      return "Contact Support";
    }

    return "Dashboard";
  };

  const pageName = getPageName();

  // =====================================================
  // NAVIGATION ITEMS
  // =====================================================

  const navItems = [
    {
      label: "Dashboard",
      path: "/organ-requirement",
      icon: Activity,
      exact: true,
    },
    {
      label: "Search Organ",
      path: "/organ-requirement/search",
      icon: Search,
    },
    {
      label: "Nearby Organ Banks",
      path: "/organ-requirement/nearby-organ-banks",
      icon: Building2,
    },
    {
      label: "My Requests",
      path: "/organ-requirement/my-requests",
      icon: ClipboardList,
    },
    {
      label: "Saved Donors",
      path: "/organ-requirement/saved-organ-donors",
      icon: Users,
    },
    {
      label: "Eligibility",
      path: "/organ-requirement/eligibility",
      icon: ShieldCheck,
    },
    {
      label: "Guidelines",
      path: "/organ-requirement/guidelines",
      icon: BookOpen,
    },
  ];

  // =====================================================
  // TOGGLE SIDEBAR
  // =====================================================

  const toggleSidebar = () => {
    setCollapsed((value) => !value);
  };

  // =====================================================
  // GO TO SERVICES
  // =====================================================

  const goToServices = () => {
    closeMobileMenu();
    navigate("/services");
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className={`organ-requirement-layout ${
        collapsed ? "sidebar-collapsed" : ""
      }`}
    >
      {/* =====================================================
          MOBILE OVERLAY
          ===================================================== */}

      {mobileOpen && (
        <button
          type="button"
          className="organ-requirement-mobile-overlay"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        />
      )}

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside
        className={`organ-requirement-sidebar ${
          mobileOpen
            ? "organ-requirement-sidebar-open"
            : ""
        }`}
      >
        {/* ===================================================
            BRAND
            =================================================== */}

        <div className="organ-requirement-brand">
          <button
            type="button"
            className="organ-requirement-brand-link"
            onClick={goToServices}
            onMouseDown={(event) =>
              event.preventDefault()
            }
            aria-label="Go to services"
            title={
              collapsed
                ? "MedVisionRx"
                : undefined
            }
          >
            <div className="organ-requirement-brand-icon">
              <img src={medvisionRxLogo} alt="MedVisionRx logo" />
            </div>

            {!collapsed && (
              <div className="organ-requirement-brand-text">
                <strong>
                  MedVisionRx
                </strong>

                <span>
                  Healthcare Platform
                </span>
              </div>
            )}
          </button>

          {/* MOBILE CLOSE */}

          <button
            type="button"
            className="organ-requirement-mobile-close"
            onClick={closeMobileMenu}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* ===================================================
            SERVICE CARD
            =================================================== */}

        {!collapsed && (
          <div className="organ-requirement-service-card">
            <div className="organ-requirement-service-icon">
              <img src="https://cdn.pixabay.com/photo/2021/12/16/03/39/heart-6873709_1280.jpg" alt="Organ transplant care illustration" title="Organ care illustration by geralt / Pixabay" />
            </div>

            <div className="organ-requirement-service-content">
              <span>
                SERVICE
              </span>

              <strong>
                Organ Requirement
              </strong>
            </div>
          </div>
        )}

        {/* ===================================================
            NAVIGATION HEADING
            =================================================== */}

        {!collapsed && (
          <div className="organ-requirement-nav-heading">
            ORGAN REQUIREMENT
          </div>
        )}

        {/* ===================================================
            MAIN NAVIGATION
            =================================================== */}

        <nav className="organ-requirement-navigation">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={closeMobileMenu}
                title={
                  collapsed
                    ? item.label
                    : undefined
                }
                className={({ isActive }) =>
                  `organ-requirement-nav-item ${
                    isActive
                      ? "organ-requirement-nav-item-active"
                      : ""
                  }`
                }
              >
                <span className="organ-requirement-nav-icon">
                  <Icon size={19} />
                </span>

                {!collapsed && (
                  <span className="organ-requirement-nav-label">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ===================================================
            BOTTOM NAVIGATION
            =================================================== */}

        <div className="organ-requirement-sidebar-bottom">
          {/* HOME */}

          <Link
            to="/services"
            className="organ-requirement-bottom-item"
            onClick={closeMobileMenu}
            onMouseDown={(event) =>
              event.preventDefault()
            }
            title={
              collapsed
                ? "Home"
                : undefined
            }
          >
            <Home size={18} />

            {!collapsed && (
              <span>
                Home
              </span>
            )}
          </Link>

          {/* ABOUT */}

          <NavLink
            to="/organ-requirement/about"
            onClick={closeMobileMenu}
            className="organ-requirement-bottom-item"
            title={
              collapsed
                ? "About MedVisionRx"
                : undefined
            }
          >
            <Info size={18} />

            {!collapsed && (
              <span>
                About MedVisionRx
              </span>
            )}
          </NavLink>

          {/* CONTACT SUPPORT */}

          <NavLink
            to="/organ-requirement/contact"
            onClick={closeMobileMenu}
            className="organ-requirement-bottom-item"
            title={
              collapsed
                ? "Contact Support"
                : undefined
            }
          >
            <FileText size={18} />

            {!collapsed && (
              <span>
                Contact Support
              </span>
            )}
          </NavLink>

          {/* =================================================
              COLLAPSE BUTTON
              ================================================= */}

          <button
            type="button"
            className="organ-requirement-collapse-button"
            onClick={toggleSidebar}
            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            title={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            <ChevronRight
              size={17}
              className={
                collapsed
                  ? "organ-requirement-collapse-arrow"
                  : "organ-requirement-collapse-arrow organ-requirement-collapse-arrow-open"
              }
            />
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN AREA
          ===================================================== */}

      <div className="organ-requirement-main">
        {/* ===================================================
            TOP HEADER
            =================================================== */}

        <header className="organ-requirement-header">
          <div className="organ-requirement-header-left">
            {/* MOBILE MENU */}

            <button
              type="button"
              className="organ-requirement-menu-button"
              onClick={() =>
                setMobileOpen(true)
              }
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            {/* BREADCRUMB */}

            <div className="organ-requirement-breadcrumb">
              <button
                type="button"
                onClick={() =>
                  navigate("/services")
                }
                onMouseDown={(event) =>
                  event.preventDefault()
                }
              >
                <Home size={14} />

                <span>
                  Home
                </span>
              </button>

              <ChevronRight size={14} />

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/organ-requirement"
                  )
                }
                onMouseDown={(event) =>
                  event.preventDefault()
                }
              >
                <span>
                  Organ Requirement
                </span>
              </button>

              <ChevronRight size={14} />

              <strong>
                {pageName}
              </strong>
            </div>
          </div>

          {/* =================================================
              HEADER ACTIONS
              ================================================= */}

          <div className="organ-requirement-header-actions">
            {/* THEME: simple icon, without a square border/background */}
            <button
              type="button"
              className="organ-requirement-theme-button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === "light" ? "Enable dark mode" : "Enable light mode"}
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>

            {/* REAL LOGGED-IN USER PROFILE */}
            <div className="organ-requirement-profile-wrap" ref={profileRef}>
              <button
                type="button"
                className="organ-requirement-user"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-label="Open user profile"
              >
                <span className="organ-requirement-user-avatar">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" />
                  ) : (
                    <UserRound size={21} />
                  )}
                </span>

                <span className="organ-requirement-user-info">
                  <strong>
                    {profileLoading ? "Loading..." : displayName}
                  </strong>
                  <span>{isAdmin ? "Administrator" : "Requester"}</span>
                </span>

                {profileOpen ? (
                  <ChevronUp className="organ-requirement-profile-chevron" size={16} />
                ) : (
                  <ChevronDown className="organ-requirement-profile-chevron" size={16} />
                )}
              </button>

              {profileOpen && (
                <div className="organ-requirement-profile-dropdown">
                  <div className="organ-requirement-profile-heading">
                    <span className="organ-requirement-dropdown-avatar">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" />
                      ) : (
                        <UserRound size={25} />
                      )}
                    </span>
                    <span className="organ-requirement-profile-title">
                      <strong>{displayName}</strong>
                      <span>{isAdmin ? "Administrator" : "Requester Account"}</span>
                    </span>
                  </div>

                  <div className="organ-requirement-profile-details">
                    <div>
                      <Mail size={16} />
                      <span>{profile?.email || firebaseUser?.email || "Email not available"}</span>
                    </div>
                    {!isAdmin && (<div>
                      <Phone size={16} />
                      <span>{profile?.phone || "Phone number not available"}</span>
                    </div>)}
                  </div>

                  {!isAdmin && (<button type="button" className="organ-requirement-edit-button" onClick={openEditProfile} disabled={!firebaseUser || profileLoading}>
                    <Pencil size={16} /> Edit Profile
                  </button>)}

                  <button
                    type="button"
                    className="organ-requirement-signout-button"
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

        {/* ===================================================
            PAGE CONTENT
            =================================================== */}

        <main className="organ-requirement-page-content">
          {saveMessage && (
            <div className="organ-requirement-save-success" role="status">
              {saveMessage}
              <button type="button" onClick={() => setSaveMessage("")} aria-label="Dismiss message">?</button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {editProfileOpen && (
        <div
          className="organ-requirement-edit-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingProfile) {
              setEditProfileOpen(false);
            }
          }}
        >
          <section
            className="organ-requirement-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="organ-edit-profile-title"
          >
            <div className="organ-requirement-edit-header">
              <div>
                <span>ACCOUNT SETTINGS</span>
                <h2 id="organ-edit-profile-title">Edit Profile</h2>
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

            <div className="organ-requirement-edit-avatar-area avatar-only">
              <div className="organ-requirement-edit-preview">
                <img src={profilePreview || avatarOptions[0]} alt="Selected avatar" />
              </div>
              <small>Choose a cartoon avatar below. Your selection is saved to your account.</small>
            </div>

            <div className="organ-requirement-avatar-picker">
              <strong>Choose an avatar</strong>
              <div className="organ-requirement-avatar-options">
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

            <label className="organ-requirement-edit-field">
              Full name
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                maxLength={100}
                disabled={savingProfile}
                autoComplete="name"
              />
            </label>

            <label className="organ-requirement-edit-field">
              Email address
              <input value={displayEmail} readOnly />
            </label>

            <label className="organ-requirement-edit-field">
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
              <p className="organ-requirement-edit-error" role="alert">{editError}</p>
            )}

            <div className="organ-requirement-edit-actions">
              <button
                type="button"
                className="organ-requirement-edit-cancel"
                onClick={() => setEditProfileOpen(false)}
                disabled={savingProfile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="organ-requirement-edit-save"
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

export default OrganRequirementLayout;