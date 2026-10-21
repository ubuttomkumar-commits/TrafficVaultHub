import { useState } from "react";
import styles from "./TrustGraph.module.css";

const DIMENSIONS = [
  {
    id: "identity",
    title: "1. Identity & Business KYC",
    score: "VERIFIED",
    desc: "Strict verification of publisher and advertiser organizational credentials, tax records, and authorized officer contact.",
    evidence: "DocuSign + Corporate Registry Match",
    status: "100% Enforced",
  },
  {
    id: "property",
    title: "2. Domain & Property Control",
    score: "AUTHENTICATED",
    desc: "Domain DNS verification and ads.txt / app-ads.txt authorization confirming genuine traffic source ownership.",
    evidence: "DNS TXT + ads.txt crawler",
    status: "Automated Crawl",
  },
  {
    id: "crypto",
    title: "3. Cryptographic S2S HMAC",
    score: "SHA-256 SIGNED",
    desc: "All postback transactions verified via SHA-256 HMAC digital signatures using encrypted pre-shared secrets.",
    evidence: "HMAC Token Invariant",
    status: "Zero Spoofing",
  },
  {
    id: "ledger",
    title: "4. Ledger Parity Engine",
    score: "ZERO DRIFT",
    desc: "Double-entry accounting enforces debits equal credits in integer minor units across all publisher and advertiser accounts.",
    evidence: "Sum(Debits) == Sum(Credits)",
    status: "Mathematical Proof",
  },
  {
    id: "velocity",
    title: "5. Velocity & Replay Defense",
    score: "ACTIVE SHIELD",
    desc: "Atomic reservation locks prevent double-credit replay attacks and detect bot burst spikes in Durable Objects.",
    evidence: "OfferCapDO In-Memory Mutex",
    status: "Real-Time Defense",
  },
  {
    id: "compliance",
    title: "6. Category Compliance Gate",
    score: "AUDITED",
    desc: "Restricted verticals require explicit compliance officer approval before LIVE offer traffic activation.",
    evidence: "Audit Log #AUD_9812",
    status: "Human + Policy Guard",
  },
];

export function TrustGraph() {
  const [selectedId, setSelectedId] = useState("ledger");

  return (
    <div className={styles.trustCard}>
      <div className={styles.radarGrid}>
        {DIMENSIONS.map((dim) => {
          const isActive = dim.id === selectedId;
          return (
            <div
              key={dim.id}
              className={`${styles.dimensionBox} ${isActive ? styles.dimensionBoxActive : ""}`}
              onClick={() => setSelectedId(dim.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedId(dim.id);
              }}
            >
              <div className={styles.dimHeader}>
                <span className={styles.dimTitle}>{dim.title}</span>
                <span className={styles.dimScore}>{dim.score}</span>
              </div>
              <p className={styles.dimDesc}>{dim.desc}</p>
              <div className={styles.dimMeta}>
                <span>{dim.evidence}</span>
                <span className="mono" style={{ color: "var(--color-success)" }}>
                  {dim.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
