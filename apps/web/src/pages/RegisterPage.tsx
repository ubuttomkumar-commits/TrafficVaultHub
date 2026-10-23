import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../lib/api";
import styles from "./RegisterPage.module.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role")?.toLowerCase() === "advertiser" ? "ADVERTISER" : "PUBLISHER";

  const [accountType, setAccountType] = useState<"PUBLISHER" | "ADVERTISER">(initialRole);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiUrl("/api/v1/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          displayName: displayName.trim(),
          accountType,
          organizationName: orgName.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? `Registration failed (HTTP ${res.status})`);
        return;
      }

      const token = body?.data?.token as string;
      if (token) {
        localStorage.setItem("tvh_token", token);
        localStorage.setItem("tvh_user", JSON.stringify(body?.data?.user ?? {}));
      }

      // Redirect based on role
      if (accountType === "ADVERTISER") {
        navigate("/campaign-studio");
      } else {
        navigate("/offers");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1>Create your Partner Account</h1>
      <p>
        Join TrafficVaultHub universal CPA network. Transparent tracking, clear attribution, and auditable financial records.
      </p>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.typeSelector}>
          <button
            type="button"
            className={`${styles.typeBtn} ${accountType === "PUBLISHER" ? styles.typeBtnActive : ""}`}
            onClick={() => setAccountType("PUBLISHER")}
          >
            <span>Affiliate / Publisher</span>
            <span className={styles.typeSub}>Promote offers & monetize traffic</span>
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${accountType === "ADVERTISER" ? styles.typeBtnActive : ""}`}
            onClick={() => setAccountType("ADVERTISER")}
          >
            <span>Advertiser / Brand</span>
            <span className={styles.typeSub}>Launch campaigns & track conversions</span>
          </button>
        </div>

        <label>
          Full Name / Contact Name *
          <input
            type="text"
            required
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Alex Rivera"
          />
        </label>

        <label>
          Work Email Address *
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </label>

        <label>
          {accountType === "PUBLISHER" ? "Media Property or Network Name" : "Company or Brand Name"} (Optional)
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder={accountType === "PUBLISHER" ? "e.g. Apex Media Group" : "e.g. CloudScale Tech"}
          />
        </label>

        <label>
          Password * (Minimum 8 characters)
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
          />
        </label>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Creating Account…" : `Register as ${accountType === "PUBLISHER" ? "Publisher" : "Advertiser"} →`}
        </button>

        <div className={styles.footerLinks}>
          Already registered? <Link to="/login">Sign in here</Link>
        </div>
      </form>
    </div>
  );
}
