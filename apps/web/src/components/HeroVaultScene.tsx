import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./HeroVaultScene.module.css";

const JOURNEY_STEPS = [
  { id: "click", label: "Click", desc: "Unique click ID & SubID telemetry generated" },
  { id: "track", label: "Track", desc: "Durable Object cap reservation & 302 redirection" },
  { id: "validate", label: "Validate", desc: "HMAC-SHA256 authenticated postback verification" },
  { id: "convert", label: "Convert", desc: "Idempotency check, quality shield & ledger posting" },
];

export function HeroVaultScene({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 3D Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040711, 0.08);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.4, 7.0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth, container.clientHeight, false);
    } catch {
      return;
    }

    // Materials
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x0f1524,
      metalness: 0.9,
      roughness: 0.25,
    });

    const brushedGoldMat = new THREE.MeshStandardMaterial({
      color: 0x1e2a3c,
      metalness: 0.8,
      roughness: 0.35,
    });

    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x0c2536,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.85,
      metalness: 0.5,
      roughness: 0.2,
    });

    const innerPulseMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.25,
      roughness: 0.1,
    });

    const glassCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x071526,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
      ior: 1.5,
    });

    // Vault Master Group
    const vaultGroup = new THREE.Group();
    scene.add(vaultGroup);

    // 1. Vault Outer Heavy Ring
    const outerRingGeo = new THREE.TorusGeometry(2.2, 0.12, 16, 64);
    const outerRingMesh = new THREE.Mesh(outerRingGeo, darkMetalMat);
    vaultGroup.add(outerRingMesh);

    // 2. Counter-Rotating Gyro Ring
    const gyroRingGeo = new THREE.TorusGeometry(2.5, 0.05, 12, 64);
    const gyroRingMesh = new THREE.Mesh(gyroRingGeo, cyanGlowMat);
    gyroRingMesh.rotation.x = Math.PI / 4;
    vaultGroup.add(gyroRingMesh);

    // 3. Vault Radial Teeth
    const teethGroup = new THREE.Group();
    const toothGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tooth = new THREE.Mesh(toothGeo, brushedGoldMat);
      tooth.position.set(Math.cos(angle) * 2.2, Math.sin(angle) * 2.2, 0);
      tooth.rotation.z = angle + Math.PI / 2;
      teethGroup.add(tooth);
    }
    vaultGroup.add(teethGroup);

    // 4. Faceted Vault Core
    const coreGeo = new THREE.IcosahedronGeometry(0.9, 1);
    const coreMesh = new THREE.Mesh(coreGeo, glassCoreMat);
    vaultGroup.add(coreMesh);

    // 5. Central Biometric Pulse Core
    const innerPulseGeo = new THREE.SphereGeometry(0.42, 32, 32);
    const innerPulseMesh = new THREE.Mesh(innerPulseGeo, innerPulseMat);
    vaultGroup.add(innerPulseMesh);

    // 6. Orbiting Nodes
    const nodeGroup = new THREE.Group();
    vaultGroup.add(nodeGroup);

    const orbitingNodes = [
      { mesh: new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), cyanGlowMat), radius: 3.1, speed: 0.008, angle: 0, yOffset: 0.3 },
      { mesh: new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), brushedGoldMat), radius: 3.3, speed: -0.006, angle: Math.PI * 0.6, yOffset: -0.4 },
      { mesh: new THREE.Mesh(new THREE.TetrahedronGeometry(0.22, 0), cyanGlowMat), radius: 2.9, speed: 0.009, angle: Math.PI * 1.2, yOffset: 0.2 },
    ];
    orbitingNodes.forEach((n) => nodeGroup.add(n.mesh));

    // 7. Atmospheric particles
    const particleCount = 75;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 10;
      particlePos[i + 1] = (Math.random() - 0.5) * 8;
      particlePos[i + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 8. Lights
    const ambientLight = new THREE.AmbientLight(0x0e1726, 2.5);
    scene.add(ambientLight);
    const cyanKeyLight = new THREE.PointLight(0x22d3ee, 4.5, 12, 1.2);
    cyanKeyLight.position.set(3, 3, 4);
    scene.add(cyanKeyLight);
    const violetRimLight = new THREE.PointLight(0xa855f7, 3.8, 12, 1.2);
    violetRimLight.position.set(-3.5, -2, -2);
    scene.add(violetRimLight);

    // Pointer Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = nx * 0.4;
      targetRotX = -ny * 0.3;
    };

    window.addEventListener("pointermove", handlePointerMove);

    // Resize Observer
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation Loop
    let animId = 0;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      mouseX += (targetRotX - mouseX) * 0.05;
      mouseY += (targetRotY - mouseY) * 0.05;

      vaultGroup.rotation.x = mouseX + Math.sin(elapsed * 0.3) * 0.08;
      vaultGroup.rotation.y = mouseY + elapsed * 0.15;

      gyroRingMesh.rotation.z += 0.008;
      teethGroup.rotation.z -= 0.004;
      coreMesh.rotation.x -= 0.007;

      const pulse = 1.0 + Math.sin(elapsed * 3.0) * 0.35;
      innerPulseMat.emissiveIntensity = pulse;

      orbitingNodes.forEach((node) => {
        node.angle += node.speed;
        node.mesh.position.set(
          Math.cos(node.angle) * node.radius,
          node.yOffset + Math.sin(elapsed * 1.5 + node.angle) * 0.25,
          Math.sin(node.angle) * node.radius
        );
        node.mesh.rotation.x += 0.02;
      });

      particles.rotation.y = elapsed * 0.02;
      renderer.render(scene, camera);

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(animate);
      }
    };

    if (prefersReducedMotion) {
      renderer.render(scene, camera);
    } else {
      animId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${styles.wrap} ${className ?? ""}`}
      role="region"
      aria-label="Interactive 3D Digital Vault showcase"
    >
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Floating HUD Panels */}
      <div className={styles.hudOverlay}>
        {/* Top Panels */}
        <div className={styles.hudTop}>
          <div className={styles.hudCard}>
            <div className={styles.cardHeader}>
              <span>📈 Publisher Earnings</span>
            </div>
            <div className={styles.earningsList}>
              <div className={styles.earningItem}>
                <span><span className={styles.dotAmber}>●</span> Pending</span>
                <span className="mono">$248.50</span>
              </div>
              <div className={styles.earningItem}>
                <span><span className={styles.dotCyan}>●</span> Approved</span>
                <span className="mono">$1,245.00</span>
              </div>
              <div className={styles.earningItem}>
                <span><span className={styles.dotGreen}>●</span> Payable</span>
                <span className="mono">$980.00</span>
              </div>
            </div>
          </div>

          <div className={styles.hudCard}>
            <div className={styles.cardHeader}>
              <span>Campaign Health</span>
              <span className={styles.healthBadge}>
                <span className={styles.healthDot} /> Healthy
              </span>
            </div>
            {/* SVG Mini Line Chart */}
            <svg width="120" height="32" viewBox="0 0 120 32" fill="none">
              <path
                d="M 0 24 Q 20 8, 40 20 T 80 12 T 120 4"
                stroke="#10b981"
                strokeWidth="2.5"
                fill="none"
              />
              <path
                d="M 0 24 Q 20 8, 40 20 T 80 12 T 120 4 L 120 32 L 0 32 Z"
                fill="url(#greenGrad)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Middle Badges */}
        <div className={styles.hudMiddle}>
          <div className={styles.offersBadge}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ffffff" }}>Offers</span>
            <div className={styles.iconRow}>
              <span className={styles.miniIcon}>🛒</span>
              <span className={styles.miniIcon}>🛡️</span>
              <span className={styles.miniIcon}>🎮</span>
            </div>
          </div>

          <div className={styles.resultsBadge}>
            <span className={styles.shieldIcon}>🛡️</span>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ffffff" }}>Real Tracking</div>
              <div style={{ fontSize: "0.62rem", color: "var(--color-accent-cyan)" }}>Real Results</div>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Journey Track */}
        <div className={styles.hudBottom}>
          <div className={styles.journeyTrack}>
            {JOURNEY_STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  className={`${styles.journeyStep} ${activeStep === idx ? styles.journeyStepActive : ""}`}
                  onClick={() => setActiveStep(idx)}
                  title={step.desc}
                >
                  <span className={styles.stepCircle}>{idx + 1}</span>
                  <span>{step.label}</span>
                </button>
                {idx < JOURNEY_STEPS.length - 1 && (
                  <span className={styles.stepArrow}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
