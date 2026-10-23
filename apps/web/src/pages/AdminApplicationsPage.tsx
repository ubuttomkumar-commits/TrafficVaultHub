import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./AdminApplicationsPage.module.css";

type ApplicationItem = {
  id: string;
  account_type: "PUBLISHER" | "ADVERTISER";
  sub_type: string;
  status: string;
  email: string;
  email_verified?: number | boolean;
  phone: string;
  phone_verified?: number | boolean;
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
  updated_at?: string;
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

  // Filters state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("risk_score");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");

  // Selection & Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkDecision, setBulkDecision] = useState<"APPROVE" | "PROBATIONARY_APPROVE" | "REQUEST_DOCS" | "REJECT">("APPROVE");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkExecuting, setBulkExecuting] = useState(false);

  // Inspection dossier
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AppDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [dossierTab, setDossierTab] = useState<"profile" | "methodology" | "risk" | "matrix" | "documents" | "audit">("profile");

  // Interactive Dimension update state
  const [updatingDimension, setUpdatingDimension] = useState<string | null>(null);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // Single Decision Modal
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<
    "APPROVE" | "PROBATIONARY_APPROVE" | "REJECT" | "REQUEST_DOCS" | "SCHEDULE_CALL" | "ESCALATE"
  >("APPROVE");
  const [decisionReasonCode, setDecisionReasonCode] = useState("KYC_VERIFIED");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [probationaryCap, setProbationaryCap] = useState("500");
  const [reserveDays, setReserveDays] = useState("7");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewPlatform, setInterviewPlatform] = useState("Telegram Video Call");
  const [requestDocType, setRequestDocType] = useState("PROOF_OF_ADDRESS");
  const [deciding, setDeciding] = useState(false);
  const [decisionMsg, setDecisionMsg] = useState<string | null>(null);

  // Copy ID feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const token = localStorage.getItem("tvh_token");

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const params = new URLSearchParams({
        status: statusFilter,
        accountType: typeFilter,
        search: search.trim(),
        riskLevel: riskFilter,
        emailVerified: emailVerifiedFilter,
        sortBy,
        sortOrder,
      });

      const res = await fetch(apiUrl(`/api/v1/onboarding/admin/applications?${params.toString()}`), { headers });
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
  }, [typeFilter, statusFilter, riskFilter, emailVerifiedFilter, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      void loadApplications();
    }, 280);
    return () => clearTimeout(handler);
  }, [search]);

  // Top summary counters based on all currently loaded or unfiltered applications
  const queueCounters = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "PENDING_REVIEW").length;
    const highRisk = applications.filter((a) => (a.risk_score || 0) >= 25).length;
    const docsReq = applications.filter((a) => a.status === "DOCS_REQUESTED").length;
    const approved = applications.filter((a) => a.status === "APPROVED" || a.status === "PROBATIONARY_APPROVED").length;
    const rejected = applications.filter((a) => a.status === "REJECTED").length;
    return { total, pending, highRisk, docsReq, approved, rejected };
  }, [applications]);

  // Selection toggle
  function toggleSelectAll() {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a.id));
    }
  }

  function toggleSelectItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function openDetail(id: string) {
    setSelectedAppId(id);
    setLoadingDetail(true);
    setDetail(null);
    setDecisionMsg(null);
    setDossierTab("profile");
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(apiUrl(`/api/v1/onboarding/admin/applications/${id}`), { headers });
      const json = await res.json();
      if (res.ok) {
        setDetail(json.data);
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleDimensionStageChange(dimension: string, newStage: string) {
    if (!selectedAppId) return;
    setUpdatingDimension(dimension);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const nextStatus = newStage === "VERIFIED" ? "PASSED" : newStage === "REJECTED" ? "REJECTED" : "IN_REVIEW";

      const res = await fetch(
        apiUrl(`/api/v1/onboarding/admin/applications/${selectedAppId}/dimensions/${dimension}`),
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            stage: newStage,
            status: nextStatus,
            reviewerNotes: `Dimension manually elevated to ${newStage} by compliance officer`,
          }),
        }
      );
      if (res.ok) {
        // Refresh dossier
        void openDetail(selectedAppId);
      }
    } catch {
      // non-fatal
    } finally {
      setUpdatingDimension(null);
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

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(apiUrl(`/api/v1/onboarding/admin/applications/${selectedAppId}/decision`), {
        method: "POST",
        headers,
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

  async function handleExecuteBulkDecision(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setBulkExecuting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(apiUrl("/api/v1/onboarding/admin/applications/bulk-decision"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          applicationIds: selectedIds,
          decision: bulkDecision,
          notes: bulkNotes || `Batch action applied to ${selectedIds.length} applications`,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Bulk action failed");

      setShowBulkModal(false);
      setSelectedIds([]);
      setBulkNotes("");
      void loadApplications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error running bulk action");
    } finally {
      setBulkExecuting(false);
    }
  }

  function handleCopyId(id: string) {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function resetAllFilters() {
    setSearch("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setRiskFilter("ALL");
    setEmailVerifiedFilter("ALL");
    setSortBy("risk_score");
    setSortOrder("DESC");
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h1>
            <span>⚖️</span> Partner KYC / KYB Review Queue
            <span className={styles.titleBadge}>Multi-Dimensional Verification</span>
          </h1>
          <p className={styles.subtitle}>
            Zero auto-approvals. Anti-fraud telemetry, traffic methodology scrutiny, and immutable audit trail.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link to="/admin" className={styles.btnSecondary}>
            ← Admin Dashboard
          </Link>
          <button
            type="button"
            onClick={() => void loadApplications()}
            className={styles.btnPrimary}
            title="Reload applications queue"
          >
            <span>⟳</span> Refresh Queue
          </button>
        </div>
      </div>

      {/* Top summary counter tiles */}
      <div className={styles.counterGrid}>
        <div
          className={`${styles.counterTile} ${statusFilter === "ALL" && riskFilter === "ALL" ? styles.counterTileActive : ""}`}
          onClick={() => { setStatusFilter("ALL"); setRiskFilter("ALL"); }}
        >
          <div className={styles.counterLabel}>
            <span>Total Queue</span>
            <span>📋</span>
          </div>
          <div className={styles.counterValue}>{queueCounters.total}</div>
        </div>

        <div
          className={`${styles.counterTile} ${statusFilter === "PENDING_REVIEW" ? styles.counterTileActive : ""}`}
          onClick={() => { setStatusFilter("PENDING_REVIEW"); setRiskFilter("ALL"); }}
        >
          <div className={styles.counterLabel}>
            <span>Pending Review</span>
            <span style={{ color: "#fbbf24" }}>⏳</span>
          </div>
          <div className={styles.counterValue} style={{ color: "#fde68a" }}>
            {queueCounters.pending}
          </div>
        </div>

        <div
          className={`${styles.counterTile} ${riskFilter === "HIGH" ? styles.counterTileActive : ""}`}
          onClick={() => { setRiskFilter("HIGH"); }}
        >
          <div className={styles.counterLabel}>
            <span>High Risk Flagged</span>
            <span style={{ color: "#f87171" }}>🚨</span>
          </div>
          <div className={styles.counterValue} style={{ color: "#fca5a5" }}>
            {queueCounters.highRisk}
          </div>
        </div>

        <div
          className={`${styles.counterTile} ${statusFilter === "DOCS_REQUESTED" ? styles.counterTileActive : ""}`}
          onClick={() => { setStatusFilter("DOCS_REQUESTED"); setRiskFilter("ALL"); }}
        >
          <div className={styles.counterLabel}>
            <span>Docs Requested</span>
            <span style={{ color: "#fbbf24" }}>📄</span>
          </div>
          <div className={styles.counterValue} style={{ color: "#fbbf24" }}>
            {queueCounters.docsReq}
          </div>
        </div>

        <div
          className={`${styles.counterTile} ${statusFilter === "APPROVED" ? styles.counterTileActive : ""}`}
          onClick={() => { setStatusFilter("APPROVED"); setRiskFilter("ALL"); }}
        >
          <div className={styles.counterLabel}>
            <span>Approved / Live</span>
            <span style={{ color: "#34d399" }}>✓</span>
          </div>
          <div className={styles.counterValue} style={{ color: "#a7f3d0" }}>
            {queueCounters.approved}
          </div>
        </div>

        <div
          className={`${styles.counterTile} ${statusFilter === "REJECTED" ? styles.counterTileActive : ""}`}
          onClick={() => { setStatusFilter("REJECTED"); setRiskFilter("ALL"); }}
        >
          <div className={styles.counterLabel}>
            <span>Rejected</span>
            <span style={{ color: "#f87171" }}>✕</span>
          </div>
          <div className={styles.counterValue} style={{ color: "#f87171" }}>
            {queueCounters.rejected}
          </div>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className={styles.filterCard}>
        <div className={styles.searchRow}>
          <div className={styles.searchInputWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by applicant name, company, email, or application ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={resetAllFilters}
          >
            Clear Filters
          </button>
        </div>

        <div className={styles.filtersGrid}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Account Type</label>
            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Partner Types</option>
              <option value="PUBLISHER">Publishers / Affiliates</option>
              <option value="ADVERTISER">Advertisers / Brands</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Review Status</label>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Risk Tier</label>
            <select
              className={styles.filterSelect}
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk (Score ≥ 25)</option>
              <option value="MEDIUM">Medium Risk (Score 10–24)</option>
              <option value="LOW">Low Risk (Score &lt; 10)</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Email Verification</label>
            <select
              className={styles.filterSelect}
              value={emailVerifiedFilter}
              onChange={(e) => setEmailVerifiedFilter(e.target.value)}
            >
              <option value="ALL">All Email States</option>
              <option value="1">Verified Email Only</option>
              <option value="0">Unverified Email Only</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Sort Order</label>
            <select
              className={styles.filterSelect}
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("_");
                setSortBy(sb);
                setSortOrder(so as any);
              }}
            >
              <option value="risk_score_DESC">Risk Score: Highest First</option>
              <option value="risk_score_ASC">Risk Score: Lowest First</option>
              <option value="created_at_DESC">Submitted: Newest First</option>
              <option value="created_at_ASC">Submitted: Oldest First</option>
              <option value="status_ASC">Status: Alphabetical</option>
            </select>
          </div>
        </div>

        <div className={styles.filterMeta}>
          <span>
            Showing <strong>{applications.length}</strong> matching partner applications
          </span>
          {(search || typeFilter !== "ALL" || statusFilter !== "ALL" || riskFilter !== "ALL" || emailVerifiedFilter !== "ALL") && (
            <button type="button" className={styles.resetBtn} onClick={resetAllFilters}>
              Reset all active filters
            </button>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <div className={styles.bulkInfo}>
            <span className={styles.bulkCountBadge}>{selectedIds.length}</span>
            <span>applications selected</span>
          </div>

          <div className={styles.bulkBtnGroup}>
            <button
              type="button"
              className={styles.bulkBtnApprove}
              onClick={() => {
                setBulkDecision("APPROVE");
                setShowBulkModal(true);
              }}
            >
              ✓ Bulk Approve
            </button>
            <button
              type="button"
              className={styles.bulkBtnApprove}
              style={{ borderColor: "#22d3ee", color: "#22d3ee" }}
              onClick={() => {
                setBulkDecision("PROBATIONARY_APPROVE");
                setShowBulkModal(true);
              }}
            >
              🛡️ Bulk Probation
            </button>
            <button
              type="button"
              className={styles.bulkBtnDocs}
              onClick={() => {
                setBulkDecision("REQUEST_DOCS");
                setShowBulkModal(true);
              }}
            >
              📄 Request Docs
            </button>
            <button
              type="button"
              className={styles.bulkBtnReject}
              onClick={() => {
                setBulkDecision("REJECT");
                setShowBulkModal(true);
              }}
            >
              ✕ Bulk Reject
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(248, 113, 113, 0.1)", border: "1px solid var(--color-danger)", padding: "1rem", borderRadius: "var(--radius-md)", color: "#fca5a5", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* Queue Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th} style={{ width: "40px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={applications.length > 0 && selectedIds.length === applications.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all applications"
                />
              </th>
              <th className={styles.th}>Applicant / Entity</th>
              <th className={styles.th}>Partner Type</th>
              <th className={styles.th}>Review Status</th>
              <th className={styles.th}>Contact & Email Verification</th>
              <th className={styles.th}>Risk Telemetry</th>
              <th className={styles.th}>Submitted</th>
              <th className={styles.th} style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ animation: "spin 1s linear infinite" }}>⟳</span>
                    Loading partner onboarding applications...
                  </div>
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No partner applications match the specified criteria.
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

                const isSelected = selectedIds.includes(app.id);

                return (
                  <tr key={app.id} className={isSelected ? styles.selectedRow : ""}>
                    <td className={styles.td} style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(app.id)}
                        aria-label={`Select application ${app.id}`}
                      />
                    </td>

                    <td className={styles.td}>
                      <span className={styles.applicantName}>
                        {app.first_name} {app.last_name}
                      </span>
                      {app.company_name && (
                        <div className={styles.applicantCompany}>{app.company_name}</div>
                      )}
                      <div className={styles.applicantId}>
                        <span>{app.id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(app.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent-cyan)", fontSize: "0.7rem", padding: "0" }}
                          title="Copy ID"
                        >
                          {copiedId === app.id ? "✓" : "📋"}
                        </button>
                        <span>· {app.country}</span>
                      </div>
                    </td>

                    <td className={styles.td}>
                      {app.account_type === "PUBLISHER" ? (
                        <span className={styles.typeBadgePub}>
                          PUBLISHER {app.sub_type ? `· ${app.sub_type}` : ""}
                        </span>
                      ) : (
                        <span className={styles.typeBadgeAdv}>
                          ADVERTISER {app.sub_type ? `· ${app.sub_type}` : ""}
                        </span>
                      )}
                    </td>

                    <td className={styles.td}>
                      <span
                        className={`${styles.statusBadge} ${
                          app.status === "APPROVED"
                            ? styles.statusApproved
                            : app.status === "PROBATIONARY_APPROVED"
                            ? styles.statusProbation
                            : app.status === "REJECTED"
                            ? styles.statusRejected
                            : app.status === "DOCS_REQUESTED"
                            ? styles.statusDocs
                            : app.status === "INTERVIEW_SCHEDULED"
                            ? styles.statusInterview
                            : styles.statusPending
                        }`}
                      >
                        {app.status === "APPROVED" && "✓ "}
                        {app.status === "PROBATIONARY_APPROVED" && "🛡️ "}
                        {app.status === "REJECTED" && "✕ "}
                        {app.status === "DOCS_REQUESTED" && "📄 "}
                        {app.status === "INTERVIEW_SCHEDULED" && "🎙️ "}
                        {app.status === "PENDING_REVIEW" && "⏳ "}
                        {app.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ color: "#fff", fontWeight: 500 }}>{app.email}</span>
                        {app.email_verified ? (
                          <span className={styles.emailVerifiedBadge} title="Email verified via OTP">✓ Verified</span>
                        ) : (
                          <span className={styles.emailUnverifiedBadge} title="Email unverified">✕ Unverified</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.15rem" }}>
                        {app.contact_method}: <strong style={{ color: "#fff" }}>{app.contact_handle || app.phone}</strong>
                      </div>
                    </td>

                    <td className={styles.td}>
                      <div className={styles.riskMeter}>
                        <span
                          className={`${styles.riskScoreBadge} ${
                            app.risk_score >= 25
                              ? styles.riskHigh
                              : app.risk_score >= 10
                              ? styles.riskMedium
                              : styles.riskLow
                          }`}
                        >
                          Score: {app.risk_score}
                        </span>
                        {flags.slice(0, 2).map((f) => (
                          <span key={f} className={styles.riskFlagChip}>
                            {f.replace(/_/g, " ")}
                          </span>
                        ))}
                        {flags.length > 2 && (
                          <span className={styles.riskFlagChip} title={flags.slice(2).join(", ")}>
                            +{flags.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>

                    <td className={styles.td} style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(app.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => void openDetail(app.id)}
                        className={styles.btnInspect}
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

      {/* Full Dossier Overlay Modal */}
      {selectedAppId && (
        <div className={styles.dossierOverlay}>
          <div className={styles.dossierModal}>
            {/* Header */}
            <div className={styles.dossierHeader}>
              <div>
                <div className={styles.dossierTitleRow}>
                  <h2 className={styles.dossierTitle}>
                    {detail?.application?.first_name} {detail?.application?.last_name}
                  </h2>
                  <span
                    className={
                      detail?.application?.account_type === "PUBLISHER"
                        ? styles.typeBadgePub
                        : styles.typeBadgeAdv
                    }
                  >
                    {detail?.application?.account_type}
                  </span>
                  <span
                    className={`${styles.statusBadge} ${
                      detail?.application?.status === "APPROVED"
                        ? styles.statusApproved
                        : detail?.application?.status === "PROBATIONARY_APPROVED"
                        ? styles.statusProbation
                        : detail?.application?.status === "REJECTED"
                        ? styles.statusRejected
                        : detail?.application?.status === "DOCS_REQUESTED"
                        ? styles.statusDocs
                        : styles.statusPending
                    }`}
                  >
                    {detail?.application?.status?.replace(/_/g, " ")}
                  </span>
                </div>

                <div className={styles.dossierSubinfo}>
                  <span className="mono" style={{ color: "var(--color-accent-cyan)" }}>
                    ID: {selectedAppId}
                  </span>
                  <span>·</span>
                  <span>Country: <strong>{detail?.application?.country}</strong></span>
                  <span>·</span>
                  <span>
                    Email: <strong>{detail?.application?.email}</strong> (
                    {detail?.application?.email_verified ? "✓ Verified" : "✕ Unverified"})
                  </span>
                  <span>·</span>
                  <span>
                    Risk Score:{" "}
                    <strong
                      style={{
                        color:
                          (detail?.application?.risk_score || 0) >= 25
                            ? "#fca5a5"
                            : (detail?.application?.risk_score || 0) >= 10
                            ? "#fde68a"
                            : "#a7f3d0",
                      }}
                    >
                      {detail?.application?.risk_score ?? 0}
                    </strong>
                  </span>
                </div>
              </div>

              <div className={styles.dossierActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => setShowDecisionModal(true)}
                >
                  Execute Compliance Decision ⚖️
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedAppId(null)}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {decisionMsg && (
              <div style={{ background: "rgba(52, 211, 153, 0.15)", border: "1px solid var(--color-success)", color: "#a7f3d0", padding: "0.75rem 1.25rem", margin: "1rem 1.75rem 0" }}>
                ✓ {decisionMsg}
              </div>
            )}

            {/* Dossier Tabs */}
            <div className={styles.dossierTabs}>
              <button
                type="button"
                className={`${styles.dossierTab} ${dossierTab === "profile" ? styles.dossierTabActive : ""}`}
                onClick={() => setDossierTab("profile")}
              >
                👤 Identity & Entity Profile
              </button>
              <button
                type="button"
                className={`${styles.dossierTab} ${dossierTab === "methodology" ? styles.dossierTabActive : ""}`}
                onClick={() => setDossierTab("methodology")}
              >
                🎯 Traffic Methodology & Volume
              </button>
              <button
                type="button"
                className={`${styles.dossierTab} ${dossierTab === "risk" ? styles.dossierTabActive : ""}`}
                onClick={() => setDossierTab("risk")}
              >
                🚨 Risk Signals & Telemetry
              </button>
              <button
                type="button"
                className={`${styles.dossierTab} ${dossierTab === "matrix" ? styles.dossierTabActive : ""}`}
                onClick={() => setDossierTab("matrix")}
              >
                🛡️ Verification Matrix ({detail?.dimensions?.length || 0})
              </button>
              <button
                type="button"
                className={`${styles.dossierTab} ${dossierTab === "documents" ? styles.dossierTabActive : ""}`}
                onClick={() => setDossierTab("documents")}
              >
                📁 Secure Document Vault ({detail?.documents?.length || 0})
              </button>
              <button
                type="button"
                className={`${styles.dossierTab} ${dossierTab === "audit" ? styles.dossierTabActive : ""}`}
                onClick={() => setDossierTab("audit")}
              >
                📜 Immutable Audit Ledger ({detail?.auditHistory?.length || 0})
              </button>
            </div>

            {/* Dossier Content */}
            <div className={styles.dossierBody}>
              {loadingDetail ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  Loading comprehensive compliance dossier...
                </div>
              ) : !detail ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                  Failed to load application dossier.
                </div>
              ) : (
                <>
                  {/* TAB 1: Profile & Contact */}
                  {dossierTab === "profile" && (
                    <div>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Full Legal Name</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.first_name} {detail.application.last_name}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Company / Legal Entity</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.company_name || "Individual / Self-Employed"}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Business Reg. / Tax ID</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.business_reg_no || "N/A"}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Direct Email Contact</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.email}{" "}
                            {detail.application.email_verified ? (
                              <span style={{ color: "#34d399", fontSize: "0.78rem" }}>[OTP Confirmed]</span>
                            ) : (
                              <span style={{ color: "#f87171", fontSize: "0.78rem" }}>[Unverified]</span>
                            )}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Primary Telephone</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.phone}{" "}
                            {detail.application.phone_verified ? (
                              <span style={{ color: "#34d399", fontSize: "0.78rem" }}>[Verified]</span>
                            ) : (
                              <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>[Self-Declared]</span>
                            )}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Direct Messenger Handle</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.contact_method}: {detail.application.contact_handle || "None specified"}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Country & Jurisdiction</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.country} · {detail.application.city}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Street Address</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.address_line1} {detail.application.postal_code}
                          </span>
                        </div>

                        {detail.application.website_url && (
                          <div className={styles.infoBlock}>
                            <span className={styles.infoBlockLabel}>Corporate / Media Website</span>
                            <span className={styles.infoBlockValue}>
                              <a
                                href={detail.application.website_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "var(--color-accent-cyan)" }}
                              >
                                {detail.application.website_url} ↗
                              </a>
                            </span>
                          </div>
                        )}
                      </div>

                      {detail.application.decision_notes && (
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "1rem", marginTop: "1rem" }}>
                          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-text-muted)", display: "block", marginBottom: "0.25rem" }}>
                            Previous Reviewer Notes
                          </span>
                          <p style={{ color: "#fff", margin: 0, fontSize: "0.88rem" }}>
                            {detail.application.decision_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Methodology & Volume */}
                  {dossierTab === "methodology" && (
                    <div>
                      {detail.application.traffic_description && (
                        <div>
                          <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", color: "var(--color-accent-cyan)" }}>
                            Declared Traffic Acquisition Methodology (Anti-Scam Signal)
                          </h4>
                          <div className={styles.quoteBox}>
                            "{detail.application.traffic_description}"
                          </div>
                        </div>
                      )}

                      <div className={styles.infoGrid}>
                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Experience Level</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.experience_level || "Standard"} ({detail.application.traffic_experience_years || 0} years)
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Previous Affiliate Networks</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.previous_networks || "None provided / Private Direct"}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Estimated Monthly Volume / Budget</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.estimated_monthly_volume || detail.application.expected_monthly_budget || "10,000–50,000"}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Incentivized Traffic Intent</span>
                          <span
                            className={styles.infoBlockValue}
                            style={{
                              color: detail.application.incentivized_traffic ? "#f87171" : "#34d399",
                              fontWeight: 700,
                            }}
                          >
                            {detail.application.incentivized_traffic
                              ? `YES — ${detail.application.incentive_details || "Details pending"}`
                              : "NO (Strictly Non-Incentivized)"}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Traffic Sources</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.traffic_sources || "Search, Social, Native, Display"}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Target GEOs</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.target_geos || "Tier 1: US, CA, UK, AU, DE"}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Tracking Integration Preference</span>
                          <span className={styles.infoBlockValue}>
                            {detail.application.tracking_preference || "S2S Server Postback"}
                          </span>
                        </div>

                        <div className={styles.infoBlock}>
                          <span className={styles.infoBlockLabel}>Restricted Category Intent</span>
                          <span
                            className={styles.infoBlockValue}
                            style={{
                              color: detail.application.restricted_categories_intent ? "#fbbf24" : "var(--color-text-secondary)",
                            }}
                          >
                            {detail.application.restricted_categories_intent ? "YES (Requires Compliance Gate)" : "NO (Standard Only)"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Risk Signals */}
                  {dossierTab === "risk" && (
                    <div>
                      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", marginBottom: "1.5rem", background: "var(--color-bg-base)", border: "1px solid var(--color-border)", padding: "1.25rem", borderRadius: "var(--radius-md)" }}>
                        <div>
                          <div style={{ fontSize: "0.74rem", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                            Automated Risk Score
                          </div>
                          <div
                            style={{
                              fontSize: "2.5rem",
                              fontWeight: 800,
                              fontFamily: "var(--font-mono, monospace)",
                              color:
                                (detail.application.risk_score || 0) >= 25
                                  ? "#f87171"
                                  : (detail.application.risk_score || 0) >= 10
                                  ? "#fbbf24"
                                  : "#34d399",
                            }}
                          >
                            {detail.application.risk_score || 0}
                            <span style={{ fontSize: "1rem", color: "var(--color-text-muted)" }}> / 100</span>
                          </div>
                        </div>

                        <div style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: "1.5rem" }}>
                          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                            {(detail.application.risk_score || 0) >= 25
                              ? "HIGH RISK — Escalated Due Diligence Required"
                              : (detail.application.risk_score || 0) >= 10
                              ? "MODERATE RISK — Standard Secondary Verification"
                              : "LOW RISK — Clean Digital Footprint"}
                          </div>
                          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                            Risk score is computed from 12 deterministic criteria including disposable domains, country risk index, anonymous proxies, and incentivized traffic disclosures.
                          </p>
                        </div>
                      </div>

                      <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", color: "#fff" }}>
                        Active Risk Flag Breakdown
                      </h4>

                      {(() => {
                        let flags: string[] = [];
                        try {
                          flags = typeof detail.application.risk_flags === "string" ? JSON.parse(detail.application.risk_flags) : detail.application.risk_flags ?? [];
                        } catch {
                          flags = [];
                        }

                        if (flags.length === 0) {
                          return (
                            <div style={{ color: "#34d399", fontSize: "0.88rem", padding: "1rem", background: "rgba(52, 211, 153, 0.05)", borderRadius: "var(--radius-sm)" }}>
                              ✓ Zero negative risk flags detected. Clean submission baseline.
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
                            {flags.map((flag) => (
                              <div
                                key={flag}
                                style={{
                                  background: "rgba(248, 113, 113, 0.08)",
                                  border: "1px solid rgba(248, 113, 113, 0.3)",
                                  borderRadius: "var(--radius-sm)",
                                  padding: "0.75rem 1rem",
                                }}
                              >
                                <strong style={{ color: "#fca5a5", fontSize: "0.85rem" }}>
                                  🚨 {flag.replace(/_/g, " ")}
                                </strong>
                                <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                                  Deterministic telemetry alert requiring manual review before approval.
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB 4: Verification Matrix */}
                  {dossierTab === "matrix" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
                          Multi-dimensional verification gate. Operators can manually elevate or reject individual dimensions.
                        </p>
                      </div>

                      <div className={styles.dimensionMatrix}>
                        {detail.dimensions.map((dim: any) => (
                          <div key={dim.id} className={styles.dimCard}>
                            <div className={styles.dimHeader}>
                              <span className={styles.dimTitle}>{dim.dimension}</span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color:
                                    dim.status === "PASSED"
                                      ? "#34d399"
                                      : dim.status === "REJECTED"
                                      ? "#f87171"
                                      : "#fbbf24",
                                }}
                              >
                                {dim.status}
                              </span>
                            </div>

                            <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                              Current Stage: <strong style={{ color: "var(--color-accent-cyan)" }}>{dim.stage}</strong>
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.35rem" }}>
                              <select
                                className={styles.dimStageSelect}
                                value={dim.stage}
                                disabled={updatingDimension === dim.dimension}
                                onChange={(e) => void handleDimensionStageChange(dim.dimension, e.target.value)}
                              >
                                <option value="SELF_DECLARED">SELF_DECLARED</option>
                                <option value="DOCUMENTED">DOCUMENTED</option>
                                <option value="VERIFIED">VERIFIED (Passed)</option>
                                <option value="REJECTED">REJECTED</option>
                              </select>
                              {updatingDimension === dim.dimension && (
                                <span style={{ fontSize: "0.72rem", color: "var(--color-accent-cyan)" }}>
                                  Saving...
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: Secure Document Vault */}
                  {dossierTab === "documents" && (
                    <div>
                      {detail.documents.length === 0 ? (
                        <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                          No identity or compliance documents uploaded yet for this application.
                        </div>
                      ) : (
                        <div className={styles.docGrid}>
                          {detail.documents.map((doc: any) => (
                            <div key={doc.id} className={styles.docCard}>
                              <div className={styles.docCardHeader}>
                                <span className={styles.docType}>{doc.doc_type}</span>
                                <span style={{ fontSize: "0.7rem", color: "#34d399" }}>
                                  [ENCRYPTED VAULT]
                                </span>
                              </div>
                              <div className={styles.docFileName}>{doc.file_name}</div>
                              <div className={styles.docMeta}>
                                <span>{doc.mime_type}</span>
                                <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                                Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                              </div>
                              <button
                                type="button"
                                className={styles.btnDocPreview}
                                onClick={() => setPreviewDoc(doc)}
                              >
                                Audit & Preview Document 🔍
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: Audit Ledger */}
                  {dossierTab === "audit" && (
                    <div>
                      <div className={styles.timeline}>
                        {detail.auditHistory.map((item: any) => (
                          <div key={item.id || item.created_at} className={styles.timelineItem}>
                            <div className={styles.timelineDot} />
                            <div className={styles.timelineContent}>
                              <div className={styles.timelineAction}>
                                <span>{item.action}</span>
                                <span className={styles.timelineTime}>
                                  {new Date(item.created_at).toLocaleString()}
                                </span>
                              </div>
                              <div className={styles.timelineNotes}>
                                {item.notes || "No notes attached"}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                                Operator / Actor: <span className="mono">{item.actor_id || "system"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Preview & Verification Modal */}
      {previewDoc && (
        <div className={styles.modalOverlay}>
          <div className={styles.decisionDialog} style={{ maxWidth: "42rem" }}>
            <div className={styles.dialogHeader}>
              <h2>Secure Document Inspection: {previewDoc.doc_type}</h2>
              <p>Cryptographically verified access token. Vault checksum confirmed.</p>
            </div>

            <div style={{ background: "var(--color-bg-base)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.82rem", marginBottom: "1rem" }}>
                <div><span className="muted">File Name: </span><strong className="mono">{previewDoc.file_name}</strong></div>
                <div><span className="muted">Doc Type: </span><strong>{previewDoc.doc_type}</strong></div>
                <div><span className="muted">Size: </span><strong>{(previewDoc.file_size_bytes / 1024).toFixed(1)} KB</strong></div>
                <div><span className="muted">Status: </span><span style={{ color: "#34d399", fontWeight: 700 }}>ACCEPTED</span></div>
              </div>

              {/* Simulated Document Viewer Box */}
              <div
                style={{
                  height: "220px",
                  background: "radial-gradient(ellipse at center, rgba(34, 211, 238, 0.08) 0%, rgba(5, 7, 13, 0.95) 100%)",
                  border: "1px dashed rgba(34, 211, 238, 0.3)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <span style={{ fontSize: "2.5rem" }}>📄</span>
                <span style={{ fontSize: "0.9rem", color: "#fff", fontWeight: 600 }}>
                  Encrypted Document Vault Render
                </span>
                <span className="mono" style={{ fontSize: "0.72rem", color: "var(--color-accent-cyan)" }}>
                  SHA256: 8f49a37c02b3781e9d0e1236fb6...
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Protected by Zero-Knowledge Encryption. Inspected by Compliance Desk.
                </span>
              </div>
            </div>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setPreviewDoc(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Engine Modal */}
      {showDecisionModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.decisionDialog}>
            <div className={styles.dialogHeader}>
              <h2>Execute Compliance Decision</h2>
              <p>
                Every privileged action is recorded in the immutable audit log with policy version v5.0.
              </p>
            </div>

            <form onSubmit={(e) => void handleExecuteDecision(e)}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Decision Action *</label>
                <select
                  className={styles.formControl}
                  value={decisionType}
                  onChange={(e: any) => setDecisionType(e.target.value)}
                >
                  <option value="APPROVE">Full Approval (Elevate to Verified Partner)</option>
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
                      className={styles.formControl}
                      value={probationaryCap}
                      onChange={(e) => setProbationaryCap(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Reserve Hold Days</label>
                    <input
                      type="number"
                      className={styles.formControl}
                      value={reserveDays}
                      onChange={(e) => setReserveDays(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {decisionType === "SCHEDULE_CALL" && (
                <div style={{ marginBottom: "1rem", background: "rgba(139, 92, 246, 0.08)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Proposed Interview Date & Time</label>
                  <input
                    type="text"
                    className={styles.formControl}
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    placeholder="e.g. Tomorrow 14:00 UTC"
                    style={{ marginBottom: "0.5rem" }}
                  />
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Interview Platform</label>
                  <input
                    type="text"
                    className={styles.formControl}
                    value={interviewPlatform}
                    onChange={(e) => setInterviewPlatform(e.target.value)}
                    placeholder="Telegram / Google Meet / Phone"
                  />
                </div>
              )}

              {decisionType === "REQUEST_DOCS" && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Required Document Type</label>
                  <select
                    className={styles.formControl}
                    value={requestDocType}
                    onChange={(e) => setRequestDocType(e.target.value)}
                  >
                    <option value="PROOF_OF_ADDRESS">Proof of Residential / Business Address</option>
                    <option value="TRAFFIC_SCREENSHOT">Ad Network Invoices & Billing Proof</option>
                    <option value="BUSINESS_REGISTRATION">Certificate of Good Standing</option>
                    <option value="SELFIE_WITH_ID">Selfie with Government ID and Timestamp Note</option>
                  </select>
                </div>
              )}

              {decisionType === "REJECT" && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Standardized Rejection Reason Code *</label>
                  <select
                    className={styles.formControl}
                    value={decisionReasonCode}
                    onChange={(e) => setDecisionReasonCode(e.target.value)}
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

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Officer Reviewer Notes (Sent to applicant & recorded in audit ledger)
                </label>
                <textarea
                  className={styles.formControl}
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Explain rationale for this decision..."
                />
              </div>

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowDecisionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deciding}
                  className={styles.btnPrimary}
                >
                  {deciding ? "Recording Decision..." : "Commit Decision ⚖️"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Decision Modal */}
      {showBulkModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.decisionDialog}>
            <div className={styles.dialogHeader}>
              <h2>Bulk Decision: {selectedIds.length} Applications</h2>
              <p>Applying bulk compliance resolution. Each action will be logged individually.</p>
            </div>

            <form onSubmit={(e) => void handleExecuteBulkDecision(e)}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bulk Action</label>
                <select
                  className={styles.formControl}
                  value={bulkDecision}
                  onChange={(e: any) => setBulkDecision(e.target.value)}
                >
                  <option value="APPROVE">Full Approval</option>
                  <option value="PROBATIONARY_APPROVE">Probationary Approval</option>
                  <option value="REQUEST_DOCS">Request Additional Documents</option>
                  <option value="REJECT">Reject Applications</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bulk Reviewer Notes</label>
                <textarea
                  className={styles.formControl}
                  rows={3}
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Enter reason or instructions applied to all selected applications..."
                />
              </div>

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowBulkModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkExecuting}
                  className={styles.btnPrimary}
                >
                  {bulkExecuting ? "Applying to Queue..." : `Apply to ${selectedIds.length} Applications`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
