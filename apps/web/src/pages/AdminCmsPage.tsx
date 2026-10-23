import { useEffect, useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

interface CmsContent {
  siteName: string;
  tagline: string;
  logoUrl?: string;
  heroHeadline: string;
  heroSubheadline: string;
  ctaPrimaryText: string;
  ctaPrimaryLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
  supportEmail: string;
  telegramHandle: string;
  minPayoutDisplay: string;
  seoTitle: string;
  seoDescription: string;
  version?: number;
  publishedAt?: string;
}

export function AdminCmsPage() {
  const [content, setContent] = useState<CmsContent>({
    siteName: "TrafficVaultHub",
    tagline: "The CPA Network That Shows Its Work",
    logoUrl: "",
    heroHeadline: "The CPA Network That Shows Its Work",
    heroSubheadline: "Universal CPA affiliate network built on double-entry accounting and cryptographic proof. Every click accounted for. Every decision explained. Every valid payout tracked.",
    ctaPrimaryText: "Explore Live Offers",
    ctaPrimaryLink: "/offers",
    ctaSecondaryText: "Partner Verification",
    ctaSecondaryLink: "/signup",
    supportEmail: "support@trafficvaulthub.com",
    telegramHandle: "@TrafficVaultDesk",
    minPayoutDisplay: "$50 Minimum",
    seoTitle: "TrafficVaultHub — Universal CPA Network",
    seoDescription: "Publishers track and protect every valid conversion. Advertisers control quality, fraud risk, and campaign spend.",
  });

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [revisions, setRevisions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const token = localStorage.getItem("tvh_token");

  useEffect(() => {
    fetchCms();
  }, []);

  async function fetchCms() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/cms/landing"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) {
        if (json.data.draft) {
          setContent(json.data.draft);
        } else if (json.data.published) {
          setContent(json.data.published);
        }
        if (json.data.revisions) {
          setRevisions(json.data.revisions);
        }
      }
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    setStatusMessage(null);
    try {
      await fetch(apiUrl("/api/v1/admin/cms/landing/draft"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(content),
      });
      setStatusMessage("Draft saved successfully to private staging.");
    } catch {
      alert("Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setStatusMessage(null);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/cms/landing/publish"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          changeSummary: changeSummary || "Production content update",
        }),
      });
      const json = await res.json();
      if (json.data?.version) {
        setStatusMessage(`Version ${json.data.version} successfully published live! Immediate effect across all visitors.`);
        fetchCms();
      }
    } catch {
      alert("Failed to publish content");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>Landing Page CMS &amp; Brand Control</h1>
          <p className={styles.pageSubtitle}>
            Update copy, call-to-actions, brand identity, and metadata live without requiring a codebase deployment.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={() => setShowPreview(true)}>
            👁 Preview View
          </button>
          <button className={styles.btnSecondary} onClick={handleSaveDraft} disabled={savingDraft}>
            {savingDraft ? "Saving..." : "Save Private Draft"}
          </button>
          <button className={styles.btnPrimary} onClick={handlePublish} disabled={publishing}>
            {publishing ? "Publishing..." : "Publish to Live"}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", padding: "0.85rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem" }}>
          ✓ {statusMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        {/* EDIT FORM */}
        <div className={styles.card}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1.25rem 0" }}>
            Landing Page Core Content &amp; Hero Setup
          </h3>

          <div className={styles.formGrid}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className={styles.formField}>
                <label className={styles.label}>Network Brand Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.siteName}
                  onChange={(e) => setContent({ ...content, siteName: e.target.value })}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Official Tagline</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.tagline}
                  onChange={(e) => setContent({ ...content, tagline: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Custom Brand Logo URL (Optional)</label>
              <input
                type="text"
                placeholder="https://... or data:image/svg+xml;base64,... (leave empty for default obsidian vault logo)"
                className={styles.input}
                value={content.logoUrl || ""}
                onChange={(e) => setContent({ ...content, logoUrl: e.target.value })}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Hero Display Headline</label>
              <input
                type="text"
                className={styles.input}
                value={content.heroHeadline}
                onChange={(e) => setContent({ ...content, heroHeadline: e.target.value })}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Hero Sub-headline / Value Proposition</label>
              <textarea
                className={styles.textarea}
                value={content.heroSubheadline}
                onChange={(e) => setContent({ ...content, heroSubheadline: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className={styles.formField}>
                <label className={styles.label}>Primary Action CTA Label</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.ctaPrimaryText}
                  onChange={(e) => setContent({ ...content, ctaPrimaryText: e.target.value })}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Primary Action Target URL</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.ctaPrimaryLink}
                  onChange={(e) => setContent({ ...content, ctaPrimaryLink: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className={styles.formField}>
                <label className={styles.label}>Secondary CTA Label</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.ctaSecondaryText}
                  onChange={(e) => setContent({ ...content, ctaSecondaryText: e.target.value })}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Secondary CTA Target URL</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.ctaSecondaryLink}
                  onChange={(e) => setContent({ ...content, ctaSecondaryLink: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div className={styles.formField}>
                <label className={styles.label}>Support Email</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.supportEmail}
                  onChange={(e) => setContent({ ...content, supportEmail: e.target.value })}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Telegram Desk</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.telegramHandle}
                  onChange={(e) => setContent({ ...content, telegramHandle: e.target.value })}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Minimum Payout Badge</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.minPayoutDisplay}
                  onChange={(e) => setContent({ ...content, minPayoutDisplay: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Change Summary Note (Logged to Audit History)</label>
              <input
                type="text"
                placeholder="e.g. Updated spring campaign hero CTA and minimum threshold"
                className={styles.input}
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SIDEBAR: REVISIONS & SEO */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className={styles.card}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
              SEO &amp; OpenGraph Settings
            </h3>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Meta Title</label>
                <input
                  type="text"
                  className={styles.input}
                  value={content.seoTitle}
                  onChange={(e) => setContent({ ...content, seoTitle: e.target.value })}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Meta Description</label>
                <textarea
                  className={styles.textarea}
                  value={content.seoDescription}
                  onChange={(e) => setContent({ ...content, seoDescription: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
              Immutable Change History
            </h3>
            {revisions.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#64748b" }}>Initial version published.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {revisions.map((rev) => (
                  <div key={rev.id || rev.revision_num} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 600, color: "#38bdf8" }}>
                      <span>Version {rev.revision_num}</span>
                      <span style={{ color: "#64748b", fontSize: "0.72rem" }}>
                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#cbd5e1", marginTop: "0.2rem" }}>
                      {rev.change_summary || "Published release"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INTERACTIVE PREVIEW MODAL */}
      {showPreview && (
        <div className={styles.modalBackdrop} onClick={() => setShowPreview(false)}>
          <div className={styles.modalBox} style={{ maxWidth: "800px" }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Live Preview: Homepage Hero</h3>
              <button className={styles.closeBtn} onClick={() => setShowPreview(false)}>
                ✕
              </button>
            </div>

            <div style={{ background: "#05070d", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "10px", padding: "2.5rem 1.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                {content.siteName} · {content.minPayoutDisplay}
              </div>
              <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 1rem 0", lineHeight: 1.15 }}>
                {content.heroHeadline}
              </h1>
              <p style={{ fontSize: "1rem", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 1.75rem auto", lineHeight: 1.6 }}>
                {content.heroSubheadline}
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                <span className={styles.btnPrimary}>{content.ctaPrimaryText}</span>
                <span className={styles.btnSecondary}>{content.ctaSecondaryText}</span>
              </div>
            </div>

            <div className={styles.formActions}>
              <button className={styles.btnPrimary} onClick={() => setShowPreview(false)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
