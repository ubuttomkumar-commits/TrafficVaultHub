import { useState } from "react";
import { Link } from "react-router-dom";
import { HeroVaultScene } from "../components/HeroVaultScene";
import { HowItWorksProcess } from "../components/HowItWorksProcess";
import { OfferCategoriesGrid } from "../components/OfferCategoriesGrid";
import { TrustSection } from "../components/TrustSection";
import { FAQAccordion } from "../components/FAQAccordion";
import { FinalCTASection } from "../components/FinalCTASection";
import styles from "./LandingPage.module.css";

export function LandingPage() {
  const [themeMode, setThemeMode] = useState<"dark" | "cyber">("cyber");

  return (
    <div className={styles.page}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      {/* SECTION 1 — COMPACT PREMIUM DARK NAVIGATION */}
      <header className={styles.topNav}>
        <div className={styles.topInner}>
          <Link to="/" className={styles.brand} aria-label="TrafficVaultHub home">
            <div className={styles.logoIcon}>
              <span className={styles.logoV}>V</span>
            </div>
            <div className={styles.brandCol}>
              <span className={styles.brandName}>TrafficVaultHub</span>
              <span className={styles.brandSub}>Universal CPA Network</span>
            </div>
          </Link>

          <nav className={styles.navLinks} aria-label="Primary Navigation">
            <Link to="/" className={`${styles.navItem} ${styles.navItemActive}`}>Home</Link>
            <Link to="/offers" className={styles.navItem}>Offers</Link>
            <a href="#problems" className={styles.navItem}>Publishers</a>
            <a href="#problems" className={styles.navItem}>Advertisers</a>
            <Link to="/conversion-confidence" className={styles.navItem}>Resources ▾</Link>
            <a href="#trust" className={styles.navItem}>About ▾</a>
          </nav>

          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.themeBtn}
              onClick={() => setThemeMode(themeMode === "cyber" ? "dark" : "cyber")}
              aria-label="Toggle visual theme mode"
              title="Toggle theme mode"
            >
              ☀️
            </button>
            <Link to="/login" className={styles.loginBtn}>
              Login
            </Link>
            <Link to="/signup" className={styles.getStartedBtn}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* SECTION 2 — CINEMATIC HERO */}
        <section className={styles.heroSection} aria-labelledby="hero-title">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.heroTaglinePill}>
                The CPA Network That Shows Its Work.
              </div>
              <h1 id="hero-title" className={styles.heroHeadline}>
                More <span className={styles.cyanText}>Conversions.</span><br />
                More <span className={styles.gradientRev}>Revenue.</span><br />
                More <span className={styles.purpleText}>Trust.</span>
              </h1>
              <p className={styles.heroSubtext}>
                Discover relevant offers, track conversions with greater transparency,
                and manage affiliate campaigns with stronger financial and fraud controls.
              </p>
              <div className={styles.heroCtas}>
                <Link to="/signup?role=publisher" className={styles.ctaPublisher}>
                  Start as Publisher →
                </Link>
                <Link to="/signup?role=advertiser" className={styles.ctaAdvertiser}>
                  Start as Advertiser →
                </Link>
              </div>

              {/* Four Compact Trust Indicators */}
              <div className={styles.trustIndicatorsRow}>
                <div className={styles.trustIndicatorItem}>
                  <div className={styles.trustIcon}>🔍</div>
                  <span>Transparent Tracking</span>
                </div>
                <div className={styles.trustIndicatorItem}>
                  <div className={styles.trustIcon}>💳</div>
                  <span>Flexible Payouts</span>
                </div>
                <div className={styles.trustIndicatorItem}>
                  <div className={styles.trustIcon}>🛡️</div>
                  <span>Fraud Protection</span>
                </div>
                <div className={styles.trustIndicatorItem}>
                  <div className={styles.trustIcon}>📊</div>
                  <span>Reliable Reporting</span>
                </div>
              </div>
            </div>

            {/* Real Interactive 3D Digital Vault (Three.js WebGL Engine) */}
            <HeroVaultScene />
          </div>
        </section>

        {/* SECTION 3 — PUBLISHER AND ADVERTISER VALUE CARDS */}
        <section id="problems" className={styles.sectionWrap} aria-labelledby="solve-title">
          <div className={styles.splitSection}>
            <div>
              <div className={styles.sectionPill}>Built for Your Success</div>
              <h2 id="solve-title" className={styles.sectionHeading}>
                Solve Real <span className={styles.cyanText}>Problems</span>
              </h2>
              <p className={styles.sectionText}>
                Whether you're a publisher looking to grow your earnings or an advertiser
                seeking quality conversions — we've got you covered.
              </p>
            </div>

            <div className={styles.twoCardsGrid}>
              {/* For Publishers Card */}
              <article className={styles.featureCard}>
                <div>
                  <div className={styles.cardHead}>
                    <div className={styles.cardAvatarIcon}>👤</div>
                    <div>
                      <h3 className={styles.cardTitle}>For Publishers</h3>
                      <div className={styles.cardSub}>More earnings. More control.</div>
                    </div>
                  </div>
                  <ul className={styles.cardList}>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Understand conversion decisions</span>
                    </li>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Diagnose missing or delayed tracking</span>
                    </li>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Find relevant offers for your traffic</span>
                    </li>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Track pending, <strong>approved</strong> & payable earnings</span>
                    </li>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Resolve disputes with evidence</span>
                    </li>
                  </ul>
                </div>
                <Link to="/login" className={styles.cardBtnPub}>
                  Grow as a Publisher →
                </Link>
              </article>

              {/* For Advertisers Card */}
              <article className={styles.featureCard}>
                <div>
                  <div className={styles.cardHead}>
                    <div className={styles.cardAvatarIcon} style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>📊</div>
                    <div>
                      <h3 className={styles.cardTitle}>For Advertisers</h3>
                      <div className={styles.cardSub} style={{ color: "var(--tvh-cyan)" }}>Better traffic. Higher ROI.</div>
                    </div>
                  </div>
                  <ul className={styles.cardList}>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Detect suspicious conversion patterns</span>
                    </li>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Protect campaign budgets and caps</span>
                    </li>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Diagnose postback failures</span>
                    </li>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Analyze campaign performance</span>
                    </li>
                    <li className={styles.cardListItem}>
                      <span className={styles.checkCircle}>✓</span>
                      <span>Manage compliance & publisher quality</span>
                    </li>
                  </ul>
                </div>
                <Link to="/campaign-studio" className={styles.cardBtnAdv}>
                  Launch a Campaign →
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* SECTION 4 — HOW IT WORKS (REAL INTERACTIVE COMPONENT) */}
        <section id="how" className={styles.sectionWrap} aria-labelledby="how-title">
          <div className={styles.splitSection}>
            <div>
              <div className={styles.sectionPill}>Simple. Transparent. Powerful.</div>
              <h2 id="how-title" className={styles.sectionHeading}>
                How It Works
              </h2>
              <p className={styles.sectionText}>
                From discovery to payout — every step is tracked, verified and recorded.
              </p>
              <Link to="/conversion-confidence" className={styles.cardBtnPub}>
                Explore Full Flow →
              </Link>
            </div>

            <HowItWorksProcess />
          </div>
        </section>

        {/* SECTION 5 — OFFER CATEGORIES (12 REAL LUMINOUS TILES) */}
        <section id="categories" className={styles.sectionWrap} aria-labelledby="cat-title">
          <div className={styles.splitSection}>
            <div>
              <div className={styles.sectionPill}>Explore Opportunities</div>
              <h2 id="cat-title" className={styles.sectionHeading}>
                Offer Categories
              </h2>
              <p className={styles.sectionText}>
                Find your perfect vertical. Millions of opportunities across 12+ categories.
              </p>
              <Link to="/offers" className={styles.cardBtnAdv}>
                Browse All Offers →
              </Link>
            </div>

            <OfferCategoriesGrid />
          </div>
        </section>

        {/* SECTION 6 — TRUST AND TRANSPARENCY (REAL 3D GLOBE & SHIELD) */}
        <section id="trust" className={styles.sectionWrap} aria-labelledby="trust-title">
          <TrustSection />
        </section>

        {/* SECTION 7 — PRODUCT PREVIEW CARDS ("SEE IT IN ACTION") */}
        <section id="previews" className={styles.sectionWrap} aria-labelledby="preview-title">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div className={styles.sectionPill}>Product Preview</div>
              <h2 id="preview-title" className={styles.sectionHeading}>
                See It in Action
              </h2>
              <p className={styles.sectionText} style={{ margin: 0 }}>
                Get a closer look at key features and real dashboards.
              </p>
            </div>
            <Link to="/earnings" className={styles.cardBtnPub}>
              Explore All Features →
            </Link>
          </div>

          <div className={styles.productCardsGrid}>
            {/* Card 1: Publisher Earnings Center */}
            <Link to="/earnings" className={styles.previewCard}>
              <div>
                <div className={styles.previewMiniHeader}>
                  <span className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--tvh-cyan)" }}>
                    $248.50
                  </span>
                  <span className={styles.miniTag}>PAYABLE</span>
                </div>
                <h3 className={styles.previewCardTitle}>Publisher Earnings Center</h3>
                <p className={styles.previewCardDesc}>
                  Separate pending, approved and payable earnings with complete ledger transparency.
                </p>
                <div className={styles.previewMeter}>
                  <div className={styles.previewMeterFill} style={{ width: "78%" }} />
                </div>
              </div>
              <span className={styles.demoBadge}>Demo Preview</span>
            </Link>

            {/* Card 2: Campaign Health */}
            <Link to="/offer-caps" className={styles.previewCard}>
              <div>
                <div className={styles.previewMiniHeader}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-success)" }}>
                    ● 100% HEALTHY
                  </span>
                  <span className={styles.miniTag}>DO MUTEX</span>
                </div>
                <h3 className={styles.previewCardTitle}>Campaign Health</h3>
                <p className={styles.previewCardDesc}>
                  Monitor performance, budget and spend protection signals in real time.
                </p>
                <div className={styles.previewMeter}>
                  <div className={styles.previewMeterFill} style={{ width: "100%", background: "var(--color-success)" }} />
                </div>
              </div>
              <span className={styles.demoBadge}>Demo Preview</span>
            </Link>

            {/* Card 3: Conversion Evidence Trail */}
            <Link to="/conversion-confidence" className={styles.previewCard}>
              <div>
                <div className={styles.previewMiniHeader}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--tvh-cyan)" }}>
                    8-STAGE PIPELINE
                  </span>
                  <span className={styles.miniTag}>AUDITED</span>
                </div>
                <h3 className={styles.previewCardTitle}>Conversion Evidence Trail</h3>
                <p className={styles.previewCardDesc}>
                  See every authoritative step from initial click to wallet payout.
                </p>
                <div className={styles.previewMeter}>
                  <div className={styles.previewMeterFill} style={{ width: "92%" }} />
                </div>
              </div>
              <span className={styles.demoBadge}>Demo Preview</span>
            </Link>

            {/* Card 4: Tracking Diagnostics */}
            <Link to="/tracking-links" className={styles.previewCard}>
              <div>
                <div className={styles.previewMiniHeader}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--tvh-blue)" }}>
                    TELEMETRY LOGS
                  </span>
                  <span className={styles.miniTag}>LIVE</span>
                </div>
                <h3 className={styles.previewCardTitle}>Tracking Diagnostics</h3>
                <p className={styles.previewCardDesc}>
                  Fix configuration issues and improve postback accuracy with deep SubID inspection.
                </p>
                <div className={styles.previewMeter}>
                  <div className={styles.previewMeterFill} style={{ width: "85%" }} />
                </div>
              </div>
              <span className={styles.demoBadge}>Demo Preview</span>
            </Link>
          </div>
        </section>

        {/* SECTION 8 — FAQ ACCORDION */}
        <section id="faq" className={styles.sectionWrap} aria-labelledby="faq-title">
          <div className={styles.sectionPill}>Support & Policies</div>
          <h2 id="faq-title" className={styles.sectionHeading}>
            Frequently Asked Questions
          </h2>
          <p className={styles.sectionText}>
            Transparent answers on payments, postbacks, fraud prevention, and network operations.
          </p>
          <FAQAccordion />
        </section>

        {/* SECTION 9 — FINAL CONVERSION BANNER (REAL 3D CYBERNETIC LAPTOP) */}
        <div className={styles.sectionWrap}>
          <FinalCTASection />
        </div>
      </main>

      {/* SECTION 10 — COMPACT PREMIUM FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <Link to="/" className={styles.brand}>
              <div className={styles.logoIcon}>
                <span className={styles.logoV}>V</span>
              </div>
              <div className={styles.brandCol}>
                <span className={styles.brandName}>TrafficVaultHub</span>
                <span className={styles.brandSub}>Universal CPA Network</span>
              </div>
            </Link>

            <nav className={styles.footerNav} aria-label="Footer Navigation">
              <Link to="/offers" className={styles.footerLink}>Offers</Link>
              <a href="#problems" className={styles.footerLink}>Publishers</a>
              <a href="#problems" className={styles.footerLink}>Advertisers</a>
              <a href="#trust" className={styles.footerLink}>About</a>
              <Link to="/health" className={styles.footerLink}>Help Center</Link>
              <Link to="/disputes" className={styles.footerLink}>Contact</Link>
            </nav>

            <div className={styles.footerLegal}>
              <Link to="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link to="/terms" className={styles.footerLink}>Terms of Service</Link>
              <Link to="/compliance" className={styles.footerLink}>Compliance Policy</Link>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div>
              © 2026 TrafficVaultHub. All rights reserved.
            </div>
            <div className={styles.socialRow}>
              <a href="https://discord.gg" target="_blank" rel="noreferrer" className={styles.socialLink} aria-label="Discord">Discord</a>
              <a href="https://x.com" target="_blank" rel="noreferrer" className={styles.socialLink} aria-label="X Twitter">X</a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className={styles.socialLink} aria-label="YouTube">YouTube</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className={styles.socialLink} aria-label="LinkedIn">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
