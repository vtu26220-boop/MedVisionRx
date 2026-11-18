import medvisionLogo from "../../assets/medvisionrx-logo.png";
import { useState, type FormEvent } from "react";

import {
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import { Link, useNavigate } from "react-router-dom";

import { auth } from "../../firebase";

import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /*
   * Save basic login session
   */
  const saveSession = () => {
    const user = auth.currentUser;

    if (!user) {
      return;
    }

    const storage = rememberMe
      ? localStorage
      : sessionStorage;

    storage.setItem(
      "medvisionrxUserUid",
      user.uid
    );

    storage.setItem(
      "medvisionrxUserEmail",
      user.email || ""
    );

    storage.setItem(
      "medvisionrxUserName",
      user.displayName || ""
    );
  };

  /*
   * Go to services after successful login
   */
  const goToServices = () => {
    navigate("/services", {
      replace: true,
    });
  };

  /*
   * Normal Email + Password Login
   */
  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage(
        "Please enter your email and password."
      );

      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      saveSession();

      setSuccessMessage(
        "Login successful. Redirecting..."
      );

      window.setTimeout(() => {
        goToServices();
      }, 500);
    } catch (error: unknown) {
      const firebaseError =
        error as {
          code?: string;
        };

      switch (firebaseError.code) {
        case "auth/invalid-email":
          setErrorMessage(
            "Please enter a valid email address."
          );
          break;

        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setErrorMessage(
            "Incorrect email or password."
          );
          break;

        case "auth/user-disabled":
          setErrorMessage(
            "This account has been disabled."
          );
          break;

        case "auth/too-many-requests":
          setErrorMessage(
            "Too many attempts. Please try again later."
          );
          break;

        case "auth/network-request-failed":
          setErrorMessage(
            "Network error. Check your internet connection."
          );
          break;

        case "auth/operation-not-allowed":
          setErrorMessage(
            "Email/password login is not enabled in Firebase."
          );
          break;

        default:
          setErrorMessage(
            "Login failed. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * Google Login
   */
  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    setLoading(true);

    try {
      const provider =
        new GoogleAuthProvider();

      await signInWithPopup(
        auth,
        provider
      );

      saveSession();

      setSuccessMessage(
        "Google login successful. Redirecting..."
      );

      window.setTimeout(() => {
        goToServices();
      }, 500);
    } catch (error: unknown) {
      const firebaseError =
        error as {
          code?: string;
        };

      switch (firebaseError.code) {
        case "auth/popup-closed-by-user":
          setErrorMessage(
            "Google login was cancelled."
          );
          break;

        case "auth/popup-blocked":
          setErrorMessage(
            "Google popup was blocked. Please allow popups."
          );
          break;

        case "auth/account-exists-with-different-credential":
          setErrorMessage(
            "This email already uses another login method."
          );
          break;

        case "auth/network-request-failed":
          setErrorMessage(
            "Network error. Please check your connection."
          );
          break;

        default:
          setErrorMessage(
            "Google login failed. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * Forgot Password
   */
  const handleForgotPassword =
    async () => {
      setErrorMessage("");
      setSuccessMessage("");

      const cleanEmail =
        email.trim().toLowerCase();

      if (!cleanEmail) {
        setErrorMessage(
          "Enter your email address first."
        );

        return;
      }

      setLoading(true);

      try {
        await sendPasswordResetEmail(
          auth,
          cleanEmail
        );

        setSuccessMessage(
          "Password reset email sent. Check your inbox."
        );
      } catch (error: unknown) {
        const firebaseError =
          error as {
            code?: string;
          };

        switch (firebaseError.code) {
          case "auth/invalid-email":
            setErrorMessage(
              "Please enter a valid email address."
            );
            break;

          case "auth/user-not-found":
            setErrorMessage(
              "No account found with this email."
            );
            break;

          case "auth/too-many-requests":
            setErrorMessage(
              "Too many requests. Please try again later."
            );
            break;

          default:
            setErrorMessage(
              "Unable to send password reset email."
            );
        }
      } finally {
        setLoading(false);
      }
    };

  return (
    <main className="auth-page">

      <div className="auth-container">

        {/* ======================================
            LEFT SIDE
        ====================================== */}

        <section className="auth-left">

          <img
            src="/images/auth/login-doctor.png"
            alt="Healthcare professional"
            className="auth-doctor-image"
          />

          <div className="auth-image-overlay" />

          {/* Logo */}

          <div className="auth-brand">

            <div className="auth-brand-icon">
              <img src={medvisionLogo} alt="" />
            </div>

            <div>
              <h3>
                MedVision<span>Rx</span>
              </h3>

              <p>
                Healthcare Platform
              </p>
            </div>

          </div>

          {/* Left content */}

          <div className="auth-left-content">

            <p className="auth-small-title">
              MEDVISIONRX
            </p>

            <h1>
              Better Healthcare
              <br />
              <span>Starts Here</span>
            </h1>

            <p className="auth-description">
              Access medicine information,
              health resources and support
              services in one secure platform.
            </p>

          </div>

          {/* Features */}

          <div className="auth-features">

            <div className="auth-feature">

              <div className="auth-feature-icon">
                <HeartPulse size={18} />
              </div>

              <div>
                <strong>
                  Trusted
                </strong>

                <span>
                  Information
                </span>
              </div>

            </div>

            <div className="auth-feature">

              <div className="auth-feature-icon">
                <ShieldCheck size={18} />
              </div>

              <div>
                <strong>
                  Secure
                </strong>

                <span>
                  &amp; Private
                </span>
              </div>

            </div>

            <div className="auth-feature">

              <div className="auth-feature-icon">
                <Users size={18} />
              </div>

              <div>
                <strong>
                  One
                </strong>

                <span>
                  Platform
                </span>
              </div>

            </div>

          </div>

        </section>

        {/* ======================================
            RIGHT SIDE
        ====================================== */}

        <section className="auth-right">

          <div className="auth-form-wrapper">

            <div className="auth-heading">
              <img className="auth-heading-logo" src={medvisionLogo} alt="MedVisionRx logo" />

              <h2>
                Welcome <span>Back</span>
              </h2>

              <p>
                Sign in to your MedVisionRx
                account to continue.
              </p>

            </div>

            {/* Error */}

            {errorMessage && (
              <div className="auth-message auth-error">
                {errorMessage}
              </div>
            )}

            {/* Success */}

            {successMessage && (
              <div className="auth-message auth-success">
                {successMessage}
              </div>
            )}

            {/* Login Form */}

            <form
              className="auth-form"
              onSubmit={handleLogin}
            >

              {/* Email */}

              <div className="auth-field">

                <label htmlFor="login-email">
                  Email Address
                </label>

                <div className="auth-input-wrapper">

                  <Mail
                    size={18}
                    className="auth-input-icon"
                  />

                  <input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(event) => {
                      setEmail(
                        event.target.value
                      );

                      setErrorMessage("");
                    }}
                    autoComplete="email"
                    disabled={loading}
                    required
                  />

                </div>

              </div>

              {/* Password */}

              <div className="auth-field">

                <label htmlFor="login-password">
                  Password
                </label>

                <div className="auth-input-wrapper">

                  <LockKeyhole
                    size={18}
                    className="auth-input-icon"
                  />

                  <input
                    id="login-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value
                      );

                      setErrorMessage("");
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>

              {/* Remember + Forgot */}

              <div className="auth-options">

                <label className="remember-option">

                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    disabled={loading}
                  />

                  <span>
                    Remember me
                  </span>

                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={
                    handleForgotPassword
                  }
                  disabled={loading}
                >
                  Forgot Password?
                </button>

              </div>

              {/* Login button */}

              <button
                type="submit"
                className="auth-login-button"
                disabled={loading}
              >
                {loading
                  ? "Signing in..."
                  : "Log In"}

                <span>→</span>
              </button>

            </form>

            {/* OR */}

            <div className="auth-divider">

              <span />

              <strong>OR</strong>

              <span />

            </div>

            {/* Google */}

            <button
              type="button"
              className="google-login-button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >

              <span className="google-icon">
                G
              </span>

              <span>
                Continue with Google
              </span>

            </button>

            {/* Sign Up */}

            <p className="auth-signup-text">

              Don't have an account?

              <Link to="/register">
                Sign Up
              </Link>

            </p>

            {/* Back */}

            <Link
              to="/"
              className="auth-back-home"
            >
              ← Back to Home
            </Link>

          </div>

        </section>

      </div>

    </main>
  );
}

export default Login;