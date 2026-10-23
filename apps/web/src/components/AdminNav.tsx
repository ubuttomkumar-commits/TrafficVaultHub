import { Link, useLocation } from "react-router-dom";
import styles from "./AdminNav.module.css";

interface AdminNavProps {
  maintenanceActive?: boolean;
}

export function AdminNav({ maintenanceActive }: AdminNavProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  let operatorEmail = "ubuttomkumar@gmail.com";
  let operatorRole = "Super Admin";
  try {
    const raw = localStorage.getItem("tvh_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u.email) operatorEmail = u.email;
      if (u.role) operatorRole = u.role.replace(/_/g, " ");
    }
  } catch {
    /* fallback */
  }

  const navGroups = [
    {
      group: "Core",
      items: [
        { to: "/admin", label: "Command Center" },
        { to: "/admin/applications", label: "Applications Queue" },
        { to: "/admin/publishers", label: "Publishers" },
        { to: "/admin/advertisers", label: "Advertisers" },
        { to: "/admin/offers", label: "Offers & Campaigns" },
        { to: "/admin/categories", label: "Categories" },
      ],
    },
    {
      group: "Operations",
      items: [
        { to: "/admin/compliance", label: "Compliance" },
        { to: "/admin/payouts", label: "Payouts & Finance" },
        { to: "/admin/tracking", label: "Tracking Diagnostics" },
        { to: "/admin/audit-log", label: "Audit Log" },
      ],
    },
    {
      group: "Platform",
      items: [
        { to: "/admin/cms", label: "Landing CMS" },
        { to: "/admin/announcements", label: "Announcement Bar" },
        { to: "/admin/maintenance", label: "Maintenance Mode" },
        { to: "/admin/users", label: "Users & Roles" },
        { to: "/admin/settings", label: "Settings" },
        { to: "/admin/ai-tools", label: "AI Operations Desk" },
      ],
    },
  ];

  return (
    <header className={styles.adminHeader}>
      <div className={styles.topBar}>
        <div className={styles.branding}>
          <span className={styles.brandBadge}>Operations</span>
          <Link to="/admin" className={styles.brandTitle}>
            TrafficVault<span>Hub</span>
          </Link>
        </div>

        <div className={styles.metaGroup}>
          {maintenanceActive && (
            <Link to="/admin/maintenance" className={styles.maintAlert} title="Public access restricted to maintenance page">
              <span aria-hidden="true">⚠️</span> Maintenance Active
            </Link>
          )}

          <div className={styles.statusIndicator}>
            <span className={styles.statusDot} />
            <span>D1 Authoritative</span>
          </div>

          <div className={styles.operatorPill}>
            <span>{operatorEmail}</span>
            <span className={styles.operatorRole}>{operatorRole}</span>
          </div>

          <Link to="/" className={styles.exitLink} title="Switch to Public View">
            Public View ↗
          </Link>
        </div>
      </div>

      <nav className={styles.navRibbon} aria-label="Admin Sub-navigation">
        {navGroups.map((group, gIdx) => (
          <div key={group.group} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            {gIdx > 0 && <span className={styles.navDivider} aria-hidden="true" />}
            {group.items.map((item) => {
              const isActive =
                item.to === "/admin"
                  ? currentPath === "/admin"
                  : currentPath.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </header>
  );
}
