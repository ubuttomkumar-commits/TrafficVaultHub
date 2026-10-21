import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./LandingPage.module.css";

const CATEGORIES = [
  { id: "dating", name: "Dating & Relationships", icon: "❤️", bg: "linear-gradient(135deg, #ec4899, #be185d)", shadow: "rgba(236, 72, 153, 0.35)" },
  { id: "apps", name: "Mobile Apps & Software", icon: "📱", bg: "linear-gradient(135deg, #0284c7, #0369a1)", shadow: "rgba(2, 132, 199, 0.35)" },
  { id: "gaming", name: "Gaming & Entertainment", icon: "🎮", bg: "linear-gradient(135deg, #7c3aed, #5b21b6)", shadow: "rgba(124, 58, 237, 0.35)" },
  { id: "ecommerce", name: "E-commerce & Retail", icon: "🛒", bg: "linear-gradient(135deg, #059669, #047857)", shadow: "rgba(5, 150, 105, 0.35)" },
  { id: "finance", name: "Finance & Business", icon: "💰", bg: "linear-gradient(135deg, #d97706, #b45309)", shadow: "rgba(217, 119, 6, 0.35)" },
  { id: "education", name: "Education & Employment", icon: "🎓", bg: "linear-gradient(135deg, #2563eb, #1d4ed8)", shadow: "rgba(37, 99, 235, 0.35)" },
  { id: "travel", name: "Travel & Hospitality", icon: "✈️", bg: "linear-gradient(135deg, #db2777, #9d174d)", shadow: "rgba(219, 39, 119, 0.35)" },
  { id: "health", name: "Health & Wellness", icon: "🩺", bg: "linear-gradient(135deg, #0d9488, #0f766e)", shadow: "rgba(13, 148, 136, 0.35)" },
  { id: "home", name: "Home & Local Services", icon: "🏠", bg: "linear-gradient(135deg, #6366f1, #4338ca)", shadow: "rgba(99, 102, 241, 0.35)" },
  { id: "media", name: "Media & Content", icon: "▶️", bg: "linear-gradient(135deg, #8b5cf6, #6d28d9)", shadow: "rgba(139, 92, 246, 0.35)" },
  { id: "surveys", name: "Surveys & Rewards", icon: "🎁", bg: "linear-gradient(135deg, #ea580c, #c2410c)", shadow: "rgba(234, 88, 12, 0.35)" },
  { id: "other", name: "Other", icon: "•••", bg: "linear-gradient(135deg, #1e293b, #0f172a)", shadow: "rgba(30, 41, 59, 0.35)" },
];

export function LandingPage() {
  const [themeDark, setThemeDark] = useState(true);

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
              onClick={() => setThemeDark(!themeDark)}
              aria-label="Toggle theme display"
              title="Toggle theme"
            >
              ☀️
            </button>
            <Link to="/login" className={styles.loginBtn}>
              Login
            </Link>
            <Link to="/login" className={styles.getStartedBtn}>
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
                <Link to="/login" className={styles.ctaPublisher}>
                  Start as Publisher →
                </Link>
                <Link to="/campaign-studio" className={styles.ctaAdvertiser}>
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

            {/* 3D Digital Vault Visual (Reference Reproduction) */}
            <div className={styles.vaultArtworkContainer}>
              <img
                src="/assets/hero_vault_reference.png"
                alt="TrafficVaultHub 3D Digital Vault with real-time conversion telemetry and floating analytics panels"
                className={styles.vaultArtworkImg}
                loading="eager"
              />
            </div>
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
                <img
                  src="/assets/publisher_avatar_3d.png"
                  alt=""
                  aria-hidden="true"
                  className={styles.cardCharacterImg}
                  loading="lazy"
                />
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
                <img
                  src="/assets/advertiser_avatar_3d.png"
                  alt=""
                  aria-hidden="true"
                  className={styles.cardCharacterImg}
                  loading="lazy"
                />
              </article>
            </div>
          </div>
        </section>

        {/* SECTION 4 — HOW IT WORKS */}
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
              <Link to="/conversion-confidence" className={styles.exploreFullBtn}>
                Explore Full Flow →
              </Link>
            </div>

            <div className={styles.howItWorksBanner}>
              <img
                src="/assets/how_it_works_reference.png"
                alt="How it works 5 steps: 1. Discover Offer, 2. Track Click, 3. Validate Event, 4. Review Conversion, 5. Record Earnings"
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "0.5rem" }}
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* SECTION 5 — OFFER CATEGORIES */}
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
              <Link to="/offers" className={styles.exploreFullBtn} style={{ background: "var(--tvh-gradient-btn)" }}>
                Browse All Offers →
              </Link>
            </div>

            <div className={styles.categoriesGrid12}>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/offers?vertical=${encodeURIComponent(cat.name)}`}
                  className={styles.categoryTile}
                >
                  <div
                    className={styles.catIconBox}
                    style={{ background: cat.bg, boxShadow: `0 0 16px ${cat.shadow}` }}
                  >
                    <span>{cat.icon}</span>
                  </div>
                  <span className={styles.catName}>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6 — TRUST AND TRANSPARENCY */}
        <section id="trust" className={styles.sectionWrap} aria-labelledby="trust-title">
          <div className={styles.trustBannerGrid}>
            <div className={styles.globeBox}>
              <img
                src="/assets/trust_globe_reference.png"
                alt="3D Holographic globe and verified audit checklist"
                className={styles.globeImg}
                loading="lazy"
              />
            </div>

            <div className={styles.trustCenterText}>
              <div className={styles.sectionPill}>Trust & Transparency</div>
              <h2 id="trust-title" className={styles.sectionHeading}>
                Built on Trust.<br />
                Backed by Data.
              </h2>
              <p className={styles.sectionText}>
                We combine advanced tracking, strict verification, and transparent
                financial systems to protect your earnings and your campaigns.
              </p>
              <Link to="/integrity" className={styles.learnMoreBtn}>
                Learn More →
              </Link>
            </div>

            <div className={styles.shieldBox}>
              <img
                src="/assets/trust_shield_reference.png"
                alt="Verified security shield and compliance protections"
                className={styles.shieldImg}
                loading="lazy"
              />
            </div>
          </div>
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
            <Link to="/earnings" className={styles.exploreFullBtn} style={{ background: "var(--tvh-gradient-pub)" }}>
              Explore All Features →
            </Link>
          </div>

          <div className={styles.productCardsGrid}>
            {/* Card 1: Publisher Earnings */}
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
              </div>
              <span className={styles.demoBadge}>Demo Preview</span>
            </Link>
          </div>
        </section>

        {/* SECTION 8 — FINAL CONVERSION BANNER */}
        <section className={styles.finalBannerWrap} aria-labelledby="final-title">
          <div className={styles.finalBannerCard}>
            <img
              src="/assets/final_cta_reference.png"
              alt="Build Better Campaigns. Make Every Conversion Count."
              className={styles.finalBannerImg}
              loading="lazy"
            />
            <div className={styles.finalBannerOverlay}>
              <h2 id="final-title" className={styles.finalHeadline}>
                Build Better Campaigns.<br />
                Make Every <span className={styles.cyanText}>Conversion Count.</span>
              </h2>
              <p className={styles.finalSub}>
                Discover eligible offers, improve tracking visibility and manage campaigns with greater confidence.
              </p>
              <div className={styles.finalCtas}>
                <Link to="/login" className={styles.ctaPublisher}>
                  Join as Publisher →
                </Link>
                <Link to="/campaign-studio" className={styles.ctaAdvertiser}>
                  Join as Advertiser →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* SECTION 9 — COMPACT PREMIUM FOOTER */}
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
