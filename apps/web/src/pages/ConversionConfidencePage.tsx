import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./EarningsPage.module.css";

type Confidence = {
  organizationName?: string;
  windowHours?: number;
  conversionCountsByStatus?: Record<string, number>;
  conversionsInWindow?: number;
  lastConversionAt?: string | null;
  lastClickAt?: string | null;
  note?: string;
};

export function ConversionConfidencePage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Confidence | null>(null);

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
        const res = await fetch(apiUrl("/api/v1/publisher/conversion-confidence"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!cancelled) {
          if (!res.ok) {
            setError(body?.error?.message ?? `HTTP ${res.status}`);
          } else {
            setData(body.data);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = data?.conversionCountsByStatus ?? {};

  return (
    <div className={styles.page}>
      <h1>Conversion Confidence Monitor</h1>
      <p className="muted">
        Real event counts for your affiliate organization. No fabricated rates or forecasts.
      </p>
      {!localStorage.getItem("tvh_token") && (
        <p>
          <Link to="/login">Sign in</Link> to view confidence data.
        </p>
      )}
      {loading && <p>Loading…</p>}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {data && (
        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>{data.organizationName ?? "Organization"}</h2>
            <p className="muted">Window: last {data.windowHours ?? 24} hours</p>
            <dl>
              <div>
                <dt>Conversions in window</dt>
                <dd className="mono">{data.conversionsInWindow ?? 0}</dd>
              </div>
              <div>
                <dt>Last conversion</dt>
                <dd className="mono">{data.lastConversionAt ?? "—"}</dd>
              </div>
              <div>
                <dt>Last click</dt>
                <dd className="mono">{data.lastClickAt ?? "—"}</dd>
              </div>
            </dl>
          </section>
          <section className={styles.card}>
            <h2>By lifecycle status</h2>
            {Object.keys(counts).length === 0 ? (
              <p className="muted">No conversions recorded yet.</p>
            ) : (
              <ul className={styles.list}>
                {Object.entries(counts).map(([st, cnt]) => (
                  <li key={st}>
                    <strong>{st}</strong> <span className="mono">{cnt}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {data.note && <p className="muted">{data.note}</p>}
        </div>
      )}
    </div>
  );
}
