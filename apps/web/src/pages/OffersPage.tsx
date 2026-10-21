import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import styles from "./OffersPage.module.css";

type Offer = {
  id: string;
  name: string;
  description: string | null;
  vertical: string | null;
  status: string;
  accessMode: string;
  payoutType: string | null;
  currency: string | null;
  affiliateCommissionMinor: number | null;
  conversionEvent: string | null;
};

type ListResponse = {
  data?: Offer[];
  pagination?: { total: number; page: number; hasMore: boolean };
  error?: { message: string };
};

function formatCommission(minor: number | null, currency: string | null) {
  if (minor == null || !currency) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl("/api/v1/offers?limit=20"));
        const body = (await res.json()) as ListResponse;
        if (!cancelled) {
          if (!res.ok) {
            setError(body.error?.message ?? `HTTP ${res.status}`);
            setOffers([]);
          } else {
            setOffers(body.data ?? []);
            setTotal(body.pagination?.total ?? 0);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load offers");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.page}>
      <h1>Offer marketplace</h1>
      <p className="muted">
        LIVE offers with PUBLIC access. Data from server-side D1 — no fabricated
        EPC or conversion rates.
      </p>

      {loading && <p>Loading…</p>}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {!loading && !error && offers.length === 0 && (
        <p className="muted">
          No public LIVE offers yet ({total} total matching filters). Seed or
          activate offers in the database to populate this list.
        </p>
      )}

      <ul className={styles.list}>
        {offers.map((o) => (
          <li key={o.id} className={styles.card}>
            <div className={styles.head}>
              <strong>{o.name}</strong>
              <span className={styles.badge}>{o.payoutType ?? "—"}</span>
            </div>
            {o.description && <p className="muted">{o.description}</p>}
            <dl className={styles.meta}>
              <div>
                <dt>Vertical</dt>
                <dd>{o.vertical ?? "—"}</dd>
              </div>
              <div>
                <dt>Commission</dt>
                <dd className="mono">
                  {formatCommission(o.affiliateCommissionMinor, o.currency)}
                </dd>
              </div>
              <div>
                <dt>Event</dt>
                <dd>{o.conversionEvent ?? "—"}</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>{o.accessMode}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
