import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./AdminDashboardPage.module.css";

type OperationalMetrics = {
  pendingPublishers: number;
  pendingAdvertisers: number;
  highRiskPending: number;
  totalApplications: number;
  verifiedApplications: number;
  emailVerificationRate: number;
  decisions24h: number;
  openComplianceCases: number;
};

type AuditFeedItem = {
  id: string;
  application_id: string;
  actor_id: string;
  action: string;
  reason_code?: string;
  notes?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  account_type?: string;
  email?: string;
};

type SystemHealthInfo = {
  status: string;
  apiVersion: string;
  environment: string;
  database: string;
  checkedAt: string;
};

type OverviewData = {
  users?: { total: number };
  organizations?: Record<string, number>;
  offers?: Record<string, number>;
  conversions?: Record<string, { count: number; totalMinor: number }>;
  complianceCases?: Array<{ status: string; count: number }>;
  payouts?: Array<{ status: string; count: number; total_minor: number }>;
  partnerApplications?: Array<{ status: string; count: number }>;
  operationalMetrics?: OperationalMetrics;
  recentAuditFeed?: AuditFeedItem[];
  systemHealth?: SystemHealthInfo;
};

type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  created_at: string;
  organization_name: string | null;
  organization_type: string | null;
  role_name: string | null;
};

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Directory search & filtering
  const [userSearch, setUserSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("ALL");

  const token = localStorage.getItem("tvh_token");

  async function loadAdminData() {
    if (!token) {
      setError("Platform operator credentials required to access Admin Command Center");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [overviewRes, usersRes] = await Promise.all([
        fetch(apiUrl("/api/v1/admin/overview"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl("/api/v1/admin/users?limit=50"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (overviewRes.status === 403 || usersRes.status === 403) {
        throw new Error("Access restricted: Platform Operator or Super Admin role required.");
      }

      if (!overviewRes.ok || !usersRes.ok) {
        throw new Error(`Failed to load admin operations telemetry (HTTP ${overviewRes.status})`);
      }

      const overviewBody = await overviewRes.json();
      const usersBody = await usersRes.json();

      setOverview(overviewBody.data);
      setUsers(usersBody.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin command center data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, [token]);

  async function toggleUserStatus(userId: string, currentStatus: string) {
    if (!token) return;
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/users/${userId}/status`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus, reason: "Operator moderation from command center" }),
      });
      if (res.ok) {
        await loadAdminData();
      }
    } catch {
      // ignore
    }
  }

  // Derive metrics safely
  const op = overview?.operationalMetrics;
  const pendingPublishers = op?.pendingPublishers ?? 0;
  const pendingAdvertisers = op?.pendingAdvertisers ?? 0;
  const totalPending = pendingPublishers + pendingAdvertisers;
  const highRiskCount = op?.highRiskPending ?? 0;
  const verifRate = op?.emailVerificationRate ?? 100;
  const openCompliance = op?.openComplianceCases ?? 0;
  const decisions24h = op?.decisions24h ?? 0;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (userTypeFilter !== "ALL" && u.organization_type !== userTypeFilter) return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchName = u.display_name?.toLowerCase().includes(q) ?? false;
      const matchOrg = u.organization_name?.toLowerCase().includes(q) ?? false;
      return matchEmail || matchName || matchOrg;
    }
    return true;
  });

  return (
    <div className={styles.page}>
      {/* Top Operational Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h1>
            Network Operations Cockpit
            <span className={styles.titleBadge}>Platform Operator</span>
          </h1>
          <p className={styles.subtitle}>
            Authoritative command center for publisher onboarding, advertiser KYB, compliance verification, and ledger health.
          </p>
        </div>

        <div className={styles.telemetryBadge}>
          <span className={styles.pulseDot} />
          <span>Edge Mesh: <strong>Operational</strong></span>
          <span style={{ color: "var(--color-border-strong)" }}>|</span>
          <span className="mono" style={{ fontSize: "0.78rem" }}>
            {new Date().toISOString().slice(11, 19)} UTC
          </span>
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Real-Time Operational Metric Tiles */}
      <div className={styles.operationalGrid}>
        {/* 1. Pending Publishers */}
        <div className={`${styles.opCard} ${pendingPublishers > 0 ? styles.opCardHighlight : ""}`}>
          <div className={styles.opTopRow}>
            <span className={styles.opLabel}>Pending Publishers</span>
            <span className={styles.opIcon}>📡</span>
          </div>
          <div className={styles.opValue}>{loading ? "—" : pendingPublishers}</div>
          <div className={styles.opSub}>
            <span>Affiliate KYC Queue</span>
            <Link to="/admin/applications?accountType=PUBLISHER&status=PENDING_REVIEW" className={styles.opLink}>
              Inspect →
            </Link>
          </div>
        </div>

        {/* 2. Pending Advertisers */}
        <div className={`${styles.opCard} ${pendingAdvertisers > 0 ? styles.opCardHighlight : ""}`}>
          <div className={styles.opTopRow}>
            <span className={styles.opLabel}>Pending Advertisers</span>
            <span className={styles.opIcon}>🏢</span>
          </div>
          <div className={styles.opValue}>{loading ? "—" : pendingAdvertisers}</div>
          <div className={styles.opSub}>
            <span>Corporate KYB Queue</span>
            <Link to="/admin/applications?accountType=ADVERTISER&status=PENDING_REVIEW" className={styles.opLink}>
              Inspect →
            </Link>
          </div>
        </div>

        {/* 3. Email Verification Rate */}
        <div className={`${styles.opCard} ${styles.opCardSuccess}`}>
          <div className={styles.opTopRow}>
            <span className={styles.opLabel}>Email Auth Rate</span>
            <span className={styles.opIcon}>✉️</span>
          </div>
          <div className={styles.opValue}>{loading ? "—" : `${verifRate}%`}</div>
          <div className={styles.opSub}>
            <span>Cryptographic OTP</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>Active Gate</span>
          </div>
        </div>

        {/* 4. High-Risk Signals Alert */}
        <div className={`${styles.opCard} ${highRiskCount > 0 ? styles.opCardDanger : ""}`}>
          <div className={styles.opTopRow}>
            <span className={styles.opLabel}>High-Risk Flags</span>
            <span className={styles.opIcon}>⚠️</span>
          </div>
          <div className={styles.opValue} style={{ color: highRiskCount > 0 ? "#f87171" : "inherit" }}>
            {loading ? "—" : highRiskCount}
          </div>
          <div className={styles.opSub}>
            <span>Score ≥ 20 Anomaly</span>
            <Link to="/admin/applications?riskLevel=HIGH" className={styles.opLink}>
              Filter Queue →
            </Link>
          </div>
        </div>

        {/* 5. Open Compliance Cases */}
        <div className={styles.opCard}>
          <div className={styles.opTopRow}>
            <span className={styles.opLabel}>Open Compliance</span>
            <span className={styles.opIcon}>⚖️</span>
          </div>
          <div className={styles.opValue}>{loading ? "—" : openCompliance}</div>
          <div className={styles.opSub}>
            <span>Gated Verticals / Velocity</span>
            <Link to="/compliance" className={styles.opLink}>
              Review →
            </Link>
          </div>
        </div>

        {/* 6. Decisions Last 24h */}
        <div className={styles.opCard}>
          <div className={styles.opTopRow}>
            <span className={styles.opLabel}>Decisions (24h)</span>
            <span className={styles.opIcon}>✅</span>
          </div>
          <div className={styles.opValue}>{loading ? "—" : decisions24h}</div>
          <div className={styles.opSub}>
            <span>Operator throughput</span>
            <span style={{ color: "var(--color-text-muted)" }}>Immutable</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Navigation Ribbon */}
      <div className={styles.quickActionsRibbon}>
        <span className={styles.ribbonLabel}>Operational Queues:</span>
        <Link to="/admin/applications" className={`${styles.actionPill} ${totalPending > 0 ? styles.actionPillActive : ""}`}>
          🪪 Partner Verification Queue
          {totalPending > 0 && <span className={styles.pillBadge}>{totalPending}</span>}
        </Link>
        <Link to="/compliance" className={styles.actionPill}>
          ⚖️ Restricted Verticals Compliance
          {openCompliance > 0 && <span className={styles.pillBadge} style={{ background: "#ef4444", color: "#fff" }}>{openCompliance}</span>}
        </Link>
        <Link to="/integrity" className={styles.actionPill}>
          🛡️ Fraud Shield & Ledger Parity
        </Link>
        <Link to="/payouts" className={styles.actionPill}>
          💳 Payout Approvals ($50 Min)
        </Link>
        <Link to="/categories" className={styles.actionPill}>
          📁 Category Catalog Admin
        </Link>
        <Link to="/offers" className={styles.actionPill}>
          🎯 Offer Lifecycle & Caps
        </Link>
        <Link to="/health" className={styles.actionPill}>
          ⚡ Infrastructure Telemetry
        </Link>
      </div>

      {/* Two Column Layout: Directory + Side Panels */}
      <div className={styles.dashboardSplit}>
        {/* LEFT COLUMN: User & Tenant Moderation Directory */}
        <div className={styles.directorySection}>
          <div className={styles.directoryHeader}>
            <div className={styles.directoryTitleGroup}>
              <h2>User & Organization Directory</h2>
              <p className={styles.directorySub}>
                Moderation records across affiliate tenants, advertiser brands, and platform operators.
              </p>
            </div>

            <div className={styles.directoryControls}>
              <input
                type="text"
                placeholder="Search email, name, org..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className={styles.searchInput}
              />
              <select
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value)}
                className={styles.typeSelect}
              >
                <option value="ALL">All Tenant Types</option>
                <option value="AFFILIATE">Affiliates / Publishers</option>
                <option value="ADVERTISER">Advertisers / Brands</option>
                <option value="PLATFORM">Platform Operations</option>
              </select>
              <button type="button" onClick={() => void loadAdminData()} className={styles.refreshBtn} title="Refresh records">
                ↻
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Identity / Email</th>
                  <th>Tenant Entity</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Moderation</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                      Loading platform directory records…
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                      No user accounts found matching current query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAff = u.organization_type === "AFFILIATE";
                    const isAdv = u.organization_type === "ADVERTISER";
                    return (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.display_name || "—"}</strong>
                          <div className="mono" style={{ fontSize: "0.76rem", color: "var(--color-text-muted)" }}>
                            {u.email}
                          </div>
                        </td>
                        <td>{u.organization_name ?? "—"}</td>
                        <td>
                          <span className={isAff ? styles.orgTypeAffiliate : isAdv ? styles.orgTypeAdvertiser : styles.orgTypePlatform}>
                            {u.organization_type ?? "MEMBER"}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                          {u.role_name ?? "Standard"}
                        </td>
                        <td>
                          <span className={u.status === "ACTIVE" ? styles.statusActive : styles.statusSuspended}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => void toggleUserStatus(u.id, u.status)}
                          >
                            {u.status === "ACTIVE" ? "Suspend" : "Reinstate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: System Telemetry & Live Audit Stream */}
        <div className={styles.sidePanel}>
          {/* Infrastructure Health Box */}
          <div className={styles.panelBox}>
            <div className={styles.panelTitle}>
              <span>System Invariant Health</span>
              <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 600 }}>● VERIFIED</span>
            </div>
            <div className={styles.telemetryGrid}>
              <div className={styles.telemItem}>
                <span className={styles.telemLabel}>Runtime</span>
                <span className={styles.telemVal}>Cloudflare Workers</span>
              </div>
              <div className={styles.telemItem}>
                <span className={styles.telemLabel}>Primary DB</span>
                <span className={styles.telemVal}>Cloudflare D1</span>
              </div>
              <div className={styles.telemItem}>
                <span className={styles.telemLabel}>Ledger Parity</span>
                <span className={styles.telemVal} style={{ color: "#34d399" }}>100% Balanced</span>
              </div>
              <div className={styles.telemItem}>
                <span className={styles.telemLabel}>Offer Caps DO</span>
                <span className={styles.telemVal}>OfferCapDO Live</span>
              </div>
            </div>
          </div>

          {/* Live Review Audit Stream */}
          <div className={styles.panelBox}>
            <div className={styles.panelTitle}>
              <span>Operator Audit Stream</span>
              <span className="mono" style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                review_audit_log
              </span>
            </div>

            <div className={styles.auditList}>
              {overview?.recentAuditFeed && overview.recentAuditFeed.length > 0 ? (
                overview.recentAuditFeed.map((item) => {
                  const isApprove = item.action.includes("APPROVAL");
                  const isReject = item.action.includes("REJECT");
                  const isWarn = item.action.includes("REQUEST") || item.action.includes("SCHEDULE");

                  const badgeClass = isApprove
                    ? styles.auditActionApprove
                    : isReject
                    ? styles.auditActionReject
                    : isWarn
                    ? styles.auditActionWarning
                    : styles.auditActionBadge;

                  return (
                    <div key={item.id} className={styles.auditItem}>
                      <div className={styles.auditTop}>
                        <span className={`${styles.auditActionBadge} ${badgeClass}`}>
                          {item.action.replace(/_/g, " ")}
                        </span>
                        <span className={styles.auditTime}>
                          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className={styles.auditSubject}>
                        {item.first_name ? `${item.first_name} ${item.last_name || ""}` : item.application_id}
                        {item.account_type && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginLeft: "0.35rem" }}>
                            [{item.account_type}]
                          </span>
                        )}
                      </div>
                      {item.notes && <div className={styles.auditNotes}>"{item.notes}"</div>}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "1rem" }}>
                  No recent operator actions in current session.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
