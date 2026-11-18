import { useWebsiteAdmin } from "../../components/admin-access/WebsiteAdminContext";
import { signOutWebsiteAccount } from "../../components/admin-access/adminSession";
import {
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Droplets,
  FileHeart,
  Grid2X2,
  HeartPulse,
  Home,
  Info,
  LayoutDashboard,
  Menu,
  LogOut,
  Mail,
  Phone,
  Pencil,
  Save,
  XCircle,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useEffect, useRef, useState } from "react";
import medvisionRxLogo from "../../assets/medvisionrx-logo.png";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebase";

import ThemeToggle from "../../components/common/ThemeToggle";

import "./BloodDonationLayout.css";

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

function BloodDonationLayout() {
  const {isAdmin}=useWebsiteAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Avatar-only profile editor (no photo upload or Firebase Storage).
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [editError, setEditError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

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

  const profilePhoto = isAdmin ? "/admin-avatar.svg" : (profile?.profileImageUrl || profile?.avatarId || "");

  const profileRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Load the signed-in user's profile from the existing MongoDB endpoint.
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
            throw new Error(
              "Your profile was not found. Please complete your user profile."
            );
          }
          throw new Error(`Unable to load profile (${response.status}).`);
        }

        const result = await response.json();
        if (active) setProfile(result.user);
      } catch (error) {
        if (active) {
          setProfileError(
            error instanceof Error
              ? error.message
              : "Unable to load your profile."
          );
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

  // Close the profile menu when the user clicks outside it or presses Escape.
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
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

  const openEditProfile = () => {
    setEditName(profile?.fullName || firebaseUser?.displayName || "");
    setEditPhone(profile?.phone || "");
    setSelectedAvatar(profile?.avatarId || profile?.profileImageUrl || avatarOptions[0]);
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
    if (!/^[+0-9()\\s-]{7,20}$/.test(cleanPhone)) {
      setEditError("Enter a valid phone number.");
      return;
    }

    setSavingProfile(true);
    setEditError("");
    try {
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
            profileImageUrl: "",
            avatarId: selectedAvatar || avatarOptions[0],
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
        ...(profile || { uid: firebaseUser.uid, email: firebaseUser.email || "" }),
        uid: firebaseUser.uid,
        fullName: cleanName,
        email: profile?.email || firebaseUser.email || "",
        phone: cleanPhone,
        profileImageUrl: "",
        avatarId: selectedAvatar || avatarOptions[0],
      };
      setProfile(result.user ? { ...updatedProfile, ...result.user } : updatedProfile);
      setSaveMessage("Profile saved successfully.");
      setEditProfileOpen(false);
    } catch (error) {
      setEditError(
        error instanceof DOMException && error.name === "AbortError"
          ? "Saving took too long. Check that the backend is running and PATCH /api/users/me is enabled."
          : error instanceof Error
            ? error.message
            : "Unable to save your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const displayName = isAdmin ? "Admin" : profile?.fullName || firebaseUser?.displayName || "User";
  const displayEmail = profile?.email || firebaseUser?.email || "Email not available";
  const displayPhone = profile?.phone || "Not provided";

  const navItems = [
    {
      label: "Dashboard",
      path: "/blood-donation",
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: "Register as Donor",
      path: "/blood-donation/register",
      icon: UserPlus,
    },
    {
      label: "My Donations",
      path: "/blood-donation/donations",
      icon: Droplets,
    },
    {
      label: "Eligibility",
      path: "/blood-donation/eligibility",
      icon: ShieldCheck,
    },
    {
      label: "Guidelines",
      path: "/blood-donation/guidelines",
      icon: FileHeart,
    },
    {
      label: "Blood Requests",
      path: "/blood-donation/requests",
      icon: Users,
    },
    {
      label: "Blood Banks",
      path: "/blood-donation/banks",
      icon: Grid2X2,
    },
  ];

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  const goToServices = () => {
    closeMobileSidebar();
    navigate("/services");
  };

  const getPageTitle = () => {
    if (location.pathname === "/blood-donation") {
      return "Dashboard";
    }

    if (location.pathname.includes("/register")) {
      return "Register as Donor";
    }

    if (location.pathname.includes("/donations")) {
      return "My Donations";
    }

    if (location.pathname.includes("/eligibility")) {
      return "Eligibility";
    }

    if (location.pathname.includes("/guidelines")) {
      return "Guidelines";
    }

    if (location.pathname.includes("/requests")) {
      return "Blood Requests";
    }

    if (location.pathname.includes("/banks")) {
      return "Blood Banks";
    }

    if (location.pathname.includes("/about")) {
      return "About MedVisionRx";
    }

    if (location.pathname.includes("/contact")) {
      return "Contact Support";
    }

    return "Blood Donation";
  };

  return (
    <div
      className={`blood-app-shell ${
        sidebarCollapsed
          ? "blood-layout-collapsed"
          : ""
      }`}
    >
      {/* ================= MOBILE OVERLAY ================= */}

      {mobileOpen && (
        <button
          type="button"
          className="blood-mobile-overlay"
          onClick={closeMobileSidebar}
          aria-label="Close sidebar"
        />
      )}

      {/* ================= SIDEBAR ================= */}

      <aside
        className={`blood-sidebar ${
          mobileOpen
            ? "blood-sidebar-open"
            : ""
        } ${
          sidebarCollapsed
            ? "blood-sidebar-collapsed"
            : ""
        }`}
      >
        {/* ================= BRAND ================= */}

        <div className="blood-sidebar-brand">
          <button
            type="button"
            className="blood-brand-link"
            onClick={goToServices}
            onMouseDown={(event) =>
              event.preventDefault()
            }
            aria-label="Go to services"
            title={
              sidebarCollapsed
                ? "MedVisionRx"
                : undefined
            }
          >
            <div className="blood-brand-logo">
              <img src={medvisionRxLogo} alt="MedVisionRx logo" />
            </div>

            {!sidebarCollapsed && (
              <div className="blood-brand-text">
                <span className="blood-brand-name">
                  MedVisionRx
                </span>

                <span className="blood-brand-subtitle">
                  Healthcare Platform
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            className="blood-sidebar-close"
            onClick={closeMobileSidebar}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= SERVICE HEADER ================= */}

        {!sidebarCollapsed && (
          <div className="blood-service-box">
            <div className="blood-service-icon blood-service-icon-photo">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Bloodbags.jpg"
                alt="Blood donation bags"
                loading="eager"
              />
            </div>

            <div>
              <span className="blood-service-label">
                SERVICE
              </span>

              <strong>
                Blood Donation
              </strong>
            </div>
          </div>
        )}

        {/* ================= NAVIGATION HEADING ================= */}

        {!sidebarCollapsed && (
          <div className="blood-sidebar-section-title">
            DONATION
          </div>
        )}

        {/* ================= MAIN NAVIGATION ================= */}

        <nav className="blood-sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={closeMobileSidebar}
                title={
                  sidebarCollapsed
                    ? item.label
                    : undefined
                }
                className={({ isActive }) =>
                  `blood-nav-link ${
                    isActive
                      ? "blood-nav-link-active"
                      : ""
                  }`
                }
              >
                <span className="blood-nav-icon">
                  <Icon
                    size={19}
                    strokeWidth={2}
                  />
                </span>

                {!sidebarCollapsed && (
                  <span className="blood-nav-label">
                    {item.label}
                  </span>
                )}

                
              </NavLink>
            );
          })}
        </nav>

        {/* ================= SIDEBAR BOTTOM ================= */}

        <div className="blood-sidebar-bottom">
          <div className="blood-sidebar-divider" />

          {/* HOME */}

          <button
            type="button"
            className="blood-bottom-link blood-home-button"
            onClick={goToServices}
            onMouseDown={(event) =>
              event.preventDefault()
            }
            title={
              sidebarCollapsed
                ? "Home"
                : undefined
            }
          >
            <Home size={18} />

            {!sidebarCollapsed && (
              <span>Home</span>
            )}
          </button>

          {/* ABOUT */}

          <NavLink
            to="/blood-donation/about"
            onClick={closeMobileSidebar}
            className={({ isActive }) =>
              `blood-bottom-link ${
                isActive
                  ? "blood-bottom-link-active"
                  : ""
              }`
            }
            title={
              sidebarCollapsed
                ? "About MedVisionRx"
                : undefined
            }
          >
            <Info size={18} />

            {!sidebarCollapsed && (
              <span>
                About MedVisionRx
              </span>
            )}
          </NavLink>

          {/* CONTACT */}

          <NavLink
            to="/blood-donation/contact"
            onClick={closeMobileSidebar}
            className={({ isActive }) =>
              `blood-bottom-link ${
                isActive
                  ? "blood-bottom-link-active"
                  : ""
              }`
            }
            title={
              sidebarCollapsed
                ? "Contact Support"
                : undefined
            }
          >
            <HeartPulse size={18} />

            {!sidebarCollapsed && (
              <span>
                Contact Support
              </span>
            )}
          </NavLink>

          {/* ================= COLLAPSE / MOVE BUTTON ================= */}

          <button
            type="button"
            className="blood-sidebar-collapse-button"
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
                  ? "blood-collapse-arrow"
                  : "blood-collapse-arrow blood-collapse-arrow-open"
              }
            />
          </button>
        </div>
      </aside>

      {/* ================= MAIN AREA ================= */}

      <div className="blood-main-area">
        {/* ================= TOP HEADER ================= */}

        <header className="blood-topbar">
          <div className="blood-topbar-left">
            {/* MOBILE MENU */}

            <button
              type="button"
              className="blood-menu-button"
              onClick={() =>
                setMobileOpen(true)
              }
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            {/* BREADCRUMB */}

            <div className="blood-breadcrumb">
              <button
                type="button"
                className="blood-breadcrumb-home"
                onClick={() =>
                  navigate("/services")
                }
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                aria-label="Go to Home"
              >
                <Home size={16} />
                <span>Home</span>
              </button>

              <ChevronRight size={15} />

              <span>
                Blood Donation
              </span>

              <ChevronRight size={15} />

              <strong>
                {getPageTitle()}
              </strong>
            </div>
          </div>

          {/* ================= HEADER ACTIONS ================= */}

          <div className="blood-topbar-actions">
            <ThemeToggle />

            {/* ================= USER PROFILE ================= */}
            <div className="blood-profile-wrapper" ref={profileRef}>
              <button
                type="button"
                className="blood-user"
                onClick={() => setProfileOpen((previous) => !previous)}
                aria-expanded={profileOpen}
                aria-label="Open user profile"
              >
                <div className="blood-user-avatar">
                  {profilePhoto ? <img src={profilePhoto} alt="Profile avatar" /> : <CircleUserRound size={22} />}
                </div>

                <div className="blood-user-info">
                  <strong>
                    {profileLoading ? "Loading..." : displayName}
                  </strong>
                  <span>{isAdmin ? "Administrator" : "Donor"}</span>
                </div>

                <ChevronDown
                  size={15}
                  className={`blood-profile-chevron ${
                    profileOpen ? "blood-profile-chevron-open" : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="blood-profile-dropdown">
                  <div className="blood-profile-heading">
                    <div className="blood-profile-large-avatar">
                      {profilePhoto ? <img src={profilePhoto} alt="Profile avatar" /> : <CircleUserRound size={27} />}
                    </div>
                    <div className="blood-profile-heading-text">
                      <strong>{displayName}</strong>
                      <span>{isAdmin ? "Administrator" : "Donor Account"}</span>
                    </div>
                  </div>

                  <div className="blood-profile-details">
                    <div className="blood-profile-detail">
                      <Mail size={16} />
                      <span>{displayEmail}</span>
                    </div>
                    {!isAdmin && (<div className="blood-profile-detail">
                      <Phone size={16} />
                      <span>{displayPhone}</span>
                    </div>)}
                    {profile?.location && (
                      <div className="blood-profile-detail">
                        <CircleUserRound size={16} />
                        <span>{profile.location}</span>
                      </div>
                    )}
                  </div>

                  {profileError && (
                    <p className="blood-profile-error">{profileError}</p>
                  )}

                  {!isAdmin && (<button
                    type="button"
                    className="blood-edit-profile-button"
                    onClick={openEditProfile}
                  >
                    <Pencil size={15} />
                    Edit Profile
                  </button>)}

                  <button
                    type="button"
                    className="blood-logout-button"
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

        {/* ================= PAGE CONTENT ================= */}

        <main className="blood-page-content">
          {saveMessage && (
            <div className="blood-profile-save-success" role="status">
              {saveMessage}
              <button type="button" onClick={() => setSaveMessage("")} aria-label="Dismiss message">×</button>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {editProfileOpen && (
        <div
          className="blood-edit-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingProfile) {
              setEditProfileOpen(false);
            }
          }}
        >
          <section className="blood-edit-modal" role="dialog" aria-modal="true" aria-labelledby="blood-edit-title">
            <div className="blood-edit-header">
              <div>
                <span>ACCOUNT SETTINGS</span>
                <h2 id="blood-edit-title">Edit Profile</h2>
              </div>
              <button type="button" onClick={() => !savingProfile && setEditProfileOpen(false)} aria-label="Close edit profile" disabled={savingProfile}>
                <XCircle size={21} />
              </button>
            </div>

            <div className="blood-edit-avatar-preview">
              <img src={selectedAvatar || avatarOptions[0]} alt="Selected avatar" />
              <small>Choose your avatar below. Photo uploads are disabled.</small>
            </div>

            <div className="blood-avatar-picker">
              <strong>Choose an avatar</strong>
              <div className="blood-avatar-options">
                {avatarOptions.map((avatar, index) => (
                  <button
                    type="button"
                    key={avatar}
                    className={selectedAvatar === avatar ? "selected" : ""}
                    onClick={() => { setSelectedAvatar(avatar); setEditError(""); }}
                    aria-label={`Choose avatar ${index + 1}`}
                    title={index >= 12 ? "Robot avatar" : "Cartoon avatar"}
                  >
                    <img src={avatar} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>

            <label className="blood-edit-field">
              Full name
              <input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={100} autoComplete="name" />
            </label>
            <label className="blood-edit-field">
              Email address
              <input value={displayEmail} readOnly />
            </label>
            <label className="blood-edit-field">
              Phone number
              <input value={editPhone} onChange={(event) => setEditPhone(event.target.value)} maxLength={20} autoComplete="tel" />
            </label>

            {editError && <p className="blood-edit-error" role="alert">{editError}</p>}

            <div className="blood-edit-actions">
              <button type="button" className="blood-edit-cancel" onClick={() => setEditProfileOpen(false)} disabled={savingProfile}>Cancel</button>
              <button type="button" className="blood-edit-save" onClick={handleSaveProfile} disabled={savingProfile}>
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

export default BloodDonationLayout;
