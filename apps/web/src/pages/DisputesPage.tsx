import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./DisputesPage.module.css";

type DisputeCase = {
  id: string;
  status: string;
  case_type: string;
  summary: string;
  offer_id?: string | null;
  organization_id?: string | null;
  priority?: string;
  decision_reason?: string | null;
  created_at?: string;
};

export function DisputesPage() {
  const [organizationId, setOrg] = useState("");
  const [offerId, setOfferId] = useState("");
  const [caseType, setCaseType] = useState("CONVERSION_REVERSAL_DISPUTE");
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState("normal");
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("tvh_user");
    if (u) {
      try {
        const parsed = JSON.parse(u);
        if (parsed.organizationId) setOrg(parsed.organizationId);
      } catch {
        // ignore
      }
    }
    void loadCases();
  }, []);

  async function loadCases() {
    const token = localStorage.getItem("tvh_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/compliance/queue?status=ALL"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok) {
        setCases(body.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("tvh_token");
    if (!token) {
      setError("Sign in required to file dispute appeal");
      return;
    }
    if (!summary.trim()) {
      setError("Please describe the dispute reasons and evidence");
      return;
    }

    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      const res = await fetch(apiUrl("/api/v1/compliance/cases"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organizationId.trim() || undefined,
          offerId: offerId.trim() || undefined,
          caseType,
          priority,
          summary: summary.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
      } else {
        setMsg(`Dispute appeal lodged successfully: Case ${body?.data?.id}. Case queued for platform review.`);
        setSummary("");
        setOfferId("");
        void loadCases();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lodge dispute");
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    if (status === "APPROVED") return <span className={styles.badgeApproved}>APPROVED</span>;
    if (status === "REJECTED") return <span className={styles.badgeRejected}>REJECTED</span>;
    return <span className={styles.badgeOpen}>{status}</span>;
  }

  return (
    <div className={styles.page}>
      <h1>Disputes & Evidence Appeals</h1>
      <p className="muted">
        Every decision explained. Submit formal dispute appeals for rejected conversions, traffic holds, or compliance reviews.
        All reviews are immutable and audited server-side. {!localStorage.getItem("tvh_token") && <Link to="/login">Sign in</Link>}
      </p>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {msg && <div className={styles.ok} role="status">{msg}</div>}

      <div className={styles.card}>
        <h2>File New Dispute Appeal</h2>
        <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="dp-org">Organization ID</label>
              <input
                id="dp-org"
                value={organizationId}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="org_traffic_vault"
                className="mono"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="dp-offer">Offer ID (Optional)</label>
              <input
                id="dp-offer"
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
                placeholder="off_vpn_shield_01"
                className="mono"
              />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="dp-type">Dispute Type</label>
              <select
                id="dp-type"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
              >
                <option value="CONVERSION_REVERSAL_DISPUTE">Conversion Reversal Appeal</option>
                <option value="RESTRICTED_CATEGORY_REVIEW">Restricted Category Clearance</option>
                <option value="CLICK_VELOCITY_CHECK">Traffic Quality & Velocity Verification</option>
                <option value="PAYOUT_RECONCILIATION">Payout Reconciliation Inquiry</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="dp-priority">Priority</label>
              <select
                id="dp-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="high">High (Active Campaign Hold)</option>
                <option value="urgent">Urgent (Financial Reconciliation)</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="dp-summary">Dispute Statement & Evidence References</label>
            <textarea
              id="dp-summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Provide event details, external transaction identifiers, click timestamps, or CRM settlement evidence..."
              required
              maxLength={500}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Lodging appeal…" : "Submit Dispute Appeal"}
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <h2>Dispute Cases & Review History</h2>
        {cases.length === 0 ? (
          <p className="muted">No disputes filed or under review.</p>
        ) : (
          <ul className={styles.disputeList}>
            {cases.map((c) => (
              <li key={c.id} className={styles.disputeItem}>
                <div className={styles.disputeHead}>
                  <div>
                    <strong>{c.case_type}</strong>
                    <span className="mono muted"> · {c.id}</span>
                  </div>
                  <div>{getStatusBadge(c.status)}</div>
                </div>
                <p>{c.summary}</p>
                {c.decision_reason && (
                  <p className="muted"><strong>Decision Reason:</strong> {c.decision_reason}</p>
                )}
                {c.offer_id && (
                  <p className="mono muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                    Associated Offer: {c.offer_id}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
