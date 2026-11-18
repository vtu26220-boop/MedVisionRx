import { useEffect, useState } from "react";
import introBackground from "../../assets/intro-healthcare-background.png";
import logo from "../../assets/medvisionrx-logo.png";
import Home from "./Home";
import "./LandingEntry.css";

export default function LandingEntry() {
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (finished) return;
    const finish = () => setFinished(true);
    const timer = window.setTimeout(finish, 2000);
    const key = (event: KeyboardEvent) => {
      if (["Enter", " ", "Escape"].includes(event.key)) { event.preventDefault(); finish(); }
    };
    window.addEventListener("keydown", key);
    const previousOverflow = document.body.style.overflow;
    if (!finished) document.body.style.overflow = "hidden";
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", key); document.body.style.overflow = previousOverflow; };
  }, [finished]);
  if (finished) return <Home />;
  return <main className="mv-intro" onClick={() => setFinished(true)} aria-label="MedVisionRx introduction. Click anywhere or press Enter to skip to the home page. Opens automatically after two seconds.">
    <div className="mv-intro-photos" aria-hidden="true"><img src={introBackground} alt="" fetchPriority="high" /><div className="mv-intro-mobile-left" /><div className="mv-intro-mobile-right" /></div>
    <section className="mv-intro-brand" aria-label="MedVisionRx. Connected Healthcare, Simplified.">
      <div className="mv-intro-logo"><img src={logo} alt="MedVisionRx logo" fetchPriority="high" /></div>
      <h1>MedVision<span>Rx</span></h1>
      <p>Connected Healthcare, Simplified.</p>
    </section>
  </main>;
}
