import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface PlatformSettingsState {
  minPayoutDollars: string;
  defaultHoldDays: string;
  probationDailyCap: string;
  supportEmail: string;
  telegramDesk: string;
  skypeDesk: string;
  binancePayEnabled: boolean;
  smartlinksEnabled: boolean;
  autoOtpEnabled: boolean;
  riskEngineEnabled: boolean;
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettingsState>({
    minPayoutDollars: "50.00",
    defaultHoldDays: "7",
    probationDailyCap: "250",
    supportEmail: "support@trafficvaulthub.com",
    telegramDesk: "@TrafficVaultDesk",
    skypeDesk: "live:.cid.tvhsupport",
    binancePayEnabled: true,
    smartlinksEnabled: true,
    autoOtpEnabled: true,
    riskEngineEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/settings"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) {
        const d = json.data;
        setSettings({
          minPayoutDollars: d.min_payout_minor ? (d.min_payout_minor / 100).toFixed(2) : "50.00",
          defaultHoldDays: String(d.default_hold_days || "7"),
          probationDailyCap: String(d.probation_click_cap_daily || "250"),
          supportEmail: d.support_contact?.email || "support@trafficvaulthub.com",
          telegramDesk: d.support_contact?.telegram || "@TrafficVaultDesk",
          skypeDesk: d.support_contact?.skype || "live:.cid.tvhsupport",
          binancePayEnabled: d.feature_flags?.binance_pay_enabled ?? true,
          smartlinksEnabled: d.feature_flags?.smartlinks_enabled ?? true,
          autoOtpEnabled: d.feature_flags?.auto_otp_dispatch ?? true,
          riskEngineEnabled: d.feature_flags?.risk_engine_active ?? true,
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
      const payload = {
        min_payout_minor: Math.round(parseFloat(settings.minPayoutDollars || "50") * 100),
        default_hold_days: Number(settings.defaultHoldDays),
        probation_click_cap_daily: Number(settings.probationDailyCap),
        support_contact: {
          email: settings.supportEmail,
          telegram: settings.telegramDesk,
          skype: settings.skypeDesk,
        },
        feature_flags: {
          binance_pay_enabled: settings.binancePayEnabled,
          smartlinks_enabled: settings.smartlinksEnabled,
          auto_otp_dispatch: settings.autoOtpEnabled,
          risk_engine_active: settings.riskEngineEnabled,
        },
      };

      await fetch(apiUrl("/api/v1/admin/settings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      setStatusMessage("Platform parameters successfully synchronized to database.");
    } catch {
      alert("Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>System Settings &amp; Global Parameters</h1>
          <p className={styles.pageSubtitle}>
            Configure financial thresholds, reserve hold duration, feature flags, and official operations desk contact channels.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", padding: "0.85rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem" }}>
          ✓ {statusMessage}
        </div>
      )}

      <form onSubmit={handleSave} className={styles.formGrid}>
        {/* FINANCIAL & RISK DEFAULTS */}
        <div className={styles.card}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
            Network Financial &amp; Velocity Defaults
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            <div className={styles.formField}>
              <label className={styles.label}>Minimum Payout Threshold ($ USD)</label>
              <input
                type="number"
                step="0.01"
                required
                className={styles.input}
                value={settings.minPayoutDollars}
                onChange={(e) => setSettings({ ...settings, minPayoutDollars: e.target.value })}
              />
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Enforced across all withdrawal requests</span>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Default Reserve Hold Duration (Days)</label>
              <input
                type="number"
                required
                className={styles.input}
                value={settings.defaultHoldDays}
                onChange={(e) => setSettings({ ...settings, defaultHoldDays: e.target.value })}
              />
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Days before pending commission becomes payable</span>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Probation Daily Click Cap</label>
              <input
                type="number"
                required
                className={styles.input}
                value={settings.probationDailyCap}
                onChange={(e) => setSettings({ ...settings, probationDailyCap: e.target.value })}
              />
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Max daily clicks for newly onboarded publishers</span>
            </div>
          </div>
        </div>

        {/* OPERATIONS CONTACT COORDINATES */}
        <div className={styles.card}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
            Official Support &amp; Desk Coordinates
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            <div className={styles.formField}>
              <label className={styles.label}>Support Operations Email</label>
              <input
                type="email"
                required
                className={styles.input}
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Official Telegram Channel / Handle</label>
              <input
                type="text"
                required
                className={styles.input}
                value={settings.telegramDesk}
                onChange={(e) => setSettings({ ...settings, telegramDesk: e.target.value })}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Skype Live ID</label>
              <input
                type="text"
                className={styles.input}
                value={settings.skypeDesk}
                onChange={(e) => setSettings({ ...settings, skypeDesk: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* PLATFORM FEATURE SWITCHES */}
        <div className={styles.card}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
            Platform Feature Flags
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.binancePayEnabled}
                onChange={(e) => setSettings({ ...settings, binancePayEnabled: e.target.checked })}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f8fafc" }}>Binance Pay Integration</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Allow zero-fee crypto payouts via Binance ID</div>
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.smartlinksEnabled}
                onChange={(e) => setSettings({ ...settings, smartlinksEnabled: e.target.checked })}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f8fafc" }}>Smartlinks Traffic Rotator</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Enable weighted probabilistic offer distribution</div>
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.autoOtpEnabled}
                onChange={(e) => setSettings({ ...settings, autoOtpEnabled: e.target.checked })}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f8fafc" }}>Automatic Email OTP Dispatch</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Send 6-digit verification code on signup &amp; login</div>
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.riskEngineEnabled}
                onChange={(e) => setSettings({ ...settings, riskEngineEnabled: e.target.checked })}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f8fafc" }}>Anti-Scam Risk Engine</div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Automated disposable email &amp; methodology checks</div>
              </div>
            </label>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.btnPrimary} disabled={saving}>
            {saving ? "Saving Changes..." : "Save System Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
