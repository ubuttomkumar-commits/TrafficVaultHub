import React, { useState } from "react";
import styles from "./HowItWorksProcess.module.css";

const STEPS = [
  {
    num: "1",
    title: "1. Discover Offer",
    desc: "Find the right offers for your audience.",
    gradient: "radial-gradient(circle, #3b0764 0%, #1e1136 60%, #0a0614 100%)",
    glowColor: "rgba(168, 85, 247, 0.45)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    codeLog: `GET /api/v1/offers?category=cybersecurity&status=LIVE
-> Authenticated publisher permissions verified.
-> 14 verified high-converting CPA campaigns loaded.`,
  },
  {
    num: "2",
    title: "2. Track Click",
    desc: "Unique ID & attribution are recorded.",
    gradient: "radial-gradient(circle, #082f49 0%, #0c1e33 60%, #040d17 100%)",
    glowColor: "rgba(56, 189, 248, 0.45)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 3 10.07 19.97 12.58 12.58 19.97 10.07 3 3" />
      </svg>
    ),
    codeLog: `GET /api/v1/t/trk_vpn_top?sub1=campaign_01&sub2=ad_tier1
-> Click-ID: clk_8f9c1b72e04a91
-> DurableObject Cap Reservation: Daily 1,421 / 5,000 (Pass)
-> 302 Redirect to advertiser landing page.`,
  },
  {
    num: "3",
    title: "3. Validate Event",
    desc: "Server-side checks and deduplication.",
    gradient: "radial-gradient(circle, #083344 0%, #06212e 60%, #030f14 100%)",
    glowColor: "rgba(34, 211, 238, 0.45)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    codeLog: `POST /api/v1/postbacks/s2s
-> X-TVH-Signature: sha256=9b3a...7c1f (Valid HMAC)
-> Idempotency Key: idemp:org_adv_01:tx_9921_clk_8f9c1b72e04a91
-> Deduplication check: PASS (First-time unique conversion)`,
  },
  {
    num: "4",
    title: "4. Review Conversion",
    desc: "Fraud, policy and eligibility checks.",
    gradient: "radial-gradient(circle, #1e1b4b 0%, #131233 60%, #09081a 100%)",
    glowColor: "rgba(99, 102, 241, 0.45)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    codeLog: `Quality Shield Engine:
-> Velocity: 283s (Organic human flow)
-> GEO Target: US (Visitor US -> PASS)
-> Status transition: RECEIVED -> APPROVED`,
  },
  {
    num: "5",
    title: "5. Record Earnings",
    desc: "Approved and tracked in your wallet.",
    gradient: "radial-gradient(circle, #022c22 0%, #041f19 60%, #020f0c 100%)",
    glowColor: "rgba(52, 211, 153, 0.45)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    codeLog: `Double-Entry Ledger Posting:
-> Journal Type: CONVERSION_COMMISSION
-> Credit: Publisher Payable Wallet +$15.00
-> Parity verified: Zero drift across minor currency units.`,
  },
];

export function HowItWorksProcess() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className={styles.container}>
      <div className={styles.stepsTrack}>
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.num}>
            <button
              type="button"
              className={`${styles.stepNode} ${activeStep === idx ? styles.stepNodeActive : ""}`}
              onClick={() => setActiveStep(idx)}
              aria-label={`Step ${s.title}`}
            >
              <div
                className={styles.iconPlate}
                style={{
                  background: s.gradient,
                  boxShadow: activeStep === idx ? `0 0 28px ${s.glowColor}` : `0 8px 20px rgba(0, 0, 0, 0.5)`,
                }}
              >
                {s.icon}
              </div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepDesc}>{s.desc}</p>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={styles.arrowConnector} aria-hidden="true">
                →
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className={styles.logPreview}>
        <div className={styles.logHeader}>
          <span>STAGE #{activeStep + 1} LIVE ENGINE TELEMETRY</span>
          <span>CLICK STEP TO INSPECT SERVER ACTIONS</span>
        </div>
        <p className={styles.logBody}>{STEPS[activeStep].codeLog}</p>
      </div>
    </div>
  );
}
