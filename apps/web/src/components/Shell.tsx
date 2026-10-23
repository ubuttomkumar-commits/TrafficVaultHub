import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, type ReactNode } from "react";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@trafficvaulthub/shared";
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
  }, [location.pathname]);

  function handleSignOut() {
    localStorage.removeItem("tvh_token");
    localStorage.removeItem("tvh_user");
    setToken(null);
    setUserEmail(null);
    navigate("/login");
  }

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>Skip to content</a>
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
          {token && (
            <div className={styles.authWidget}>
              <span className={styles.userBadge} title={userEmail ?? "Logged in"}>
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
          )}
        </nav>
      </header>
      <main id="main-content" className={styles.main} tabIndex={-1}>{children}</main>
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
