import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PublisherWizard } from "../components/onboarding/PublisherWizard";
import { AdvertiserWizard } from "../components/onboarding/AdvertiserWizard";
import styles from "./RegisterPage.module.css";

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role")?.toLowerCase() === "advertiser" ? "ADVERTISER" : "PUBLISHER";
  const [accountType, setAccountType] = useState<"PUBLISHER" | "ADVERTISER">(initialRole);

  return (
    <div className={styles.page}>
      <div style={{ textAlign: "center", maxWidth: "42rem", margin: "0 auto 2rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem", letterSpacing: "-0.03em" }}>
          Partner Onboarding & Verification
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "1rem", lineHeight: 1.5, margin: 0 }}>
          TrafficVaultHub is built on strict verification and transparent ledger accounting.
          Every decision is explained. Every valid payout is tracked.
        </p>

        {/* Top Type Selector */}
        <div style={{ display: "inline-flex", background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: "9999px", padding: "0.35rem", marginTop: "1.5rem" }}>
          <button
            type="button"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "9999px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.92rem",
              background: accountType === "PUBLISHER" ? "var(--color-accent-cyan)" : "transparent",
              color: accountType === "PUBLISHER" ? "#05070d" : "var(--color-text-secondary)",
              transition: "all 0.15s ease",
            }}
            onClick={() => setAccountType("PUBLISHER")}
          >
            Affiliate / Publisher Sign-Up
          </button>
          <button
            type="button"
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "9999px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.92rem",
              background: accountType === "ADVERTISER" ? "var(--color-accent-violet)" : "transparent",
              color: accountType === "ADVERTISER" ? "#fff" : "var(--color-text-secondary)",
              transition: "all 0.15s ease",
            }}
            onClick={() => setAccountType("ADVERTISER")}
          >
            Advertiser / Brand Sign-Up
          </button>
        </div>
      </div>

      {accountType === "PUBLISHER" ? <PublisherWizard /> : <AdvertiserWizard />}

      <div style={{ textAlign: "center", marginTop: "2rem", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
        Already have a verified partner account?{" "}
        <Link to="/login" style={{ color: "var(--color-accent-cyan)", fontWeight: 500 }}>
          Sign In Here
        </Link>
      </div>
    </div>
  );
}
