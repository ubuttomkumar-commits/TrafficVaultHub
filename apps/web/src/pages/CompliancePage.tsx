import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import styles from "./CompliancePage.module.css";

type CaseRow = {
  id: string;
  status: string;
  case_type: string;
  summary: string;
  offer_id?: string | null;
  decision_reason?: string | null;
};

export function CompliancePage() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("tvh_token");
    if (!token) {
      setError("Sign in as platform operator required");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/compliance/queue?status=${encodeURIComponent(statusFilter)}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
        setRows([]);
      } else {
        setRows(body.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED" | "CLOSED") {
    const token = localStorage.getItem("tvh_token");
    if (!token) return;
    const reason = window.prompt(`Reason for ${decision} (optional)`) ?? "";
    setBusyId(id);
    try {
      const res = await fetch(apiUrl(`/api/v1/compliance/cases/${id}/decide`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision, reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
      } else {
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decide failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.page}>
      <h1>Compliance queue</h1>
      <p className="muted">
        Restricted-category reviews and emergency holds. Decisions are audited server-side.
      </p>
      <div className={styles.toolbar}>
        <label>
          Status{" "}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="OPEN">OPEN</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="ALL">ALL</option>
          </select>
        </label>
        <button type="button" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {loading && <p>Loading…</p>}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <ul className={styles.list}>
        {rows.map((r) => (
          <li key={r.id}>
            <div>
              <strong>{r.status}</strong> {r.case_type}
              <span className="mono"> {r.id}</span>
            </div>
            <div className="muted">{r.summary}</div>
            {r.offer_id && <div className="mono muted">offer: {r.offer_id}</div>}
            {r.decision_reason && <div className="muted">Reason: {r.decision_reason}</div>}
            {r.status === "OPEN" && (
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void decide(r.id, "APPROVED")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void decide(r.id, "REJECTED")}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void decide(r.id, "CLOSED")}
                >
                  Close
                </button>
              </div>
            )}
          </li>
        ))}
        {!loading && rows.length === 0 && <li className="muted">No cases for this filter</li>}
      </ul>
    </div>
  );
}
