import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import styles from "./OfferCapsPage.module.css";

type Counter = {
  cap_type: string;
  period_key: string;
  limit_value: number | null;
  current_value: number;
  exhausted_at: string | null;
};

export function OfferCapsPage() {
  const [offerId, setOfferId] = useState("");
  const [daily, setDaily] = useState("");
  const [total, setTotal] = useState("");
  const [counters, setCounters] = useState<Counter[]>([]);
  const [offerName, setOfferName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function token() {
    return localStorage.getItem("tvh_token");
  }

  async function load() {
    const t = token();
    if (!t) {
      setError("Sign in required");
      return;
    }
    if (!offerId.trim()) {
      setError("Enter an offer ID");
      return;
    }
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/v1/offers/${offerId.trim()}/caps`), {
        headers: { Authorization: `Bearer ${t}` },
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
        setCounters([]);
        setOfferName(null);
        return;
      }
      setOfferName(body.data?.offer?.name ?? null);
      const list = (body.data?.counters ?? []) as Counter[];
      setCounters(list);
      const day = body.data?.today as string | undefined;
      const dailyRow = list.find(
        (c) =>
          c.cap_type === "DAILY_CLICK" &&
          (c.period_key === day || c.limit_value != null)
      );
      const totalRow = list.find((c) => c.cap_type === "TOTAL_CLICK");
      setDaily(
        dailyRow?.limit_value != null ? String(dailyRow.limit_value) : ""
      );
      setTotal(
        totalRow?.limit_value != null ? String(totalRow.limit_value) : ""
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = token();
    if (!t) {
      setError("Sign in required");
      return;
    }
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const payload: {
        dailyClickLimit: number | null;
        totalClickLimit: number | null;
      } = {
        dailyClickLimit: daily.trim() === "" ? null : Number(daily),
        totalClickLimit: total.trim() === "" ? null : Number(total),
      };
      const res = await fetch(apiUrl(`/api/v1/offers/${offerId.trim()}/caps`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      setMsg("Click caps saved");
      setCounters((body.data?.counters as Counter[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // no auto-load
  }, []);

  return (
    <div className={styles.page}>
      <h1>Offer click caps</h1>
      <p className="muted">
        Set daily and lifetime click limits for an offer. Empty = unlimited.
        Requires advertiser membership or platform ops. Sign in first.
      </p>

      <div className={styles.row}>
        <label>
          Offer ID
          <input
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            placeholder="uuid"
            className="mono"
          />
        </label>
        <button type="button" onClick={() => void load()} disabled={loading}>
          Load
        </button>
      </div>

      {offerName && (
        <p>
          Offer: <strong>{offerName}</strong>
        </p>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {msg && <div className={styles.ok}>{msg}</div>}

      <form className={styles.form} onSubmit={(e) => void save(e)}>
        <label>
          Daily click limit
          <input
            type="number"
            min={0}
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            placeholder="Unlimited"
          />
        </label>
        <label>
          Total (lifetime) click limit
          <input
            type="number"
            min={0}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="Unlimited"
          />
        </label>
        <button type="submit" disabled={loading || !offerId.trim()}>
          {loading ? "Saving…" : "Save click caps"}
        </button>
      </form>

      {counters.length > 0 && (
        <div className={styles.tableWrap}>
          <h2>Current counters</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Period</th>
                <th>Limit</th>
                <th>Current</th>
                <th>Exhausted</th>
              </tr>
            </thead>
            <tbody>
              {counters.map((c) => (
                <tr key={`${c.cap_type}-${c.period_key}`}>
                  <td className="mono">{c.cap_type}</td>
                  <td className="mono">{c.period_key}</td>
                  <td className="mono">
                    {c.limit_value == null ? "—" : c.limit_value}
                  </td>
                  <td className="mono">{c.current_value}</td>
                  <td className="mono">{c.exhausted_at ? "yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
