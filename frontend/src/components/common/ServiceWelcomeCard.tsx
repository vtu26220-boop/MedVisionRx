import type { ReactNode } from "react";
import "./ServiceWelcomeCard.css";

type Props = {
  service: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  tone: "blood" | "donation" | "requirement";
  icon: ReactNode;
};

export default function ServiceWelcomeCard({ service, name, description, image, imageAlt, tone, icon }: Props) {
  return (
    <section className={`service-welcome-card service-welcome-${tone}`}>
      <div className="service-welcome-copy">
        <span className="service-welcome-kicker">{icon}{service}</span>
        <h2>Welcome <span>{name}!</span></h2>
        <p>{description}</p>
      </div>
      <div className="service-welcome-image">
        <img src={image} alt={imageAlt} loading="eager" decoding="async" />
      </div>
    </section>
  );
}
