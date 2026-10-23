import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  link_url?: string;
  link_label?: string;
  style: "info" | "warning" | "critical" | "success";
  target_audience: "all" | "publishers" | "advertisers" | "guests";
  is_active: number;
  created_at?: string;
}

export function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("Universal Ledger Live");
  const [message, setMessage] = useState("Welcome to TrafficVaultHub. Every click accounted for. Every decision explained.");
  const [linkUrl, setLinkUrl] = useState("/offers");
  const [linkLabel, setLinkLabel] = useState("Explore Offers");
  const [style, setStyle] = useState<"info" | "warning" | "critical" | "success">("info");
  const [audience, setAudience] = useState<"all" | "publishers" | "advertisers" | "guests">("all");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/announcements"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setAnnouncements(json.data);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(apiUrl("/api/v1/admin/announcements"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          message,
          linkUrl,
          linkLabel,
          style,
          targetAudience: audience,
          isActive,
        }),
      });
      setShowCreate(false);
      fetchAnnouncements();
    } catch {
      alert("Failed to save announcement");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ann: AnnouncementItem) {
    try {
      await fetch(apiUrl(`/api/v1/admin/announcements/${ann.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !ann.is_active,
        }),
      });
      fetchAnnouncements();
    } catch {
      alert("Failed to toggle announcement");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await fetch(apiUrl(`/api/v1/admin/announcements/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAnnouncements();
    } catch {
      alert("Failed to delete announcement");
    }
  }

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Sitewide Announcement Bar</h1>
          <p className={styles.pageSubtitle}>
            Publish network broadcasts, policy alerts, and scheduled downtime notices with immediate site-wide visibility.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
            + Create New Announcement
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.emptyState}>Loading announcement schedule...</div>
        ) : announcements.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No announcements configured</div>
            <p>Create an announcement to broadcast urgent network updates to publishers and advertisers.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title &amp; Message</th>
                  <th>Visual Style</th>
                  <th>Target Audience</th>
                  <th>CTA Action Link</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann) => (
                  <tr key={ann.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#f8fafc" }}>{ann.title}</div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                        {ann.message}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          ann.style === "critical"
                            ? styles.badgeDanger
                            : ann.style === "warning"
                            ? styles.badgeProbation
                            : styles.badgeActive
                        }`}
                      >
                        {ann.style.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textTransform: "capitalize", fontSize: "0.85rem" }}>
                      {ann.target_audience}
                    </td>
                    <td>
                      {ann.link_url ? (
                        <a href={ann.link_url} style={{ color: "#38bdf8", textDecoration: "none" }}>
                          {ann.link_label || ann.link_url} ↗
                        </a>
                      ) : (
                        <span style={{ color: "#64748b" }}>—</span>
                      )}
                    </td>
                    <td>
                      {ann.is_active ? (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>Active Live</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeMuted}`}>Disabled</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => toggleActive(ann)}
                        >
                          {ann.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleDelete(ann.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <h3 className={styles.modalTitle}>Create Sitewide Announcement</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreate(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Broadcast Headline</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Message Text</label>
                <textarea
                  required
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formField}>
                  <label className={styles.label}>Visual Theme</label>
                  <select
                    className={styles.input}
                    value={style}
                    onChange={(e) => setStyle(e.target.value as any)}
                  >
                    <option value="info">Cyan Info — General announcement</option>
                    <option value="warning">Amber Warning — Maintenance notice</option>
                    <option value="critical">Crimson Critical — Urgent compliance alert</option>
                    <option value="success">Emerald Success — Milestone / feature launch</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Target Audience</label>
                  <select
                    className={styles.input}
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                  >
                    <option value="all">All Visitors</option>
                    <option value="publishers">Authenticated Publishers Only</option>
                    <option value="advertisers">Authenticated Advertisers Only</option>
                    <option value="guests">Logged-Out Guests Only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formField}>
                  <label className={styles.label}>Action Button Link URL (Optional)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>Action Button Label</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Immediate Activation</label>
                <select
                  className={styles.input}
                  value={isActive ? "1" : "0"}
                  onChange={(e) => setIsActive(e.target.value === "1")}
                >
                  <option value="1">Active Immediately (Disables conflicting notices)</option>
                  <option value="0">Draft / Inactive</option>
                </select>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Publishing..." : "Save Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
