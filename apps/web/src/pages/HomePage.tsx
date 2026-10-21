import { PRODUCT_NAME, PRODUCT_PROMISE } from "@trafficvaulthub/shared";
import styles from "./HomePage.module.css";

export function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Universal CPA Network</p>
        <h1 className={styles.title}>{PRODUCT_NAME}</h1>
        <p className={styles.promise}>{PRODUCT_PROMISE}</p>
        <p className={styles.lead}>
          Transparent conversion tracking. Explainable rejection decisions.
          Reliable financial accounting. Verifiable payout records. Built for
          publishers who need clarity and advertisers who need control.
        </p>
      </section>

      <section className={styles.grid} aria-label="Core pillars">
        <article className="card">
          <h2>Publisher trust</h2>
          <p className="muted">
            Earnings center with pending vs payable separation, explainable
            conversion decisions, and dispute workflows grounded in recorded
            evidence.
          </p>
        </article>
        <article className="card">
          <h2>Advertiser protection</h2>
          <p className="muted">
            Cap and budget enforcement, conversion quality signals, live
            campaign health, and funding reconciliation against an append-only
            ledger.
          </p>
        </article>
        <article className="card">
          <h2>Configurable engine</h2>
          <p className="muted">
            Database-driven categories, versioned payout rules, and category-
            agnostic tracking so the core does not need rewriting when offers
            change.
          </p>
        </article>
      </section>

      <section className={styles.note}>
        <p className="muted">
          This is the foundation scaffold. Auth, offer lifecycle, tracking,
          finance, and role-specific dashboards will be implemented
          incrementally per the PRD phases. No production financial data or
          fabricated metrics are shown.
        </p>
      </section>
    </div>
  );
}
