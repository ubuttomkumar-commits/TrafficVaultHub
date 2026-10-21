import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./CampaignStudioPage.module.css";
export function CampaignStudioPage() {
  const [organizationId, setOrg] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("tvh_token");
    if (!token) { setError("Sign in required"); return; }
    setBusy(true); setError(null); setMsg(null);
    try {
      const res = await fetch(apiUrl("/api/v1/offers"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: organizationId.trim(), name: name.trim(), payoutType: "CPA", currency: "USD", affiliateCommissionMinor: 500, advertiserPayoutMinor: 700, conversionEvent: "lead", destinationUrl: "https://example.com/land" }),
      });
      const body = await res.json();
      if (!res.ok) setError(body?.error?.message ?? `HTTP ${res.status}`);
      else setMsg(`DRAFT created: ${body?.data?.offerId ?? body?.data?.id ?? "ok"}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }
  return (
    <div className={styles.page}>
      <h1>Campaign Launch Studio</h1>
      <p className="muted">Creates DRAFT offers only. <Link to="/login">Sign in</Link></p>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {msg && <p className={styles.ok}>{msg}</p>}
      <form className={styles.form} onSubmit={(e) => void submit(e)}>
        <label>Organization ID<input value={organizationId} onChange={(e) => setOrg(e.target.value)} required /></label>
        <label>Offer name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></label>
        <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create DRAFT"}</button>
      </form>
    </div>
  );
}
