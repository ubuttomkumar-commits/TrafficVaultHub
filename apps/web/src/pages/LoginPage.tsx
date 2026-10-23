import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function fillRole(roleEmail: string) {
    setEmail(roleEmail);
    setPassword("Password123!");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      const token = body?.data?.token as string;
      localStorage.setItem("tvh_token", token);
      localStorage.setItem("tvh_user", JSON.stringify(body?.data?.user ?? {}));

      // Route operators to /admin, partners to /earnings
      if (email.toLowerCase().includes("admin") || body?.data?.user?.role === "super_admin") {
        navigate("/admin");
      } else {
        navigate("/earnings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.brandLockup}>
        <div className={styles.brandLogo} />
        <span className={styles.brandName}>TrafficVaultHub</span>
      </div>

      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.subtitle}>
        Authoritative session tokens validated server-side per request. Zero client credential leakage.
      </p>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Account Email</label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="operator@trafficvaulthub.local"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Master Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className={styles.error} role="alert">
            ⚠️ {error}
          </div>
        )}

        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Authenticating Session…" : "Sign In to Network"}
        </button>
      </form>

      <div className={styles.quickRolesBox}>
        <span className={styles.quickRolesLabel}>Quick Session Demo Fill</span>
        <div className={styles.roleButtons}>
          <button
            type="button"
            className={styles.roleBtn}
            onClick={() => fillRole("admin@trafficvaulthub.local")}
          >
            <strong>Platform Operator</strong>
            <span>admin@trafficvaulthub.local</span>
          </button>
          <button
            type="button"
            className={styles.roleBtn}
            onClick={() => fillRole("partner@trafficvaulthub.com")}
          >
            <strong>Affiliate Partner</strong>
            <span>partner@trafficvaulthub.com</span>
          </button>
        </div>
      </div>

      <div className={styles.footerLinks}>
        <div>
          Platform Operator?{" "}
          <Link to="/admin/login" style={{ color: "var(--color-accent-cyan)", fontWeight: 600 }}>
            Go to Admin Portal →
          </Link>
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          New partner?{" "}
          <Link to="/signup" style={{ color: "var(--color-text-secondary)", textDecoration: "underline" }}>
            Apply for onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
