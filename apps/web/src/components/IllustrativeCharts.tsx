import { useEffect, useRef, useState } from "react";
import styles from "./IllustrativeCharts.module.css";

/**
 * Decorative chart visuals for marketing only.
 * Explicitly not live production metrics.
 */
export function IllustrativeCharts() {
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = visible || reduced;

  // Deterministic demo series — not production data
  const bars = [42, 58, 51, 72, 65, 80, 74, 88, 70, 92, 85, 78];
  const line = [30, 36, 34, 48, 45, 55, 62, 58, 70, 68, 75, 82];
  const maxBar = Math.max(...bars);
  const maxLine = Math.max(...line);

  const linePoints = line
    .map((v, i) => {
      const x = (i / (line.length - 1)) * 100;
      const y = 100 - (v / maxLine) * 88 - 6;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${active ? styles.active : ""} ${reduced ? styles.reduced : ""}`}
      aria-hidden
    >
      <div className={styles.chartCard}>
        <div className={styles.chartHead}>
          <span>Conversion funnel</span>
          <span className={styles.badge}>Illustrative</span>
        </div>
        <div className={styles.bars} role="img" aria-label="Illustrative bar chart">
          {bars.map((v, i) => (
            <div key={i} className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={
                  {
                    "--h": `${(v / maxBar) * 100}%`,
                    "--delay": `${i * 0.04}s`,
                  } as React.CSSProperties
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartHead}>
          <span>Tracking health</span>
          <span className={styles.badge}>Illustrative</span>
        </div>
        <svg
          className={styles.lineSvg}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label="Illustrative line chart"
        >
          <defs>
            <linearGradient id="tvhLineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(34, 211, 238, 0.35)" />
              <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
            </linearGradient>
            <linearGradient id="tvhLineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
          <polyline
            className={styles.lineArea}
            fill="url(#tvhLineFill)"
            points={`0,100 ${linePoints} 100,100`}
          />
          <polyline
            className={styles.linePath}
            fill="none"
            stroke="url(#tvhLineStroke)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            points={linePoints}
          />
        </svg>
      </div>

      <div className={styles.ringRow}>
        <div className={styles.ringCard}>
          <svg viewBox="0 0 36 36" className={styles.ring}>
            <circle className={styles.ringBg} cx="18" cy="18" r="15.5" />
            <circle
              className={styles.ringFg}
              cx="18"
              cy="18"
              r="15.5"
              style={{ "--pct": "72" } as React.CSSProperties}
            />
          </svg>
          <div className={styles.ringMeta}>
            <span className={styles.ringLabel}>Approved</span>
            <span className={styles.ringNote}>Demo ratio</span>
          </div>
        </div>
        <div className={styles.ringCard}>
          <svg viewBox="0 0 36 36" className={styles.ring}>
            <circle className={styles.ringBg} cx="18" cy="18" r="15.5" />
            <circle
              className={`${styles.ringFg} ${styles.ringViolet}`}
              cx="18"
              cy="18"
              r="15.5"
              style={{ "--pct": "48" } as React.CSSProperties}
            />
          </svg>
          <div className={styles.ringMeta}>
            <span className={styles.ringLabel}>Payable</span>
            <span className={styles.ringNote}>Demo ratio</span>
          </div>
        </div>
      </div>
    </div>
  );
}
