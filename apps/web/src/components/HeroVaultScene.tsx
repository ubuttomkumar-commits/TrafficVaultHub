import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./HeroVaultScene.module.css";

export function HeroVaultScene({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pulseCount, setPulseCount] = useState(142);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060911, 0.08);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.6, 7.2);

    // Renderer
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
      renderer.toneMappingExposure = 1.25;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth, container.clientHeight, false);
    } catch {
      // Fallback if WebGL fails
      return;
    }

    // Materials Library
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x111624,
      metalness: 0.9,
      roughness: 0.25,
    });

    const brushedGoldMat = new THREE.MeshStandardMaterial({
      color: 0x1a2638,
      metalness: 0.8,
      roughness: 0.35,
    });

    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x0f2a3a,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.85,
      metalness: 0.5,
      roughness: 0.2,
      wireframe: false,
    });

    const violetGlowMat = new THREE.MeshStandardMaterial({
      color: 0x25163e,
      emissive: 0xa855f7,
      emissiveIntensity: 0.75,
      metalness: 0.5,
      roughness: 0.3,
    });

    const glassCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x051322,
      transmission: 0.85,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
      ior: 1.5,
    });

    // Master Vault Group
    const vaultGroup = new THREE.Group();
    scene.add(vaultGroup);

    // 1. Outer Heavy Vault Ring
    const outerRingGeo = new THREE.TorusGeometry(2.3, 0.12, 16, 64);
    const outerRingMesh = new THREE.Mesh(outerRingGeo, darkMetalMat);
    vaultGroup.add(outerRingMesh);

    // 2. Secondary Counter-Rotating Gyro Ring
    const gyroRingGeo = new THREE.TorusGeometry(2.6, 0.05, 12, 64);
    const gyroRingMesh = new THREE.Mesh(gyroRingGeo, cyanGlowMat);
    gyroRingMesh.rotation.x = Math.PI / 4;
    vaultGroup.add(gyroRingMesh);

    // 3. Vault Radial Teeth / Locking Bolts (8 segments)
    const teethGroup = new THREE.Group();
    const toothGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tooth = new THREE.Mesh(toothGeo, brushedGoldMat);
      tooth.position.set(Math.cos(angle) * 2.3, Math.sin(angle) * 2.3, 0);
      tooth.rotation.z = angle + Math.PI / 2;
      teethGroup.add(tooth);
    }
    vaultGroup.add(teethGroup);

    // 4. Faceted Vault Core (Crystalline Icosahedron)
    const coreGeo = new THREE.IcosahedronGeometry(0.9, 1);
    const coreMesh = new THREE.Mesh(coreGeo, glassCoreMat);
    vaultGroup.add(coreMesh);

    // 5. Central Biometric Pulse Sphere
    const innerPulseGeo = new THREE.SphereGeometry(0.42, 32, 32);
    const innerPulseMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const innerPulseMesh = new THREE.Mesh(innerPulseGeo, innerPulseMat);
    vaultGroup.add(innerPulseMesh);

    // 6. Orbiting Conversion Nodes (Attribution, Postback, Quality, Ledger)
    const nodeGroup = new THREE.Group();
    vaultGroup.add(nodeGroup);

    type NodeOrbit = {
      mesh: THREE.Mesh;
      radius: number;
      speed: number;
      angle: number;
      yOffset: number;
    };

    const nodeGeos = [
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.DodecahedronGeometry(0.18, 0),
      new THREE.TetrahedronGeometry(0.22, 0),
      new THREE.IcosahedronGeometry(0.19, 0),
    ];

    const orbitingNodes: NodeOrbit[] = [
      { mesh: new THREE.Mesh(nodeGeos[0], cyanGlowMat), radius: 3.2, speed: 0.008, angle: 0, yOffset: 0.4 },
      { mesh: new THREE.Mesh(nodeGeos[1], violetGlowMat), radius: 3.4, speed: -0.006, angle: Math.PI * 0.6, yOffset: -0.5 },
      { mesh: new THREE.Mesh(nodeGeos[2], cyanGlowMat), radius: 3.0, speed: 0.009, angle: Math.PI * 1.2, yOffset: 0.2 },
      { mesh: new THREE.Mesh(nodeGeos[3], brushedGoldMat), radius: 3.6, speed: -0.005, angle: Math.PI * 1.7, yOffset: -0.3 },
    ];

    orbitingNodes.forEach((node) => nodeGroup.add(node.mesh));

    // 7. Atmospheric Data Particle Cloud
    const particleCount = 100;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 12;
      particlePos[i + 1] = (Math.random() - 0.5) * 8;
      particlePos[i + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 8. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x0e1726, 2.5);
    scene.add(ambientLight);

    const cyanKeyLight = new THREE.PointLight(0x22d3ee, 4.5, 12, 1.2);
    cyanKeyLight.position.set(3, 3, 4);
    scene.add(cyanKeyLight);

    const violetRimLight = new THREE.PointLight(0xa855f7, 3.8, 12, 1.2);
    violetRimLight.position.set(-3.5, -2, -2);
    scene.add(violetRimLight);

    const frontFillLight = new THREE.DirectionalLight(0xf8fafc, 1.2);
    frontFillLight.position.set(0, 4, 6);
    scene.add(frontFillLight);

    // Pointer Interaction (Damped Lerp)
    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = nx * 0.45;
      targetRotX = -ny * 0.35;
    };

    window.addEventListener("pointermove", handlePointerMove);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId = 0;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Smooth pointer damping
      mouseX += (targetRotX - mouseX) * 0.05;
      mouseY += (targetRotY - mouseY) * 0.05;

      vaultGroup.rotation.x = mouseX + Math.sin(elapsed * 0.3) * 0.08;
      vaultGroup.rotation.y = mouseY + elapsed * 0.15;

      // Rotate sub-elements at varied velocities
      gyroRingMesh.rotation.z += 0.008;
      gyroRingMesh.rotation.y += 0.005;
      teethGroup.rotation.z -= 0.004;
      coreMesh.rotation.x -= 0.007;
      coreMesh.rotation.y += 0.009;

      // Pulse core emission
      const pulse = 1.0 + Math.sin(elapsed * 3.0) * 0.35;
      innerPulseMat.emissiveIntensity = pulse;
      innerPulseMesh.scale.setScalar(0.95 + Math.sin(elapsed * 3.0) * 0.05);

      // Orbiting conversion nodes
      orbitingNodes.forEach((node) => {
        node.angle += node.speed;
        node.mesh.position.set(
          Math.cos(node.angle) * node.radius,
          node.yOffset + Math.sin(elapsed * 1.5 + node.angle) * 0.25,
          Math.sin(node.angle) * node.radius
        );
        node.mesh.rotation.x += 0.02;
        node.mesh.rotation.y += 0.03;
      });

      // Drift particle cloud
      particles.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    if (prefersReducedMotion) {
      // Single pristine render
      renderer.render(scene, camera);
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }

    // Dynamic pulse counter interval for realism
    const interval = setInterval(() => {
      setPulseCount((prev) => prev + 1);
    }, 4500);

    // Cleanup & Resource Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(interval);
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
      role="img"
      aria-label="Interactive 3D Digital Vault representing TrafficVaultHub universal tracking engine"
    >
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Floating HUD Preview Panels */}
      <div className={styles.hudOverlay}>
        <div className={styles.hudTop}>
          <div className={styles.hudCard}>
            <div className={styles.hudLabel}>Publisher Earnings</div>
            <div className={styles.hudValue}>
              <span className={styles.hudIndicator} />
              $1,245.50 <span style={{ fontSize: "0.68rem", color: "var(--color-accent-cyan)" }}>PAYABLE</span>
            </div>
          </div>
          <div className={styles.hudCard}>
            <div className={styles.hudLabel}>Ledger Integrity</div>
            <div className={styles.hudValue}>
              <span className={styles.hudIndicator} />
              100% <span style={{ fontSize: "0.68rem", color: "var(--color-success)" }}>PARITY</span>
            </div>
          </div>
        </div>

        <div className={styles.hudBottom}>
          <div className={styles.hudTicker}>
            <span className={styles.hudIndicator} />
            <span>EVENT #{pulseCount}: S2S POSTBACK VERIFIED · IDEMPOTENT</span>
          </div>
          <p className={styles.caption}>Interactive 3D Vault Engine</p>
        </div>
      </div>
    </div>
  );
}
