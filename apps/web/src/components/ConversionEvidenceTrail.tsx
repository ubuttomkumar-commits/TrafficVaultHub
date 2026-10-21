import { useState } from "react";
import styles from "./ConversionEvidenceTrail.module.css";

const STAGES = [
  {
    step: "01",
    name: "Click Received",
    title: "1. Authoritative Click Ingest",
    desc: "Every inbound click via /api/v1/t/:code logs an encrypted click ID, evaluates offer caps in Durable Objects, and validates subID parameters before 302 redirection.",
    code: `GET /api/v1/t/trk_vpn_top?sub1=search&sub2=us
-> Status: 302 Found
-> Click-ID: clk_8f9c1b72e04a91
-> DurableObject: Caps Reserved (Daily: 1421/5000)
-> Location: https://advertiser.com/lander?click_id=clk_8f9c1b72e04a91`,
    tag: "Sub-millisecond Ingest",
  },
  {
    step: "02",
    name: "Attribution Matching",
    title: "2. Attribution & Window Verification",
    desc: "Attribution window is strictly evaluated against offer terms. Expired click tokens are rejected with standardized EXPIRED_ATTRIBUTION code.",
    code: `Attribution Engine Check:
-> Click Timestamp: 2026-10-21T10:14:02Z
-> Event Timestamp: 2026-10-21T10:18:45Z (Delta: 4m 43s)
-> Window Allowed: 30 Days (43,200 min)
-> Verdict: PASS (Valid Attribution Match)`,
    tag: "Cryptographic Match",
  },
  {
    step: "03",
    name: "S2S Postback",
    title: "3. Authenticated S2S Postback",
    desc: "Postback callbacks require cryptographic signature validation (HMAC SHA-256) using tenant-specific pre-shared keys to prevent falsified notifications.",
    code: `POST /api/v1/postbacks/s2s
Headers:
  X-TVH-Signature: sha256=9b3a...7c1f
Payload:
  {"click_id":"clk_8f9c1b72e04a91","event":"sale","payout_cents":5000}
-> HMAC Verification: VALID`,
    tag: "HMAC-SHA256 Authenticated",
  },
  {
    step: "04",
    name: "Idempotency Check",
    title: "4. Idempotency & Replay Defense",
    desc: "Every external transaction ID is paired with click ID into a deterministic compound key. Duplicate callbacks are acknowledged without duplicate ledger postings.",
    code: `Compound Key: idemp:org_adv_01:tx_9921_clk_8f9c1b72e04a91
-> KV / D1 Deduplication: Checked
-> Replay Detection: None (First-time occurrence)
-> State Transition: RECEIVED -> VALIDATING`,
    tag: "Strict Dedup",
  },
  {
    step: "05",
    name: "Eligibility & Caps",
    title: "5. Cap & Geo-Eligibility Verification",
    desc: "Verifies offer is LIVE, caps are within daily and lifetime limits, and conversion origin complies with targeted GEO and device parameters.",
    code: `Cap & Policy Matrix:
-> Offer Status: LIVE (Access Mode: PUBLIC)
-> Daily Cap: 1,421 / 5,000 (Pass)
-> Lifetime Cap: 31,201 / 100,000 (Pass)
-> GEO Target: US (Visitor GEO: US -> PASS)`,
    tag: "Budget Shield Active",
  },
  {
    step: "06",
    name: "Risk Shield",
    title: "6. Conversion Quality Shield",
    desc: "Checks velocity anomalies, TOR/datacenter proxies, and rapid replay clusters. Suspicious anomalies flag FRAUD_REVIEW rather than silent dropped events.",
    code: `Risk Evaluation Signals:
-> Click-to-Conversion Velocity: 283s (Organic)
-> SubID Cluster Distribution: Normal Variance
-> Datacenter IP Flag: False
-> Fraud Score: 0.04 (Acceptance Threshold < 0.25)`,
    tag: "Anomaly Detection",
  },
  {
    step: "07",
    name: "Decision Engine",
    title: "7. Standardized Decision Reason",
    desc: "Conversions transition deterministically into APPROVED or explainable REJECTED states with human-readable and machine-verifiable codes.",
    code: `Decision Engine Outcome:
-> Conversion ID: conv_47fa918b201
-> Status: APPROVED
-> Reason Code: QUALIFIED_TIER1_ACTION
-> Affiliate Commission: $15.00 (1500 minor units)`,
    tag: "100% Explainable",
  },
  {
    step: "08",
    name: "Ledger Posting",
    title: "8. Immutable Double-Entry Ledger",
    desc: "Approved conversions trigger atomic journal entries crediting publisher pending/payable accounts and debiting advertiser campaign funding. Zero float drift.",
    code: `Double-Entry Journal Entry:
-> Debit:  ACT_ADV_PREPAID_LIABILITY  $20.00
-> Credit: ACT_PUB_PAYABLE_EARNINGS  $15.00
-> Credit: ACT_PLATFORM_MARGIN       $5.00
-> Sum Balanced: $20.00 == $20.00 (Zero Drift)`,
    tag: "Ledger-Backed Parity",
  },
];

export function ConversionEvidenceTrail() {
  const [activeIdx, setActiveIdx] = useState(0);
  const current = STAGES[activeIdx];

  return (
    <div className={styles.trailCard}>
      <nav className={styles.stageNav} aria-label="Evidence trail stages">
        {STAGES.map((s, idx) => (
          <button
            key={s.step}
            type="button"
            className={`${styles.stageBtn} ${idx === activeIdx ? styles.stageBtnActive : ""}`}
            onClick={() => setActiveIdx(idx)}
          >
            <span className={styles.stageNumber}>{s.step}</span>
            <span>{s.name}</span>
          </button>
        ))}
      </nav>

      <div className={styles.detailBox}>
        <div className={styles.detailCopy}>
          <h3>
            {current.title}
            <span className={styles.badgeSecure}>{current.tag}</span>
          </h3>
          <p>{current.desc}</p>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            Step {activeIdx + 1} of {STAGES.length} in the authoritative TrafficVaultHub verification lifecycle.
          </div>
        </div>

        <div>
          <pre className={styles.codeBlock}>
            <code>{current.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
