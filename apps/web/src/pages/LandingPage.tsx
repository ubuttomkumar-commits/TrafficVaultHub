import { Link } from "react-router-dom";
import { HeroVaultScene } from "../components/HeroVaultScene";
import { ConversionEvidenceTrail } from "../components/ConversionEvidenceTrail";
import { TrustGraph } from "../components/TrustGraph";
import { CampaignRadar } from "../components/CampaignRadar";
import { OfferDiscoveryExplorer } from "../components/OfferDiscoveryExplorer";
import styles from "./LandingPage.module.css";

const PUBLISHER_PROBLEMS = [
  "Unexplained rejected conversions without audit trails",
  "Delayed or uncertain payments with unclear pending vs payable status",
  "Missing conversions and broken unauthenticated postbacks",
  "Difficulty finding relevant verified inventory across verticals",
  "Unexpected campaign pauses and arbitrary cap changes",
  "Poor dispute support with no evidence submission channel",
];

const PUBLISHER_SOLUTIONS = [
  "Explainable conversion decisions with standardized, human-readable reason codes",
  "Conversion Confidence Monitor for tracking health, latency, and delayed events",
  "Transparent Earnings Center separating pending, approved, payable, paid, and held balances",
  "Smart Offer Discovery with GEO, device, payout model, and category filters",
  "Dedicated dispute resolution workflow grounded in recorded server-side evidence",
  "SubID attribution telemetry (sub1–sub3) preserved across all conversion lifecycles",
];

const ADVERTISER_PROBLEMS = [
  "Fake, duplicate, or low-quality conversions draining marketing budgets",
  "Budget leakage and overspending from slow or missing cap enforcement",
  "Unreliable affiliate traffic with proxy clusters and datacenter bot farms",
  "Missing or incorrectly configured S2S postback callbacks",
  "Limited SubID visibility preventing campaign optimization",
  "Slow compliance workflows delaying campaign launches and updates",
];

const ADVERTISER_SOLUTIONS = [
  "Conversion Quality Shield blocking duplicates, replayed postbacks, and velocity bursts",
  "Spend Protection with server-enforced caps (Durable Objects) and automatic pause gates",
  "Live Campaign Health: postbacks, latency, cap utilization, budgets, and reconciliation",
  "Campaign Launch Studio with versioned payout models, macros, and readiness checks",
  "In-depth analytics by campaign, publisher, GEO, device, SubID, and conversion event",
  "Funding and liabilities reconciliation against an append-only double-entry ledger",
];

const FEATURES = [
  {
    title: "Universal Offer Engine",
    body: "Full support for CPA, CPL, CPI, CPS, CPV, CPE, CPC, CPM, recurring, and custom event-based commissions.",
  },
  {
    title: "Versioned Payout Rules",
    body: "Every conversion preserves the exact applicable payout terms, billing currency, calculation basis, and effective period.",
  },
  {
    title: "Conversion Evidence Trail",
    body: "Every event is cryptographically audited: click received -> attribution -> authenticated postback -> idempotency -> eligibility -> risk -> decision -> ledger.",
  },
  {
    title: "Explainable Rejections",
    body: "Standardized reasons: duplicate, invalid event, expired attribution, ineligible GEO, prohibited traffic source, policy hold, or review.",
  },
  {
    title: "Tracking Recovery Assistant",
    body: "Surface potentially missing or delayed events using authorized click tokens, postback records, and reconciliation evidence.",
  },
  {
    title: "Smart Offer Marketplace",
    body: "Searchable discovery by category, GEO, payout model, device, language, traffic source, and approval state.",
  },
  {
    title: "Multi-Dimensional Trust",
    body: "Verification covering email, phone, business registration, domain ownership, property verification, and compliance clearance.",
  },
  {
    title: "Unified Incident Room",
    body: "Operational visibility into tracking failures, queue telemetry, reconciliation gaps, compliance cases, and payout inquiries.",
  },
  {
    title: "Category-Agnostic Core",
    body: "Database-driven categories—from cybersecurity and SaaS to mobile apps, gaming, finance, and approved restricted verticals.",
  },
];

const FAQS = [
  {
    q: "What is the minimum payout threshold and payment schedule?",
    a: "The minimum payout threshold is $50 (5,000 minor units). Supported rails include Binance Pay (crypto) and wire transfers. Funds move to PAYABLE status once conversions are approved and hold periods clear.",
  },
  {
    q: "How does TrafficVaultHub prevent duplicate postback fraud?",
    a: "Every S2S postback is evaluated against a deterministic compound idempotency key (organizationId + externalConversionId). Replayed or duplicate postbacks are acknowledged without generating redundant ledger credits.",
  },
  {
    q: "How are campaign caps enforced across edge nodes?",
    a: "Caps are enforced in real-time via Cloudflare Durable Objects (OfferCapDO) with atomic in-memory mutexes and automatic atomic D1 database fallbacks. Once a daily or total cap is reached, traffic is safely paused or routed via Smartlinks.",
  },
  {
    q: "Can publishers dispute a rejected conversion?",
    a: "Yes. The platform provides a formal Disputes & Appeals workflow where affiliates can provide transaction evidence, server timestamps, or order receipts for manual compliance review.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Join & verify",
    body: "Publishers complete identity and domain verification before accessing live inventory and payouts.",
  },
  {
    n: "02",
    title: "Discover & apply",
    body: "Find eligible offers by vertical, payout model, and GEO with transparent commission terms.",
  },
  {
    n: "03",
    title: "Track securely",
    body: "Traffic flows through encrypted click IDs, deep SubIDs, and authenticated SHA-256 S2S postbacks.",
  },
  {
    n: "04",
    title: "Review & pay",
    body: "Valid conversions are explained, ledger-posted in integer minor units, and made payout-eligible.",
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
  "Secure sessions and role-based permissions (PBKDF2 Web Crypto)",
  "Idempotent conversion processing and duplicate replay protection",
  "Authenticated S2S postbacks with HMAC-SHA256 digital signature checks",
  "Append-only double-entry financial ledger in integer minor currency units",
  "Private compliance evidence storage with restricted tenant isolation",
  "Audit logs tracking all privileged administrative actions",
  "Privacy-aware collection and strict data minimization",
  "Explainable risk signals without exposing exploitable detection thresholds",
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
            <a href="#solutions">Solutions</a>
            <a href="#pipeline">Evidence Trail</a>
            <a href="#offers">Marketplace</a>
            <a href="#trust">Trust Graph</a>
            <a href="#radar">Radar</a>
            <a href="#faq">FAQ</a>
            <Link to="/offers">Browse Offers</Link>
            <Link to="/login" className={styles.navCta}>
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* HERO SECTION */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroGlow} aria-hidden />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Universal CPA Network · The Network That Shows Its Work</p>
              <h1 id="hero-title" className={styles.heroTitle}>
                More Conversions. More Revenue. More Trust.
              </h1>
              <p className={styles.heroSub}>
                Discover relevant offers, track conversions with greater transparency,
                and manage affiliate campaigns with stronger financial and fraud controls.
              </p>
              <div className={styles.heroCtas}>
                <Link to="/login" className={styles.btnPrimary}>
                  Start as Publisher
                </Link>
                <Link to="/campaign-studio" className={styles.btnSecondary}>
                  Start as Advertiser
                </Link>
              </div>
              <p className={styles.trustLine}>
                Minimum payout: $50 · Binance Pay supported · Double-entry financial ledger · Zero float drift
              </p>
            </div>

            <div className={styles.heroVisual}>
              <HeroVaultScene />
            </div>
          </div>
        </section>

        {/* SOLUTIONS SECTION */}
        <section id="solutions" className={styles.section} aria-labelledby="solutions-title">
          <h2 id="solutions-title" className={styles.sectionTitle}>
            Built to Solve the Problems That Break Affiliate Growth.
          </h2>
          <div className={styles.twoCol}>
            <article className={styles.glassCard}>
              <h3>For Publishers</h3>
              <p className={styles.cardKicker}>Industry pain points</p>
              <ul>
                {PUBLISHER_PROBLEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.cardKicker}>How TrafficVaultHub solves them</p>
              <ul className={styles.solList}>
                {PUBLISHER_SOLUTIONS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className={styles.glassCard}>
              <h3>For Advertisers</h3>
              <p className={styles.cardKicker}>Industry pain points</p>
              <ul>
                {ADVERTISER_PROBLEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.cardKicker}>How TrafficVaultHub solves them</p>
              <ul className={styles.solList}>
                {ADVERTISER_SOLUTIONS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {/* HOW IT WORKS & CONVERSION EVIDENCE TRAIL */}
        <section id="pipeline" className={styles.section} aria-labelledby="pipeline-title">
          <h2 id="pipeline-title" className={styles.sectionTitle}>
            How It Works & Conversion Evidence Trail
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
          <p className="muted" style={{ maxWidth: "42rem", margin: "1.5rem 0 1rem" }}>
            Every conversion passes through an 8-stage cryptographic lifecycle. Inspect how clicks, postbacks, risk signals, and ledger debits are validated in real time:
          </p>
          <ConversionEvidenceTrail />
        </section>

        {/* DYNAMIC OFFER DISCOVERY EXPLORER */}
        <section id="offers" className={styles.section} aria-labelledby="offers-title">
          <h2 id="offers-title" className={styles.sectionTitle}>
            Interactive Offer Discovery Explorer
          </h2>
          <p className="muted" style={{ maxWidth: "42rem", margin: "0 0 1rem" }}>
            Discover top-converting verified offers across cybersecurity, enterprise SaaS, gaming, and consumer verticals. Payouts locked into versioned contract terms.
          </p>
          <OfferDiscoveryExplorer />
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

        {/* CAMPAIGN RADAR & SPEND PROTECTION */}
        <section id="radar" className={styles.section} aria-labelledby="radar-title">
          <h2 id="radar-title" className={styles.sectionTitle}>
            Real-Time Spend Protection & Quality Shield
          </h2>
          <p className="muted" style={{ maxWidth: "42rem", margin: "0 0 1rem" }}>
            Automated cap enforcement prevents overspending with edge concurrency locks. Inspect live telemetry metrics:
          </p>
          <CampaignRadar />
        </section>

        {/* TRUST GRAPH SECTION */}
        <section id="trust" className={styles.section} aria-labelledby="trust-title">
          <h2 id="trust-title" className={styles.sectionTitle}>
            Multi-Dimensional Trust Graph
          </h2>
          <p className="muted" style={{ maxWidth: "42rem", margin: "0 0 1rem" }}>
            Trust is not a marketing promise. It is an infrastructure framework enforcing mathematical proofs, cryptographic signatures, and tenant isolation.
          </p>
          <TrustGraph />
          <ul className={styles.trustGrid} style={{ marginTop: "1.5rem" }}>
            {TRUST_ITEMS.map((item) => (
              <li key={item} className={styles.trustItem}>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* PAYOUT SECTION */}
        <section className={styles.section} aria-labelledby="payout-title">
          <h2 id="payout-title" className={styles.sectionTitle}>
            Get Paid With Absolute Clarity.
          </h2>
          <div className={styles.payoutPanel}>
            <p className={styles.payoutHighlight}>Minimum Payout: $50 · Multi-Currency Settlement</p>
            <p>
              Supported settlement rails include Binance Pay (USDT/crypto) and direct wire transfers.
              Eligibility is mathematically backed by verified ledger balances with clear separation between pending, approved, and payable funds.
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
              Payout availability is governed by double-entry ledger accounts, verification status, and transparent hold schedules.
            </p>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className={styles.section} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.sectionTitle}>
            Frequently Asked Questions
          </h2>
          <div className={styles.faqGrid}>
            {FAQS.map((faq, i) => (
              <div key={i} className={styles.faqCard}>
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className={styles.finalCta} aria-labelledby="cta-title">
          <h2 id="cta-title">Start Building Transparent Affiliate Growth.</h2>
          <p>
            Join TrafficVaultHub to discover offers, track conversions with confidence,
            and manage campaigns with real financial and operational visibility.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/login" className={styles.btnPrimary}>
              Start as Publisher
            </Link>
            <Link to="/campaign-studio" className={styles.btnSecondary}>
              Start as Advertiser
            </Link>
          </div>
          <p className={styles.trustLine}>
            Minimum payout $50 · Binance Pay supported · Transparent tracking · Double-entry ledger
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
              Every Click Accounted For. Every Decision Explained. Every Valid Payout Tracked.
            </p>
          </div>
          <div>
            <h3>Marketplace & Tracking</h3>
            <ul>
              <li>
                <Link to="/offers">Offer Marketplace</Link>
              </li>
              <li>
                <Link to="/tracking-links">Tracking Links Generator</Link>
              </li>
              <li>
                <Link to="/smartlinks">Smartlinks Traffic Router</Link>
              </li>
              <li>
                <Link to="/campaign-studio">Campaign Launch Studio</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Trust & Finance</h3>
            <ul>
              <li>
                <Link to="/earnings">Publisher Earnings</Link>
              </li>
              <li>
                <Link to="/conversion-confidence">Confidence Monitor</Link>
              </li>
              <li>
                <Link to="/disputes">Disputes & Appeals</Link>
              </li>
              <li>
                <Link to="/integrity">Fraud Shield & Integrity</Link>
              </li>
              <li>
                <Link to="/payouts">Payout Requests</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Platform & Legal</h3>
            <ul>
              <li>
                <Link to="/health">System Health</Link>
              </li>
              <li>
                <Link to="/compliance">Compliance Queue</Link>
              </li>
              <li>
                <Link to="/terms">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy">Privacy Policy</Link>
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
