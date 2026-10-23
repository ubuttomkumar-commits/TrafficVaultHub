import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface AdminOffer {
  id: string;
  public_id: string;
  name: string;
  description: string | null;
  status: string;
  payout_model: string;
  currency: string;
  current_payout_version: number;
  category_name: string;
  advertiser_name: string;
  affiliate_payout_minor: number;
  event_name: string;
  created_at: string;
}

export function AdminOffersPage() {
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newModel, setNewModel] = useState("cpa");
  const [newPayout, setNewPayout] = useState("25.00");
  const [newStatus, setNewStatus] = useState("active");
  const [newEvent, setNewEvent] = useState("lead");
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [selectedOffer, setSelectedOffer] = useState<AdminOffer | null>(null);
  const [editStatus, setEditStatus] = useState("active");
  const [editPayout, setEditPayout] = useState("");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchOffers();
  }, [statusFilter]);

  async function fetchOffers() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/offers?status=${statusFilter}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setOffers(json.data);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const payoutMinor = Math.round(parseFloat(newPayout || "0") * 100);
      await fetch(apiUrl("/api/v1/admin/offers"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          payoutModel: newModel,
          affiliatePayoutMinor: payoutMinor,
          status: newStatus,
          eventName: newEvent,
        }),
      });
      setShowCreateModal(false);
      setNewName("");
      setNewDesc("");
      fetchOffers();
    } catch {
      alert("Failed to create offer");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOffer) return;
    setSaving(true);
    try {
      // 1. Update status
      await fetch(apiUrl(`/api/v1/admin/offers/${selectedOffer.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: editStatus }),
      });

      // 2. If payout changed, issue new immutable payout version
      const currentMinor = selectedOffer.affiliate_payout_minor || 0;
      const targetMinor = Math.round(parseFloat(editPayout || "0") * 100);
      if (targetMinor > 0 && targetMinor !== currentMinor) {
        await fetch(apiUrl(`/api/v1/admin/offers/${selectedOffer.id}/new-payout-version`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            affiliatePayoutMinor: targetMinor,
            reason: "Administrative rate adjustment",
          }),
        });
      }

      setSelectedOffer(null);
      fetchOffers();
    } catch {
      alert("Failed to update offer");
    } finally {
      setSaving(false);
    }
  }

  const filtered = offers.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(s) ||
      o.public_id?.toLowerCase().includes(s) ||
      o.category_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Offers &amp; Campaigns Control</h1>
          <p className={styles.pageSubtitle}>
            Full campaign lifecycle management. Version-safe payout edits ensure historical conversion records remain intact.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => setShowCreateModal(true)}>
            + Create New Offer
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search by offer name, ID, vertical..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={styles.selectInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Campaign Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
              <option value="pending_review">Pending Review</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading offer catalog...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No offers found</div>
            <p>No campaigns match your search query.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Campaign Name / Public ID</th>
                  <th>Vertical Category</th>
                  <th>Model</th>
                  <th>Payout Rate</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((off) => {
                  const isActive = off.status?.toLowerCase() === "active" || off.status?.toLowerCase() === "live";
                  const isPaused = off.status?.toLowerCase() === "paused";
                  const isDraft = off.status?.toLowerCase() === "draft";

                  return (
                    <tr key={off.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#f8fafc" }}>{off.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }} className={styles.mono}>
                          {off.public_id || off.id}
                        </div>
                      </td>
                      <td>{off.category_name || "General"}</td>
                      <td className={styles.mono} style={{ textTransform: "uppercase" }}>
                        {off.payout_model}
                      </td>
                      <td className={styles.mono} style={{ color: "#38bdf8", fontWeight: 600 }}>
                        ${((off.affiliate_payout_minor || 0) / 100).toFixed(2)}
                      </td>
                      <td className={styles.mono}>v{off.current_payout_version || 1}</td>
                      <td>
                        {isActive && <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>}
                        {isPaused && <span className={`${styles.badge} ${styles.badgePending}`}>Paused</span>}
                        {isDraft && <span className={`${styles.badge} ${styles.badgeMuted}`}>Draft</span>}
                        {!isActive && !isPaused && !isDraft && (
                          <span className={`${styles.badge} ${styles.badgeDanger}`}>{off.status}</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => {
                            setSelectedOffer(off);
                            setEditStatus(off.status?.toLowerCase() || "active");
                            setEditPayout(((off.affiliate_payout_minor || 0) / 100).toFixed(2));
                          }}
                        >
                          Edit &amp; Version
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

      {/* CREATE OFFER MODAL */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Universal CPA Offer</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOffer} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Campaign Offer Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ProtonVPN Ultra Security"
                  className={styles.input}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formField}>
                  <label className={styles.label}>Commission Payout Model</label>
                  <select
                    className={styles.input}
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                  >
                    <option value="cpa">CPA — Cost Per Action / Sale</option>
                    <option value="cpl">CPL — Cost Per Lead (Single Opt-In)</option>
                    <option value="cpi">CPI — Cost Per App Install</option>
                    <option value="cps">CPS — Cost Per Sale (E-Commerce)</option>
                    <option value="revshare">REVSHARE — Revenue Share Percentage</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Publisher Commission ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className={styles.input}
                    value={newPayout}
                    onChange={(e) => setNewPayout(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formField}>
                  <label className={styles.label}>Conversion Event Trigger</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={newEvent}
                    onChange={(e) => setNewEvent(e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>Initial Status</label>
                  <select
                    className={styles.input}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="active">Active (Available for tracking)</option>
                    <option value="draft">Draft (Private configuration)</option>
                    <option value="paused">Paused (Halt redirects)</option>
                  </select>
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Description &amp; GEO Restrictions</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Offer details, allowed traffic types, prohibited channels..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={creating}>
                  {creating ? "Creating..." : "Save & Publish Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT & VERSION OFFER MODAL */}
      {selectedOffer && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedOffer(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Manage Offer: {selectedOffer.name}</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedOffer(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Campaign Status</label>
                <select
                  className={styles.input}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="active">ACTIVE — Live in Offer Catalog</option>
                  <option value="paused">PAUSED — Maintain Links, Fallback to Smartlink</option>
                  <option value="draft">DRAFT — Private Staging</option>
                  <option value="archived">ARCHIVED — Closed Campaign</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>
                  Affiliate Commission ($ USD) — Version v{selectedOffer.current_payout_version || 1}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.input}
                  value={editPayout}
                  onChange={(e) => setEditPayout(e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Changing the payout will publish an immutable new payout version (v{(selectedOffer.current_payout_version || 1) + 1}). Historical conversions preserve their locked rate.
                </span>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedOffer(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Saving..." : "Commit Campaign Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
