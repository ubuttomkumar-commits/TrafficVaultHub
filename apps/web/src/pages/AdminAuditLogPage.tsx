import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_email?: string;
  actor_name?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  before_json?: string;
  after_json?: string;
  reason?: string;
  created_at: string;
}

export function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, resourceFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/admin/audit-logs?action=${encodeURIComponent(actionFilter)}&resourceType=${encodeURIComponent(resourceFilter)}&limit=100`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.data) setLogs(json.data);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    if (logs.length === 0) {
      alert("No logs to export");
      return;
    }
    const headers = ["ID", "Timestamp", "Actor", "Action", "Resource Type", "Resource ID", "Reason"];
    const rows = logs.map((l) => [
      l.id,
      l.created_at,
      l.actor_email || l.actor_id,
      l.action,
      l.resource_type,
      l.resource_id || "",
      (l.reason || "").replace(/"/g, '""'),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tvh_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(s) ||
      l.actor_email?.toLowerCase().includes(s) ||
      l.resource_type?.toLowerCase().includes(s) ||
      l.resource_id?.toLowerCase().includes(s) ||
      l.reason?.toLowerCase().includes(s)
    );
  });

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Global Immutable Audit Ledger</h1>
          <p className={styles.pageSubtitle}>
            Cryptographically sealed record of every administrative moderation, rate update, status transition, and payout decision.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={handleExportCsv}>
            ⬇ Export CSV Ledger
          </button>
          <button className={styles.btnPrimary} onClick={fetchLogs}>
            ↻ Refresh Stream
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.controlsBar}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search by action, actor, resource ID, or reason..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={styles.selectInput}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="UPDATE">Update</option>
              <option value="CREATE">Create</option>
              <option value="DELETE">Delete</option>
              <option value="APPROVE">Approve</option>
              <option value="REJECT">Reject</option>
            </select>
            <select
              className={styles.selectInput}
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
            >
              <option value="">All Resource Types</option>
              <option value="publisher">Publishers</option>
              <option value="advertiser">Advertisers</option>
              <option value="offer">Offers</option>
              <option value="offer_category">Categories</option>
              <option value="payout_request">Payouts</option>
              <option value="cms_page">Landing CMS</option>
              <option value="system_announcement">Announcements</option>
              <option value="maintenance_config">Maintenance Mode</option>
              <option value="platform_settings">Settings</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading audit events...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No audit events found</div>
            <p>No actions match the selected filter criteria.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Privileged Actor</th>
                  <th>Action Code</th>
                  <th>Resource Entity</th>
                  <th>Context / Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.mono} style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                        {log.actor_name || log.actor_email || log.actor_id}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b" }} className={styles.mono}>
                        {log.actor_id}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeActive}`} style={{ fontFamily: "monospace" }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ textTransform: "capitalize" }}>{log.resource_type.replace(/_/g, " ")}</div>
                      {log.resource_id && (
                        <div style={{ fontSize: "0.72rem", color: "#38bdf8" }} className={styles.mono}>
                          {log.resource_id}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                      {log.reason || "Administrative operation"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
