import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface PublisherItem {
  org_id: string;
  org_name: string;
  org_status: string;
  org_created_at: string;
  user_id: string;
  email: string;
  display_name: string;
  email_verified: number;
  application_id: string;
  app_status: string;
  risk_score: number;
  traffic_sources?: string;
  conditional_caps?: string | null;
  total_conversions: number;
  total_earned_minor: number;
}

export function AdminPublishersPage() {
  const [publishers, setPublishers] = useState<PublisherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [selectedPub, setSelectedPub] = useState<PublisherItem | null>(null);
  const [editStatus, setEditStatus] = useState("active");
  const [dailyCap, setDailyCap] = useState("500");
  const [holdDays, setHoldDays] = useState("7");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchPublishers();
  }, [statusFilter, riskFilter]);

  async function fetchPublishers() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/publishers?status=${statusFilter}&riskLevel=${riskFilter}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setPublishers(json.data);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveControls(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPub) return;
    setSaving(true);
    try {
      await fetch(apiUrl(`/api/v1/admin/publishers/${selectedPub.org_id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: editStatus,
          conditionalCaps: { dailyClickLimit: Number(dailyCap), holdDays: Number(holdDays) },
          notes,
        }),
      });
      setSelectedPub(null);
      fetchPublishers();
    } catch (err) {
      alert("Failed to update publisher controls");
    } finally {
      setSaving(false);
    }
  }

  const filtered = publishers.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.org_name?.toLowerCase().includes(s) ||
      p.email?.toLowerCase().includes(s) ||
      p.display_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Publisher Network Control</h1>
          <p className={styles.pageSubtitle}>
            Full authority over traffic access, daily velocity caps, reserve holds, and publisher identity dossiers.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={fetchPublishers}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search by company, email, contact..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={styles.selectInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PROBATION">Probation</option>
              <option value="PENDING">Pending Review</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select
              className={styles.selectInput}
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="LOW">Low Risk (&lt;10)</option>
              <option value="MEDIUM">Medium Risk (10–24)</option>
              <option value="HIGH">High Risk (≥25)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading publisher directory...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No publishers found</div>
            <p>No publisher organizations match your current search and filter parameters.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Publisher Organization</th>
                  <th>Primary Operator</th>
                  <th>Status</th>
                  <th>Risk Tier</th>
                  <th>Conversions</th>
                  <th>Total Earned</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pub) => {
                  const isProb = pub.org_status === "probation" || pub.app_status === "PROBATIONARY_APPROVED";
                  const isActive = pub.org_status === "active" || pub.app_status === "APPROVED";
                  const isSusp = pub.org_status === "suspended";

                  return (
                    <tr key={pub.org_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#f8fafc" }}>{pub.org_name || "Unnamed Org"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }} className={styles.mono}>
                          {pub.org_id}
                        </div>
                      </td>
                      <td>
                        <div>{pub.display_name || "Primary Partner"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                          {pub.email} {pub.email_verified ? "✓" : "⚠️"}
                        </div>
                      </td>
                      <td>
                        {isActive && <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>}
                        {isProb && <span className={`${styles.badge} ${styles.badgeProbation}`}>Probation</span>}
                        {isSusp && <span className={`${styles.badge} ${styles.badgeDanger}`}>Suspended</span>}
                        {!isActive && !isProb && !isSusp && (
                          <span className={`${styles.badge} ${styles.badgePending}`}>Pending</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            pub.risk_score >= 25
                              ? styles.badgeDanger
                              : pub.risk_score >= 10
                              ? styles.badgePending
                              : styles.badgeActive
                          }`}
                        >
                          Score {pub.risk_score ?? 0}
                        </span>
                      </td>
                      <td className={styles.mono}>{pub.total_conversions}</td>
                      <td className={styles.mono} style={{ color: "#38bdf8", fontWeight: 600 }}>
                        ${((pub.total_earned_minor || 0) / 100).toFixed(2)}
                      </td>
                      <td>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => {
                            setSelectedPub(pub);
                            setEditStatus(pub.org_status || "active");
                          }}
                        >
                          Configure Controls
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedPub && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedPub(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Manage Publisher: {selectedPub.org_name}</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedPub(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveControls} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Network Access Status</label>
                <select
                  className={styles.input}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="active">ACTIVE — Full Traffic Access</option>
                  <option value="probation">PROBATION — Velocity Caps &amp; Reserve Hold</option>
                  <option value="suspended">SUSPENDED — Halt Traffic &amp; Redirects</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formField}>
                  <label className={styles.label}>Daily Click Velocity Cap</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={dailyCap}
                    onChange={(e) => setDailyCap(e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>Reserve Hold Period (Days)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={holdDays}
                    onChange={(e) => setHoldDays(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Internal Administrative Audit Notes</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Record rationale for status change or terms update..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedPub(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Saving Changes..." : "Commit Operator Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
