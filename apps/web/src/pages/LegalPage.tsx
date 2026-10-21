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
