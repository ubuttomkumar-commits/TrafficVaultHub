import { Link } from "react-router-dom";
import styles from "./LegalPage.module.css";

export function PrivacyPage() {
  return (
    <article className={styles.page}>
      <h1>Privacy</h1>
      <p className="muted">Product summary — not legal advice. Counsel review required for production.</p>
      <h2>Data we process</h2>
      <ul>
        <li>Account and session data for authentication</li>
        <li>Click and conversion events for attribution and ledger</li>
        <li>Organization membership for tenant isolation</li>
      </ul>
      <p><Link to="/">Home</Link> · <Link to="/terms">Terms</Link></p>
    </article>
  );
}

export function TermsPage() {
  return (
    <article className={styles.page}>
      <h1>Terms of use</h1>
      <p className="muted">Summary expectations. Counsel review required for production.</p>
      <h2>Platform</h2>
      <p>TrafficVaultHub provides multi-tenant offer, tracking, conversion, and ledger tooling.</p>
      <h2>Integrity</h2>
      <p>Conversions may be held, reversed, or compliance-paused. Server ledger overrides client displays.</p>
      <p><Link to="/">Home</Link> · <Link to="/privacy">Privacy</Link></p>
    </article>
  );
}

export function CompliancePolicyPage() {
  return (
    <article className={styles.page}>
      <h1>Network Compliance &amp; Traffic Standards</h1>
      <p className="muted">Authoritative network standards and verification policy for publishers and advertisers.</p>
      
      <h2>1. Permitted Traffic Sources</h2>
      <p>TrafficVaultHub accepts verified organic search, paid search (Google Ads, Microsoft Advertising), social media advertising, native discovery networks, and authorized opt-in email marketing.</p>
      
      <h2>2. Strictly Prohibited Practices</h2>
      <ul>
        <li>Automated bot traffic, click farms, and proxy rotators</li>
        <li>Forced redirects, auto-refreshing iframes, and popup cascades</li>
        <li>Unannounced incentivized traffic on non-incent offers</li>
        <li>Trademark bidding without explicit written advertiser authorization</li>
        <li>Misleading pre-landers or fake celebrity endorsements</li>
      </ul>

      <h2>3. Financial Ledger Reversals</h2>
      <p>In accordance with our double-entry immutable ledger architecture, conversions identified as fraudulent or violating advertiser restrictions will be reversed with auditable reason codes before payout maturity.</p>

      <h2>4. Appeals &amp; Inquiries</h2>
      <p>If you believe a campaign hold was issued in error, submit an appeal via the <Link to="/disputes">Disputes Center</Link>.</p>
      
      <p><Link to="/">Home</Link> · <Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link></p>
    </article>
  );
}
