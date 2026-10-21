import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@trafficvaulthub/shared";
import styles from "./Shell.module.css";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/offers", label: "Offers" },
  { to: "/categories", label: "Categories" },
  { to: "/earnings", label: "Earnings" },
  { to: "/conversion-confidence", label: "Confidence" },
  { to: "/offer-caps", label: "Click caps" },
  { to: "/campaign-studio", label: "Campaign studio" },
  { to: "/compliance", label: "Compliance" },
  { to: "/payouts", label: "Payouts" },
  { to: "/login", label: "Sign in" },
  { to: "/health", label: "System Health" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();

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
          {NAV.map((item) => {
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
