import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./TrustSection.module.css";

export function TrustSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let angle = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = 55;

      // Glow backdrop
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius * 1.3);
      grad.addColorStop(0, "rgba(34, 211, 238, 0.25)");
      grad.addColorStop(1, "rgba(34, 211, 238, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Outer globe boundary
      ctx.strokeStyle = "rgba(34, 211, 238, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating Longitude Ellipses
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1;

      for (let i = 0; i < 4; i++) {
        const offset = angle + (i * Math.PI) / 4;
        const xRad = Math.abs(Math.sin(offset)) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(xRad, 2), radius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Latitude lines
      for (let lat = -2; lat <= 2; lat++) {
        if (lat === 0) continue;
        const yOffset = (lat / 3) * (radius * 0.85);
        const yRadius = Math.sqrt(Math.max(0, radius * radius - yOffset * yOffset));
        ctx.beginPath();
        ctx.ellipse(cx, cy + yOffset, yRadius, yRadius * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Orbiting Data Nodes
      for (let n = 0; n < 5; n++) {
        const nodeAngle = angle * 1.5 + (n * Math.PI * 2) / 5;
        const nx = cx + Math.cos(nodeAngle) * (radius * 1.15);
        const ny = cy + Math.sin(nodeAngle) * (radius * 0.6);
        ctx.fillStyle = "#22d3ee";
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      angle += 0.015;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className={styles.trustBannerGrid}>
      {/* Left: 3D Wireframe Globe Card */}
      <div className={styles.globeCard}>
        <canvas
          ref={canvasRef}
          width={320}
          height={160}
          className={styles.globeCanvas}
          aria-label="3D Wireframe rotating cryptographic globe"
        />
        <ul className={styles.checklist}>
          <li className={styles.checkItem}>
            <span className={styles.checkBadge}>✓</span>
            <span>Conversion Evidence Trail</span>
          </li>
          <li className={styles.checkItem}>
            <span className={styles.checkBadge}>✓</span>
            <span>Versioned Payout Terms</span>
          </li>
          <li className={styles.checkItem}>
            <span className={styles.checkBadge}>✓</span>
            <span>Explainable Decisions</span>
          </li>
          <li className={styles.checkItem}>
            <span className={styles.checkBadge}>✓</span>
            <span>Auditable Financial Records</span>
          </li>
          <li className={styles.checkItem}>
            <span className={styles.checkBadge}>✓</span>
            <span>Fraud Review & Disputes</span>
          </li>
        </ul>
      </div>

      {/* Center: Copy */}
      <div className={styles.centerCopy}>
        <div className={styles.trustPill}>Trust & Transparency</div>
        <h2 className={styles.heading}>
          Built on Trust.<br />
          Backed by Data.
        </h2>
        <p className={styles.paragraph}>
          We combine advanced tracking, strict verification, and transparent
          financial systems to protect your earnings and your campaigns.
        </p>
        <Link to="/integrity" className={styles.learnMoreBtn}>
          Learn More →
        </Link>
      </div>

      {/* Right: Holographic Security Shield Card */}
      <div className={styles.holoShieldCard}>
        <div className={styles.shieldHeader}>
          <div className={styles.shieldIconBadge}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h3 className={styles.shieldTitle}>Verified</h3>
        </div>

        <ul className={styles.shieldList}>
          <li className={styles.shieldItem}>
            <span className={styles.shieldCheck}>✓</span>
            <span>Account Verification</span>
          </li>
          <li className={styles.shieldItem}>
            <span className={styles.shieldCheck}>✓</span>
            <span>Payment Protection</span>
          </li>
          <li className={styles.shieldItem}>
            <span className={styles.shieldCheck}>✓</span>
            <span>Real-time Tracking</span>
          </li>
          <li className={styles.shieldItem}>
            <span className={styles.shieldCheck}>✓</span>
            <span>Compliance Checks</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
