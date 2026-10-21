import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@trafficvaulthub/shared";
import styles from "./Shell.module.css";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/offers", label: "Offers" },
  { to: "/categories", label: "Categories" },
  { to: "/earnings", label: "Earnings" },
  { to: "/offer-caps", label: "Click caps" },
  { to: "/login", label: "Sign in" },
  { to: "/health", label: "System Health" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className={styles.shell}>
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
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p className="muted">
          Every Click Accounted For · Every Decision Explained · Every Valid
          Payout Tracked
        </p>
      </footer>
    </div>
  );
}
