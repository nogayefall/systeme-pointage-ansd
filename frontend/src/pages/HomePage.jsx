import React from "react";
import "./HomePage.css";

// Icônes SVG simples, sans dépendance externe
const IconShieldLock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="11" r="1.5" fill="currentColor" />
    <path d="M12 12.5V15" />
  </svg>
);

const IconScan = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

const IconBadge = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <circle cx="12" cy="10" r="2" />
    <path d="M8 16c0-2 1.8-3 4-3s4 1 4 3" />
  </svg>
);

const roles = [
  {
    key: "admin",
    icon: <IconShieldLock />,
    title: "Administrateur",
    description: "Gestion des utilisateurs, rôles et pointages",
    buttonLabel: "Connexion administrateur",
    accent: "accent",
    href: "/login?role=admin",
  },
  {
    key: "security",
    icon: <IconScan />,
    title: "Agent de sécurité",
    description: "Enregistrer les pointages des agents",
    buttonLabel: "Connexion agent de sécurité",
    accent: "success",
    href: "/login?role=security",
  },
  {
    key: "agent",
    icon: <IconBadge />,
    title: "Agent",
    description: "Consulter mes pointages et demandes de congé",
    buttonLabel: "Accéder à mon espace",
    accent: "pro",
    href: "/login?role=agent",
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-logo">
          <img src="/images/ansd-logo.png" alt="ANSD" />
        </div>
        <h1>Système de pointage</h1>
        <p className="home-subtitle">
          Agence nationale de la statistique et de la démographie
        </p>
      </header>

      <div className="role-grid">
        {roles.map((role) => (
          <div key={role.key} className={`role-card role-card--${role.accent}`}>
            <div className={`role-icon role-icon--${role.accent}`}>
              {role.icon}
            </div>
            <p className="role-title">{role.title}</p>
            <p className="role-description">{role.description}</p>
            <a href={role.href} className={`role-button role-button--${role.accent}`}>
              {role.buttonLabel}
            </a>
          </div>
        ))}
      </div>

      <footer className="home-footer">
        © 2026 Système de pointage — ANSD
      </footer>
    </div>
  );
}
