import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./PayoutsPage.module.css";

type Row = { id: string; currency: string; amount_minor: number; status: string };

export function PayoutsPage() {
  const [organizationId, setOrg] = useState("");
  const [amountMinor, setAmount] = useState("5000");
  const [currency, setCurrency] = useState("USD");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function token() { return localStorage.getItem("tvh_token"); }

  async function load() {
    const t = token();
    if (!t || !organizationId.trim()) { setError("Sign in and enter organization ID"); return; }
    const res = await fetch(apiUrl(`/api/v1/payouts?organizationId=${encodeURIComponent(organizationId.trim())}`), {
      headers: { Authorization: `Bearer ${t}` },
    });
    const body = await res.json();
    if (!res.ok) { setError(body?.error?.message ?? `HTTP ${res.status}`); setRows([]); }
    else { setError(null); setRows(body.data ?? []); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = token();
    if (!t) { setError("Sign in required"); return; }
    const res = await fetch(apiUrl("/api/v1/payouts"), {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: organizationId.trim(), amountMinor: Number(amountMinor), currency }),
    });
    const body = await res.json();
    if (!res.ok) setError(body?.error?.message ?? "Failed");
    else { setMsg(`${body.data?.id} → ${body.data?.status}`); void load(); }
  }

  return (
    <div className={styles.page}>
      <h1>Payout requests</h1>
      <p className="muted">PENDING only — does not move money. <Link to="/login">Sign in</Link></p>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {msg && <p className={styles.ok}>{msg}</p>}
      <form className={styles.form} onSubmit={(e) => void submit(e)}>
        <label>Organization ID<input value={organizationId} onChange={(e) => setOrg(e.target.value)} required className="mono" /></label>
        <label>Amount (minor)<input type="number" min={1} value={amountMinor} onChange={(e) => setAmount(e.target.value)} /></label>
        <label>Currency<input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></label>
        <div className={styles.row}>
          <button type="submit">Request payout</button>
          <button type="button" onClick={() => void load()}>Refresh</button>
        </div>
      </form>
      <ul className={styles.list}>
        {rows.map((r) => (
          <li key={r.id}><span className="mono">{r.amount_minor}</span> {r.currency} · {r.status}<div className="muted mono">{r.id}</div></li>
        ))}
      </ul>
    </div>
  );
}
