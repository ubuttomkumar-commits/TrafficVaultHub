import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface ComplianceCaseItem {
  id: string;
  status: string;
  case_type: string;
  priority: string;
  summary: string;
  offer_id?: string | null;
  organization_id?: string | null;
  opened_by_user_id?: string | null;
  decision_reason?: string | null;
  decided_at?: string | null;
  created_at: string;
}

export function AdminCompliancePage() {
  const [cases, setCases] = useState<ComplianceCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Case Decision Modal
  const [selectedCase, setSelectedCase] = useState<ComplianceCaseItem | null>(null);
  const [decisionAction, setDecisionAction] = useState<"APPROVED" | "REJECTED" | "CLOSED">("APPROVED");
  const [decisionReason, setDecisionReason] = useState("");
  const [deciding, setDeciding] = useState(false);

  // New Case Modal
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [newSummary, setNewSummary] = useState("");
  const [newOfferId, setNewOfferId] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newCaseType, setNewCaseType] = useState("RESTRICTED_CATEGORY_REVIEW");
  const [creatingCase, setCreatingCase] = useState(false);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchComplianceQueue();
  }, [statusFilter]);

  async function fetchComplianceQueue() {
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/compliance/queue?status=${statusFilter}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.data) setCases(json.data);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleDecideCase(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCase) return;
    setDeciding(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/compliance/cases/${selectedCase.id}/decide`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: decisionAction,
          reason: decisionReason || `Compliance case marked as ${decisionAction}`,
        }),
      });
      if (res.ok) {
        setSelectedCase(null);
        setDecisionReason("");
        fetchComplianceQueue();
      } else {
        const data = await res.json();
        alert(data?.error?.message || "Failed to submit decision");
      }
    } catch {
      alert("Failed to submit compliance decision");
    } finally {
      setDeciding(false);
    }
  }

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault();
    if (!newSummary.trim()) {
      alert("Case summary required");
      return;
    }
    setCreatingCase(true);
    try {
      const res = await fetch(apiUrl("/api/v1/compliance/cases"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          summary: newSummary,
          offerId: newOfferId.trim() || undefined,
          priority: newPriority,
          caseType: newCaseType,
        }),
      });
      if (res.ok) {
        setShowNewCaseModal(false);
        setNewSummary("");
        setNewOfferId("");
        fetchComplianceQueue();
      } else {
        const data = await res.json();
        alert(data?.error?.message || "Failed to create case");
      }
    } catch {
      alert("Failed to create compliance case");
    } finally {
      setCreatingCase(false);
    }
  }

  const filtered = cases.filter((c) => {
    if (typeFilter !== "ALL" && c.case_type !== typeFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.summary?.toLowerCase().includes(s) ||
      c.case_type?.toLowerCase().includes(s) ||
      c.id?.toLowerCase().includes(s) ||
      c.offer_id?.toLowerCase().includes(s)
    );
  });

  const openCount = cases.filter((c) => c.status === "OPEN").length;
  const criticalCount = cases.filter((c) => c.priority === "critical" || c.priority === "urgent").length;

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Compliance &amp; Policy Review Queue</h1>
          <p className={styles.pageSubtitle}>
            Adjudicate restricted-category campaigns, click velocity audits, traffic source integrity disputes, and emergency isolation holds.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={fetchComplianceQueue}>
            ↻ Refresh Queue
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowNewCaseModal(true)}>
            + Open Investigation Case
          </button>
        </div>
      </div>

      {/* METRIC TILES */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Open Investigations</div>
          <div className={styles.statValue}>{openCount}</div>
          <div className={styles.statSub}>Requires operator adjudication</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>High / Critical Priority</div>
          <div className={styles.statValue} style={{ color: criticalCount > 0 ? "#f87171" : "#38bdf8" }}>
            {criticalCount}
          </div>
          <div className={styles.statSub}>Restricted vertical or velocity holds</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Review Policy Version</div>
          <div className={styles.statValue}>v5.0</div>
          <div className={styles.statSub}>Cryptographically audited ledger</div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className={styles.card}>
        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search by case ID, summary, or offer reference..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={styles.selectInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="OPEN">Status: OPEN</option>
              <option value="APPROVED">Status: APPROVED</option>
              <option value="REJECTED">Status: REJECTED</option>
              <option value="CLOSED">Status: CLOSED</option>
              <option value="ALL">All Statuses</option>
            </select>
            <select
              className={styles.selectInput}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Case Types</option>
              <option value="RESTRICTED_CATEGORY_REVIEW">Restricted Category</option>
              <option value="CLICK_VELOCITY_AUDIT">Click Velocity Audit</option>
              <option value="POLICY_VIOLATION">Policy Violation</option>
              <option value="TRAFFIC_QUALITY_DISPUTE">Traffic Quality Dispute</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading compliance cases...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No compliance cases matching filter</div>
            <p>Queue is clear for this category.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Type &amp; Priority</th>
                  <th>Summary &amp; Target</th>
                  <th>Status</th>
                  <th>Logged Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const isCritical = c.priority === "critical" || c.priority === "urgent";
                  const isHigh = c.priority === "high";

                  return (
                    <tr key={c.id}>
                      <td className={styles.mono} style={{ fontSize: "0.8rem", color: "#38bdf8" }}>
                        {c.id.slice(0, 16)}...
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.85rem" }}>
                          {c.case_type.replace(/_/g, " ")}
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            background: isCritical
                              ? "rgba(239, 68, 68, 0.2)"
                              : isHigh
                              ? "rgba(245, 158, 11, 0.2)"
                              : "rgba(148, 163, 184, 0.15)",
                            color: isCritical ? "#f87171" : isHigh ? "#fbbf24" : "#94a3b8",
                            marginTop: "0.2rem",
                          }}
                        >
                          {c.priority.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ maxWidth: "340px" }}>
                        <div style={{ color: "#e2e8f0", fontSize: "0.85rem", lineHeight: 1.4 }}>
                          {c.summary}
                        </div>
                        {c.offer_id && (
                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }} className={styles.mono}>
                            Offer Reference: {c.offer_id}
                          </div>
                        )}
                        {c.decision_reason && (
                          <div style={{ fontSize: "0.75rem", color: "#a855f7", marginTop: "0.2rem" }}>
                            Decision note: {c.decision_reason}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            c.status === "OPEN"
                              ? styles.badgePending
                              : c.status === "APPROVED"
                              ? styles.badgeActive
                              : styles.badgeSuspended
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                        {new Date(c.created_at).toLocaleString("en-US", { timeZone: "UTC" })}
                      </td>
                      <td>
                        {c.status === "OPEN" ? (
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                            onClick={() => {
                              setSelectedCase(c);
                              setDecisionAction("APPROVED");
                              setDecisionReason("");
                            }}
                          >
                            Adjudicate
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DECISION MODAL */}
      {selectedCase && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Adjudicate Compliance Investigation</h3>
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: "0.25rem 0.5rem" }}
                onClick={() => setSelectedCase(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1rem", background: "rgba(15, 23, 42, 0.6)", borderRadius: "6px", marginBottom: "1.25rem", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: "0.9rem" }}>
                Case: {selectedCase.case_type} ({selectedCase.priority})
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                {selectedCase.summary}
              </div>
              {selectedCase.offer_id && (
                <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: "0.35rem" }} className={styles.mono}>
                  Associated Offer ID: {selectedCase.offer_id}
                </div>
              )}
            </div>

            <form onSubmit={handleDecideCase} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Decision Action</label>
                <select
                  className={styles.selectInput}
                  value={decisionAction}
                  onChange={(e) => setDecisionAction(e.target.value as any)}
                >
                  <option value="APPROVED">APPROVE — Clear case, release traffic gating</option>
                  <option value="REJECTED">REJECT — Deny campaign authorization / enforce sanction</option>
                  <option value="CLOSED">CLOSE — Archive without further operational action</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Authoritative Reason / Audit Notes</label>
                <textarea
                  className={styles.textarea}
                  placeholder="State factual justification (corroborating documents, advertiser verification, or traffic audit results)..."
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedCase(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={decisionAction === "REJECTED" ? styles.btnDanger : styles.btnPrimary}
                  disabled={deciding}
                >
                  {deciding ? "Posting Decision..." : `Commit ${decisionAction} Decision`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW CASE MODAL */}
      {showNewCaseModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Open Compliance Investigation</h3>
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: "0.25rem 0.5rem" }}
                onClick={() => setShowNewCaseModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Investigation Classification</label>
                <select
                  className={styles.selectInput}
                  value={newCaseType}
                  onChange={(e) => setNewCaseType(e.target.value)}
                >
                  <option value="RESTRICTED_CATEGORY_REVIEW">Restricted Category Review (Adult/Gambling/Nutra)</option>
                  <option value="CLICK_VELOCITY_AUDIT">Click Velocity Burst Audit</option>
                  <option value="POLICY_VIOLATION">Advertiser Terms / Landing Page Violation</option>
                  <option value="TRAFFIC_QUALITY_DISPUTE">Traffic Quality / Conversion Discrepancy</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Severity Priority</label>
                <select
                  className={styles.selectInput}
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  <option value="low">Low — Routine check</option>
                  <option value="normal">Normal — Standard compliance queue</option>
                  <option value="high">High — Hold pending clarification</option>
                  <option value="critical">Critical — Immediate traffic pause</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Target Offer ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. off_vpn_shield_01"
                  className={styles.input}
                  value={newOfferId}
                  onChange={(e) => setNewOfferId(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Investigation Case Summary</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Describe specific grounds for investigation, observed anomalies, or advertiser restrictions..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowNewCaseModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={creatingCase}
                >
                  {creatingCase ? "Logging Case..." : "File Compliance Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
