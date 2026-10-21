import { useEffect, useRef } from "react";
import styles from "./HeroVaultScene.module.css";
export function HeroVaultScene({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0, running = true, W = 0, H = 0;
    const t0 = performance.now();
    const particles = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.3) * 0.0008, r: 1 + Math.random() * 2, hue: Math.random() }));
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paint = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, Math.max(W, H) * 0.6);
      g.addColorStop(0, "rgba(34,211,238,0.12)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const cx = W * 0.5, cy = H * 0.42, R = Math.min(W, H) * 0.14;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * (1.1 + i * 0.28), R * 0.35, t * 0.0003 * (i % 2 ? -1 : 1), 0, Math.PI * 2);
        ctx.strokeStyle = i === 1 ? "rgba(167,139,250,0.55)" : "rgba(34,211,238,0.45)";
        ctx.lineWidth = 1.4; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10,14,26,0.9)"; ctx.fill();
      ctx.strokeStyle = "rgba(34,211,238,0.7)"; ctx.stroke();
      ctx.fillStyle = "rgba(248,250,252,0.95)"; ctx.font = `600 ${Math.max(11, W * 0.028)}px Inter,system-ui,sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("TrafficVaultHub", cx, cy);
      if (!reduced) for (const p of particles) {
        p.x += p.vx; if (p.x > 1.1) p.x = -0.1;
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H * 0.7, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.hue > 0.7 ? "rgba(248,113,113,0.5)" : "rgba(34,211,238,0.55)"; ctx.fill();
      }
    };
    resize();
    if (reduced) paint(0);
    else {
      const frame = (now: number) => { if (!running) return; paint(now - t0); raf = requestAnimationFrame(frame); };
      raf = requestAnimationFrame(frame);
    }
    const ro = new ResizeObserver(() => { resize(); if (reduced) paint(0); });
    ro.observe(wrap);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return (
    <div ref={wrapRef} className={`${styles.wrap} ${className ?? ""}`} role="img" aria-label="Illustrative vault scene. Not live production data.">
      <canvas ref={canvasRef} className={styles.canvas} />
      <p className={styles.caption}>Illustrative interface — not live production data</p>
    </div>
  );
}
