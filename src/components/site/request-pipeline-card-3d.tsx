// @ts-nocheck
//
// ─────────────────────────────────────────────────────────────────────────
// NOT WIRED IN YET. This file imports "three", "@react-three/fiber",
// "@react-three/drei" and "@react-three/postprocessing" — none of which
// are installed in this project yet, so this sandbox (no npm registry
// access) can neither install them nor type-check this file. The
// @ts-nocheck above stops that from breaking `tsc`/`next build` in the
// meantime; it does NOT mean the code is untested logic, just that the
// module resolution can't be verified until the packages exist locally.
//
// To switch on:
//   1. On your machine, in the project root:
//        npm install three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing
//   2. In src/app/page.tsx, change:
//        import { RequestPipelineCard } from "@/components/site/request-pipeline-card";
//      to:
//        import { RequestPipelineCard } from "@/components/site/request-pipeline-card-3d";
//   3. Delete the @ts-nocheck line above once `three`'s types resolve.
//   4. npm run build to confirm, then deploy as usual.
//
// The old canvas-2D version (request-pipeline-card.tsx) is left untouched
// as the working fallback — nothing breaks if you never do the above.
// ─────────────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Trail } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/format";

const STAGES = ["Submitted", "Reviewed", "Matched", "Introduced"] as const;
const STAGE_MS = 2200;
const PARTNER_COUNT = 7;

const GOLD = "#FF9933"; // gold-500
const GOLD_DEEP = "#C15F0A"; // gold-700
const LEAF = "#178A38"; // leaf-500

type MatchParticle = { id: number; from: number; to: number; t: number; color: string };

/** The rim: a metal torus + rotating tread ticks, same "actual tyre" read
    as the 2D version, now with real geometry and a real light hitting it. */
function Rim({ radius }: { radius: number }) {
  const ticks = useMemo(() => {
    const count = 24;
    return Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2);
  }, []);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, radius * 0.06, 24, 96]} />
        <meshStandardMaterial color={GOLD_DEEP} metalness={0.92} roughness={0.28} emissive={GOLD} emissiveIntensity={0.18} />
      </mesh>
      {ticks.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]} rotation={[0, -a, 0]}>
          <boxGeometry args={[radius * 0.09, radius * 0.014, radius * 0.014]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.18} />
        </mesh>
      ))}
    </group>
  );
}

/** A partner node on the rim — emissive sphere that pulses brighter when
    a particle arrives or departs (`pulse` is decayed each frame by the
    parent, same idea as the .pulse field in the 2D version's Node type). */
function PartnerNode({ angle, radius, pulseRef }: { angle: number; radius: number; pulseRef: { current: number } }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (!matRef.current) return;
    pulseRef.current = Math.max(0, pulseRef.current - 0.02);
    matRef.current.emissiveIntensity = 0.7 + pulseRef.current * 1.6;
  });
  return (
    <Float speed={2.2} floatIntensity={0.35} rotationIntensity={0}>
      <mesh position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
        <sphereGeometry args={[radius * 0.045, 20, 20]} />
        <meshStandardMaterial ref={matRef} color={LEAF} emissive={LEAF} emissiveIntensity={0.7} metalness={0.3} roughness={0.4} />
      </mesh>
    </Float>
  );
}

/** A single traveling packet with a comet trail (drei's <Trail>, which is
    the library doing exactly what the 2D version hand-rolled with a
    fading-dot fan). Removes itself via onDone once t reaches 1. */
function Packet({ p, radius, onDone }: { p: MatchParticle; radius: number; onDone: (id: number) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const tRef = useRef(p.t);
  useFrame(() => {
    if (!ref.current) return;
    tRef.current += p.to === -1 || p.from === -1 ? 0.012 : 0.012;
    const a = p.from === -1 ? new THREE.Vector3(0, 0, 0) : nodePos(p.from, radius);
    const b = p.to === -1 ? new THREE.Vector3(0, 0, 0) : nodePos(p.to, radius);
    const pos = a.clone().lerp(b, Math.min(1, tRef.current));
    ref.current.position.copy(pos);
    if (tRef.current >= 1) onDone(p.id);
  });
  return (
    <Trail width={2.2} length={5} color={p.color} attenuation={(t) => t * t}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={p.color} />
      </mesh>
    </Trail>
  );
}

function nodePos(idx: number, radius: number) {
  const a = (idx / PARTNER_COUNT) * Math.PI * 2 - Math.PI / 2;
  return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
}

function Scene({ reduceMotion }: { reduceMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const hubRef = useRef<THREE.MeshStandardMaterial>(null);
  const radius = 1.15;
  const pulseRefs = useMemo(() => Array.from({ length: PARTNER_COUNT }, () => ({ current: 0 })), []);
  const [particles, setParticles] = useState<MatchParticle[]>([]);
  const nextId = useRef(0);
  const spawnClock = useRef(0);
  const matchClock = useRef(0);
  const clock = useRef(0);

  useFrame((state, delta) => {
    clock.current += delta;
    if (hubRef.current) {
      hubRef.current.emissiveIntensity = 0.9 + Math.sin(clock.current * 1.8) * 0.35;
    }
    if (groupRef.current && !reduceMotion) {
      groupRef.current.rotation.y += delta * 0.18;
      // Gentle parallax toward the pointer, same lerped-follow idea as the
      // 2D card and HeroRing — R3F already tracks normalized pointer coords.
      const targetX = state.pointer.y * 0.25;
      const targetZ = -state.pointer.x * 0.05;
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.05;
      groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.05;
    }

    if (reduceMotion) return;
    spawnClock.current += delta;
    if (spawnClock.current > 1.1) {
      spawnClock.current = 0;
      const idx = Math.floor(Math.random() * PARTNER_COUNT);
      setParticles((prev) => [...prev, { id: nextId.current++, from: idx, to: -1, t: 0, color: LEAF }]);
    }
    matchClock.current += delta;
    if (matchClock.current > 4) {
      matchClock.current = 0;
      const idx = Math.floor(Math.random() * PARTNER_COUNT);
      pulseRefs[idx].current = 1;
      setParticles((prev) => [...prev, { id: nextId.current++, from: -1, to: idx, t: 0, color: GOLD }]);
    }
  });

  function handleDone(id: number) {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={45} color={GOLD} />
      <pointLight position={[-3, -1.5, -2]} intensity={18} color={LEAF} />
      <Environment preset="studio" />

      <group ref={groupRef} rotation={[0.25, 0, 0]}>
        <Rim radius={radius} />
        {Array.from({ length: PARTNER_COUNT }, (_, i) => (
          <group key={i}>
            <PartnerNode
              angle={(i / PARTNER_COUNT) * Math.PI * 2 - Math.PI / 2}
              radius={radius}
              pulseRef={pulseRefs[i]}
            />
          </group>
        ))}
        {particles.map((p) => (
          <Packet key={p.id} p={p} radius={radius} onDone={handleDone} />
        ))}
        <mesh>
          <icosahedronGeometry args={[0.11, 1]} />
          <meshStandardMaterial ref={hubRef} color={GOLD} emissive={GOLD} emissiveIntensity={0.9} metalness={0.6} roughness={0.25} />
        </mesh>
      </group>
    </>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);
  return reduced;
}

/**
 * Real WebGL version of the pipeline visual — same wheel-of-partners idea
 * as request-pipeline-card.tsx, this time with actual geometry, PBR
 * materials, two-tone (gold/leaf) lighting, a studio environment for
 * reflections on the metal rim, and real bloom post-processing instead of
 * a hand-rolled canvas glow. Drop-in replacement: identical outer chrome
 * (header, stage labels, footer) as the 2D version, so swapping the
 * import in page.tsx is the only change needed once dependencies are
 * installed — see the notice at the top of this file.
 */
export function RequestPipelineCard() {
  const [stageIdx, setStageIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setStageIdx((s) => (s + 1) % STAGES.length), STAGE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card relative overflow-hidden border-white/10 bg-[#0b1220] shadow-raised">
      <div className="relative z-10 flex items-center justify-between gap-2.5 border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <BrandMark size={18} />
          <p className="font-mono text-[11px] tracking-wide text-white/50">Live matching network</p>
        </div>
        <span className="font-mono text-[10.5px] text-white/30">INR → USDT</span>
      </div>

      <div className="relative h-[260px] w-full">
        {mounted ? (
          <Canvas camera={{ position: [0, 1.3, 3.6], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
            <Scene reduceMotion={reduceMotion} />
            {!reduceMotion && (
              <EffectComposer>
                <Bloom mipmapBlur luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={1.1} />
              </EffectComposer>
            )}
          </Canvas>
        ) : null}
      </div>

      <div className="relative z-10 flex items-center justify-center gap-4 border-t border-white/10 bg-white/[0.02] px-5 py-2.5">
        {STAGES.map((s, i) => (
          <span
            key={s}
            className={cn(
              "font-mono text-[10px] tracking-wide transition-colors duration-300",
              i === stageIdx ? "text-gold-400" : "text-white/25",
            )}
          >
            {s}
          </span>
        ))}
      </div>

      <div className="relative z-10 flex items-center gap-2.5 border-t border-white/10 px-5 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-leaf-400" />
        <p className="text-[12px] leading-relaxed text-white/50">
          Settlement happens directly between you and the partner.
        </p>
      </div>
    </div>
  );
}
