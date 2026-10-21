import { useEffect, useRef } from "react";
import styles from "./DataFlowNetwork.module.css";

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  pulse: number;
};

type Props = {
  className?: string;
  /** Soft labels along the flow */
  labels?: string[];
};

/**
 * Lightweight canvas particle network. Pauses when off-screen or reduced-motion.
 */
export function DataFlowNetwork({
  className,
  labels = ["Publisher", "Tracking", "Advertiser", "Payout"],
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let nodes: Node[] = [];
    let raf = 0;
    let running = true;
    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      if (!canvas || !wrap || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(48, Math.max(18, Math.floor((width * height) / 18000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 1.8,
        pulse: Math.random() * Math.PI * 2,
      }));
    }

    function drawStatic() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      // soft gradient mesh
      const g = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.55
      );
      g.addColorStop(0, "rgba(34, 211, 238, 0.08)");
      g.addColorStop(0.5, "rgba(129, 140, 248, 0.05)");
      g.addColorStop(1, "rgba(5, 7, 13, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      // fixed path nodes
      const pathY = height * 0.5;
      const n = labels.length;
      for (let i = 0; i < n; i++) {
        const x = (width * (i + 1)) / (n + 1);
        ctx.beginPath();
        ctx.arc(x, pathY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34, 211, 238, 0.7)";
        ctx.fill();
        if (i < n - 1) {
          const x2 = (width * (i + 2)) / (n + 1);
          ctx.beginPath();
          ctx.moveTo(x + 6, pathY);
          ctx.lineTo(x2 - 6, pathY);
          ctx.strokeStyle = "rgba(129, 140, 248, 0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    function frame(t: number) {
      if (!ctx || !running) return;
      ctx.clearRect(0, 0, width, height);

      // ambient glow
      const g = ctx.createRadialGradient(
        width * 0.35,
        height * 0.3,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.6
      );
      g.addColorStop(0, "rgba(34, 211, 238, 0.06)");
      g.addColorStop(0.45, "rgba(59, 130, 246, 0.04)");
      g.addColorStop(1, "rgba(5, 7, 13, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      const linkDist = Math.min(140, width * 0.22);

      // links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.35;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // particles
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        n.x = Math.max(0, Math.min(width, n.x));
        n.y = Math.max(0, Math.min(height, n.y));
        n.pulse += 0.02;

        const glow = 0.45 + 0.35 * Math.sin(n.pulse + t * 0.001);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${glow})`;
        ctx.fill();
      }

      // labeled flow path
      const pathY = height * 0.72;
      const nLabels = labels.length;
      for (let i = 0; i < nLabels; i++) {
        const x = (width * (i + 1)) / (nLabels + 1);
        // traveling pulse along edges
        if (i < nLabels - 1) {
          const x2 = (width * (i + 2)) / (nLabels + 1);
          ctx.beginPath();
          ctx.moveTo(x, pathY);
          ctx.lineTo(x2, pathY);
          ctx.strokeStyle = "rgba(34, 211, 238, 0.2)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          const progress = (Math.sin(t * 0.0015 + i) + 1) / 2;
          const px = x + (x2 - x) * progress;
          ctx.beginPath();
          ctx.arc(px, pathY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(167, 139, 250, 0.9)";
          ctx.shadowColor = "rgba(129, 140, 248, 0.8)";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(x, pathY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fill();
        ctx.strokeStyle = "rgba(34, 211, 238, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    if (reduced) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) drawStatic();
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        running = visible;
        if (visible && !reduced) {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(frame);
        } else {
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.05 }
    );
    io.observe(wrap);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [labels]);

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${className ?? ""}`} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.labelRow}>
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
