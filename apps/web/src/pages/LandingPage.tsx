import { Link } from "react-router-dom";
import { DataFlowNetwork } from "../components/DataFlowNetwork";
import { IllustrativeCharts } from "../components/IllustrativeCharts";
import styles from "./LandingPage.module.css";

const PUBLISHER_PROBLEMS = [
  "Unexplained rejected conversions",
  "Delayed or uncertain payments",
  "Missing conversions and broken postbacks",
  "Difficulty finding relevant offers",
  "Unexpected campaign pauses and cap changes",
  "Poor dispute support",
];

const PUBLISHER_SOLUTIONS = [
  "Explainable conversion decisions with standardized reason codes",
  "Conversion Confidence Monitor for tracking health and delayed events",
  "Transparent Earnings Center: pending, approved, payable, paid, reversed, disputed, held",
  "Smart Offer Discovery with GEO, device, payout model, and traffic filters",
  "Publisher Growth Coach with tracking and compliance guidance",
  "Disputes workflow with evidence, status, and audit history",
];

const ADVERTISER_PROBLEMS = [
  "Fake, duplicate, or low-quality conversions",
  "Budget leakage and overspending",
  "Unreliable affiliate traffic",
  "Missing or incorrectly configured tracking",
  "Limited SubID visibility",
  "Slow compliance and campaign review",
];

const ADVERTISER_SOLUTIONS = [
  "Conversion Quality Shield for duplicates, replayed postbacks, and abnormal velocity",
  "Live Campaign Health: postbacks, tracking errors, caps, budgets, reconciliation",
  "Spend Protection with server-enforced caps and automatic pause behavior",
  "Campaign Launch Studio with readiness checks and postback configuration",
  "Analytics by campaign, publisher, GEO, device, SubID, and event",
  "Funding and reconciliation visibility with recorded liabilities",
];

const FEATURES = [
  {
    title: "Universal Offer Engine",
    body: "CPA, CPL, CPI, CPS, CPV, CPE, CPC, CPM, recurring, revenue share, hybrid, and custom event-based commissions.",
  },
  {
    title: "Versioned Payout Rules",
    body: "Every conversion preserves the applicable payout terms, currency, calculation basis, and effective period.",
  },
  {
    title: "Conversion Evidence Trail",
    body: "Click received → attribution → authenticated postback → idempotency → eligibility → risk → decision → ledger.",
  },
  {
    title: "Explainable Rejections",
    body: "Standardized reasons: duplicate, invalid event, expired attribution, ineligible GEO, prohibited source, policy, review.",
  },
  {
    title: "Tracking Recovery Assistant",
    body: "Surface potentially missing or delayed events using authorized click, postback, and reconciliation evidence.",
  },
  {
    title: "Smart Offer Marketplace",
    body: "Searchable discovery by category, GEO, payout model, device, language, traffic source, and approval state.",
  },
  {
    title: "Trust-Based Access",
    body: "Multi-dimensional verification: email, phone, identity, business, domain, property, traffic source, compliance.",
  },
  {
    title: "Unified Incident Room",
    body: "Operational visibility into tracking failures, queue errors, reconciliation gaps, compliance cases, and payout issues.",
  },
  {
    title: "Category-Agnostic Infrastructure",
    body: "Database-driven categories—from apps and e-commerce to finance, education, and custom approved verticals.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Join & verify",
    body: "Publishers complete verification before accessing inventory and payouts.",
  },
  {
    n: "02",
    title: "Discover & apply",
    body: "Find eligible offers and request access where approval is required.",
  },
  {
    n: "03",
    title: "Track securely",
    body: "Traffic flows through secure click IDs and authenticated S2S postbacks.",
  },
  {
    n: "04",
    title: "Review & pay",
    body: "Valid conversions are explained, ledger-posted, and made payout-eligible.",
  },
];

const PAYOUT_STEPS = [
  "Received",
  "Reviewed",
  "Approved",
  "Payable",
  "Initiated",
  "Paid",
];

const TRUST_ITEMS = [
  "Server-side authorization and tenant isolation",
  "Secure sessions and role-based permissions",
  "Idempotent conversion processing and duplicate protection",
  "Authenticated S2S postbacks, signature checks, replay protection, rate limits",
  "Append-only double-entry ledger for auditable financial records",
  "Private compliance evidence storage with restricted access",
  "Audit logs for privileged actions",
  "Privacy-aware collection and data minimization",
  "Explainable risk signals without exposing exploitable thresholds",
];

export function LandingPage() {
  return (
    <div className={styles.page}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      <header className={styles.topNav}>
        <div className={styles.topInner}>
          <Link to="/" className={styles.brand} aria-label="TrafficVaultHub home">
            <span className={styles.logoMark} aria-hidden />
            <span className={styles.logoText}>TrafficVaultHub</span>
          </Link>
          <nav className={styles.navLinks} aria-label="Marketing">
            <a href="#problems">Solutions</a>
            <a href="#features">Platform</a>
            <a href="#how">How it works</a>
            <a href="#trust">Trust</a>
            <Link to="/offers">Offers</Link>
            <Link to="/login" className={styles.navCta}>
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* HERO */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroGlow} aria-hidden />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>The CPA Network That Shows Its Work</p>
              <h1 id="hero-title" className={styles.heroTitle}>
                The CPA Network Built for Transparent Growth.
              </h1>
              <p className={styles.heroSub}>
                TrafficVaultHub helps publishers track, understand, and protect
                every valid conversion — while giving advertisers powerful tools
                to control quality, fraud risk, and campaign spend.
              </p>
              <div className={styles.heroCtas}>
                <Link to="/login" className={styles.btnPrimary}>
                  Join as Publisher
                </Link>
                <Link to="/login" className={styles.btnSecondary}>
                  Launch an Advertiser Campaign
                </Link>
              </div>
              <p className={styles.trustLine}>
                Minimum payout: $50 · Binance Pay supported · Transparent
                conversion evidence
              </p>
            </div>

            <div className={styles.heroVisual} aria-label="Illustrative dashboard mockup">
              <div className={styles.networkLayer} aria-hidden>
                <DataFlowNetwork />
              </div>
              <div className={styles.mockFrame}>
                <div className={styles.mockBar}>
                  <span />
                  <span />
                  <span />
                  <em>Illustrative interface — not live production data</em>
                </div>
                <div className={styles.mockBody}>
                  <div className={styles.mockCard}>
                    <span className={styles.mockLabel}>Clicks</span>
                    <span className={styles.mockValue}>Tracked</span>
                  </div>
                  <div className={styles.mockCard}>
                    <span className={styles.mockLabel}>Postbacks</span>
                    <span className={styles.mockValue}>Authenticated</span>
                  </div>
                  <div className={styles.mockCard}>
                    <span className={styles.mockLabel}>Conversions</span>
                    <span className={styles.mockValue}>Pending / Approved</span>
                  </div>
                  <div className={styles.mockCard}>
                    <span className={styles.mockLabel}>Payouts</span>
                    <span className={styles.mockValue}>Ledger status</span>
                  </div>
                  <div className={`${styles.mockCard} ${styles.mockWide}`}>
                    <span className={styles.mockLabel}>Campaign health</span>
                    <span className={styles.mockValue}>
                      Caps · Budgets · Tracking signals
                    </span>
                  </div>
                </div>
                <IllustrativeCharts />
                <div className={styles.flowNodes} aria-hidden>
                  <span>Publisher</span>
                  <span className={styles.flowLine} />
                  <span>Tracking</span>
                  <span className={styles.flowLine} />
                  <span>Advertiser</span>
                  <span className={styles.flowLine} />
                  <span>Payout</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEMS */}
        <section id="problems" className={styles.section} aria-labelledby="problems-title">
          <h2 id="problems-title" className={styles.sectionTitle}>
            Built to Solve the Problems That Break Affiliate Growth.
          </h2>
          <div className={styles.twoCol}>
            <article className={styles.glassCard}>
              <h3>For Publishers</h3>
              <p className={styles.cardKicker}>Pain points</p>
              <ul>
                {PUBLISHER_PROBLEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.cardKicker}>How we address them</p>
              <ul className={styles.solList}>
                {PUBLISHER_SOLUTIONS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.glassCard}>
              <h3>For Advertisers</h3>
              <p className={styles.cardKicker}>Pain points</p>
              <ul>
                {ADVERTISER_PROBLEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.cardKicker}>How we address them</p>
              <ul className={styles.solList}>
                {ADVERTISER_SOLUTIONS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {/* FEATURES BENTO */}
        <section id="features" className={styles.section} aria-labelledby="features-title">
          <h2 id="features-title" className={styles.sectionTitle}>
            Everything a Modern CPA Network Needs.
          </h2>
          <div className={styles.bento}>
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className={`${styles.bentoCard} ${i === 0 || i === 2 ? styles.bentoWide : ""}`}
              >
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className={styles.section} aria-labelledby="how-title">
          <h2 id="how-title" className={styles.sectionTitle}>
            How it works
          </h2>
          <ol className={styles.steps}>
            {STEPS.map((s) => (
              <li key={s.n} className={styles.step}>
                <span className={styles.stepNum} aria-hidden>
                  {s.n}
                </span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* PAYOUT */}
        <section className={styles.section} aria-labelledby="payout-title">
          <h2 id="payout-title" className={styles.sectionTitle}>
            Get Paid With Clarity.
          </h2>
          <div className={styles.payoutPanel}>
            <p className={styles.payoutHighlight}>Minimum payout: $50</p>
            <p>
              Supported methods include Binance Pay and other configured payout
              rails. Eligibility depends on approved earnings, applicable
              holds/reserves, minimum thresholds, and payout schedules.
            </p>
            <div className={styles.timeline} role="list" aria-label="Payout stages">
              {PAYOUT_STEPS.map((label) => (
                <div key={label} className={styles.timelineItem} role="listitem">
                  <span className={styles.timelineDot} aria-hidden />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p className={styles.disclaimer}>
              Payout timing and availability depend on verification, approved
              earnings, payment-provider processing, and platform policies.
            </p>
          </div>
        </section>

        {/* TRUST */}
        <section id="trust" className={styles.section} aria-labelledby="trust-title">
          <h2 id="trust-title" className={styles.sectionTitle}>
            Trust Is Not a Claim. It Is Infrastructure.
          </h2>
          <ul className={styles.trustGrid}>
            {TRUST_ITEMS.map((item) => (
              <li key={item} className={styles.trustItem}>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* DIFFERENTIATORS */}
        <section className={styles.section} aria-labelledby="diff-title">
          <h2 id="diff-title" className={styles.sectionTitle}>
            Why TrafficVaultHub Is Different.
          </h2>
          <div className={styles.diffGrid}>
            <article className={styles.diffCard}>
              <h3>Shows Its Work</h3>
              <p>
                Every major conversion decision has an evidence-backed,
                explainable trail—not a black-box status change.
              </p>
            </article>
            <article className={styles.diffCard}>
              <h3>Protects Both Sides</h3>
              <p>
                Publishers get transparency and disputes; advertisers get quality
                controls and spend protection.
              </p>
            </article>
            <article className={styles.diffCard}>
              <h3>Built to Scale</h3>
              <p>
                Configurable categories, versioned payout rules, flexible events,
                and a modern Cloudflare-based architecture.
              </p>
            </article>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className={styles.finalCta} aria-labelledby="cta-title">
          <h2 id="cta-title">Start Building Transparent Affiliate Growth.</h2>
          <p>
            Join TrafficVaultHub to discover offers, track conversions with
            confidence, and manage campaigns with real financial and operational
            visibility.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/login" className={styles.btnPrimary}>
              Create Publisher Account
            </Link>
            <Link to="/login" className={styles.btnSecondary}>
              Become an Advertiser
            </Link>
          </div>
          <p className={styles.trustLine}>
            Minimum payout $50 · Binance Pay supported · Transparent tracking ·
            Explainable decisions
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.brand}>
              <span className={styles.logoMark} aria-hidden />
              <span className={styles.logoText}>TrafficVaultHub</span>
            </div>
            <p className={styles.footerTag}>
              Every Click Accounted For. Every Decision Explained. Every Valid
              Payout Tracked.
            </p>
          </div>
          <div>
            <h3>Product</h3>
            <ul>
              <li>
                <Link to="/offers">Offer Marketplace</Link>
              </li>
              <li>
                <Link to="/earnings">Earnings Center</Link>
              </li>
              <li>
                <Link to="/login">Publisher Dashboard</Link>
              </li>
              <li>
                <Link to="/login">Advertiser Dashboard</Link>
              </li>
              <li>
                <Link to="/login">Campaign Launch Studio</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Company</h3>
            <ul>
              <li>
                <a href="#trust">Trust Center</a>
              </li>
              <li>
                <a href="#features">Platform</a>
              </li>
              <li>
                <Link to="/health">System Health</Link>
              </li>
              <li>
                <a href="mailto:support@trafficvaulthub.local">Support</a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Legal</h3>
            <ul>
              <li>
                <span className={styles.legalMuted}>Terms of Service</span>
              </li>
              <li>
                <span className={styles.legalMuted}>Privacy Policy</span>
              </li>
              <li>
                <span className={styles.legalMuted}>Cookie Policy</span>
              </li>
              <li>
                <span className={styles.legalMuted}>Restricted Categories Policy</span>
              </li>
              <li>
                <span className={styles.legalMuted}>Acceptable Use Policy</span>
              </li>
            </ul>
          </div>
        </div>
        <p className={styles.compliance}>
          Adult Dating and other restricted categories are available only where
          legally eligible and subject to manual review, jurisdictional
          restrictions, age requirements, and platform approval.
        </p>
        <p className={styles.copy}>
          © {new Date().getFullYear()} TrafficVaultHub. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
