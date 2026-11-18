import medvisionLogo from "../../assets/medvisionrx-logo.png";
import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Users,
  CheckCircle2,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

import { auth } from "../../firebase";
import "./Register.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

type RegisterForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterForm>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  };

  const saveUserProfileToMongoDB = async (
    fullName: string,
    email: string,
    phone: string
  ) => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Firebase user session was not found.");
    }

    const idToken = await user.getIdToken();

    const response = await fetch(
      `${API_URL}/api/users/profile`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fullName,
          email,
          phone,
        }),
      }
    );

    let responseData: {
      success?: boolean;
      message?: string;
      detail?: string;
    } = {};

    try {
      responseData = await response.json();
    } catch {
      // Ignore non-JSON error response.
    }

    if (!response.ok) {
      throw new Error(
        responseData.detail ||
          responseData.message ||
          "Unable to save your profile."
      );
    }

    return responseData;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const fullName = formData.fullName.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!phone) {
      setError("Please enter your phone number.");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!formData.password) {
      setError("Please enter a password.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!formData.terms) {
      setError(
        "Please accept the Terms of Service and Privacy Policy."
      );
      return;
    }

    setLoading(true);

    let firebaseUserCreated = false;

    try {
      // ---------------------------------------------
      // 1. Create Firebase authentication account
      // ---------------------------------------------
      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          formData.password
        );

      firebaseUserCreated = true;

      // ---------------------------------------------
      // 2. Save user's display name in Firebase Auth
      // ---------------------------------------------
      await updateProfile(credential.user, {
        displayName: fullName,
      });

      // ---------------------------------------------
      // 3. Save profile in EXISTING MongoDB
      // ---------------------------------------------
      await saveUserProfileToMongoDB(
        fullName,
        email,
        phone
      );

      // ---------------------------------------------
      // 4. Registration completed
      // ---------------------------------------------
      setSuccess(
        "Account created successfully. Please login."
      );

      // Important:
      // We do NOT go directly to /services.
      // User must login with the newly created credentials.
      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            registered: true,
            email,
          },
        });
      }, 1200);
    } catch (error: unknown) {
      // ---------------------------------------------
      // If Firebase account was created but MongoDB
      // failed, remove the Firebase account so we
      // don't leave an incomplete account behind.
      // ---------------------------------------------
      if (firebaseUserCreated && auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (deleteError) {
          console.error(
            "Unable to roll back Firebase account:",
            deleteError
          );
        }
      }

      const firebaseError = error as {
        code?: string;
        message?: string;
      };

      if (
        firebaseError.code ===
        "auth/email-already-in-use"
      ) {
        setError(
          "This email is already registered. Please login instead."
        );
      } else if (
        firebaseError.code === "auth/invalid-email"
      ) {
        setError("Please enter a valid email address.");
      } else if (
        firebaseError.code === "auth/weak-password"
      ) {
        setError(
          "Password is too weak. Use at least 6 characters."
        );
      } else if (
        firebaseError.code ===
        "auth/operation-not-allowed"
      ) {
        setError(
          "Email/password authentication is not enabled in Firebase."
        );
      } else if (
        firebaseError.message
      ) {
        setError(firebaseError.message);
      } else {
        setError(
          "Unable to create your account. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(
        auth,
        provider
      );

      const user = result.user;

      // Google account has no phone from this form.
      // Save the Google user's profile to MongoDB.
      await saveUserProfileToMongoDB(
        user.displayName || "",
        user.email || "",
        ""
      );

      setSuccess(
        "Google account created successfully."
      );

      // Google has already authenticated the user.
      // Send to services.
      setTimeout(() => {
        navigate("/services", {
          replace: true,
        });
      }, 700);
    } catch (error: unknown) {
      const firebaseError = error as {
        code?: string;
      };

      if (
        firebaseError.code ===
        "auth/popup-closed-by-user"
      ) {
        setError("Google signup was cancelled.");
      } else if (
        firebaseError.code ===
        "auth/popup-blocked"
      ) {
        setError(
          "The Google popup was blocked. Please allow popups and try again."
        );
      } else if (
        firebaseError.code ===
        "auth/account-exists-with-different-credential"
      ) {
        setError(
          "An account already exists with this email using another sign-in method."
        );
      } else {
        setError(
          "Google signup failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">

        {/* LEFT SIDE */}
        <section className="register-visual">

          <img
            src="/images/auth/signup-doctor.png"
            alt="Healthcare professional"
            className="register-doctor-image"
          />

          <div className="register-image-overlay" />

          <div className="register-brand">

            <div className="register-brand-icon">
              <img src={medvisionLogo} alt="" />
            </div>

            <div>
              <h2>
                MedVision<span>Rx</span>
              </h2>

              <p>Healthcare Platform</p>
            </div>

          </div>

          <div className="register-hero-content">

            <span className="register-small-label">
              MEDVISIONRX
            </span>

            <h1>
              Your Health,
              <br />
              <span>Our Priority</span>
            </h1>

            <p>
              Create your secure MedVisionRx account and
              access healthcare information, resources and
              support services in one place.
            </p>

          </div>

          <div className="register-features">

            <div className="register-feature">

              <div className="register-feature-icon">
                <ShieldCheck size={19} />
              </div>

              <div>
                <strong>Secure</strong>
                <span>Your data is protected</span>
              </div>

            </div>

            <div className="register-feature">

              <div className="register-feature-icon">
                <Users size={19} />
              </div>

              <div>
                <strong>Personal</strong>
                <span>Your healthcare profile</span>
              </div>

            </div>

            <div className="register-feature">

              <div className="register-feature-icon">
                <HeartPulse size={19} />
              </div>

              <div>
                <strong>Connected</strong>
                <span>Healthcare services</span>
              </div>

            </div>

          </div>

        </section>

        {/* RIGHT SIDE */}
        <section className="register-form-section">

          <div className="register-form-wrapper">

            <div className="register-heading">
              <img className="register-heading-logo" src={medvisionLogo} alt="MedVisionRx logo" />

              <h1>
                Create <span>Account</span>
              </h1>

              <p>
                Register for your MedVisionRx account to get started.
              </p>

            </div>

            {error && (
              <div className="register-error">
                {error}
              </div>
            )}

            {success && (
              <div className="register-success">
                {success}
              </div>
            )}

            <form
              className="register-form"
              onSubmit={handleSubmit}
            >

              <div className="register-field">

                <label htmlFor="fullName">
                  Full Name
                </label>

                <div className="register-input-wrapper">

                  <User
                    className="register-input-icon"
                    size={18}
                  />

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={updateField}
                    autoComplete="name"
                    disabled={loading}
                  />

                </div>

              </div>

              <div className="register-field">

                <label htmlFor="email">
                  Email Address
                </label>

                <div className="register-input-wrapper">

                  <Mail
                    className="register-input-icon"
                    size={18}
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={updateField}
                    autoComplete="email"
                    disabled={loading}
                  />

                </div>

              </div>

              <div className="register-field">

                <label htmlFor="phone">
                  Phone Number
                </label>

                <div className="register-input-wrapper">

                  <Phone
                    className="register-input-icon"
                    size={18}
                  />

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter 10-digit phone number"
                    value={formData.phone}
                    onChange={(event) => {
                      const value =
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);

                      setFormData((previous) => ({
                        ...previous,
                        phone: value,
                      }));

                      setError("");
                      setSuccess("");
                    }}
                    autoComplete="tel"
                    disabled={loading}
                  />

                </div>

              </div>

              <div className="register-field">

                <label htmlFor="password">
                  Password
                </label>

                <div className="register-input-wrapper">

                  <LockKeyhole
                    className="register-input-icon"
                    size={18}
                  />

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={updateField}
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>

              <div className="register-field">

                <label htmlFor="confirmPassword">
                  Confirm Password
                </label>

                <div className="register-input-wrapper">

                  <LockKeyhole
                    className="register-input-icon"
                    size={18}
                  />

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={updateField}
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>

              <label className="register-terms">

                <input
                  type="checkbox"
                  name="terms"
                  checked={formData.terms}
                  onChange={updateField}
                  disabled={loading}
                />

                <span className="register-checkmark">
                  <CheckCircle2 size={14} />
                </span>

                <span>
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </Link>
                </span>

              </label>

              <button
                type="submit"
                className="register-submit"
                disabled={loading}
              >
                {loading
                  ? "Creating Account..."
                  : "Create Account"}

                {!loading && <span>→</span>}
              </button>

            </form>

            <div className="register-divider">

              <span></span>

              <p>OR</p>

              <span></span>

            </div>

            <button
              type="button"
              className="register-google"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <span className="google-letter">
                G
              </span>

              {loading
                ? "Please wait..."
                : "Continue with Google"}
            </button>

            <p className="register-login-text">

              Already have an account?{" "}

              <Link to="/login">
                Log In
              </Link>

            </p>

            <Link
              to="/"
              className="register-back-home"
            >
              ← Back to Home
            </Link>

          </div>

        </section>

      </div>
    </div>
  );
};

export default Register;