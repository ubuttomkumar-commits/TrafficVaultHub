import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./EarningsPage.module.css";

type Balance = {
  currency: string;
  commissionsMinor: number;
  reversalsMinor: number;
  earnedMinor: number;
  paidMinor: number;
  payableMinor: number;
};

export function EarningsPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<{
    organizationName?: string;
    byCurrency?: Balance[];
    conversionCounts?: Record<string, number>;
    note?: string;
  } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("tvh_token");
    if (!token) {
      setError("Sign in required");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/publisher/earnings"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!cancelled) {
          if (!res.ok) {
            setError(body?.error?.message ?? `HTTP ${res.status}`);
          } else {
            setPayload(body.data);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function money(minor: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(minor / 100);
  }

  return (
    <div className={styles.page}>
      <h1>Earnings Center</h1>
      <p className="muted">
        Server-derived journal totals. Pending is never shown as payable.
      </p>
      {!localStorage.getItem("tvh_token") && (
        <p>
          <Link to="/login">Sign in</Link> to view earnings.
        </p>
      )}
      {loading && <p>Loading…</p>}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {payload && (
        <>
          <p>
            Organization: <strong>{payload.organizationName ?? "—"}</strong>
          </p>
          {payload.note && <p className="muted">{payload.note}</p>}
          {(payload.byCurrency ?? []).length === 0 && (
            <p className="muted">No posted journal activity yet.</p>
          )}
          <ul className={styles.list}>
            {(payload.byCurrency ?? []).map((b) => (
              <li key={b.currency} className={styles.card}>
                <h2>{b.currency}</h2>
                <dl>
                  <div>
                    <dt>Commissions</dt>
                    <dd className="mono">{money(b.commissionsMinor, b.currency)}</dd>
                  </div>
                  <div>
                    <dt>Reversals</dt>
                    <dd className="mono">{money(b.reversalsMinor, b.currency)}</dd>
                  </div>
                  <div>
                    <dt>Earned</dt>
                    <dd className="mono">{money(b.earnedMinor, b.currency)}</dd>
                  </div>
                  <div>
                    <dt>Paid</dt>
                    <dd className="mono">{money(b.paidMinor, b.currency)}</dd>
                  </div>
                  <div>
                    <dt>Payable (estimate)</dt>
                    <dd className="mono">{money(b.payableMinor, b.currency)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          {payload.conversionCounts && (
            <div className={styles.counts}>
              <h2>Conversion lifecycle counts</h2>
              <ul>
                {Object.entries(payload.conversionCounts).map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    <span className="mono">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
