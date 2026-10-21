import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./SmartlinksPage.module.css";

type OfferItem = {
  id: string;
  name: string;
  vertical: string | null;
  payoutType: string | null;
};

type SmartlinkTargetInput = {
  offerId: string;
  weight: number;
};

type SmartlinkRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  created_at?: string;
};

export function SmartlinksPage() {
  const [organizationId, setOrg] = useState("");
  const [name, setName] = useState("");
  const [availableOffers, setAvailableOffers] = useState<OfferItem[]>([]);
  const [targets, setTargets] = useState<SmartlinkTargetInput[]>([
    { offerId: "", weight: 1 },
  ]);
  const [smartlinks, setSmartlinks] = useState<SmartlinkRow[]>([]);
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

    async function loadOffers() {
      try {
        const res = await fetch(apiUrl("/api/v1/offers?limit=50"));
        const body = await res.json();
        if (res.ok && body.data) {
          setAvailableOffers(body.data);
          if (body.data.length > 0) {
            setTargets([{ offerId: body.data[0].id, weight: 1 }]);
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
      void loadSmartlinks();
    }
  }, [organizationId]);

  async function loadSmartlinks() {
    const token = localStorage.getItem("tvh_token");
    if (!token || !organizationId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/smartlinks?organizationId=${encodeURIComponent(organizationId.trim())}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await res.json();
      if (res.ok) {
        setSmartlinks(body.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function addTargetRow() {
    const defaultOfferId = availableOffers[0]?.id || "";
    setTargets([...targets, { offerId: defaultOfferId, weight: 1 }]);
  }

  function removeTargetRow(index: number) {
    if (targets.length <= 1) return;
    setTargets(targets.filter((_, i) => i !== index));
  }

  function updateTarget(index: number, field: "offerId" | "weight", value: string | number) {
    setTargets(
      targets.map((t, i) => {
        if (i !== index) return t;
        return {
          ...t,
          [field]: field === "weight" ? Math.max(1, Number(value) || 1) : value,
        };
      })
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("tvh_token");
    if (!token) {
      setError("Sign in required to configure smartlinks");
      return;
    }
    const validTargets = targets.filter((t) => t.offerId.trim());
    if (validTargets.length === 0) {
      setError("At least one target offer is required");
      return;
    }

    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      const res = await fetch(apiUrl("/api/v1/smartlinks"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organizationId.trim(),
          name: name.trim(),
          targets: validTargets,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
      } else {
        setMsg(`Smartlink deployed: ${body?.data?.code} (${body?.data?.name})`);
        setName("");
        void loadSmartlinks();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create smartlink");
    } finally {
      setLoading(false);
    }
  }

  function getSmartlinkUrl(code: string) {
    return `${window.location.origin}/api/v1/sl/${code}`;
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

  return (
    <div className={styles.page}>
      <h1>Smartlinks & Traffic Distribution</h1>
      <p className="muted">
        Route incoming clicks dynamically across weighted LIVE offers. Real probabilistic traffic distribution
        backed by server-side routing. {!localStorage.getItem("tvh_token") && <Link to="/login">Sign in</Link>}
      </p>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {msg && <div className={styles.ok} role="status">{msg}</div>}

      <div className={styles.card}>
        <h2>Deploy New Smartlink</h2>
        <form className={styles.form} onSubmit={(e) => void handleCreate(e)}>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label htmlFor="sl-org">Organization ID</label>
              <input
                id="sl-org"
                value={organizationId}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="org_traffic_vault"
                className="mono"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="sl-name">Smartlink Name</label>
              <input
                id="sl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Global Tier-1 VPN & Security Mix"
                required
                maxLength={120}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Weighted Target Offers</label>
            <div className={styles.targetList}>
              {targets.map((t, idx) => (
                <div key={idx} className={styles.targetRow}>
                  <select
                    value={t.offerId}
                    onChange={(e) => updateTarget(idx, "offerId", e.target.value)}
                    required
                  >
                    {availableOffers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.vertical ?? "General"} · {o.payoutType ?? "CPA"})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={t.weight}
                    onChange={(e) => updateTarget(idx, "weight", e.target.value)}
                    placeholder="Weight (1-100)"
                    required
                  />
                  {targets.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeTargetRow(idx)}
                      title="Remove target"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className={styles.addTargetBtn}
              onClick={addTargetRow}
            >
              + Add Target Offer
            </button>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Deploying…" : "Deploy Smartlink"}
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <h2>Active Smartlinks</h2>
        {smartlinks.length === 0 ? (
          <p className="muted">No smartlinks configured yet for this organization.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Status</th>
                <th>Direct Routing URL</th>
              </tr>
            </thead>
            <tbody>
              {smartlinks.map((sl) => {
                const slUrl = getSmartlinkUrl(sl.code);
                return (
                  <tr key={sl.id}>
                    <td className="mono"><strong>{sl.code}</strong></td>
                    <td>{sl.name}</td>
                    <td><span className="mono">{sl.status}</span></td>
                    <td>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => void copyToClipboard(slUrl, sl.id)}
                      >
                        {copiedCode === sl.id ? "Copied!" : "Copy Link"}
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
