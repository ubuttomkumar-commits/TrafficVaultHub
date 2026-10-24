import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HeroVaultScene } from "../components/HeroVaultScene";
import { HowItWorksProcess } from "../components/HowItWorksProcess";
import { OfferCategoriesGrid } from "../components/OfferCategoriesGrid";
import { TrustSection } from "../components/TrustSection";
import { FAQAccordion } from "../components/FAQAccordion";
import { FinalCTASection } from "../components/FinalCTASection";
import { apiUrl } from "../lib/api";
import styles from "./LandingPage.module.css";

interface CmsData {
  heroTagline?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  heroSubtext?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  ctaPrimaryText?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  trustBullet1?: string;
  trustBullet2?: string;
  trustBullet3?: string;
  trustBullet4?: string;
  customNotice?: string | null;
  siteName?: string;
  tagline?: string;
  logoUrl?: string;
}

export function LandingPage() {
  const [themeMode, setThemeMode] = useState<"dark" | "cyber">("cyber");
  const [cms, setCms] = useState<CmsData | null>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<{ isEnabled: boolean; headline: string; message?: string; estimatedDuration?: string } | null>(null);

  useEffect(() => {
    // Fetch CMS
    fetch(apiUrl("/api/v1/cms/landing"))
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setCms(res.data);
      })
      .catch(() => {});

    // Fetch Active Announcement
    fetch(apiUrl("/api/v1/announcements/active"))
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setAnnouncement(res.data);
      })
      .catch(() => {});

    // Fetch Maintenance status
    fetch(apiUrl("/api/v1/maintenance/status"))
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setMaintenance(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      {/* Sitewide Announcement Bar */}
      {announcement && (
        <div
          style={{
            background:
              announcement.style === "critical"
                ? "rgba(239, 68, 68, 0.9)"
                : announcement.style === "warning"
                ? "rgba(245, 158, 11, 0.9)"
                : "rgba(14, 165, 233, 0.9)",
            color: "#fff",
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            position: "relative",
            zIndex: 100,
            borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span>
            <strong>{announcement.title}:</strong> {announcement.message}
          </span>
          {announcement.link_url && (
            <Link
              to={announcement.link_url}
              style={{
                color: "#fff",
                textDecoration: "underline",
                fontWeight: 600,
                fontSize: "0.8rem",
              }}
            >
              {announcement.link_label || "Learn more →"}
            </Link>
          )}
        </div>
      )}

      {/* Full Maintenance Mode Gateway */}
      {maintenance?.isEnabled && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "#05070d", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ maxWidth: "560px", width: "100%", background: "rgba(10, 15, 29, 0.95)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "12px", padding: "2.5rem 2rem", textAlign: "center", boxShadow: "0 25px 60px rgba(0,0,0,0.85)" }}>
            <div style={{ fontSize: "2.75rem", marginBottom: "0.75rem" }}>🛡️</div>
            <div style={{ display: "inline-block", background: "rgba(239, 68, 68, 0.12)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1rem" }}>
              Scheduled System Maintenance Active
            </div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 0.75rem 0" }}>
              {maintenance.headline || "Scheduled Network Synchronization"}
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1.25rem 0" }}>
              {maintenance.message || "TrafficVaultHub is performing scheduled network synchronization and ledger upgrades. Public access is temporarily gated."}
            </p>
            <div style={{ display: "inline-block", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "0.4rem 0.85rem", borderRadius: "6px", fontSize: "0.78rem", color: "#38bdf8", marginBottom: "1.5rem" }}>
              Estimated Duration: {maintenance.estimatedDuration || "30 minutes"}
            </div>
            <div style={{ padding: "0.75rem 1rem", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "6px", fontSize: "0.8rem", color: "#34d399", margin: "0 auto 1.5rem" }}>
              ✓ Authoritative click tracking redirects and server-to-server (S2S) postbacks continue without interruption.
            </div>
            <div>
              <Link to="/admin/login" style={{ color: "#64748b", fontSize: "0.78rem", textDecoration: "none" }}>
                Platform Operator Sign In ↗
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Custom CMS Notice */}
      {cms?.customNotice && (
        <div
          style={{
            background: "rgba(139, 92, 246, 0.15)",
            borderBottom: "1px solid rgba(139, 92, 246, 0.35)",
            color: "#c4b5fd",
            padding: "0.5rem 1rem",
            textAlign: "center",
            fontSize: "0.82rem",
            position: "relative",
            zIndex: 98,
          }}
        >
          ℹ️ {cms.customNotice}
        </div>
      )}

      {/* SECTION 1 — COMPACT PREMIUM DARK NAVIGATION */}
      <header className={styles.topNav}>
        <div className={styles.topInner}>
          <Link to="/" className={styles.brand} aria-label="TrafficVaultHub home">
            {cms?.logoUrl ? (
              <img src={cms.logoUrl} alt={cms.siteName || "TrafficVaultHub"} style={{ height: "30px", maxWidth: "140px", objectFit: "contain" }} />
            ) : (
              <div className={styles.logoIcon}>
                <span className={styles.logoV}>V</span>
              </div>
            )}
            <div className={styles.brandCol}>
              <span className={styles.brandName}>{cms?.siteName || "TrafficVaultHub"}</span>
              <span className={styles.brandSub}>{cms?.tagline || "Universal CPA Network"}</span>
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
                {cms?.heroTagline || "The CPA Network That Shows Its Work."}
              </div>
              <h1 id="hero-title" className={styles.heroHeadline}>
                {cms?.heroHeadline ? (
                  <span>{cms.heroHeadline}</span>
                ) : (
                  <>
                    More <span className={styles.cyanText}>Conversions.</span><br />
                    More <span className={styles.gradientRev}>Revenue.</span><br />
                    More <span className={styles.purpleText}>Trust.</span>
                  </>
                )}
              </h1>
              <p className={styles.heroSubtext}>
                {cms?.heroSubheadline || cms?.heroSubtext ||
                  "Discover relevant offers, track conversions with greater transparency, and manage affiliate campaigns with stronger financial and fraud controls."}
              </p>
              <div className={styles.heroCtas}>
                <Link to={cms?.ctaPrimaryLink || cms?.primaryCtaLink || "/signup?role=publisher"} className={styles.ctaPublisher}>
                  {cms?.ctaPrimaryText || cms?.primaryCtaText || "Start as Publisher →"}
                </Link>
                <Link to={cms?.ctaSecondaryLink || cms?.secondaryCtaLink || "/signup?role=advertiser"} className={styles.ctaAdvertiser}>
                  {cms?.ctaSecondaryText || cms?.secondaryCtaText || "Start as Advertiser →"}
                </Link>
              </div>

              {/* Four Compact Trust Indicators */}
              <div className={styles.trustIndicatorsRow}>
                <div className={styles.trustIndicatorItem}>
                  <div className={styles.trustIcon}>🔍</div>
                  <span>{cms?.trustBullet1 || "Transparent Tracking"}</span>
                </div>
                <div className={styles.trustIndicatorItem}>
                  <div className={styles.trustIcon}>💳</div>
                  <span>{cms?.trustBullet2 || "Flexible Payouts"}</span>
                </div>
                <div className={styles.trustIndicatorItem}>
                  <div className={styles.trustIcon}>🛡️</div>
                  <span>{cms?.trustBullet3 || "Fraud Protection"}</span>
                </div>
                <div className={styles.trustIndicatorItem}>
                  <div className={styles.trustIcon}>📊</div>
                  <span>{cms?.trustBullet4 || "Reliable Reporting"}</span>
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
              {cms?.logoUrl ? (
                <img src={cms.logoUrl} alt={cms.siteName || "TrafficVaultHub"} style={{ height: "26px", maxWidth: "120px", objectFit: "contain" }} />
              ) : (
                <div className={styles.logoIcon}>
                  <span className={styles.logoV}>V</span>
                </div>
              )}
              <div className={styles.brandCol}>
                <span className={styles.brandName}>{cms?.siteName || "TrafficVaultHub"}</span>
                <span className={styles.brandSub}>{cms?.tagline || "Universal CPA Network"}</span>
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
