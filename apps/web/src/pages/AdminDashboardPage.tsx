import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./AdminDashboardPage.module.css";

type OverviewData = {
  users?: { total: number };
  organizations?: Record<string, number>;
  offers?: Record<string, number>;
  conversions?: Record<string, { count: number; totalMinor: number }>;
  complianceCases?: Array<{ status: string; count: number }>;
  payouts?: Array<{ status: string; count: number; total_minor: number }>;
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

  const token = localStorage.getItem("tvh_token");

  async function loadAdminData() {
    if (!token) {
      setError("Platform operator credentials required to access Admin Dashboard");
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
        fetch(apiUrl("/api/v1/admin/users?limit=25"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (overviewRes.status === 403 || usersRes.status === 403) {
        throw new Error("Access restricted: Platform Operator or Super Admin role required.");
      }

      if (!overviewRes.ok || !usersRes.ok) {
        throw new Error(`Failed to load admin data (HTTP ${overviewRes.status})`);
      }

      const overviewBody = await overviewRes.json();
      const usersBody = await usersRes.json();

      setOverview(overviewBody.data);
      setUsers(usersBody.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin operations data");
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
        body: JSON.stringify({ status: nextStatus, reason: "Operator moderation" }),
      });
      if (res.ok) {
        await loadAdminData();
      }
    } catch {
      // ignore
    }
  }

  const publishersCount = overview?.organizations?.AFFILIATE ?? 0;
  const advertisersCount = overview?.organizations?.ADVERTISER ?? 0;
  const liveOffersCount = overview?.offers?.LIVE ?? 0;
  const pendingReviewCount = (overview?.offers?.SUBMITTED ?? 0) + (overview?.offers?.UNDER_REVIEW ?? 0);

  return (
    <div className={styles.page}>
      <h1>Platform Operations & Moderation</h1>
      <p>
        Administrative cockpit for platform health, network membership, compliance review, and ledger reconciliation.
      </p>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* QUICK WORKFLOW ACCESS PILLS */}
      <div className={styles.quickActions}>
        <Link to="/admin/applications" className={styles.actionPill} style={{ borderColor: "var(--color-accent-cyan)", color: "var(--color-accent-cyan)" }}>
          🪪 KYC/KYB Partner Verification Queue
        </Link>
        <Link to="/compliance" className={styles.actionPill}>
          ⚖️ Compliance Review Queue
        </Link>
        <Link to="/integrity" className={styles.actionPill}>
          🛡️ Fraud & Ledger Health
        </Link>
        <Link to="/payouts" className={styles.actionPill}>
          💳 Payout Approval Queue
        </Link>
        <Link to="/categories" className={styles.actionPill}>
          📁 Category Catalog Admin
        </Link>
        <Link to="/offers" className={styles.actionPill}>
          🎯 Offer Moderation
        </Link>
        <Link to="/health" className={styles.actionPill}>
          ⚡ Infrastructure Telemetry
        </Link>
      </div>

      {loading && <p>Loading administrative telemetry…</p>}

      {overview && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Active Publishers</span>
            <span className={styles.statValue}>{publishersCount}</span>
            <span className={styles.statSub}>Affiliate tenant accounts</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Active Advertisers</span>
            <span className={styles.statValue}>{advertisersCount}</span>
            <span className={styles.statSub}>Brand & agency tenants</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Live Offers</span>
            <span className={styles.statValue}>{liveOffersCount}</span>
            <span className={styles.statSub}>{pendingReviewCount} pending review</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Platform Users</span>
            <span className={styles.statValue}>{overview.users?.total ?? 0}</span>
            <span className={styles.statSub}>Registered identities</span>
          </div>
        </div>
      )}

      {/* USER & TENANT MODERATION TABLE */}
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>User & Organization Directory</h2>
          <button type="button" className={styles.toggleStatusBtn} onClick={loadAdminData}>
            ↻ Refresh
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>User Email</th>
                <th>Display Name</th>
                <th>Organization</th>
                <th>Type</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.email}</strong></td>
                  <td>{u.display_name ?? "—"}</td>
                  <td>{u.organization_name ?? "—"}</td>
                  <td>{u.organization_type ?? "—"}</td>
                  <td>{u.role_name ?? "Member"}</td>
                  <td>
                    <span className={u.status === "ACTIVE" ? styles.statusActive : styles.statusSuspended}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.toggleStatusBtn}
                      onClick={() => void toggleUserStatus(u.id, u.status)}
                    >
                      {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem" }}>
                    No users found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
