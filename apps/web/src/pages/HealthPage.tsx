import { useEffect, useState } from "react";
import styles from "./HealthPage.module.css";

type HealthResponse = {
  status: string;
  product?: string;
  version?: string;
  environment?: string;
  checks?: { database?: string };
  correlationId?: string;
  timestamp?: string;
  message?: string;
};

export function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/v1/health");
        const body = (await res.json()) as HealthResponse;
        if (!cancelled) {
          setData(body);
          if (!res.ok && body.status !== "ok") {
            setError(`API returned ${res.status}`);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to reach API"
          );
          setData(null);
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
      <h1>System Health</h1>
      <p className="muted">
        Live checks against the Workers API and D1. Status is not inferred from
        UI load alone.
      </p>

      {loading && <p className={styles.status}>Checking…</p>}

      {error && !data && (
        <div className={styles.error} role="alert">
          <strong>Unavailable</strong>
          <p>{error}</p>
          <p className="muted">
            Ensure the API worker is running (<code>npm run dev:api</code>) and
            migrations have been applied.
          </p>
        </div>
      )}

      {data && (
        <div className={`card ${styles.card}`}>
          <dl className={styles.dl}>
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={
                    data.status === "ok" ? styles.ok : styles.degraded
                  }
                >
                  {data.status}
                </span>
              </dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd className="mono">{data.checks?.database ?? "—"}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd className="mono">{data.version ?? "—"}</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd className="mono">{data.environment ?? "—"}</dd>
            </div>
            <div>
              <dt>Correlation ID</dt>
              <dd className="mono">{data.correlationId ?? "—"}</dd>
            </div>
            <div>
              <dt>Timestamp</dt>
              <dd className="mono">{data.timestamp ?? "—"}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
