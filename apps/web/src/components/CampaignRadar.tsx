import styles from "./CampaignRadar.module.css";

export function CampaignRadar() {
  return (
    <div className={styles.radarWrap}>
      <div className={styles.radarHeader}>
        <div className={styles.radarTitle}>
          <span className={styles.liveIndicator} />
          <span>Campaign Quality & Spend Protection Radar</span>
        </div>
        <div className="muted" style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
          ACTIVE ENFORCEMENT · DO MUTEX ACTIVE
        </div>
      </div>

      <div className={styles.grid4}>
        <div className={styles.metricTile}>
          <div className={styles.tileLabel}>Daily Click Cap Utilization</div>
          <div className={styles.tileVal}>28.4%</div>
          <div className="muted" style={{ fontSize: "0.78rem" }}>1,420 / 5,000 Clicks Reserved</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "28.4%" }} />
          </div>
        </div>

        <div className={styles.metricTile}>
          <div className={styles.tileLabel}>Lifetime Cap Ingestion</div>
          <div className={styles.tileVal}>31.2%</div>
          <div className="muted" style={{ fontSize: "0.78rem" }}>31,200 / 100,000 Ingested</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "31.2%" }} />
          </div>
        </div>

        <div className={styles.metricTile}>
          <div className={styles.tileLabel}>Duplicate Replay Attacks</div>
          <div className={styles.tileVal} style={{ color: "var(--color-success)" }}>0.00%</div>
          <div className="muted" style={{ fontSize: "0.78rem" }}>100% Idempotent Shielding</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "100%", background: "var(--color-success)" }} />
          </div>
        </div>

        <div className={styles.metricTile}>
          <div className={styles.tileLabel}>S2S Postback Latency</div>
          <div className={styles.tileVal} style={{ color: "var(--color-accent-cyan)" }}>18 ms</div>
          <div className="muted" style={{ fontSize: "0.78rem" }}>Global Edge Worker Response</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "95%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
