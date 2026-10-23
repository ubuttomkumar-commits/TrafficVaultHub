import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface UserItem {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  email_verified: number;
  created_at: string;
  organization_name: string | null;
  organization_type: string | null;
  role_name: string | null;
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState("publisher");
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/users?limit=100"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) setUsers(json.data);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(u: UserItem) {
    const nextStatus = u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Are you sure you want to change ${u.email} to ${nextStatus}?`)) return;
    try {
      await fetch(apiUrl(`/api/v1/admin/users/${u.id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus, reason: "Operator directory toggle" }),
      });
      fetchUsers();
    } catch {
      alert("Failed to update status");
    }
  }

  async function handleForceReverify(u: UserItem) {
    if (!confirm(`Force ${u.email} to re-verify email via OTP on next access?`)) return;
    try {
      await fetch(apiUrl(`/api/v1/admin/users/${u.id}/force-reverify`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Forced re-verification set for ${u.email}`);
      fetchUsers();
    } catch {
      alert("Failed to trigger re-verification");
    }
  }

  async function handleRoleChange(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    try {
      await fetch(apiUrl(`/api/v1/admin/users/${selectedUser.id}/role`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: editRole }),
      });
      setSelectedUser(null);
      fetchUsers();
    } catch {
      alert("Failed to update role");
    } finally {
      setSaving(false);
    }
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(s) ||
      u.display_name?.toLowerCase().includes(s) ||
      u.organization_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Users &amp; RBAC Access Control</h1>
          <p className={styles.pageSubtitle}>
            Directory of registered operators, publishers, and advertisers. Strict role separation enforces least-privilege principles.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={fetchUsers}>
            ↻ Refresh Directory
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search users by email, name, organization..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading directory...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No users found</div>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User Identity</th>
                  <th>Assigned Organization</th>
                  <th>Role Claim</th>
                  <th>Email Verified</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                        {u.display_name || u.email.split("@")[0]}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{u.email}</div>
                    </td>
                    <td>
                      <div>{u.organization_name || "Platform"}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase" }}>
                        {u.organization_type || "Direct"}
                      </div>
                    </td>
                    <td>
                      <span className={styles.mono} style={{ color: "#a78bfa", fontWeight: 600, fontSize: "0.8rem" }}>
                        {u.role_name || "Member"}
                      </span>
                    </td>
                    <td>
                      {u.email_verified ? (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>Verified ✓</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgePending}`}>Pending OTP</span>
                      )}
                    </td>
                    <td>
                      {u.status === "ACTIVE" ? (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeDanger}`}>Suspended</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => {
                            setSelectedUser(u);
                            setEditRole(u.role_name?.toLowerCase() || "publisher");
                          }}
                        >
                          Role
                        </button>
                        <button
                          className={u.status === "ACTIVE" ? styles.btnDanger : styles.btnSecondary}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => handleForceReverify(u)}
                          title="Force Email OTP Verification"
                        >
                          Re-verify
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

      {selectedUser && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedUser(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Assign Role: {selectedUser.email}</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedUser(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleRoleChange} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Platform Role</label>
                <select
                  className={styles.input}
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <option value="super_admin">Super Admin (Platform Operator — Full Access)</option>
                  <option value="admin">Admin (Operational Management)</option>
                  <option value="compliance">Compliance Officer (KYC/KYB &amp; Case Review)</option>
                  <option value="finance">Finance Manager (Payout Disbursement)</option>
                  <option value="support">Support Agent (Read-only / Diagnostics)</option>
                  <option value="publisher">Publisher (Affiliate Traffic Partner)</option>
                  <option value="advertiser">Advertiser (Merchant Offer Creator)</option>
                </select>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Updating..." : "Confirm Role Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
