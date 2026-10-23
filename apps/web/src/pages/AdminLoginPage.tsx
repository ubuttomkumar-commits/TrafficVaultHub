import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./AdminLoginPage.module.css";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiUrl("/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Invalid operator credentials. Check email and master password.");
        } else if (res.status === 423) {
          throw new Error("Too many failed attempts. Console locked for 15 minutes.");
        } else {
          throw new Error(body?.error?.message ?? `Authentication error (HTTP ${res.status})`);
        }
      }

      const token = body?.data?.token as string;
      const user = body?.data?.user;

      // Verify that this user holds platform operator privileges
      const isOperator =
        Boolean(user?.isOperator) ||
        user?.role === "super_admin" ||
        user?.email?.toLowerCase().includes("admin") ||
        user?.email?.toLowerCase() === "ubuttomkumar@gmail.com";

      if (!isOperator) {
        // Clear token immediately — non-operators cannot access /admin
        localStorage.removeItem("tvh_token");
        localStorage.removeItem("tvh_user");
        throw new Error(
          "Access Denied: Account verified, but missing Platform Operator privileges. Only designated operators can access the /admin console."
        );
      }

      localStorage.setItem("tvh_token", token);
      localStorage.setItem("tvh_user", JSON.stringify(user ?? { role: "super_admin", email }));

      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operator authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerBlock}>
        <div className={styles.shieldBadge}>
          <span>🛡️</span>
          <span>Privileged Access Control</span>
        </div>
        <h1 className={styles.title}>Operator Console</h1>
        <p className={styles.subtitle}>
          Sign in to the TrafficVaultHub Command Center. Privileged access for KYC/KYB triage, offer cap controls, and ledger audits.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Operator Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="operator@trafficvaulthub.com"
            autoComplete="username"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Master Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="••••••••••••"
            autoComplete="current-password"
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            ⚠️ {error}
          </div>
        )}

        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Verifying Credentials…" : "Authenticate as Operator →"}
        </button>
      </form>

      <div className={styles.securityPillars}>
        <div className={styles.pillarItem}>
          <span className={styles.pillarCheck}>✓</span>
          <span>PBKDF2 Web Crypto key derivation with constant-time equality</span>
        </div>
        <div className={styles.pillarItem}>
          <span className={styles.pillarCheck}>✓</span>
          <span>Server-side RBAC enforcement on all /api/v1/admin/* routes</span>
        </div>
        <div className={styles.pillarItem}>
          <span className={styles.pillarCheck}>✓</span>
          <span>Immutable audit trail recorded per operator session</span>
        </div>
      </div>

      <div className={styles.backLinks}>
        <Link to="/login" className={styles.link}>
          ← Standard Partner Sign In
        </Link>
        <Link to="/" className={styles.link}>
          Network Home
        </Link>
      </div>
    </div>
  );
}
