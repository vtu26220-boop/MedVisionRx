import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import ThemeToggle from "../common/ThemeToggle";

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">

        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">
            <HeartPulse size={22} />
          </div>

          <span>MedVisionRx</span>
        </Link>

        <nav className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/services">Services</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>

        <div className="navbar-actions">
          <ThemeToggle />

          <Link to="/login" className="navbar-login">
            Login
          </Link>

          <Link to="/register" className="navbar-signup">
            Sign Up
          </Link>
        </div>

      </div>
    </header>
  );
}

export default Navbar;