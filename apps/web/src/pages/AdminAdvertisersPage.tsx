import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface AdvertiserItem {
  org_id: string;
  org_name: string;
  org_status: string;
  org_created_at: string;
  user_id: string;
  email: string;
  display_name: string;
  company_name: string;
  country: string;
  total_offers: number;
  active_offers: number;
}

export function AdminAdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<AdvertiserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAdv, setSelectedAdv] = useState<AdvertiserItem | null>(null);
  const [editStatus, setEditStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchAdvertisers();
  }, [statusFilter]);

  async function fetchAdvertisers() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/advertisers?status=${statusFilter}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setAdvertisers(json.data);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAdv(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAdv) return;
    setSaving(true);
    try {
      await fetch(apiUrl(`/api/v1/admin/advertisers/${selectedAdv.org_id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: editStatus,
          notes,
        }),
      });
      setSelectedAdv(null);
      fetchAdvertisers();
    } catch (err) {
      alert("Failed to update advertiser");
    } finally {
      setSaving(false);
    }
  }

  const filtered = advertisers.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.org_name?.toLowerCase().includes(s) ||
      a.company_name?.toLowerCase().includes(s) ||
      a.email?.toLowerCase().includes(s)
    );
  });

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Advertiser &amp; KYB Control</h1>
          <p className={styles.pageSubtitle}>
            Oversee merchant accounts, corporate KYB verification, campaign authorizations, and restricted vertical access.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={fetchAdvertisers}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search advertisers by corporate entity, email, country..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={styles.selectInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading advertiser directory...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No advertisers found</div>
            <p>No merchant corporate accounts match your current search.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Corporate Merchant Entity</th>
                  <th>Contact Email</th>
                  <th>Country</th>
                  <th>Campaigns</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((adv) => (
                  <tr key={adv.org_id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                        {adv.company_name || adv.org_name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }} className={styles.mono}>
                        {adv.org_id}
                      </div>
                    </td>
                    <td>{adv.email}</td>
                    <td>{adv.country || "Global"}</td>
                    <td className={styles.mono}>
                      <span style={{ color: "#38bdf8", fontWeight: 600 }}>{adv.active_offers} active</span> / {adv.total_offers} total
                    </td>
                    <td>
                      {adv.org_status === "active" ? (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeDanger}`}>Suspended</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={styles.btnSecondary}
                        onClick={() => {
                          setSelectedAdv(adv);
                          setEditStatus(adv.org_status);
                        }}
                      >
                        Manage Account
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedAdv && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedAdv(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Advertiser Operations: {selectedAdv.company_name || selectedAdv.org_name}</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedAdv(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdv} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Corporate Account Status</label>
                <select
                  className={styles.input}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="active">ACTIVE — Offers Live &amp; Tracked</option>
                  <option value="suspended">SUSPENDED — Halt All Campaigns &amp; Payouts</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Administrative Notes / Audit Context</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Record compliance reason or funding notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedAdv(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Updating..." : "Save Advertiser Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
