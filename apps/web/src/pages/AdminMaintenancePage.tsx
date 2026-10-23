import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface MaintenanceConfig {
  isEnabled: boolean;
  headline: string;
  message: string;
  estimatedDuration: string;
  allowAdminBypass: boolean;
  allowedIps?: string;
  updatedAt?: string;
}

export function AdminMaintenancePage() {
  const [config, setConfig] = useState<MaintenanceConfig>({
    isEnabled: false,
    headline: "Scheduled System Maintenance",
    message: "TrafficVaultHub is performing scheduled network synchronization and ledger upgrades. All click tracking redirects and postbacks continue without interruption.",
    estimatedDuration: "30 minutes",
    allowAdminBypass: true,
    allowedIps: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchMaintenance();
  }, []);

  async function fetchMaintenance() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/maintenance"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) {
        setConfig({
          isEnabled: Boolean(json.data.is_enabled ?? json.data.isEnabled),
          headline: json.data.headline || config.headline,
          message: json.data.message || config.message,
          estimatedDuration: json.data.estimated_duration || json.data.estimatedDuration || config.estimatedDuration,
          allowAdminBypass: Boolean(json.data.allow_admin_bypass ?? json.data.allowAdminBypass ?? true),
          allowedIps: json.data.allowed_ips || json.data.allowedIps || "",
        });
      }
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      await fetch(apiUrl("/api/v1/admin/maintenance"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      setStatusMessage(
        config.isEnabled
          ? "⚠️ MAINTENANCE MODE IS NOW LIVE. Public visitors will see the maintenance gate."
          : "✓ MAINTENANCE MODE DEACTIVATED. Public network traffic and portal restored."
      );
    } catch {
      alert("Failed to update maintenance settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <AdminNav maintenanceActive={config.isEnabled} />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Maintenance Mode Control Center</h1>
          <p className={styles.pageSubtitle}>
            Emergency isolation and scheduled ledger maintenance kill-switch. When enabled, public portal routes display an obsidian maintenance shield.
          </p>
          {loading && <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>Loading configuration...</p>}
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            background: config.isEnabled ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
            border: `1px solid ${config.isEnabled ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
            color: config.isEnabled ? "#f87171" : "#34d399",
            padding: "0.85rem 1.25rem",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {statusMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }}>
        {/* SETTINGS FORM */}
        <div className={styles.card}>
          <form onSubmit={handleSave} className={styles.formGrid}>
            <div style={{ padding: "1rem", background: "rgba(15, 23, 42, 0.7)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: config.isEnabled ? "#f87171" : "#34d399" }}>
                  Status: {config.isEnabled ? "ACTIVE (Public Gated)" : "DEACTIVATED (Normal Operation)"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                  Toggle to switch network mode. Admin console remains accessible.
                </div>
              </div>
              <button
                type="button"
                className={config.isEnabled ? styles.btnPrimary : styles.btnDanger}
                onClick={() => setConfig({ ...config, isEnabled: !config.isEnabled })}
              >
                {config.isEnabled ? "Turn Off Maintenance" : "Activate Maintenance Mode"}
              </button>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Maintenance Headline</label>
              <input
                type="text"
                required
                className={styles.input}
                value={config.headline}
                onChange={(e) => setConfig({ ...config, headline: e.target.value })}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Public Explanation Message</label>
              <textarea
                required
                className={styles.textarea}
                value={config.message}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className={styles.formField}>
                <label className={styles.label}>Estimated Duration Notice</label>
                <input
                  type="text"
                  className={styles.input}
                  value={config.estimatedDuration}
                  onChange={(e) => setConfig({ ...config, estimatedDuration: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Platform Operator Bypass</label>
                <select
                  className={styles.input}
                  value={config.allowAdminBypass ? "1" : "0"}
                  onChange={(e) => setConfig({ ...config, allowAdminBypass: e.target.value === "1" })}
                >
                  <option value="1">Enabled — Logged-in operators bypass gate</option>
                  <option value="0">Disabled — Lock all sessions</option>
                </select>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Allowed IP Whitelist (Optional, comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. 192.168.1.1, 10.0.0.1"
                className={styles.input}
                value={config.allowedIps}
                onChange={(e) => setConfig({ ...config, allowedIps: e.target.value })}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>
                {saving ? "Saving Changes..." : "Commit Maintenance Configuration"}
              </button>
            </div>
          </form>
        </div>

        {/* LIVE PREVIEW OF MAINTENANCE SCREEN */}
        <div className={styles.card}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
            Live Visitor Preview
          </h3>
          <div
            style={{
              background: "#05070d",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              padding: "2rem 1.25rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🛡️</div>
            <h4 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 0.5rem 0" }}>
              {config.headline}
            </h4>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 1rem 0" }}>
              {config.message}
            </p>
            <div style={{ display: "inline-block", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "0.35rem 0.75rem", borderRadius: "4px", fontSize: "0.75rem", color: "#38bdf8" }} className={styles.mono}>
              Estimated Duration: {config.estimatedDuration}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "1rem" }}>
              All authoritative click tracking and S2S postbacks continue without loss.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
