import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, type ReactNode } from "react";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@trafficvaulthub/shared";
import { apiUrl } from "../lib/api";
import styles from "./Shell.module.css";

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
  { to: "/compliance", label: "Compliance" },
  { to: "/verification", label: "Verification" },
  { to: "/payouts", label: "Payouts" },
  { to: "/admin", label: "Admin" },
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
  const [maintenance, setMaintenance] = useState<{ isEnabled: boolean; headline: string } | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("tvh_token");
    setToken(t);
    const u = localStorage.getItem("tvh_user");
    if (u) {
      try {
        const parsed = JSON.parse(u);
        setUserEmail(parsed.email || parsed.role || "Partner");
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

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isSuperAdmin = userEmail?.toLowerCase().includes("admin");

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

      {maintenance?.isEnabled && (
        <div className={styles.maintenanceBanner}>
          ⚠️ <strong>System Maintenance Active:</strong> {maintenance.headline}. All tracking and postback redirects continue without interruption.
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
            const active = location.pathname === item.to || (item.to === "/admin" && isAdminRoute);
            const isAdminLink = item.to === "/admin";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`${active ? styles.navLinkActive : styles.navLink} ${isAdminLink ? styles.adminNavLink : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {isAdminLink ? "Admin Console" : item.label}
              </Link>
            );
          })}
          {token ? (
            <div className={styles.authWidget}>
              <span className={`${styles.userBadge} ${isSuperAdmin ? styles.userBadgeAdmin : ""}`} title={userEmail ?? "Logged in"}>
                {isSuperAdmin ? "Operator: " : ""}{userEmail}
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
      <main id="main-content" className={isAdminRoute ? styles.mainWide : styles.main} tabIndex={-1}>{children}</main>
      <footer className={styles.footer}>
        <p className="muted">
          Every Click Accounted For · Every Decision Explained · Every Valid
          Payout Tracked
        </p>
        <p className="muted">
          <Link to="/privacy">Privacy</Link>
          {" · "}
          <Link to="/terms">Terms</Link>
        </p>
      </footer>
    </div>
  );
}
