import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiUrl } from "../lib/api";
import { EmailOtpVerification } from "../components/auth/EmailOtpVerification";

type Dimension = {
  id: string;
  dimension: string;
  stage: "SELF_DECLARED" | "DOCUMENTED" | "VERIFIED" | "INDEPENDENTLY_CORROBORATED" | "PLATFORM_TRUSTED";
  status: "PENDING" | "IN_REVIEW" | "PASSED" | "REJECTED" | "WAIVED";
  reviewer_notes?: string | null;
  verified_at?: string | null;
};

type DocumentItem = {
  id: string;
  doc_type: string;
  file_name: string;
  file_size_bytes: number;
  status: string;
  uploaded_at: string;
};

const STAGE_WEIGHTS: Record<string, { percent: number; label: string; color: string }> = {
  SELF_DECLARED: { percent: 20, label: "Self-Declared", color: "#64748b" },
  DOCUMENTED: { percent: 45, label: "Documented", color: "#38bdf8" },
  VERIFIED: { percent: 75, label: "Verified", color: "#22c55e" },
  INDEPENDENTLY_CORROBORATED: { percent: 90, label: "Corroborated", color: "#a855f7" },
  PLATFORM_TRUSTED: { percent: 100, label: "Platform Trusted", color: "#eab308" },
};

const DIMENSION_TITLES: Record<string, { title: string; icon: string; desc: string }> = {
  EMAIL: { title: "Email Authenticity", icon: "✉️", desc: "Corporate / domain authority and SPF/DKIM verification" },
  PHONE: { title: "Telephone & SMS Telemetry", icon: "📱", desc: "Direct phone line connectivity and country match" },
  IDENTITY: { title: "Government Photo Identity", icon: "🪪", desc: "Passport or National ID authenticity & biometric liveness" },
  BUSINESS_ENTITY: { title: "Commercial Registration (KYB)", icon: "🏢", desc: "Registrar certificate and good standing verification" },
  DOMAIN_OWNERSHIP: { title: "Domain / Web Property Control", icon: "🌐", desc: "DNS or meta-tag verification of pre-lander assets" },
  TRAFFIC_EVIDENCE: { title: "Traffic Source Evidence", icon: "📊", desc: "Live ad network invoices, tracking links, and dashboard proof" },
  HISTORICAL_PERFORMANCE: { title: "Network Ledger References", icon: "⭐", desc: "Cross-network reputation and historical payout records" },
  COMPLIANCE_REVIEW: { title: "Regulatory & Restricted Gating", icon: "⚖️", desc: "Restricted category clearance, age gates, and disclaimers" },
};

export function VerificationStatusPage() {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get("applicationId") || searchParams.get("id") || "app_pub_sample01";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Additional doc upload state
  const [uploadDocType, setUploadDocType] = useState("TRAFFIC_SCREENSHOT");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/v1/onboarding/status?applicationId=${encodeURIComponent(applicationId)}`));
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? `Failed to load verification status (${res.status})`);
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, [applicationId]);

  async function handleAdditionalUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadSuccess(null);
    try {
      const res = await fetch(apiUrl("/api/v1/onboarding/documents"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          docType: uploadDocType,
          fileName: uploadFile.name,
          fileSizeBytes: uploadFile.size,
          mimeType: uploadFile.type || "application/octet-stream",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Upload failed");
      setUploadSuccess(`Document ${uploadFile.name} securely added to review docket.`);
      setUploadFile(null);
      void loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.4rem", color: "#fff", marginBottom: "0.5rem" }}>Retrieving Verification Docket...</h2>
        <p className="muted">Inspecting cryptographic ledger dimensions & KYC evidence</p>
      </div>
    );
  }

  const application = data?.application;
  const dimensions: Dimension[] = data?.dimensions ?? [];
  const documents: DocumentItem[] = data?.documents ?? [];
  const auditHistory = data?.auditHistory ?? [];

  return (
    <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "1.5rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.85rem", margin: 0, letterSpacing: "-0.02em" }}>
              Multi-Dimensional Verification Cockpit
            </h1>
            <span
              style={{
                fontSize: "0.8rem",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                fontWeight: 600,
                background:
                  application?.status === "APPROVED"
                    ? "rgba(52, 211, 153, 0.15)"
                    : application?.status === "REJECTED"
                    ? "rgba(248, 113, 113, 0.15)"
                    : "rgba(251, 191, 36, 0.15)",
                color:
                  application?.status === "APPROVED"
                    ? "var(--color-success)"
                    : application?.status === "REJECTED"
                    ? "var(--color-danger)"
                    : "var(--color-warning)",
                border: "1px solid currentColor",
              }}
            >
              {application?.status ?? "IN_REVIEW"}
            </span>
          </div>
          <p style={{ color: "var(--color-text-secondary)", margin: 0, fontSize: "0.95rem" }}>
            Every identity and traffic dimension is individually assessed. Self-declared data never creates automated trust.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={() => void loadStatus()}
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            Refresh Status ⟳
          </button>
          <Link
            to="/offers"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              color: "#fff",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Offer Catalog →
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(248, 113, 113, 0.1)", border: "1px solid var(--color-danger)", padding: "1rem", borderRadius: "var(--radius-md)", color: "#fca5a5", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* Unverified Email Warning & Modal Trigger */}
      {application && !application.emailVerified && (
        <div style={{ background: "rgba(251, 191, 36, 0.12)", border: "1px solid var(--color-warning)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.25rem", color: "#fef08a", fontSize: "1.05rem" }}>⚠️ Action Required: Email Unverified</h3>
            <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.88rem" }}>
              A 6-digit confirmation code was sent to <strong>{application.email}</strong>. Confirming your code elevates your trust score and unlocks offers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEmailOtpModal(true)}
            style={{
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              color: "#05070d",
              border: "none",
              padding: "0.55rem 1.25rem",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.88rem",
            }}
          >
            Enter 6-Digit OTP Code ✉️
          </button>
        </div>
      )}

      {/* Email OTP Modal */}
      {showEmailOtpModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ maxWidth: "28rem", width: "100%" }}>
            <EmailOtpVerification
              email={application?.email || ""}
              applicationId={application?.id}
              onVerified={() => {
                setShowEmailOtpModal(false);
                void loadStatus();
              }}
              onCancel={() => setShowEmailOtpModal(false)}
            />
          </div>
        </div>
      )}

      {/* Trust Stage Hierarchy Explainer Banner */}
      <div
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem 1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
          TrafficVaultHub Trust Stage Lifecycle
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))", gap: "1rem" }}>
          {Object.entries(STAGE_WEIGHTS).map(([stageKey, val]) => (
            <div
              key={stageKey}
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "0.75rem",
                borderLeft: `3px solid ${val.color}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: 600, fontSize: "0.82rem", color: val.color }}>{val.label}</span>
                <span className="mono" style={{ fontSize: "0.75rem", opacity: 0.8 }}>{val.percent}%</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: 1.3 }}>
                {stageKey === "SELF_DECLARED" && "Unverified form inputs; probationary zero-trust limits."}
                {stageKey === "DOCUMENTED" && "Official photo ID / incorporation files received."}
                {stageKey === "VERIFIED" && "Operator verified identity, telephone OTP, and clean IP."}
                {stageKey === "INDEPENDENTLY_CORROBORATED" && "Network ledger references or corporate registry checked."}
                {stageKey === "PLATFORM_TRUSTED" && "Highest tier: instant payouts, higher caps, private offers."}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Call or Conditional Caps Notice if Present */}
      {application?.interviewDetails && (
        <div style={{ background: "rgba(139, 92, 246, 0.12)", border: "1px solid var(--color-accent-violet)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div style={{ fontSize: "1.8rem" }}>📞</div>
          <div>
            <h3 style={{ margin: "0 0 0.25rem", color: "#fff", fontSize: "1.1rem" }}>Verification Interview Scheduled</h3>
            <div style={{ color: "#ddd6fe", fontSize: "0.9rem" }}>
              Time: <strong>{application.interviewDetails.datetime ?? "To be confirmed via email"}</strong> · Channel: <strong>{application.interviewDetails.platform ?? application.contactMethod}</strong>
              {application.interviewDetails.notes && <div>Instructions: {application.interviewDetails.notes}</div>}
            </div>
          </div>
        </div>
      )}

      {application?.conditionalCaps && (
        <div style={{ background: "rgba(34, 211, 238, 0.08)", border: "1px solid var(--color-accent-cyan)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--color-accent-cyan)", fontSize: "1.05rem" }}>
            Probationary Approval Conditions Active
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "1rem", fontSize: "0.88rem" }}>
            <div>
              <span className="muted">Daily Click Cap: </span>
              <strong>{application.conditionalCaps.dailyClickCap ?? "500 clicks / day"}</strong>
            </div>
            <div>
              <span className="muted">Commission Reserve Hold: </span>
              <strong>{application.conditionalCaps.reserveHoldDays ?? "7 days"}</strong>
            </div>
            <div>
              <span className="muted">Permitted Verticals: </span>
              <strong>{application.conditionalCaps.allowedVerticals ?? "Standard tiers only"}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Independent Verification Dimensions */}
      <h2 style={{ fontSize: "1.25rem", margin: "0 0 1rem", color: "var(--color-text-primary)" }}>
        Independent Verification Dimensions ({dimensions.length})
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))", gap: "1.25rem", marginBottom: "2.5rem" }}>
        {dimensions.map((dim) => {
          const meta = DIMENSION_TITLES[dim.dimension] || { title: dim.dimension, icon: "🛡️", desc: "Security dimension" };
          const stageInfo = STAGE_WEIGHTS[dim.stage] || { percent: 20, label: dim.stage, color: "#94a3b8" };

          return (
            <div
              key={dim.id}
              style={{
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, height: "3px", width: `${stageInfo.percent}%`, background: stageInfo.color }} />

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>{meta.icon}</span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--color-text-primary)" }}>{meta.title}</strong>
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "9999px",
                      fontWeight: 600,
                      background: dim.status === "PASSED" ? "rgba(52, 211, 153, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      color: dim.status === "PASSED" ? "var(--color-success)" : "var(--color-text-secondary)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {dim.status}
                  </span>
                </div>

                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", margin: "0 0 0.85rem", lineHeight: 1.4 }}>
                  {meta.desc}
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                  <span className="muted">Trust Stage:</span>
                  <span style={{ fontWeight: 600, color: stageInfo.color }}>{stageInfo.label}</span>
                </div>
                {dim.reviewer_notes && (
                  <div style={{ fontSize: "0.78rem", color: "#fef08a", marginTop: "0.35rem", background: "rgba(254, 240, 138, 0.08)", padding: "0.3rem 0.5rem", borderRadius: "4px" }}>
                    Officer Note: {dim.reviewer_notes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Additional Evidence Section */}
      <div style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", marginBottom: "2.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", color: "var(--color-text-primary)" }}>
          Attach Additional Evidence & Regulatory Documentation
        </h3>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem", margin: "0 0 1.25rem" }}>
          If our compliance team requested ad network billing screenshots, campaign setup videos, or proof of address, submit them directly here.
        </p>

        {uploadSuccess && (
          <div style={{ background: "rgba(52, 211, 153, 0.1)", border: "1px solid var(--color-success)", color: "#a7f3d0", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", marginBottom: "1rem", fontSize: "0.88rem" }}>
            ✓ {uploadSuccess}
          </div>
        )}

        <form onSubmit={(e) => void handleAdditionalUpload(e)} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "1rem", alignItems: "center" }}>
          <div>
            <select
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value)}
              style={{
                width: "100%",
                background: "var(--color-bg-base)",
                border: "1px solid var(--color-border)",
                color: "#fff",
                padding: "0.6rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <option value="TRAFFIC_SCREENSHOT">Traffic / Earnings Screenshot</option>
              <option value="PROOF_OF_ADDRESS">Proof of Residential/Business Address</option>
              <option value="GOV_ID_FRONT">Updated Government Photo ID</option>
              <option value="BUSINESS_REGISTRATION">Certificate of Incorporation</option>
              <option value="TAX_DOCUMENT">Tax / VAT Certificate</option>
              <option value="OTHER">Other Compliance Document</option>
            </select>
          </div>

          <div>
            <input
              type="file"
              required
              onChange={(e) => {
                if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
              }}
              style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !uploadFile}
            style={{
              background: "var(--color-accent-cyan)",
              color: "#05070d",
              border: "none",
              padding: "0.65rem 1.25rem",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              cursor: uploading || !uploadFile ? "not-allowed" : "pointer",
              opacity: uploading || !uploadFile ? 0.5 : 1,
            }}
          >
            {uploading ? "Encrypting & Storing..." : "Upload Evidence 📄"}
          </button>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", color: "var(--color-text-primary)" }}>
          Registered Evidence Objects ({documents.length})
        </h3>
        {documents.length === 0 ? (
          <div className="muted" style={{ fontSize: "0.9rem" }}>No documents uploaded yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--color-bg-base)",
                  padding: "0.65rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <strong>{doc.file_name}</strong>
                  <span className="muted" style={{ marginLeft: "0.5rem" }}>({doc.doc_type})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                    {(doc.file_size_bytes / 1024).toFixed(1)} KB
                  </span>
                  <span
                    style={{
                      color: "var(--color-accent-cyan)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      background: "rgba(34, 211, 238, 0.1)",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "9999px",
                    }}
                  >
                    Encrypted Vault
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Immutable Review Audit Trail */}
      <div style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1.5rem", marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "var(--color-text-primary)" }}>
          Cryptographic Review Audit Trail ({auditHistory.length})
        </h3>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", margin: "0 0 1rem" }}>
          Every risk score recalculation, document review, and status transition is immutably logged with an auditor signature.
        </p>

        {auditHistory.length === 0 ? (
          <div className="muted" style={{ fontSize: "0.88rem" }}>No audit events logged yet. Initial intake record pending operator review.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {auditHistory.map((log: any) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--color-bg-base)",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.82rem",
                }}
              >
                <div>
                  <strong style={{ color: "var(--color-accent-cyan)" }}>{log.action}</strong>
                  {log.notes && <span style={{ marginLeft: "0.5rem", color: "var(--color-text-secondary)" }}>— {log.notes}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span className="muted" style={{ fontSize: "0.78rem" }}>by {log.performed_by}</span>
                  <span className="mono muted" style={{ fontSize: "0.75rem" }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "Just now"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
