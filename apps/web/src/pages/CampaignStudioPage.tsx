import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./CampaignStudioPage.module.css";

export function CampaignStudioPage() {
  const [organizationId, setOrg] = useState("");
  const [name, setName] = useState("");
  const [payoutType, setPayoutType] = useState("CPA");
  const [currency, setCurrency] = useState("USD");
  const [affiliateCommissionMajor, setAffiliateCommissionMajor] = useState("15.00");
  const [advertiserPayoutMajor, setAdvertiserPayoutMajor] = useState("20.00");
  const [conversionEvent, setConversionEvent] = useState("sale");
  const [destinationUrl, setDestinationUrl] = useState("https://example.com/lander?click_id={click_id}");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("tvh_user");
    if (u) {
      try {
        const parsed = JSON.parse(u);
        if (parsed.organizationId) setOrg(parsed.organizationId);
      } catch {
        // ignore
      }
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("tvh_token");
    if (!token) {
      setError("Sign in required to create campaign offers");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);

    const affMinor = Math.round((parseFloat(affiliateCommissionMajor) || 0) * 100);
    const advMinor = Math.round((parseFloat(advertiserPayoutMajor) || 0) * 100);

    try {
      const res = await fetch(apiUrl("/api/v1/offers"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organizationId.trim(),
          name: name.trim(),
          payoutType,
          currency,
          affiliateCommissionMinor: affMinor,
          advertiserPayoutMinor: advMinor,
          conversionEvent,
          destinationUrl: destinationUrl.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
      } else {
        const id = body?.data?.offerId ?? body?.data?.id ?? "ok";
        setMsg(`DRAFT offer created successfully: ${id}. Pending compliance review before LIVE activation.`);
        setName("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign offer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1>Campaign Launch Studio</h1>
      <p className="muted">
        Configure advertiser offers with versioned payout models, tracking macros, and server-side validation.
        Creates immutable DRAFT records. {!localStorage.getItem("tvh_token") && <Link to="/login">Sign in first</Link>}
      </p>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {msg && (
        <div className={styles.ok} role="status">
          {msg}
        </div>
      )}

      <form className={styles.form} onSubmit={(e) => void submit(e)}>
        <div className={styles.field}>
          <label htmlFor="cs-org">Organization ID</label>
          <input
            id="cs-org"
            value={organizationId}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="e.g. org_advertiser_alpha"
            className="mono"
            required
          />
          <span className={styles.helpText}>Tenant identifier for advertiser accounting and billing.</span>
        </div>

        <div className={styles.field}>
          <label htmlFor="cs-name">Offer Campaign Name</label>
          <input
            id="cs-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ShieldGuard Security Pro 2026"
            required
            maxLength={120}
          />
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="cs-payout">Payout Model</label>
            <select
              id="cs-payout"
              value={payoutType}
              onChange={(e) => setPayoutType(e.target.value)}
            >
              <option value="CPA">CPA — Cost Per Action / Sale</option>
              <option value="CPL">CPL — Cost Per Lead</option>
              <option value="CPC">CPC — Cost Per Click</option>
              <option value="CPI">CPI — Cost Per Install</option>
              <option value="CPM">CPM — Cost Per Mille (1,000 Impressions)</option>
              <option value="CPS">CPS — Cost Per Subscription</option>
              <option value="CPV">CPV — Cost Per View (Video / Lander)</option>
              <option value="CPE">CPE — Cost Per Engagement</option>
              <option value="RECURRING">RECURRING — Recurring Rebill / Subscription</option>
              <option value="REVSHARE">REVSHARE — Revenue Share %</option>
              <option value="HYBRID">HYBRID — Hybrid Base + Performance</option>
              <option value="CUSTOM_EVENT">CUSTOM_EVENT — Custom Milestone Event</option>
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="cs-currency">Billing Currency</label>
            <select
              id="cs-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USDT">USDT (Tether)</option>
            </select>
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="cs-comm">Affiliate Commission ({currency})</label>
            <input
              id="cs-comm"
              type="number"
              step="0.01"
              min="0.01"
              value={affiliateCommissionMajor}
              onChange={(e) => setAffiliateCommissionMajor(e.target.value)}
              required
            />
            <span className={styles.helpText}>Payable to verified publishers per approved event.</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="cs-adv">Advertiser Cost / Payout ({currency})</label>
            <input
              id="cs-adv"
              type="number"
              step="0.01"
              min="0.01"
              value={advertiserPayoutMajor}
              onChange={(e) => setAdvertiserPayoutMajor(e.target.value)}
              required
            />
            <span className={styles.helpText}>Billed to advertiser ledger (includes network margin).</span>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="cs-event">Conversion Event Name</label>
          <input
            id="cs-event"
            value={conversionEvent}
            onChange={(e) => setConversionEvent(e.target.value)}
            placeholder="sale, lead, trial_signup, install"
            required
          />
          <span className={styles.helpText}>Must match S2S postback event param for attribution validation.</span>
        </div>

        <div className={styles.field}>
          <label htmlFor="cs-dest">Destination Landing URL</label>
          <input
            id="cs-dest"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://example.com/lander?click_id={click_id}"
            required
          />
          <span className={styles.helpText}>
            Supported macro: <span className={styles.macroPill}>{"{click_id}"}</span> — replaced with unique tracking click ID.
          </span>
        </div>

        <div className={styles.readinessBox}>
          <div className={styles.readinessTitle}>Offer Launch Readiness Checklist</div>
          <ul className={styles.readinessList}>
            <li>Zero float drift: values converted to minor integer units automatically</li>
            <li>S2S postback HMAC token generated upon version approval</li>
            <li>Restricted categories auto-routed to compliance review queue</li>
          </ul>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={busy}>
          {busy ? "Submitting to studio…" : "Create DRAFT offer"}
        </button>
      </form>
    </div>
  );
}
