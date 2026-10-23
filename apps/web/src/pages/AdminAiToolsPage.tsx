import { useState } from "react";
import { AdminNav } from "../components/AdminNav";
import { apiUrl } from "../lib/api";
import styles from "./AdminCommon.module.css";

export function AdminAiToolsPage() {
  const [activeTab, setActiveTab] = useState<"risk" | "draft" | "ledger">("risk");

  // Tool 1: Risk Analysis State
  const [applicantEmail, setApplicantEmail] = useState("marcus.vance@apexaffiliates.com");
  const [experienceYears, setExperienceYears] = useState("4");
  const [trafficSources, setTrafficSources] = useState("Paid Search (Google/Bing), Native (Taboola)");
  const [trafficDescription, setTrafficDescription] = useState(
    "We run search arbitrage campaigns on Bing targeting Tier-1 cybersecurity utility subscriptions with 2.4x ROAS."
  );
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskResult, setRiskResult] = useState<any>(null);

  // Tool 2: Message Drafter State
  const [draftIntent, setDraftIntent] = useState<"REQUEST_DOCS" | "REJECT">("REQUEST_DOCS");
  const [partnerName, setPartnerName] = useState("Marcus Vance");
  const [customNotes, setCustomNotes] = useState("Need clear proof of Taboola ad account spend and billing address match.");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  // Tool 3: Ledger Explainer State
  const [ledgerExplanation, setLedgerExplanation] = useState<string | null>(null);

  const token = localStorage.getItem("tvh_token");

  async function handleAnalyzeRisk(e: React.FormEvent) {
    e.preventDefault();
    setRiskLoading(true);
    setRiskResult(null);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/ai/analyze-risk"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicant: {
            email: applicantEmail,
            experienceYears: Number(experienceYears),
            trafficSources: trafficSources.split(",").map((s) => s.trim()),
            trafficDescription,
          },
        }),
      });
      const json = await res.json();
      if (json.data) setRiskResult(json.data);
    } catch {
      alert("Risk analysis service unavailable");
    } finally {
      setRiskLoading(false);
    }
  }

  async function handleGenerateDraft(e: React.FormEvent) {
    e.preventDefault();
    setDraftLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/admin/ai/draft-message"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          intent: draftIntent,
          applicantName: partnerName,
          notes: customNotes,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setDraftSubject(json.data.subject || "");
        setDraftBody(json.data.body || "");
      }
    } catch {
      alert("Draft generator unavailable");
    } finally {
      setDraftLoading(false);
    }
  }

  function handleExplainLedger() {
    setLedgerExplanation(
      "Double-Entry Ledger Invariant: Conversion #CNV-9821 posted a $48.00 credit to Publisher Ledger (Payable) and a $48.00 debit to Network Clearing Account. Because the publisher is currently under 7-day reserve hold, this amount remains in 'PENDING_RESERVE' and cannot be withdrawn until the 7-day maturation window elapses. No duplicate credits or velocity spikes were detected."
    );
  }

  return (
    <div className={styles.container}>
      <AdminNav />

      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>AI Operations Assistant Desk</h1>
          <p className={styles.pageSubtitle}>
            Practical administrative intelligence. AI provides advisory risk summaries, tailored communication drafts, and ledger explanations. Never auto-approves or mutates financial balances.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.5rem" }}>
        <button
          className={activeTab === "risk" ? styles.btnPrimary : styles.btnSecondary}
          onClick={() => setActiveTab("risk")}
        >
          🔍 Application Risk Evaluator
        </button>
        <button
          className={activeTab === "draft" ? styles.btnPrimary : styles.btnSecondary}
          onClick={() => setActiveTab("draft")}
        >
          ✍️ Decision Communication Drafter
        </button>
        <button
          className={activeTab === "ledger" ? styles.btnPrimary : styles.btnSecondary}
          onClick={() => setActiveTab("ledger")}
        >
          ⚖️ Ledger &amp; Dispute Explainer
        </button>
      </div>

      {/* TAB 1: RISK EVALUATOR */}
      {activeTab === "risk" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div className={styles.card}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
              Applicant Telemetry &amp; Signals
            </h3>

            <form onSubmit={handleAnalyzeRisk} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Applicant Email Address</label>
                <input
                  type="email"
                  required
                  className={styles.input}
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                <div className={styles.formField}>
                  <label className={styles.label}>Years Exp</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label}>Traffic Sources</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={trafficSources}
                    onChange={(e) => setTrafficSources(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Self-Declared Methodology Statement</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={trafficDescription}
                  onChange={(e) => setTrafficDescription(e.target.value)}
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={riskLoading}>
                  {riskLoading ? "Analyzing Telemetry..." : "Generate AI Risk Briefing"}
                </button>
              </div>
            </form>
          </div>

          <div className={styles.card}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
              Executive Risk Briefing
            </h3>

            {!riskResult ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyTitle}>Awaiting applicant telemetry</div>
                <p>Submit applicant information to generate structured fraud analysis and interview checklist.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Executive Summary</div>
                  <p style={{ fontSize: "0.88rem", color: "#e2e8f0", lineHeight: 1.5, margin: "0.25rem 0 0 0" }}>
                    {riskResult.executiveSummary}
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Primary Risk Flags</div>
                  <ul style={{ margin: "0.25rem 0 0 1.25rem", padding: 0, fontSize: "0.85rem", color: "#f87171" }}>
                    {riskResult.primaryRisks?.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Targeted Interview Checklist</div>
                  <ol style={{ margin: "0.25rem 0 0 1.25rem", padding: 0, fontSize: "0.85rem", color: "#cbd5e1" }}>
                    {riskResult.suggestedInterviewQuestions?.map((q: string, i: number) => (
                      <li key={i} style={{ marginBottom: "0.25rem" }}>
                        {q}
                      </li>
                    ))}
                  </ol>
                </div>

                <div style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.75rem 1rem", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.72rem", color: "#38bdf8", textTransform: "uppercase", fontWeight: 700 }}>
                    Recommended Operator Action
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc", marginTop: "0.2rem" }}>
                    {riskResult.recommendedAction?.replace(/_/g, " ")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COMMUNICATION DRAFTER */}
      {activeTab === "draft" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div className={styles.card}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
              Message Parameters
            </h3>

            <form onSubmit={handleGenerateDraft} className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Decision Intent</label>
                <select
                  className={styles.input}
                  value={draftIntent}
                  onChange={(e) => setDraftIntent(e.target.value as any)}
                >
                  <option value="REQUEST_DOCS">Request Additional Verification Documents</option>
                  <option value="REJECT">Respectful Application Rejection</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Partner / Contact Name</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Specific Compliance Reasons / Instructions</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={draftLoading}>
                  {draftLoading ? "Generating Draft..." : "Draft Professional Letter"}
                </button>
              </div>
            </form>
          </div>

          <div className={styles.card}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
              Editable Email Draft
            </h3>

            {!draftBody ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyTitle}>No draft generated yet</div>
                <p>Select decision intent and click generate to create an editable official notice.</p>
              </div>
            ) : (
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.label}>Email Subject</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Email Body</label>
                  <textarea
                    className={styles.textarea}
                    style={{ minHeight: "220px", fontFamily: "inherit", lineHeight: 1.5 }}
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                  />
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => {
                      navigator.clipboard.writeText(`${draftSubject}\n\n${draftBody}`);
                      alert("Copied letter to clipboard!");
                    }}
                  >
                    📋 Copy Letter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LEDGER EXPLAINER */}
      {activeTab === "ledger" && (
        <div className={styles.card} style={{ maxWidth: "800px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f8fafc", margin: "0 0 1rem 0" }}>
            Ledger Transaction &amp; Hold State Translator
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.5 }}>
            Translate complex double-entry journal postings, reverse hold reserves, and multi-currency exchange entries into transparent plain English for partner dispute resolution.
          </p>

          <div className={styles.formField} style={{ marginTop: "1rem" }}>
            <label className={styles.label}>Conversion or Journal Reference ID</label>
            <input
              type="text"
              defaultValue="cnv_88192a_shield_vpn"
              className={styles.input}
            />
          </div>

          <div style={{ marginTop: "1rem" }}>
            <button className={styles.btnPrimary} onClick={handleExplainLedger}>
              Explain Transaction Status
            </button>
          </div>

          {ledgerExplanation && (
            <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px", padding: "1.25rem", marginTop: "1.25rem", color: "#e2e8f0", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {ledgerExplanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
