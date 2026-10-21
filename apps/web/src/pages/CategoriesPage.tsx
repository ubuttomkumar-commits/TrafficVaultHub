import { useEffect, useState } from "react";
import styles from "./CategoriesPage.module.css";

type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: number;
  risk_classification?: string;
};

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/v1/offer-categories");
        const body = (await res.json()) as {
          data?: Category[];
          message?: string;
          correlationId?: string;
        };
        if (!cancelled) {
          setCategories(body.data ?? []);
          setMessage(body.message ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load categories");
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

  const roots = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  return (
    <div className={styles.page}>
      <h1>Offer Categories</h1>
      <p className="muted">
        Database-driven catalog. Frontend does not hard-code the full list.
      </p>

      {loading && <p>Loading…</p>}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {message && !error && (
        <p className="muted">{message}</p>
      )}

      {!loading && !error && categories.length === 0 && (
        <p className="muted">No active categories. Apply D1 migrations to seed the catalog.</p>
      )}

      <ul className={styles.list}>
        {roots.map((root) => (
          <li key={root.id} className={styles.root}>
            <div className={styles.rootHead}>
              <span className={styles.name}>{root.name}</span>
              {root.risk_classification && root.risk_classification !== "standard" && (
                <span className={styles.risk} data-risk={root.risk_classification}>
                  {root.risk_classification}
                </span>
              )}
            </div>
            <ul className={styles.subs}>
              {childrenOf(root.id).map((sub) => (
                <li key={sub.id}>
                  <span>{sub.name}</span>
                  {sub.risk_classification && sub.risk_classification !== "standard" && (
                    <span className={styles.risk} data-risk={sub.risk_classification}>
                      {sub.risk_classification}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
