import medvisionLogo from "../../assets/medvisionrx-logo.png";
import React, { useEffect, useState } from "react";
import { HeartPulse, Droplets, Heart, ShieldCheck, Users, ArrowLeft, ArrowRight, UserRound, ClipboardList, Gift } from "lucide-react";

import prescriptionHero from "../../assets/home/prescription-hero.png";
import bloodDonationHero from "../../assets/home/blood-donation-hero.png";
import bloodRequirementHero from "../../assets/home/blood-requirement-hero.png";
import organDonationHero from "../../assets/home/organ-donation-hero.png";
import organRequirementHero from "../../assets/home/organ-requirement-hero.png";

import "./Home.css";

type ServiceSlide = {
  name: string;
  shortName: string;
  eyebrow: string;
  description: string;
  image: string;
  accent: string;
  icon: React.ElementType;
};

const services: ServiceSlide[] = [
  {
    name: "Prescription Analyzer",
    shortName: "PRESCRIPTION ANALYZER",
    eyebrow: "READ SMARTER • TREAT BETTER",
    description:
      "Analyze prescriptions with intelligent healthcare technology and access clear medicine information.",
    image: prescriptionHero,
    accent: "#1677ff",
    icon: HeartPulse,
  },
  {
    name: "Blood Donation",
    shortName: "BLOOD DONATION",
    eyebrow: "SAVE LIVES",
    description:
      "Connect blood donors with people and healthcare communities when every donation matters.",
    image: bloodDonationHero,
    accent: "#ff3347",
    icon: Droplets,
  },
  {
    name: "Blood Requirement",
    shortName: "BLOOD REQUIREMENT",
    eyebrow: "FIND BLOOD",
    description:
      "Find blood support quickly by connecting patients with suitable donors and blood banks.",
    image: bloodRequirementHero,
    accent: "#ff3347",
    icon: Droplets,
  },
  {
    name: "Organ Donation",
    shortName: "ORGAN DONATION",
    eyebrow: "GIVE A SECOND CHANCE",
    description:
      "Support organ donation and help connect donors with a healthcare community built around hope.",
    image: organDonationHero,
    accent: "#16a765",
    icon: Heart,
  },
  {
    name: "Organ Requirement",
    shortName: "ORGAN REQUIREMENT",
    eyebrow: "FIND ORGAN SUPPORT",
    description:
      "Help people searching for organ support connect with donors and healthcare resources.",
    image: organRequirementHero,
    accent: "#8b5cf6",
    icon: HeartPulse,
  },
];

const serviceRoutes: Record<string, string> = {
  "Prescription Analyzer": "/prescription",
  "Blood Donation": "/blood-donation",
  "Blood Requirement": "/blood-requirement",
  "Organ Donation": "/organ-donation",
  "Organ Requirement": "/organ-requirement",
};

const Home: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(1);

  const current = services[currentSlide];
  const CurrentIcon = current.icon;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % services.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, []);

  const goNext = () => {
    setCurrentSlide((prev) => (prev + 1) % services.length);
  };

  const goPrevious = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + services.length) % services.length
    );
  };

  const openService = () => {
    const route = serviceRoutes[current.name];

    if (route) {
      window.location.assign(route);
    }
  };

  return (
    <div className="home-page">
      {/* ================= NAVBAR ================= */}
      <header className="home-navbar">
        <div className="home-navbar-inner">
          <a href="/" className="home-brand">
            <div className="home-brand-logo">
              <img src={medvisionLogo} alt="" />
            </div>

            <div className="home-brand-text">
              <div className="home-brand-name">
                MedVision<span>Rx</span>
              </div>
              <div className="home-brand-subtitle">
                Healthcare Platform
              </div>
            </div>
          </a>

          <nav className="home-nav">
            <a href="#about">About</a>
            <a href="#how-it-works">How It Works</a>
            
          </nav>

          <div className="home-auth-buttons">
            <a href="/login" className="home-login-btn">
              <UserRound size={18} />
              <span>Login</span>
            </a>

            <a href="/register" className="home-signup-btn">
              Sign Up
            </a>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section
        className="home-hero"
        style={
          {
            "--hero-accent": current.accent,
          } as React.CSSProperties
        }
      >
        <div className="home-hero-image-wrapper">
          <img
            key={current.image}
            src={current.image}
            alt={current.name}
            className="home-hero-image"
          />
        </div>

        <div className="home-hero-content">
          <div className="home-hero-copy">
            <div className="home-hero-eyebrow">
              <span>TOGETHER FOR A HEALTHIER TOMORROW</span>
              <i />
            </div>

            <h1>
              Welcome to
              <br />
              <strong>
                MedVision<span>Rx</span>
              </strong>
            </h1>

            <p>
              A compassionate healthcare platform connecting people for a
              healthier and safer community. Your actions can create hope and
              another chance at life.
            </p>

            <button
              type="button"
              className="home-service-label"
              onClick={openService}
              aria-label={`Open ${current.name}`}
            >
              <div
                className="home-service-icon"
                style={{ color: current.accent }}
              >
                <CurrentIcon size={24} strokeWidth={2.2} />
              </div>

              <div className="home-service-info">
                <span>{current.eyebrow}</span>
                <strong>{current.name}</strong>
              </div>
            </button>
          </div>

          <div className="home-watermark" aria-hidden="true">
            {current.shortName.split(" ").map((word, index) => (
              <span key={`${word}-${index}`}>{word}</span>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="home-hero-arrow home-hero-arrow-left"
          onClick={goPrevious}
          aria-label="Previous service"
        >
          <ArrowLeft size={24} />
        </button>

        <button
          type="button"
          className="home-hero-arrow home-hero-arrow-right"
          onClick={goNext}
          aria-label="Next service"
        >
          <ArrowRight size={24} />
        </button>

        <div className="home-slider-dots">
          {services.map((service, index) => (
            <button
              key={service.name}
              type="button"
              className={`home-slider-dot ${
                index === currentSlide ? "active" : ""
              }`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Show ${service.name}`}
            />
          ))}
        </div>
      </section>

      

      {/* ================= ABOUT / IMPACT ================= */}
      <section className="home-impact" id="about">
        <div className="home-section-container">
          <div className="home-impact-heading">
            <div className="home-section-label">
              <span />
              WHY MEDVISIONRX?
            </div>

            <h2>
              A Small Act Makes a <br />
              <strong>Big Impact</strong>
            </h2>

            <p>
              Healthcare becomes stronger when people come together.
              MedVisionRx makes it easier to connect donors, patients,
              healthcare resources and intelligent technology.
            </p>
          </div>

          <div className="home-impact-grid">
            <div className="home-impact-cards">
              <article className="home-impact-card pink">
                <div className="home-card-icon">
                  <Heart size={24} />
                </div>

                <h3>Save Lives</h3>

                <p>
                  One simple action can give someone hope and another chance
                  at life.
                </p>
              </article>

              <article className="home-impact-card blue">
                <div className="home-card-icon">
                  <Users size={24} />
                </div>

                <h3>Support Community</h3>

                <p>
                  Help patients and donors connect with the right support.
                </p>
              </article>

              <article className="home-impact-card blue">
                <div className="home-card-icon">
                  <ShieldCheck size={24} />
                </div>

                <h3>Safe &amp; Simple</h3>

                <p>
                  A clear, quick and easy healthcare experience.
                </p>
              </article>

              <article className="home-impact-card pink">
                <div className="home-card-icon">
                  <Gift size={24} />
                </div>

                <h3>Build a Healthier World</h3>

                <p>
                  Together we can create a stronger healthcare community.
                </p>
              </article>
            </div>

            <div className="home-impact-visual">
              <div className="home-impact-circle">
                <HeartPulse size={85} strokeWidth={1.5} />
                <Heart className="home-floating-heart heart-one" size={24} />
                <Heart className="home-floating-heart heart-two" size={20} />
                <Heart className="home-floating-heart heart-three" size={18} />
              </div>

              <div className="home-impact-callout">
                <h3>
                  Be the Reason
                  <br />
                  for Someone&apos;s Tomorrow
                </h3>

                <p>
                  Join MedVisionRx and become a part of a healthcare community
                  built around helping people.
                </p>

                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="home-how" id="how-it-works">
        <div className="home-section-container">
          <div className="home-how-heading">
            <div className="home-section-label">
              <span />
              SIMPLE &amp; CONNECTED
            </div>

            <h2>
              How <strong>MedVisionRx</strong> Works
            </h2>

            <p>
              Access the right healthcare service in just a few simple steps.
            </p>
          </div>

          <div className="home-how-grid">
            <article className="home-how-card">
              <div className="home-how-number">01</div>

              <div className="home-how-icon">
                <UserRound size={28} />
              </div>

              <h3>Create Your Account</h3>

              <p>
                Register securely and create your MedVisionRx profile.
              </p>
            </article>

            <article className="home-how-card">
              <div className="home-how-number">02</div>

              <div className="home-how-icon">
                <ClipboardList size={28} />
              </div>

              <h3>Choose a Service</h3>

              <p>
                Select prescription, blood or organ healthcare services.
              </p>
            </article>

            <article className="home-how-card">
              <div className="home-how-number">03</div>

              <div className="home-how-icon">
                <HeartPulse size={28} />
              </div>

              <h3>Get Connected</h3>

              <p>
                Find the information, donors or healthcare support you need.
              </p>
            </article>

            <article className="home-how-card">
              <div className="home-how-number">04</div>

              <div className="home-how-icon">
                <Heart size={28} />
              </div>

              <h3>Make an Impact</h3>

              <p>
                Take action and help create a healthier community.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <div className="home-footer-logo">
              <HeartPulse size={25} />
            </div>

            <div>
              <strong>
                MedVision<span>Rx</span>
              </strong>
              <p>Healthcare Platform</p>
            </div>
          </div>

          <div className="home-footer-links">
            <a href="#about">About</a>
            <a href="#how-it-works">How It Works</a>
            
            <a href="/login">Login</a>
            <a href="/register">Sign Up</a>
          </div>
        </div>

        <div className="home-footer-bottom">
          <span>© 2026 MedVisionRx. All rights reserved.</span>

          <span>Healthcare • Community • Technology</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;