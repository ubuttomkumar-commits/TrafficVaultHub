import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./CompliancePage.module.css";

type CaseRow = { id: string; status: string; case_type?: string; summary?: string; priority?: string };

export function CompliancePage() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [offerId, setOfferId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function token() { return localStorage.getItem("tvh_token"); }

  async function load() {
    const t = token();
    if (!t) { setError("Sign in as platform operator"); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/compliance/queue?status=OPEN"), { headers: { Authorization: `Bearer ${t}` } });
      const body = await res.json();
      if (!res.ok) { setError(body?.error?.message ?? `HTTP ${res.status}`); setRows([]); }
      else { setError(null); setRows(body.data ?? []); }
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function openCase(e: React.FormEvent) {
    e.preventDefault();
    const t = token();
    if (!t) return;
    const res = await fetch(apiUrl("/api/v1/compliance/cases"), {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ summary: summary.trim(), offerId: offerId.trim() || undefined }),
    });
    const body = await res.json();
    if (!res.ok) setError(body?.error?.message ?? "Failed");
    else { setMsg(`Opened ${body.data?.id}`); setSummary(""); void load(); }
  }

  async function emergencyPause() {
    const t = token();
    if (!t || !offerId.trim()) { setError("Offer ID required"); return; }
    const res = await fetch(apiUrl(`/api/v1/compliance/offers/${offerId.trim()}/emergency-pause`), {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Ops emergency pause from UI" }),
    });
    const body = await res.json();
    if (!res.ok) setError(body?.error?.message ?? "Failed");
    else setMsg(`Paused → ${body.data?.toStatus}`);
  }

  return (
    <div className={styles.page}>
      <h1>Compliance queue</h1>
      <p className="muted">Platform operators only. <Link to="/login">Sign in</Link></p>
      {loading && <p>Loading…</p>}
      {error && <div className={styles.error} role="alert">{error}</div>}
      {msg && <p className={styles.ok}>{msg}</p>}
      <form className={styles.form} onSubmit={(e) => void openCase(e)}>
        <label>Summary<input value={summary} onChange={(e) => setSummary(e.target.value)} required maxLength={500} /></label>
        <label>Offer ID<input value={offerId} onChange={(e) => setOfferId(e.target.value)} className="mono" /></label>
        <div className={styles.row}>
          <button type="submit">Open case</button>
          <button type="button" onClick={() => void emergencyPause()}>Emergency COMPLIANCE_HOLD</button>
        </div>
      </form>
      <ul className={styles.list}>
        {rows.map((r) => (
          <li key={r.id}><strong>{r.status}</strong> {r.case_type}<span className="mono"> {r.id}</span><div className="muted">{r.summary}</div></li>
        ))}
        {!loading && rows.length === 0 && <li className="muted">No open cases</li>}
      </ul>
    </div>
  );
}
