import { useWebsiteAdmin } from "../../components/admin-access/WebsiteAdminContext";
import { signOutWebsiteAccount } from "../../components/admin-access/adminSession";

import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileHeart,
  HeartPulse,
  Home,
  Info,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth } from "../../firebase";
import ThemeToggle from "../../components/common/ThemeToggle";
import "./OrganDonationLayout.css";
import medvisionRxLogo from "../../assets/medvisionrx-logo.png";

type UserProfile = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  profileImageUrl?: string;
  avatarId?: string;
};

// Use the same avatar URLs as Blood Donation and Blood Requirement.
const AVATARS = [
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

// Older Organ Donation profiles stored numbered IDs instead of image URLs.
const resolveAvatar = (avatarId?: string) => {
  const legacyIndex = /^avatar-(\d+)$/.exec(avatarId || "");
  return legacyIndex
    ? AVATARS[Number(legacyIndex[1]) - 1] || AVATARS[0]
    : avatarId || AVATARS[0];
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function OrganDonationLayout() {
  const {isAdmin}=useWebsiteAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState("");

  const [profileDraft, setProfileDraft] = useState({
    fullName: "",
    phone: "",
    avatarId: AVATARS[0],
    profileImageUrl: "",
  });

  const profileRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------
  // FIREBASE AUTHENTICATION AND USER PROFILE
  // --------------------------------------------------

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "User profile not found. Please complete your profile."
              : `Unable to load profile (${response.status}).`
          );
        }

        const result = await response.json();

        if (!active) return;

        const userProfile = result.user ?? result;

        setProfile(userProfile);

        setProfileDraft({
          fullName:
            userProfile.fullName || user.displayName || "",
          phone: userProfile.phone || "",
          avatarId: resolveAvatar(userProfile.avatarId),
          profileImageUrl: userProfile.profileImageUrl || "",
        });
      } catch (error) {
        if (active) {
          setProfileError(
            error instanceof Error
              ? error.message
              : "Unable to load your profile."
          );
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate]);

  // --------------------------------------------------
  // CLOSE PROFILE DROPDOWN
  // --------------------------------------------------

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
      if (event.key === "Escape") {
        setProfileOpen(false);

        if (editingProfile && !savingProfile) {
          setEditingProfile(false);
          setProfileSaveMessage("");
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editingProfile, savingProfile]);

  // --------------------------------------------------
  // USER DISPLAY DATA
  // --------------------------------------------------

  const displayName = isAdmin ? "Admin" : profile?.fullName || firebaseUser?.displayName || "User";

  const displayEmail =
    profile?.email || firebaseUser?.email || "Email not available";

  const displayPhone = profile?.phone || "Not provided";

  const profilePhoto = isAdmin ? "/admin-avatar.svg" : (profile?.profileImageUrl || resolveAvatar(profile?.avatarId));

  const currentPhoto = profileDraft.profileImageUrl;

  const selectedAvatar = resolveAvatar(profileDraft.avatarId);

  // --------------------------------------------------
  // PROFILE EDIT
  // --------------------------------------------------

  const startProfileEdit = () => {
    setProfileDraft({
      fullName: profile?.fullName || firebaseUser?.displayName || "",
      phone: profile?.phone || "",
      avatarId: resolveAvatar(profile?.avatarId),
      profileImageUrl: profile?.profileImageUrl || "",
    });

    setProfileSaveMessage("");
    setProfileOpen(false);
    setEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    if (savingProfile) return;
    setEditingProfile(false);
    setProfileSaveMessage("");

    setProfileDraft({
      fullName: profile?.fullName || firebaseUser?.displayName || "",
      phone: profile?.phone || "",
      avatarId: resolveAvatar(profile?.avatarId),
      profileImageUrl: profile?.profileImageUrl || "",
    });
  };

  // --------------------------------------------------
  // SAVE PROFILE TO BACKEND
  // --------------------------------------------------

  const saveProfile = async () => {
    if (!firebaseUser || savingProfile) return;

    const fullName = profileDraft.fullName.trim();
    const phone = profileDraft.phone.trim();

    if (!fullName) {
      setProfileSaveMessage("Full name is required.");
      return;
    }

    if (!phone) {
      setProfileSaveMessage("Phone number is required.");
      return;
    }

    if (!/^[+0-9()\s-]{7,20}$/.test(phone)) {
      setProfileSaveMessage("Enter a valid phone number.");
      return;
    }

    try {
      setSavingProfile(true);
      setProfileSaveMessage("");

      const token = await firebaseUser.getIdToken();

      const response = await fetch(`${API_URL}/api/users/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email: displayEmail,
          phone,
          avatarId: profileDraft.avatarId,
          profileImageUrl: "",
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail || "Unable to save your profile."
        );
      }

      setProfile((previous) => ({
        ...(previous || {
          uid: firebaseUser.uid,
          email: displayEmail,
        }),
        fullName,
        email: displayEmail,
        phone,
        avatarId: profileDraft.avatarId,
        profileImageUrl: "",
      }));

      setProfileSaveMessage("Profile updated successfully.");
      setEditingProfile(false);
    } catch (error) {
      setProfileSaveMessage(
        error instanceof Error
          ? error.message
          : "Unable to save your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

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

  // --------------------------------------------------
  // NAVIGATION ITEMS
  // --------------------------------------------------

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/organ-donation",
      icon: <Home size={18} />,
    },
    {
      label: "Register as Donor",
      path: "/organ-donation/register",
      icon: <ClipboardList size={18} />,
    },
    {
      label: "My Donation",
      path: "/organ-donation/history",
      icon: <FileHeart size={18} />,
    },
    {
      label: "Eligibility",
      path: "/organ-donation/eligibility",
      icon: <ShieldCheck size={18} />,
    },
    {
      label: "Guidelines",
      path: "/organ-donation/guidelines",
      icon: <BookOpen size={18} />,
    },
    {
      label: "Organ Requests",
      path: "/organ-donation/requests",
      icon: <Users size={18} />,
    },
    {
      label: "Organ Banks",
      path: "/organ-donation/organ-banks",
      icon: <Building2 size={18} />,
    },
  ];

  const getPageTitle = () => {
    if (location.pathname.includes("/about")) {
      return "About MedVisionRx";
    }

    if (location.pathname.includes("/contact")) {
      return "Contact Support";
    }

    const currentItem = navigationItems.find(
      (item) =>
        item.path === location.pathname ||
        (item.path !== "/organ-donation" &&
          location.pathname.startsWith(`${item.path}/`))
    );

    return currentItem?.label || "Dashboard";
  };

  // --------------------------------------------------
  // SIDEBAR ACTIONS
  // --------------------------------------------------

  const closeMobileSidebar = () => setSidebarOpen(false);

  const goToServices = () => {
    closeMobileSidebar();
    navigate("/services");
  };

  return (
    <div
      className={`organ-donation-layout ${
        collapsed ? "sidebar-collapsed" : ""
      }`}
    >
      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <button
          type="button"
          className="organ-sidebar-overlay"
          onClick={closeMobileSidebar}
          aria-label="Close sidebar"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`organ-donation-sidebar ${
          sidebarOpen ? "mobile-open" : ""
        }`}
      >
        {/* COMMON BRAND LOGO */}

        <div className="organ-sidebar-brand">
          <button
            type="button"
            className="organ-sidebar-logo"
            onClick={goToServices}
            aria-label="Go to MedVisionRx services"
            title={collapsed ? "MedVisionRx" : undefined}
          >
            <div className="organ-sidebar-logo-icon">
              <HeartPulse
                className="organ-sidebar-logo-fallback"
                size={24}
              />

              <img
                src={medvisionRxLogo}
                alt="MedVisionRx"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>

            {!collapsed && (
              <div className="organ-sidebar-brand-text">
                <span className="organ-sidebar-brand-name">
                  MedVisionRx
                </span>

                <span className="organ-sidebar-service-name">
                  Healthcare Platform
                </span>
              </div>
            )}
          </button>

          <button
            type="button"
            className="organ-sidebar-mobile-close"
            onClick={closeMobileSidebar}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        {/* ORGAN DONATION SERVICE BOX */}

        {!collapsed && (
          <div className="organ-sidebar-service-box">
            <div className="organ-sidebar-service-icon organ-sidebar-service-icon-image">
              <HeartPulse
                className="organ-service-image-fallback"
                size={24}
              />

              <img
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=160&h=160&q=85"
                alt="Organ Donation"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div className="organ-sidebar-service-content">
              <span className="organ-sidebar-service-label">
                SERVICE
              </span>

              <strong>Organ Donation</strong>
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="organ-sidebar-section-label">
            DONATION
          </div>
        )}

        {/* NAVIGATION */}

        <nav className="organ-sidebar-navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/organ-donation"}
              onClick={closeMobileSidebar}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `organ-sidebar-nav-item ${
                  isActive ? "organ-sidebar-nav-item-active" : ""
                }`
              }
            >
              <span className="organ-sidebar-nav-icon">
                {item.icon}
              </span>

              {!collapsed && (
                <span className="organ-sidebar-nav-label">
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* SIDEBAR BOTTOM */}

        <div className="organ-sidebar-bottom">
          <Link
            to="/services"
            className="organ-sidebar-bottom-link"
            onClick={closeMobileSidebar}
            title={collapsed ? "Home" : undefined}
          >
            <Home size={17} />
            {!collapsed && <span>Home</span>}
          </Link>

          <NavLink
            to="/organ-donation/about"
            onClick={closeMobileSidebar}
            className="organ-sidebar-bottom-link"
            title={collapsed ? "About MedVisionRx" : undefined}
          >
            <Info size={17} />
            {!collapsed && <span>About MedVisionRx</span>}
          </NavLink>

          <NavLink
            to="/organ-donation/contact"
            onClick={closeMobileSidebar}
            className="organ-sidebar-bottom-link"
            title={collapsed ? "Contact Support" : undefined}
          >
            <MessageCircle size={17} />
            {!collapsed && <span>Contact Support</span>}
          </NavLink>

          <button
            type="button"
            className="organ-sidebar-collapse-button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={
              collapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            <ChevronRight
              size={17}
              className={`organ-collapse-arrow ${
                !collapsed ? "organ-collapse-arrow-open" : ""
              }`}
            />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <div className="organ-donation-main">
        {/* TOPBAR */}

        <header className="organ-donation-topbar">
          <div className="organ-topbar-left">
            <button
              type="button"
              className="organ-mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="organ-breadcrumb">
              <button
                type="button"
                className="organ-breadcrumb-home"
                onClick={() => navigate("/services")}
              >
                <Home size={15} />
                <span>Home</span>
              </button>

              <ChevronRight size={14} />

              <span>Organ Donation</span>

              <ChevronRight size={14} />

              <strong>{getPageTitle()}</strong>
            </div>
          </div>

          {/* TOPBAR ACTIONS */}

          <div className="organ-topbar-actions">
            <div className="organ-theme-toggle">
              <ThemeToggle />
            </div>

            {/* PROFILE */}

            <div className="organ-profile-wrapper" ref={profileRef}>
              <button
                type="button"
                className="organ-topbar-user"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
                aria-label="Open user profile"
              >
                <div
                  className="organ-topbar-user-avatar"
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" />
                  ) : (
                    <img
                      src={resolveAvatar(profile?.avatarId)}
                      alt="Selected avatar"
                    />
                  )}
                </div>

                <div className="organ-topbar-user-info">
                  <span className="organ-topbar-user-name">
                    {profileLoading ? "Loading..." : displayName}
                  </span>

                  <span className="organ-topbar-user-role">{isAdmin ? "Administrator" : "Organ Donor"}</span>
                </div>

                <ChevronDown
                  size={15}
                  className={`organ-profile-chevron ${
                    profileOpen ? "organ-profile-chevron-open" : ""
                  }`}
                />
              </button>

              {/* PROFILE DROPDOWN */}

              {profileOpen && (
                <div className="organ-profile-dropdown">
                  <div className="organ-profile-heading">
                    <div
                      className="organ-profile-large-avatar"
                    >
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Profile" />
                      ) : (
                        <img
                          src={resolveAvatar(profile?.avatarId)}
                          alt="Selected avatar"
                        />
                      )}
                    </div>

                    <div className="organ-profile-heading-text">
                      <strong>{displayName}</strong>
                      <span>{isAdmin ? "Administrator" : "Organ Donor Account"}</span>
                    </div>
                  </div>

                  <div className="organ-profile-details">
                    <div className="organ-profile-detail">
                      <Mail size={16} />
                      <span>{displayEmail}</span>
                    </div>

                    {!isAdmin && (<div className="organ-profile-detail">
                      <Phone size={16} />
                      <span>{displayPhone}</span>
                    </div>)}
                  </div>

                  {profileError && (
                    <p className="organ-profile-error">
                      {profileError}
                    </p>
                  )}

                  {!isAdmin && (<button
                    type="button"
                    className="organ-profile-edit-button"
                    onClick={startProfileEdit}
                  >
                    <Pencil size={15} />
                    Edit Profile
                  </button>)}

                  <button
                    type="button"
                    className="organ-logout-button"
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

        {/* PAGE ROUTES */}

        <main className="organ-donation-content">
          <Outlet />
        </main>
      </div>

      {/* EDIT PROFILE MODAL */}

      {editingProfile && (
        <div
          className="organ-edit-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelProfileEdit();
            }
          }}
        >
          <section
            className="organ-edit-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="organ-edit-profile-title"
          >
            <div className="organ-edit-modal-header">
              <div>
                <span className="organ-edit-modal-eyebrow">
                  ACCOUNT SETTINGS
                </span>

                <h2 id="organ-edit-profile-title">
                  Edit Profile
                </h2>
              </div>

              <button
                type="button"
                className="organ-edit-modal-close"
                onClick={cancelProfileEdit}
                disabled={savingProfile}
                aria-label="Close edit profile"
              >
                <X size={19} />
              </button>
            </div>

            {/* AVATAR PREVIEW */}

            <div className="organ-edit-avatar-preview">
              <div
                className="organ-edit-avatar-large"
              >
                {currentPhoto ? (
                  <img src={currentPhoto} alt="Selected profile" />
                ) : (
                  <img src={selectedAvatar} alt="Selected avatar" />
                )}
              </div>

              <p>
                Choose a cartoon avatar below. Your selection is saved to your account.
              </p>
            </div>

            {/* AVATAR OPTIONS */}

            <div className="organ-avatar-section">
              <div className="organ-avatar-section-heading">
                Choose your avatar
              </div>

              <div className="organ-avatar-grid">
                {AVATARS.map((avatar, index) => (
                  <button
                    type="button"
                    key={avatar}
                    className={`organ-avatar-option ${
                      !currentPhoto &&
                      profileDraft.avatarId === avatar
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setProfileDraft((previous) => ({
                        ...previous,
                        avatarId: avatar,
                        profileImageUrl: "",
                      }))
                    }
                    disabled={savingProfile}
                    title={index >= 12 ? "Robot avatar" : "Cartoon avatar"}
                    aria-label={`Choose avatar ${index + 1}`}
                    aria-pressed={
                      !currentPhoto &&
                      profileDraft.avatarId === avatar
                    }
                  >
                    <img src={avatar} alt="" loading="lazy" />
                  </button>
                ))}
              </div>

            </div>

            {/* PROFILE FORM */}

            <div className="organ-edit-form">
              <label>
                Full name

                <input
                  type="text"
                  value={profileDraft.fullName}
                  onChange={(event) =>
                    setProfileDraft((previous) => ({
                      ...previous,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="Enter your full name"
                />
              </label>

              <label>
                Email address

                <input
                  type="email"
                  value={displayEmail}
                  readOnly
                />
              </label>

              <label>
                Phone number

                <input
                  type="tel"
                  value={profileDraft.phone}
                  onChange={(event) =>
                    setProfileDraft((previous) => ({
                      ...previous,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Enter your phone number"
                />
              </label>
            </div>

            {profileSaveMessage && (
              <p
                className={`organ-edit-feedback ${
                  profileSaveMessage.includes("successfully")
                    ? "success"
                    : ""
                }`}
              >
                {profileSaveMessage}
              </p>
            )}

            {/* MODAL BUTTONS */}

            <div className="organ-edit-modal-actions">
              <button
                type="button"
                className="organ-edit-cancel-button"
                onClick={cancelProfileEdit}
                disabled={savingProfile}
              >
                Cancel
              </button>

              <button
                type="button"
                className="organ-edit-save-button"
                onClick={saveProfile}
                disabled={savingProfile}
              >
                <Save size={15} />

                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default OrganDonationLayout;
