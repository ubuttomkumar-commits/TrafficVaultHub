import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";

type ApplicationItem = {
  id: string;
  account_type: "PUBLISHER" | "ADVERTISER";
  sub_type: string;
  status: string;
  email: string;
  phone: string;
  contact_method: string;
  contact_handle: string;
  first_name: string;
  last_name: string;
  company_name?: string | null;
  country: string;
  risk_score: number;
  risk_flags?: string[] | string;
  traffic_sources?: string;
  created_at: string;
};

type AppDetail = {
  application: any;
  dimensions: any[];
  documents: any[];
  auditHistory: any[];
};

export function AdminApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Inspection modal
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AppDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Decision Modal
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<"APPROVE" | "PROBATIONARY_APPROVE" | "REJECT" | "REQUEST_DOCS" | "SCHEDULE_CALL" | "ESCALATE">("APPROVE");
  const [decisionReasonCode, setDecisionReasonCode] = useState("KYC_VERIFIED");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [probationaryCap, setProbationaryCap] = useState("500");
  const [reserveDays, setReserveDays] = useState("7");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewPlatform, setInterviewPlatform] = useState("Telegram Video Call");
  const [requestDocType, setRequestDocType] = useState("PROOF_OF_ADDRESS");
  const [deciding, setDeciding] = useState(false);
  const [decisionMsg, setDecisionMsg] = useState<string | null>(null);

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/onboarding/admin/applications?status=${statusFilter}&accountType=${typeFilter}`)
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load queue");
      setApplications(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, [statusFilter, typeFilter]);

  async function openDetail(id: string) {
    setSelectedAppId(id);
    setLoadingDetail(true);
    setDetail(null);
    setDecisionMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/v1/onboarding/admin/applications/${id}`));
      const json = await res.json();
      if (res.ok) {
        setDetail(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleExecuteDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAppId) return;
    setDeciding(true);
    try {
      const payload: any = {
        decision: decisionType,
        reasonCode: decisionReasonCode,
        notes: decisionNotes,
      };

      if (decisionType === "PROBATIONARY_APPROVE") {
        payload.conditionalCaps = {
          dailyClickCap: `${probationaryCap} clicks / day`,
          reserveHoldDays: `${reserveDays} days reserve hold`,
          allowedVerticals: "Standard categories only (Restricted gated)",
        };
      } else if (decisionType === "SCHEDULE_CALL") {
        payload.interviewDetails = {
          datetime: interviewDate || "Scheduled for next business day",
          platform: interviewPlatform,
          notes: decisionNotes || "Mandatory identity & traffic methodology verification interview",
        };
      } else if (decisionType === "REQUEST_DOCS") {
        payload.notes = `Please upload ${requestDocType}: ${decisionNotes}`;
      }

      const res = await fetch(apiUrl(`/api/v1/onboarding/admin/applications/${selectedAppId}/decision`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Decision failed");

      setDecisionMsg(`Decision executed: ${json.data?.status}`);
      setShowDecisionModal(false);
      void loadApplications();
      void openDetail(selectedAppId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error executing decision");
    } finally {
      setDeciding(false);
    }
  }

  return (
    <div style={{ maxWidth: "75rem", margin: "0 auto", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem" }}>⚖️</span>
            <h1 style={{ fontSize: "1.75rem", margin: 0, letterSpacing: "-0.02em" }}>
              Partner KYC / KYB Onboarding Review Queue
            </h1>
          </div>
          <p style={{ color: "var(--color-text-secondary)", margin: "0.25rem 0 0", fontSize: "0.92rem" }}>
            Anti-Scammer Verification Cockpit. Zero auto-approvals. Multi-dimensional evidence & risk telemetry inspection.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            to="/admin"
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            ← Admin Dashboard
          </Link>
          <button
            type="button"
            onClick={() => void loadApplications()}
            style={{
              background: "var(--color-accent-cyan)",
              color: "#05070d",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Refresh Queue ⟳
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Account Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.45rem 0.75rem", borderRadius: "4px" }}
          >
            <option value="ALL">All Account Types</option>
            <option value="PUBLISHER">Publishers / Affiliates</option>
            <option value="ADVERTISER">Advertisers / Brands</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.45rem 0.75rem", borderRadius: "4px" }}
          >
            <option value="ALL">All Review Statuses</option>
            <option value="PENDING_REVIEW">Pending Initial Review</option>
            <option value="DOCS_REQUESTED">Additional Docs Requested</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="PROBATIONARY_APPROVED">Probationary Approved</option>
            <option value="APPROVED">Fully Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
          Showing <strong>{applications.length}</strong> applications
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(248, 113, 113, 0.1)", border: "1px solid var(--color-danger)", padding: "1rem", borderRadius: "var(--radius-md)", color: "#fca5a5", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* Applications Table */}
      <div style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: "2rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
          <thead>
            <tr style={{ background: "var(--color-bg-elevated)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
              <th style={{ padding: "0.75rem 1rem" }}>Applicant / Entity</th>
              <th style={{ padding: "0.75rem 1rem" }}>Type</th>
              <th style={{ padding: "0.75rem 1rem" }}>Status</th>
              <th style={{ padding: "0.75rem 1rem" }}>Contact / Channel</th>
              <th style={{ padding: "0.75rem 1rem" }}>Risk Signals</th>
              <th style={{ padding: "0.75rem 1rem" }}>Submitted</th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  Loading compliance review queue...
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No applications matching current filters.
                </td>
              </tr>
            ) : (
              applications.map((app) => {
                let flags: string[] = [];
                try {
                  flags = typeof app.risk_flags === "string" ? JSON.parse(app.risk_flags) : app.risk_flags ?? [];
                } catch {
                  flags = [];
                }

                return (
                  <tr key={app.id} style={{ borderBottom: "1px solid var(--color-border)", transition: "background 0.15s ease" }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <strong>{app.first_name} {app.last_name}</strong>
                      {app.company_name && (
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>{app.company_name}</div>
                      )}
                      <div className="mono" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{app.id}</div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: app.account_type === "PUBLISHER" ? "rgba(34, 211, 238, 0.1)" : "rgba(139, 92, 246, 0.1)", color: app.account_type === "PUBLISHER" ? "var(--color-accent-cyan)" : "var(--color-accent-violet)", fontWeight: 600 }}>
                        {app.account_type}
                      </span>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color:
                            app.status === "APPROVED"
                              ? "var(--color-success)"
                              : app.status === "REJECTED"
                              ? "var(--color-danger)"
                              : app.status === "PROBATIONARY_APPROVED"
                              ? "var(--color-accent-cyan)"
                              : "var(--color-warning)",
                        }}
                      >
                        {app.status}
                      </span>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div>{app.email}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                        {app.contact_method}: {app.contact_handle || app.phone}
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            fontWeight: 700,
                            background: app.risk_score >= 30 ? "rgba(248, 113, 113, 0.2)" : "rgba(251, 191, 36, 0.15)",
                            color: app.risk_score >= 30 ? "#fca5a5" : "#fde68a",
                          }}
                        >
                          Score: {app.risk_score}
                        </span>
                        {flags.map((f) => (
                          <span
                            key={f}
                            style={{
                              fontSize: "0.68rem",
                              padding: "0.1rem 0.35rem",
                              borderRadius: "4px",
                              background: "rgba(255, 255, 255, 0.05)",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {f.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>

                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => void openDetail(app.id)}
                        style={{
                          background: "var(--color-bg-elevated)",
                          border: "1px solid var(--color-border-strong)",
                          color: "var(--color-accent-cyan)",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                        }}
                      >
                        Inspect Dossier 🔍
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail / Inspection Modal or Panel */}
      {selectedAppId && (
        <div
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "var(--radius-lg)",
            padding: "2rem",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.45rem", color: "#fff" }}>
                  Applicant Dossier: {detail?.application?.first_name} {detail?.application?.last_name}
                </h2>
                <span className="mono" style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  [{selectedAppId}]
                </span>
              </div>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Country: <strong>{detail?.application?.country}</strong> · Email: <strong>{detail?.application?.email}</strong> ({detail?.application?.email_verified ? "✓ Verified" : "Unverified"}) · Phone: <strong>{detail?.application?.phone}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setShowDecisionModal(true)}
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  color: "#fff",
                  border: "none",
                  padding: "0.55rem 1.25rem",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.88rem",
                }}
              >
                Execute Compliance Decision ⚖️
              </button>
              <button
                type="button"
                onClick={() => setSelectedAppId(null)}
                style={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {decisionMsg && (
            <div style={{ background: "rgba(52, 211, 153, 0.1)", border: "1px solid var(--color-success)", color: "#a7f3d0", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }}>
              ✓ {decisionMsg}
            </div>
          )}

          {loadingDetail ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)" }}>Loading full dossier details...</div>
          ) : detail ? (
            <div>
              {/* Traffic Methodology (Anti-Scam) */}
              {detail.application.account_type === "PUBLISHER" && (
                <div style={{ background: "var(--color-bg-base)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1.5rem" }}>
                  <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "var(--color-accent-cyan)" }}>
                    Traffic Acquisition Methodology (Anti-Scam Signal)
                  </h3>
                  <p style={{ color: "#f1f5f9", fontSize: "0.95rem", lineHeight: 1.5, background: "rgba(255,255,255,0.02)", padding: "0.85rem", borderRadius: "var(--radius-sm)", margin: "0 0 0.75rem" }}>
                    "{detail.application.traffic_description}"
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "0.75rem", fontSize: "0.85rem" }}>
                    <div>
                      <span className="muted">Experience: </span>
                      <strong>{detail.application.experience_level} ({detail.application.traffic_experience_years} years)</strong>
                    </div>
                    <div>
                      <span className="muted">Previous Networks: </span>
                      <strong>{detail.application.previous_networks || "None provided"}</strong>
                    </div>
                    <div>
                      <span className="muted">Volume Target: </span>
                      <strong>{detail.application.estimated_monthly_volume}</strong>
                    </div>
                    <div>
                      <span className="muted">Incentivized: </span>
                      <strong style={{ color: detail.application.incentivized_traffic ? "#f87171" : "#34d399" }}>
                        {detail.application.incentivized_traffic ? `YES — ${detail.application.incentive_details}` : "NO"}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Uploaded Evidence Documents */}
              <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "1.05rem", margin: "0 0 0.75rem", color: "var(--color-text-primary)" }}>
                  Uploaded Documents & Proof of Identity ({detail.documents.length})
                </h3>
                {detail.documents.length === 0 ? (
                  <div className="muted" style={{ fontSize: "0.85rem" }}>No documents uploaded.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))", gap: "1rem" }}>
                    {detail.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        style={{
                          background: "var(--color-bg-base)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-sm)",
                          padding: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.4rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: "0.85rem", color: "#fff" }}>{doc.doc_type}</strong>
                          <span style={{ fontSize: "0.72rem", color: "var(--color-success)" }}>[ENCRYPTED VAULT]</span>
                        </div>
                        <div className="mono" style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{doc.file_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          Size: {(doc.file_size_bytes / 1024).toFixed(1)} KB · {new Date(doc.uploaded_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 8 Verification Dimensions */}
              <div>
                <h3 style={{ fontSize: "1.05rem", margin: "0 0 0.75rem", color: "var(--color-text-primary)" }}>
                  Multi-Dimensional Trust Status
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))", gap: "0.75rem" }}>
                  {detail.dimensions.map((dim: any) => (
                    <div
                      key={dim.id}
                      style={{
                        background: "var(--color-bg-base)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.75rem",
                      }}
                    >
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#fff" }}>{dim.dimension}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-accent-cyan)", marginTop: "0.2rem" }}>
                        Stage: <strong>{dim.stage}</strong>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Status: {dim.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Decision Modal */}
      {showDecisionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "36rem",
              width: "100%",
              padding: "2rem",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
          >
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.35rem", color: "#fff" }}>
              Execute Compliance Decision
            </h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem", margin: "0 0 1.25rem" }}>
              Every privileged action is recorded in the immutable audit log with policy version v5.0.
            </p>

            <form onSubmit={(e) => void handleExecuteDecision(e)}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Decision Action *
                </label>
                <select
                  value={decisionType}
                  onChange={(e: any) => setDecisionType(e.target.value)}
                  style={{ width: "100%", background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.6rem", borderRadius: "4px" }}
                >
                  <option value="APPROVE">Full Approval (Elevate to Verified)</option>
                  <option value="PROBATIONARY_APPROVE">Approve with Conditions (Probationary Caps & Reserves)</option>
                  <option value="REQUEST_DOCS">Request Additional Documents</option>
                  <option value="SCHEDULE_CALL">Schedule Verification Phone / Video Call</option>
                  <option value="ESCALATE">Escalate to Senior Fraud / Legal Desk</option>
                  <option value="REJECT">Reject Application</option>
                </select>
              </div>

              {decisionType === "PROBATIONARY_APPROVE" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", background: "rgba(34, 211, 238, 0.05)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Daily Click Cap</label>
                    <input
                      type="number"
                      value={probationaryCap}
                      onChange={(e) => setProbationaryCap(e.target.value)}
                      style={{ width: "100%", background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.4rem", borderRadius: "4px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Reserve Hold Days</label>
                    <input
                      type="number"
                      value={reserveDays}
                      onChange={(e) => setReserveDays(e.target.value)}
                      style={{ width: "100%", background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.4rem", borderRadius: "4px" }}
                    />
                  </div>
                </div>
              )}

              {decisionType === "SCHEDULE_CALL" && (
                <div style={{ marginBottom: "1rem", background: "rgba(139, 92, 246, 0.08)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Proposed Interview Date & Time</label>
                  <input
                    type="text"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    placeholder="e.g. Tomorrow 14:00 UTC"
                    style={{ width: "100%", background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.4rem", borderRadius: "4px", marginBottom: "0.5rem" }}
                  />
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Interview Platform</label>
                  <input
                    type="text"
                    value={interviewPlatform}
                    onChange={(e) => setInterviewPlatform(e.target.value)}
                    placeholder="Telegram / Google Meet / Phone"
                    style={{ width: "100%", background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.4rem", borderRadius: "4px" }}
                  />
                </div>
              )}

              {decisionType === "REQUEST_DOCS" && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Required Document Type</label>
                  <select
                    value={requestDocType}
                    onChange={(e) => setRequestDocType(e.target.value)}
                    style={{ width: "100%", background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.5rem", borderRadius: "4px" }}
                  >
                    <option value="PROOF_OF_ADDRESS">Proof of Residential / Business Address</option>
                    <option value="TRAFFIC_SCREENSHOT">Ad Network Invoices & Billing Proof</option>
                    <option value="BUSINESS_REGISTRATION">Certificate of Good Standing</option>
                    <option value="SELFIE_WITH_ID">Selfie with Government ID and Timestamp Note</option>
                  </select>
                </div>
              )}

              {decisionType === "REJECT" && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Standardized Rejection Reason Code *</label>
                  <select
                    value={decisionReasonCode}
                    onChange={(e) => setDecisionReasonCode(e.target.value)}
                    style={{ width: "100%", background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.5rem", borderRadius: "4px" }}
                  >
                    <option value="VAGUE_TRAFFIC_METHOD">VAGUE_TRAFFIC_METHOD — Insufficient methodology detail</option>
                    <option value="UNVERIFIABLE_IDENTITY">UNVERIFIABLE_IDENTITY — Document unreadable or fraudulent</option>
                    <option value="POLICY_VIOLATION_INTENT">POLICY_VIOLATION_INTENT — Unpermitted advertising techniques</option>
                    <option value="INCENTIVIZED_TRAFFIC_UNALLOWED">INCENTIVIZED_TRAFFIC_UNALLOWED — Network does not allow incentivized clicks</option>
                    <option value="SUSPECTED_FRAUD_NETWORK">SUSPECTED_FRAUD_NETWORK — Flagged IP or cross-network match</option>
                    <option value="DISPOSABLE_CONTACT">DISPOSABLE_CONTACT — Invalid phone or temporary email</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Officer Reviewer Notes (Sent to applicant & recorded in audit ledger)
                </label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Explain rationale for this decision..."
                  style={{ width: "100%", minHeight: "4.5rem", background: "var(--color-bg-base)", border: "1px solid var(--color-border)", color: "#fff", padding: "0.6rem", borderRadius: "4px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  style={{ background: "transparent", border: "1px solid var(--color-border)", color: "#94a3b8", padding: "0.6rem 1.2rem", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deciding}
                  style={{ background: "var(--color-accent-cyan)", color: "#05070d", border: "none", padding: "0.6rem 1.4rem", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" }}
                >
                  {deciding ? "Recording Decision..." : "Commit Decision ⚖️"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
