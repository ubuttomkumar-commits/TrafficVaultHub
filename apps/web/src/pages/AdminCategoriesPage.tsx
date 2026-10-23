import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  parent_name?: string | null;
  sort_order: number;
  is_active: number;
  risk_classification: string;
  offer_count?: number;
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newParent, setNewParent] = useState("");
  const [newRisk, setNewRisk] = useState("standard");
  const [newSort, setNewSort] = useState("50");
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [selectedCat, setSelectedCat] = useState<CategoryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editRisk, setEditRisk] = useState("standard");
  const [editSort, setEditSort] = useState("50");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/categories"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setCategories(json.data);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await fetch(apiUrl("/api/v1/admin/categories"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          slug: newSlug || undefined,
          parentId: newParent || null,
          riskClassification: newRisk,
          sortOrder: Number(newSort),
        }),
      });
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
      fetchCategories();
    } catch {
      alert("Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCat) return;
    setSaving(true);
    try {
      await fetch(apiUrl(`/api/v1/admin/categories/${selectedCat.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          riskClassification: editRisk,
          sortOrder: Number(editSort),
          isActive: editActive,
        }),
      });
      setSelectedCat(null);
      fetchCategories();
    } catch {
      alert("Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  const filtered = categories.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.slug.toLowerCase().includes(s);
  });

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Category &amp; Policy Hierarchy</h1>
          <p className={styles.pageSubtitle}>
            Database-driven vertical classifications, compliance risk ratings, and policy versions. Soft-deactivation prevents breaking historical tracking refs.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
            + Add Vertical Category
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search categories and sub-verticals..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading vertical catalog...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No categories found</div>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Parent Vertical</th>
                  <th>Risk Rating</th>
                  <th>Sort Order</th>
                  <th>Offers Count</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => {
                  const isRestricted = cat.risk_classification === "restricted";
                  const isElevated = cat.risk_classification === "elevated";

                  return (
                    <tr key={cat.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                          {cat.parent_id && <span style={{ color: "#64748b" }}>↳ </span>}
                          {cat.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }} className={styles.mono}>
                          {cat.slug}
                        </div>
                      </td>
                      <td>{cat.parent_name || "— Root Vertical —"}</td>
                      <td>
                        {isRestricted ? (
                          <span className={`${styles.badge} ${styles.badgeDanger}`}>Restricted (KYC/KYB Gate)</span>
                        ) : isElevated ? (
                          <span className={`${styles.badge} ${styles.badgeProbation}`}>Elevated Risk</span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeActive}`}>Standard</span>
                        )}
                      </td>
                      <td className={styles.mono}>{cat.sort_order}</td>
                      <td className={styles.mono}>{cat.offer_count ?? 0}</td>
                      <td>
                        {cat.is_active ? (
                          <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeMuted}`}>Deactivated</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => {
                            setSelectedCat(cat);
                            setEditName(cat.name);
                            setEditRisk(cat.risk_classification);
                            setEditSort(String(cat.sort_order));
                            setEditActive(Boolean(cat.is_active));
                          }}
                        >
                          Edit Policy
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className={styles.modalBackdrop} onClick={() => setShowCreate(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Vertical Category</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreate(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adult Dating"
                  className={styles.input}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formField}>
                  <label className={styles.label}>Parent Category (Optional)</label>
                  <select
                    className={styles.input}
                    value={newParent}
                    onChange={(e) => setNewParent(e.target.value)}
                  >
                    <option value="">— None (Root Category) —</option>
                    {categories
                      .filter((c) => !c.parent_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Compliance Risk Classification</label>
                  <select
                    className={styles.input}
                    value={newRisk}
                    onChange={(e) => setNewRisk(e.target.value)}
                  >
                    <option value="standard">Standard — Open traffic</option>
                    <option value="elevated">Elevated — Increased telemetry audit</option>
                    <option value="restricted">Restricted — Mandatory KYC/KYB approval</option>
                    <option value="prohibited">Prohibited — Blocked network-wide</option>
                  </select>
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Sort Order Priority (Lower = higher on list)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={newSort}
                  onChange={(e) => setNewSort(e.target.value)}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={creating}>
                  {creating ? "Adding..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {selectedCat && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedCat(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Category: {selectedCat.name}</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedCat(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Category Name</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formField}>
                  <label className={styles.label}>Compliance Risk Tier</label>
                  <select
                    className={styles.input}
                    value={editRisk}
                    onChange={(e) => setEditRisk(e.target.value)}
                  >
                    <option value="standard">Standard</option>
                    <option value="elevated">Elevated Risk</option>
                    <option value="restricted">Restricted (KYC/KYB Gate)</option>
                    <option value="prohibited">Prohibited</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Sort Order</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={editSort}
                    onChange={(e) => setEditSort(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Active State</label>
                <select
                  className={styles.input}
                  value={editActive ? "1" : "0"}
                  onChange={(e) => setEditActive(e.target.value === "1")}
                >
                  <option value="1">ACTIVE — Offers allowed in this vertical</option>
                  <option value="0">DEACTIVATED (Soft) — Hidden from new campaigns</option>
                </select>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedCat(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Saving..." : "Save Category Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
