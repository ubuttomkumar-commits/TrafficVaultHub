import { Link } from "react-router-dom";
import styles from "./FinalCTASection.module.css";

export function FinalCTASection() {
  return (
    <section className={styles.wrap} aria-labelledby="final-title">
      <div className={styles.bannerCard}>
        {/* Left: 3D Cybernetic Laptop Illustration */}
        <div className={styles.laptopVisual} aria-hidden="true">
          <div className={styles.laptopContainer}>
            <div className={styles.screenLid}>
              <div className={styles.screenDisplay}>
                <div className={styles.screenLogoMark}>V</div>
                <div className={styles.screenLogoText}>TrafficVaultHub</div>
                <div className={styles.screenSub}>Universal CPA Network</div>
              </div>
            </div>
            <div className={styles.baseKeyboard} />
          </div>
        </div>

        {/* Right: Content & CTAs */}
        <div className={styles.contentArea}>
          <h2 id="final-title" className={styles.headline}>
            Build Better Campaigns.<br />
            Make Every <span className={styles.cyanHighlight}>Conversion Count.</span>
          </h2>
          <p className={styles.subcopy}>
            Discover eligible offers, improve tracking visibility and manage
            campaigns with greater confidence.
          </p>
          <div className={styles.ctasRow}>
            <Link to="/login" className={styles.btnPub}>
              Join as Publisher →
            </Link>
            <Link to="/campaign-studio" className={styles.btnAdv}>
              Join as Advertiser →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
