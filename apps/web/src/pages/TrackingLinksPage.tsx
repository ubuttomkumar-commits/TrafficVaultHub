import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./TrackingLinksPage.module.css";

type OfferOption = {
  id: string;
  name: string;
  payoutType: string | null;
  currency: string | null;
  affiliateCommissionMinor: number | null;
};

type TrackingLinkRow = {
  id: string;
  code: string;
  name?: string | null;
  offer_id: string;
  status: string;
  created_at?: string;
  trackingUrl?: string;
};

export function TrackingLinksPage() {
  const [organizationId, setOrg] = useState("");
  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [name, setName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [sub1, setSub1] = useState("");
  const [sub2, setSub2] = useState("");
  const [sub3, setSub3] = useState("");
  const [links, setLinks] = useState<TrackingLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

    // Load available offers
    async function loadOffers() {
      try {
        const res = await fetch(apiUrl("/api/v1/offers?limit=50"));
        const body = await res.json();
        if (res.ok && body.data) {
          setOffers(body.data);
          if (body.data.length > 0) {
            setSelectedOfferId(body.data[0].id);
          }
        }
      } catch {
        // ignore
      }
    }
    void loadOffers();
  }, []);

  useEffect(() => {
    if (organizationId.trim()) {
      void loadLinks();
    }
  }, [organizationId]);

  async function loadLinks() {
    const token = localStorage.getItem("tvh_token");
    if (!token || !organizationId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/tracking-links?organizationId=${encodeURIComponent(organizationId.trim())}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await res.json();
      if (res.ok) {
        setLinks(body.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("tvh_token");
    if (!token) {
      setError("Sign in required to generate tracking links");
      return;
    }
    if (!selectedOfferId) {
      setError("Please select an offer");
      return;
    }
    setError(null);
    setMsg(null);
    setLoading(true);

    try {
      const payload = {
        organizationId: organizationId.trim(),
        offerId: selectedOfferId,
        name: name.trim() || undefined,
        code: customCode.trim() || undefined,
      };

      const res = await fetch(apiUrl("/api/v1/tracking-links"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
      } else {
        setMsg(`Tracking link created: ${body?.data?.code}`);
        setCustomCode("");
        setName("");
        void loadLinks();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tracking link");
    } finally {
      setLoading(false);
    }
  }

  function getConstructedUrl(code: string) {
    const params = new URLSearchParams();
    if (sub1.trim()) params.set("sub1", sub1.trim());
    if (sub2.trim()) params.set("sub2", sub2.trim());
    if (sub3.trim()) params.set("sub3", sub3.trim());
    const q = params.toString();
    const origin = window.location.origin;
    return `${origin}/api/v1/t/${code}${q ? `?${q}` : ""}`;
  }

  async function copyToClipboard(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
    }
  }

  const previewCode = customCode.trim() || "sample_code";
  const livePreviewUrl = getConstructedUrl(previewCode);

  return (
    <div className={styles.page}>
      <h1>Tracking Link Generator</h1>
      <p className="muted">
        Generate immutable publisher tracking links with deep SubID attribution telemetry.
        Every click issues an authoritative cryptographic click ID. {!localStorage.getItem("tvh_token") && <Link to="/login">Sign in</Link>}
      </p>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {msg && <div className={styles.ok} role="status">{msg}</div>}

      <div className={styles.generatorCard}>
        <h2>Create Tracking Link</h2>
        <form className={styles.form} onSubmit={(e) => void handleCreate(e)}>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="tl-org">Affiliate Organization ID</label>
              <input
                id="tl-org"
                value={organizationId}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="org_traffic_vault"
                className="mono"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="tl-offer">Target Offer</label>
              <select
                id="tl-offer"
                value={selectedOfferId}
                onChange={(e) => setSelectedOfferId(e.target.value)}
                required
              >
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.payoutType ?? "CPA"} · {o.currency ?? "USD"} {((o.affiliateCommissionMinor ?? 0) / 100).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="tl-name">Campaign Label (Optional)</label>
              <input
                id="tl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q4 Google Search Native"
                maxLength={80}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="tl-code">Vanity Code (6–32 chars, Optional)</label>
              <input
                id="tl-code"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="Auto-generated if empty"
                className="mono"
              />
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label htmlFor="tl-sub1">SubID 1 (Campaign / Source)</label>
              <input
                id="tl-sub1"
                value={sub1}
                onChange={(e) => setSub1(e.target.value)}
                placeholder="google_ads"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="tl-sub2">SubID 2 (Ad Group / Placement)</label>
              <input
                id="tl-sub2"
                value={sub2}
                onChange={(e) => setSub2(e.target.value)}
                placeholder="us_tier1_kw"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="tl-sub3">SubID 3 (Creative / Variation)</label>
              <input
                id="tl-sub3"
                value={sub3}
                onChange={(e) => setSub3(e.target.value)}
                placeholder="v2_banner"
              />
            </div>
          </div>

          <div className={styles.previewBox}>
            <span className={styles.urlText}>{livePreviewUrl}</span>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => void copyToClipboard(livePreviewUrl, "preview")}
            >
              {copiedCode === "preview" ? "Copied!" : "Copy URL"}
            </button>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Generating…" : "Generate Tracking Link"}
          </button>
        </form>
      </div>

      <div className={styles.tableSection}>
        <h2>Your Active Tracking Links</h2>
        {links.length === 0 ? (
          <p className="muted">No tracking links created yet for this organization.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Campaign Label</th>
                <th>Offer ID</th>
                <th>Status</th>
                <th>Tracking URL</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => {
                const linkUrl = link.trackingUrl || getConstructedUrl(link.code);
                return (
                  <tr key={link.id}>
                    <td className="mono"><strong>{link.code}</strong></td>
                    <td>{link.name || "—"}</td>
                    <td className="mono">{link.offer_id}</td>
                    <td><span className={styles.badgeActive}>{link.status}</span></td>
                    <td>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => void copyToClipboard(linkUrl, link.id)}
                      >
                        {copiedCode === link.id ? "Copied!" : "Copy Link"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
