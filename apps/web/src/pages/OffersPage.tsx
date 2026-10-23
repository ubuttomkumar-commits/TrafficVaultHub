import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./OffersPage.module.css";

type Offer = {
  id: string;
  name: string;
  description: string | null;
  vertical: string | null;
  status: string;
  accessMode: string;
  payoutType: string | null;
  currency: string | null;
  affiliateCommissionMinor: number | null;
  conversionEvent: string | null;
};

type Application = {
  id: string;
  offer_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  traffic_sources?: string;
  message?: string;
};

type ListResponse = {
  data?: Offer[];
  pagination?: { total: number; page: number; hasMore: boolean };
  error?: { message: string };
};

function formatCommission(minor: number | null, currency: string | null) {
  if (minor == null || !currency) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Record<string, Application>>({});
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Application form state
  const [activeApplyOfferId, setActiveApplyOfferId] = useState<string | null>(null);
  const [trafficSources, setTrafficSources] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("tvh_token");

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/offers?limit=50"));
      const body = (await res.json()) as ListResponse;
      if (!res.ok) {
        setError(body.error?.message ?? `HTTP ${res.status}`);
        setOffers([]);
      } else {
        setOffers(body.data ?? []);
        setTotal(body.pagination?.total ?? 0);
      }

      if (token) {
        try {
          const appRes = await fetch(apiUrl("/api/v1/offers/applications/my"), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (appRes.ok) {
            const appBody = (await appRes.json()) as { data?: Application[] };
            const map: Record<string, Application> = {};
            for (const app of appBody.data ?? []) {
              map[app.offer_id] = app;
            }
            setApplications(map);
          }
        } catch {
          // ignore app load error
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token]);

  async function handleApply(e: React.FormEvent, offerId: string) {
    e.preventDefault();
    if (!token) {
      setError("Please sign in as a publisher to apply for offer access");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(apiUrl(`/api/v1/offers/${offerId}/apply`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trafficSources: trafficSources.trim() || undefined,
          message: notes.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message ?? `Failed to apply (HTTP ${res.status})`);
      }

      setSuccess("Application submitted successfully! Our compliance team will review your traffic sources.");
      setActiveApplyOfferId(null);
      setTrafficSources("");
      setNotes("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1>Universal Offer Marketplace</h1>
      <p className="muted">
        Browse verified advertiser offers with transparent attribution windows, explicit conversion rules, and instant tracking generation.
      </p>

      {loading && <p>Loading offers…</p>}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.success} role="status">
          {success}
        </div>
      )}

      {!loading && !error && offers.length === 0 && (
        <p className="muted">
          No public LIVE offers found ({total} total matching filters). Create offers in Campaign Studio to populate this catalog.
        </p>
      )}

      <ul className={styles.list}>
        {offers.map((o) => {
          const app = applications[o.id];
          const isPending = app?.status === "PENDING";
          const isApproved = app?.status === "APPROVED" || o.accessMode === "PUBLIC";

          return (
            <li key={o.id} className={styles.card}>
              <div className={styles.head}>
                <strong>{o.name}</strong>
                <div className={styles.badges}>
                  <span className={styles.badge}>{o.payoutType ?? "CPA"}</span>
                  <span className={styles.accessBadge}>{o.accessMode}</span>
                </div>
              </div>

              {o.description && <p className="muted">{o.description}</p>}

              <dl className={styles.meta}>
                <div>
                  <dt>Vertical</dt>
                  <dd>{o.vertical ?? "General"}</dd>
                </div>
                <div>
                  <dt>Commission</dt>
                  <dd className="mono">
                    {formatCommission(o.affiliateCommissionMinor, o.currency)}
                  </dd>
                </div>
                <div>
                  <dt>Event</dt>
                  <dd>{o.conversionEvent ?? "sale"}</dd>
                </div>
                <div>
                  <dt>Access Mode</dt>
                  <dd>{o.accessMode}</dd>
                </div>
              </dl>

              <div className={styles.cardActions}>
                {isApproved ? (
                  <>
                    <span className={styles.approvedTag}>✓ Approved Access</span>
                    <Link
                      to={`/tracking-links?offerId=${o.id}`}
                      className={styles.actionBtn}
                    >
                      Generate Tracking Link →
                    </Link>
                  </>
                ) : isPending ? (
                  <span className={styles.appliedTag}>⏳ Application Under Review</span>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => {
                        setActiveApplyOfferId(
                          activeApplyOfferId === o.id ? null : o.id
                        );
                      }}
                    >
                      {activeApplyOfferId === o.id ? "Cancel Application" : "Apply for Offer Access →"}
                    </button>
                    {!token && (
                      <Link to="/login" className={styles.secondaryBtn}>
                        Sign in to Apply
                      </Link>
                    )}
                  </>
                )}
              </div>

              {activeApplyOfferId === o.id && (
                <form
                  className={styles.applyBox}
                  onSubmit={(e) => void handleApply(e, o.id)}
                >
                  <h4>Submit Application for "{o.name}"</h4>
                  <div className={styles.applyField}>
                    <label htmlFor={`ts-${o.id}`}>Traffic Sources & Channels *</label>
                    <input
                      id={`ts-${o.id}`}
                      required
                      value={trafficSources}
                      onChange={(e) => setTrafficSources(e.target.value)}
                      placeholder="e.g. Google Search PPC, Native Ads, Email Newsletter"
                    />
                  </div>
                  <div className={styles.applyField}>
                    <label htmlFor={`msg-${o.id}`}>Notes / Monthly Volume Estimate</label>
                    <textarea
                      id={`msg-${o.id}`}
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. 5,000+ targeted monthly clicks in US/UK"
                    />
                  </div>
                  <button
                    type="submit"
                    className={styles.actionBtn}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Send Application to Advertiser"}
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
