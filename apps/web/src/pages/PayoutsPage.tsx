import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./PayoutsPage.module.css";

type Row = {
  id: string;
  currency: string;
  amount_minor: number;
  status: string;
  provider?: string;
  created_at?: string;
};

export function PayoutsPage() {
  const [organizationId, setOrg] = useState("");
  const [amountMinor, setAmount] = useState("5000");
  const [currency, setCurrency] = useState("USD");
  const [provider, setProvider] = useState("binance_pay");
  const [destination, setDestination] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function token() { return localStorage.getItem("tvh_token"); }

  useEffect(() => {
    const u = localStorage.getItem("tvh_user");
    if (u) {
      try {
        const parsed = JSON.parse(u);
        if (parsed.organizationId) {
          setOrg(parsed.organizationId);
        }
      } catch {
        // ignore
      }
    }
    void load();
  }, []);

  async function load() {
    const t = token();
    if (!t) return;
    const org = organizationId.trim() || "org_traffic_vault";
    try {
      const res = await fetch(apiUrl(`/api/v1/payouts?organizationId=${encodeURIComponent(org)}`), {
        headers: { Authorization: `Bearer ${t}` },
      });
      const body = await res.json();
      if (!res.ok) {
        if (organizationId.trim()) setError(body?.error?.message ?? `HTTP ${res.status}`);
        setRows([]);
      } else {
        setError(null);
        setRows(body.data ?? []);
      }
    } catch {
      // ignore
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = token();
    if (!t) {
      setError("Sign in required to request payout disbursements");
      return;
    }
    const amount = Number(amountMinor);
    if (isNaN(amount) || amount < 5000) {
      setError("Minimum payout threshold is $50.00 (5,000 minor units)");
      return;
    }
    if (!destination.trim()) {
      setError("Please provide your Binance Pay ID, wallet address, or payment routing details");
      return;
    }
    setSubmitting(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(apiUrl("/api/v1/payouts"), {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organizationId.trim() || "org_traffic_vault",
          amountMinor: amount,
          currency,
          provider,
          note: `Method: ${provider.toUpperCase()} | Account/Wallet: ${destination.trim()}`
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Failed to create payout request");
      } else {
        setMsg(`Payout request ${body.data?.id} successfully submitted with status ${body.data?.status} (${provider.toUpperCase()})`);
        setDestination("");
        void load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout request submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const majorAmount = (Number(amountMinor) / 100).toFixed(2);

  return (
    <div className={styles.page}>
      <h1>Partner Payout Requests</h1>
      <p className="muted">
        Verified earnings disbursement. Minimum payout threshold is $50.00. Powered by instant Binance Pay, USDT (TRC-20), or Wire. {!token() && <Link to="/login">Sign in</Link>}
      </p>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {msg && <p className={styles.ok}>{msg}</p>}

      <form className={styles.form} onSubmit={(e) => void submit(e)}>
        <label>
          Organization ID
          <input
            value={organizationId}
            onChange={(e) => setOrg(e.target.value)}
            required
            className="mono"
            placeholder="org_traffic_vault"
          />
        </label>

        <label>
          Payout Method
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="binance_pay">Binance Pay (Instant USDT/BUSD via Binance ID)</option>
            <option value="usdt">Crypto USDT (Tether TRC-20 Direct Wallet)</option>
            <option value="wire">International Bank Wire (USD/EUR SWIFT)</option>
            <option value="manual">Manual Settlement / Alternative Provider</option>
          </select>
        </label>

        <label>
          Destination Account / Wallet Address
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={
              provider === "binance_pay"
                ? "Binance Pay ID or registered email (e.g. 192837465)"
                : provider === "usdt"
                ? "TRC-20 Wallet Address (e.g. T...)"
                : "IBAN / SWIFT / Routing details"
            }
            required
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label>
            Amount in Minor Units (${majorAmount})
            <input
              type="number"
              min={5000}
              step={100}
              value={amountMinor}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <span style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
              5000 units = $50.00 minimum
            </span>
          </label>

          <label>
            Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD ($)</option>
              <option value="USDT">USDT (Tether)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </label>
        </div>

        <div className={styles.row}>
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : `Request $${majorAmount} Payout`}
          </button>
          <button type="button" onClick={() => void load()}>
            Refresh Ledger
          </button>
        </div>
      </form>

      <h2 style={{ marginTop: "2rem", fontSize: "1.25rem" }}>Disbursement Ledger</h2>
      <ul className={styles.list}>
        {rows.length === 0 ? (
          <li className="muted">No payout requests found for this organization.</li>
        ) : (
          rows.map((r) => (
            <li key={r.id}>
              <div>
                <strong>{(r.amount_minor / 100).toFixed(2)} {r.currency}</strong>
                <span style={{ marginLeft: "0.75rem", fontSize: "0.85rem", textTransform: "uppercase" }} className="mono">
                  [{r.status}]
                </span>
                {r.provider && (
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "var(--accent, #00ffff)" }}>
                    via {r.provider.replace("_", " ")}
                  </span>
                )}
              </div>
              <div className="muted mono" style={{ fontSize: "0.75rem" }}>
                ID: {r.id} {r.created_at ? `· ${new Date(r.created_at).toLocaleString()}` : ""}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

