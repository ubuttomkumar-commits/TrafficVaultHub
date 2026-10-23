import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface PayoutRequestItem {
  id: string;
  currency: string;
  amount_minor: number;
  status: string;
  organization_name?: string;
  requester_email?: string;
  requested_at?: string;
  processed_at?: string;
  destination_details?: string;
  decision_notes?: string;
}

export function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequestItem | null>(null);
  const [decision, setDecision] = useState("PAID");
  const [txRef, setTxRef] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);

  async function fetchPayouts() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/payouts?status=${statusFilter}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setPayouts(json.data);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleDecide(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPayout) return;
    setSaving(true);
    try {
      await fetch(apiUrl(`/api/v1/admin/payouts/${selectedPayout.id}/decide`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          transactionReference: txRef,
          reason,
        }),
      });
      setSelectedPayout(null);
      fetchPayouts();
    } catch {
      alert("Failed to process payout decision");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Finance &amp; Payout Operations</h1>
          <p className={styles.pageSubtitle}>
            Authoritative disbursement queue. Strict reconciliation against double-entry journal ensures zero over-payments.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={fetchPayouts}>
            ↻ Refresh Queue
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <select
              className={styles.selectInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Payout Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="PROCESSING">Processing / In Transit</option>
              <option value="PAID">Paid / Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading payout queue...</div>
        ) : payouts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No payout requests found</div>
            <p>All partner payout requests are reconciled and clear.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Partner Organization</th>
                  <th>Amount ($ USD)</th>
                  <th>Status</th>
                  <th>Destination / Method</th>
                  <th>Requested At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const isPending = p.status === "PENDING";
                  const isPaid = p.status === "PAID" || p.status === "PROCESSED";
                  const isProcessing = p.status === "PROCESSING";

                  let destInfo = "Binance Pay / Crypto";
                  if (p.destination_details) {
                    try {
                      const parsed = JSON.parse(p.destination_details);
                      destInfo = `${parsed.method || "Binance Pay"} (${parsed.payId || parsed.address || ""})`;
                    } catch {
                      destInfo = p.destination_details;
                    }
                  }

                  return (
                    <tr key={p.id}>
                      <td className={styles.mono} style={{ fontWeight: 600 }}>
                        {p.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.organization_name || "Partner"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{p.requester_email}</div>
                      </td>
                      <td className={styles.mono} style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.95rem" }}>
                        ${((p.amount_minor || 0) / 100).toFixed(2)}
                      </td>
                      <td>
                        {isPending && <span className={`${styles.badge} ${styles.badgePending}`}>Pending Review</span>}
                        {isProcessing && <span className={`${styles.badge} ${styles.badgeProbation}`}>Processing</span>}
                        {isPaid && <span className={`${styles.badge} ${styles.badgeActive}`}>Paid ✓</span>}
                        {!isPending && !isProcessing && !isPaid && (
                          <span className={`${styles.badge} ${styles.badgeDanger}`}>Rejected</span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>{destInfo}</td>
                      <td style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        {p.requested_at ? new Date(p.requested_at).toLocaleString() : "Recent"}
                      </td>
                      <td>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => {
                            setSelectedPayout(p);
                            setDecision(p.status === "PENDING" ? "PAID" : p.status);
                            setTxRef("");
                            setReason("");
                          }}
                        >
                          Execute Decision
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

      {selectedPayout && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedPayout(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Process Payout #{selectedPayout.id} (${((selectedPayout.amount_minor || 0) / 100).toFixed(2)})
              </h3>
              <button className={styles.closeBtn} onClick={() => setSelectedPayout(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleDecide} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Finance Decision</label>
                <select
                  className={styles.input}
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                >
                  <option value="PAID">PAID — Payment Executed &amp; Finalized</option>
                  <option value="PROCESSING">PROCESSING — Dispatched to Binance Pay / Provider</option>
                  <option value="REJECTED">REJECTED — Deny &amp; Refund to Partner Balance</option>
                </select>
              </div>

              {decision === "PAID" && (
                <div className={styles.formField}>
                  <label className={styles.label}>Transaction Reference / Blockchain Tx Hash</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Binance Order ID 849201948 or Tx Hash"
                    className={styles.input}
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                  />
                </div>
              )}

              <div className={styles.formField}>
                <label className={styles.label}>Administrative Reason / Ledger Notes</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Record verification notes or rejection rationale..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedPayout(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Posting..." : "Commit Finance Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
