import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
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
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin create state
  const [showAdmin, setShowAdmin] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [formRisk, setFormRisk] = useState("standard");
  const [formSort, setFormSort] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("tvh_token");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/offer-categories"));
      const body = (await res.json()) as {
        data?: Category[];
        message?: string;
        correlationId?: string;
      };
      setCategories(body.data ?? []);
      setMessage(body.message ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Please sign in as platform operator to create categories");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(apiUrl("/api/v1/offer-categories/admin"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          description: formDesc.trim() || undefined,
          parent_id: formParentId || null,
          risk_classification: formRisk,
          sort_order: parseInt(formSort, 10) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? `Failed with HTTP ${res.status}`);
      }

      setSuccess(`Category "${formName}" created successfully!`);
      setFormName("");
      setFormSlug("");
      setFormDesc("");
      setFormParentId("");
      setFormSort("0");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setSubmitting(false);
    }
  }

  const roots = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  return (
    <div className={styles.page}>
      <h1>Offer Categories Catalog</h1>
      <p className="muted">
        Database-driven hierarchical catalog with risk classification, subcategory routing, and policy controls.
      </p>

      {token && (
        <div className={styles.adminPanel}>
          <div className={styles.adminHeader}>
            <h2>Category Administration</h2>
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setShowAdmin(!showAdmin)}
            >
              {showAdmin ? "Hide New Category Form" : "+ Add New Category / Subcategory"}
            </button>
          </div>

          {showAdmin && (
            <form className={styles.createForm} onSubmit={(e) => void handleCreateCategory(e)}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="cat-name">Category Name *</label>
                  <input
                    id="cat-name"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Identity Protection"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="cat-slug">Slug (Optional)</label>
                  <input
                    id="cat-slug"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. identity-protection"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="cat-parent">Parent Category (Optional)</label>
                  <select
                    id="cat-parent"
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                  >
                    <option value="">None (Top-Level Root Category)</option>
                    {roots.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="cat-risk">Risk Classification</label>
                  <select
                    id="cat-risk"
                    value={formRisk}
                    onChange={(e) => setFormRisk(e.target.value)}
                  >
                    <option value="standard">Standard</option>
                    <option value="elevated">Elevated</option>
                    <option value="restricted">Restricted (Compliance Gate)</option>
                    <option value="prohibited">Prohibited</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="cat-sort">Sort Order</label>
                  <input
                    id="cat-sort"
                    type="number"
                    value={formSort}
                    onChange={(e) => setFormSort(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="cat-desc">Description</label>
                <textarea
                  id="cat-desc"
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Offer category compliance boundaries, vertical scope, and allowed promotion channels."
                />
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Save Category"}
              </button>
            </form>
          )}
        </div>
      )}

      {loading && <p>Loading categories…</p>}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.success} role="status">
          {success}
        </div>
      )}
      {message && !error && (
        <p className="muted">{message}</p>
      )}

      {!loading && !error && categories.length === 0 && (
        <p className="muted">No active categories. Apply D1 migrations to seed the catalog.</p>
      )}

      <ul className={styles.list}>
        {roots.map((root) => {
          const subs = childrenOf(root.id);
          return (
            <li key={root.id} className={styles.root}>
              <div className={styles.rootHead}>
                <span className={styles.name}>{root.name}</span>
                {root.risk_classification && root.risk_classification !== "standard" && (
                  <span className={styles.risk} data-risk={root.risk_classification}>
                    {root.risk_classification}
                  </span>
                )}
              </div>
              {root.description && <p className={styles.desc}>{root.description}</p>}
              {subs.length > 0 && (
                <ul className={styles.subs}>
                  {subs.map((sub) => (
                    <li key={sub.id} className={styles.subItem}>
                      <div className={styles.subHead}>
                        <span>{sub.name}</span>
                        {sub.risk_classification && sub.risk_classification !== "standard" && (
                          <span className={styles.risk} data-risk={sub.risk_classification}>
                            {sub.risk_classification}
                          </span>
                        )}
                      </div>
                      {sub.description && <p className={styles.subDesc}>{sub.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
