"use client";

/**
 * Live 3D silver head (client only — import through SilverHeadHero, which loads this with ssr:false).
 * One runtime controller: idle Y-turn with delta time; the scroll reveal drives yaw, MouthOpen,
 * scale and drift directly. The GLB's own clips (Turntable, MouthOpen) are not played here, so a
 * mixer and a direct writer never fight over the same property.
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export type HeadControl = {
  /** performance.now() when the reveal started, or null */
  revealStart: number | null;
  /** true once the reveal is finished and the page is scrolled away */
  hidden: boolean;
  paused: boolean;
  reducedMotion: boolean;
  /** written by the canvas each frame: 0..1 opacity the wrapper should show */
  opacity: number;
  /** set by the canvas: request a frame after changing any field above */
  kick: () => void;
};

export const TURN_SECONDS = 20;
export const REVEAL_SECONDS = 0.75;
const TWO_PI = Math.PI * 2;

// one easing family for the whole timeline (CSS twin: cubic-bezier(0.65, 0, 0.35, 1))
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const seg = (t: number, a: number, b: number) =>
  easeInOutCubic(Math.min(1, Math.max(0, (t - a) / (b - a))));

type Props = {
  control: React.MutableRefObject<HeadControl>;
  glbUrl: string;
  envUrl: string;
  onReady: () => void;
  onPoorPerformance: () => void;
  onOpacity: (o: number) => void;
};

function Environment({ url }: { url: string }) {
  const { gl, scene } = useThree();
  const hdr = useLoader(RGBELoader, url);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const env = pmrem.fromEquirectangular(hdr).texture; // processed once at load
    scene.environment = env;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, hdr]);
  return null;
}

function Head({
  control,
  glbUrl,
  onReady,
  onPoorPerformance,
  onOpacity,
}: Omit<Props, "envUrl">) {
  const gltf = useLoader(GLTFLoader, glbUrl);
  const invalidate = useThree((s) => s.invalidate);
  const tilt = useRef<THREE.Group>(null);
  const { spin, morphMeshes, morphIndex } = useMemo(() => {
    const spin = gltf.scene.getObjectByName("SpinRoot") ?? gltf.scene;
    const morphMeshes: THREE.Mesh[] = [];
    let morphIndex = 0;
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (
        m.isMesh &&
        m.morphTargetDictionary &&
        "MouthOpen" in m.morphTargetDictionary
      ) {
        morphMeshes.push(m);
        morphIndex = m.morphTargetDictionary.MouthOpen;
      }
    });
    return { spin, morphMeshes, morphIndex };
  }, [gltf]);

  const state = useRef({
    yaw: 0,
    fromYaw: 0,
    toYaw: 0,
    captured: false,
    tiltX: 0,
    tiltY: 0,
    perfT: 0,
    perfFrames: 0,
    perfDone: false,
    opacity: 1,
  });
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    control.current.kick = () => invalidate();
    onReady();
    const fine = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    if (!fine) return; // no pointer tilt on touch devices
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [onReady, invalidate, control]);

  useFrame((_, rawDelta) => {
    const c = control.current;
    const s = state.current;
    const dt = Math.min(rawDelta, 0.1); // no time jump after a pause
    let mouth = 0,
      scale = 1,
      drift = 0;
    let opacity = s.opacity;
    let moving = false;

    if (c.revealStart !== null && !c.reducedMotion) {
      const t = (performance.now() - c.revealStart) / 1000;
      if (!s.captured) {
        // capture the current yaw, stop the idle turn, settle to the nearest front-facing equivalent
        s.captured = true;
        s.fromYaw = s.yaw;
        s.toYaw = Math.round(s.yaw / TWO_PI) * TWO_PI;
      }
      s.yaw = s.fromYaw + (s.toYaw - s.fromYaw) * seg(t, 0, 0.45);
      mouth = seg(t, 0.15, 0.6);
      const k = seg(t, 0, REVEAL_SECONDS);
      scale = 1 + 0.1 * k;
      drift = 0.012 * k;
      opacity = 1 - seg(t, 0.45, REVEAL_SECONDS);
      moving = t < REVEAL_SECONDS + 0.05;
    } else {
      s.captured = false;
      // settled hero: closed mouth, fade back in if we return to the top
      const target = c.hidden ? 0 : 1;
      opacity =
        Math.abs(target - s.opacity) < 0.01
          ? target
          : s.opacity + (target - s.opacity) * Math.min(1, dt * 8);
      if (opacity !== target) moving = true;
      if (!c.paused && !c.reducedMotion && !c.hidden) {
        s.yaw = (s.yaw + (dt * TWO_PI) / TURN_SECONDS) % TWO_PI;
        moving = true;
      }
    }

    // restrained pointer tilt (desktop only; pointer stays 0 on touch)
    const targetX =
      c.reducedMotion || c.revealStart !== null
        ? 0
        : pointer.current.y * THREE.MathUtils.degToRad(3);
    const targetY =
      c.reducedMotion || c.revealStart !== null
        ? 0
        : pointer.current.x * THREE.MathUtils.degToRad(4);
    s.tiltX += (targetX - s.tiltX) * Math.min(1, dt * 6);
    s.tiltY += (targetY - s.tiltY) * Math.min(1, dt * 6);
    if (
      Math.abs(targetX - s.tiltX) > 1e-4 ||
      Math.abs(targetY - s.tiltY) > 1e-4
    )
      moving = true;

    spin.rotation.y = s.yaw;
    for (const m of morphMeshes)
      if (m.morphTargetInfluences) m.morphTargetInfluences[morphIndex] = mouth;
    if (tilt.current) {
      tilt.current.rotation.set(s.tiltX, s.tiltY, 0);
      tilt.current.scale.setScalar(scale);
      tilt.current.position.y = drift;
    }
    if (opacity !== s.opacity) {
      s.opacity = opacity;
      c.opacity = opacity;
      onOpacity(opacity);
    }

    // sustained poor performance -> fall back to the poster (measured during the first idle seconds)
    if (
      !s.perfDone &&
      c.revealStart === null &&
      !c.paused &&
      !c.reducedMotion
    ) {
      s.perfT += rawDelta;
      s.perfFrames += 1;
      if (s.perfT > 4) {
        s.perfDone = true;
        if (s.perfFrames / s.perfT < 20) onPoorPerformance();
      }
    }
    if (moving) invalidate(); // render on demand; keep going only while something moves
  });

  return (
    <group ref={tilt}>
      <primitive object={gltf.scene} />
    </group>
  );
}

export default function SilverHeadCanvas(props: Props & { active: boolean }) {
  const { active, envUrl, ...rest } = props;
  const dpr = useMemo<[number, number]>(() => {
    if (typeof window === "undefined") return [1, 1];
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    return coarse ? [1, 1] : [1, Math.min(1.5, window.devicePixelRatio || 1)];
  }, []);
  return (
    <Canvas
      frameloop={active ? "demand" : "never"}
      dpr={dpr}
      camera={{ fov: 24, near: 0.05, far: 10, position: [0, 0, 0.8] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping; // matches the poster and Blender's Khronos PBR Neutral
        gl.setClearColor(0x000000, 0);
      }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Environment url={envUrl} />
        <Head {...rest} />
      </Suspense>
    </Canvas>
  );
}
