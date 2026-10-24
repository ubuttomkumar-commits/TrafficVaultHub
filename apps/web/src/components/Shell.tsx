import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, type ReactNode } from "react";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@trafficvaulthub/shared";
import { apiUrl } from "../lib/api";
import styles from "./Shell.module.css";

// Public & Partner Navigation Items — Admin and Internal Operations strictly excluded
const NAV = [
  { to: "/", label: "Home" },
  { to: "/offers", label: "Offers" },
  { to: "/tracking-links", label: "Tracking links" },
  { to: "/smartlinks", label: "Smartlinks" },
  { to: "/disputes", label: "Disputes" },
  { to: "/integrity", label: "Fraud Shield" },
  { to: "/categories", label: "Categories" },
  { to: "/earnings", label: "Earnings" },
  { to: "/conversion-confidence", label: "Confidence" },
  { to: "/offer-caps", label: "Click caps" },
  { to: "/campaign-studio", label: "Campaign studio" },
  { to: "/verification", label: "Verification" },
  { to: "/payouts", label: "Payouts" },
  { to: "/health", label: "Health" },
  { to: "/signup", label: "Sign up" },
  { to: "/login", label: "Sign in" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<{ isEnabled: boolean; headline: string; message?: string; estimatedDuration?: string } | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("tvh_token");
    setToken(t);
    const u = localStorage.getItem("tvh_user");
    if (u) {
      try {
        const parsed = JSON.parse(u);
        setUserEmail(parsed.email || "Partner");
      } catch {
        setUserEmail("Partner");
      }
    } else {
      setUserEmail(null);
    }

    fetch(apiUrl("/api/v1/announcements/active"))
      .then((r) => r.json())
      .then((d) => setAnnouncement(d.data))
      .catch(() => {});

    fetch(apiUrl("/api/v1/maintenance/status"))
      .then((r) => r.json())
      .then((d) => setMaintenance(d.data))
      .catch(() => {});
  }, [location.pathname]);

  function handleSignOut() {
    localStorage.removeItem("tvh_token");
    localStorage.removeItem("tvh_user");
    setToken(null);
    setUserEmail(null);
    navigate("/login");
  }

  // If maintenance mode is active, show the maintenance barrier for public/partner areas
  if (maintenance?.isEnabled) {
    return (
      <div className={styles.shell} style={{ minHeight: "100vh", background: "#05070d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
        <div
          style={{
            maxWidth: "560px",
            width: "100%",
            background: "rgba(10, 15, 29, 0.95)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: "12px",
            padding: "2.5rem 2rem",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
          }}
        >
          <div style={{ fontSize: "2.75rem", marginBottom: "0.75rem" }}>🛡️</div>
          <div style={{ display: "inline-block", background: "rgba(239, 68, 68, 0.12)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Scheduled System Maintenance Active
          </div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 0.75rem 0" }}>
            {maintenance.headline || "Scheduled Network Synchronization"}
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1.25rem 0" }}>
            {maintenance.message || "TrafficVaultHub is performing scheduled network synchronization and ledger upgrades. Public partner dashboards are temporarily paused for maintenance."}
          </p>
          <div style={{ display: "inline-block", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "0.4rem 0.85rem", borderRadius: "6px", fontSize: "0.78rem", color: "#38bdf8", marginBottom: "1.5rem" }}>
            Estimated Duration: {maintenance.estimatedDuration || "30 minutes"}
          </div>
          <div style={{ padding: "0.75rem 1rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "6px", fontSize: "0.8rem", color: "#34d399", margin: "0 auto 1.5rem" }}>
            ✓ Authoritative click tracking redirects and server-to-server (S2S) postbacks continue without interruption or data loss.
          </div>
          <div>
            <Link to="/admin/login" style={{ color: "#64748b", fontSize: "0.78rem", textDecoration: "none" }}>
              Platform Operator Sign In ↗
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>

      {announcement && (
        <div
          className={`${styles.announcementBar} ${
            announcement.style === "critical"
              ? styles.announcementCritical
              : announcement.style === "warning"
              ? styles.announcementWarning
              : ""
          }`}
        >
          <span>
            <strong>{announcement.title}:</strong> {announcement.message}
          </span>
          {announcement.link_url && (
            <Link to={announcement.link_url} className={styles.announcementLink}>
              {announcement.link_label || "Learn more →"}
            </Link>
          )}
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoMark} aria-hidden />
            <span className={styles.logoText}>{PRODUCT_NAME}</span>
          </Link>
          <span className={styles.tagline}>{PRODUCT_TAGLINE}</span>
        </div>
        <nav className={styles.nav} aria-label="Primary">
          {NAV.filter((item) => !(token && (item.to === "/login" || item.to === "/signup"))).map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={active ? styles.navLinkActive : styles.navLink}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          {token ? (
            <div className={styles.authWidget}>
              <span className={styles.userBadge} title={userEmail ?? "Partner"}>
                {userEmail}
              </span>
              <button
                type="button"
                className={styles.signOutBtn}
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className={styles.authWidget}>
              <Link to="/login" className={styles.signInBtn}>
                Sign in
              </Link>
            </div>
          )}
        </nav>
      </header>
      <main id="main-content" className={styles.main} tabIndex={-1}>{children}</main>
      <footer className={styles.footer}>
        <p className={styles.footerCopy}>
          © 2026 {PRODUCT_NAME}. Double-entry ledger accounting for CPA affiliate networks. Minimum payout $50. Binance Pay supported.
        </p>
        <div className={styles.footerLinks}>
          <Link to="/offers" className={styles.footerLink}>Offers</Link>
          <Link to="/tracking-links" className={styles.footerLink}>Tracking Links</Link>
          <Link to="/smartlinks" className={styles.footerLink}>Smartlinks</Link>
          <Link to="/privacy" className={styles.footerLink}>Privacy</Link>
          <Link to="/terms" className={styles.footerLink}>Terms</Link>
          <Link to="/compliance" className={styles.footerLink}>Compliance</Link>
          <Link to="/health" className={styles.footerLink}>Health</Link>
        </div>
      </footer>
    </div>
  );
}
