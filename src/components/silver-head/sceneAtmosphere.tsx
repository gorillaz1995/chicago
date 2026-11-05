"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { HeadControl } from "./SilverHeadCanvas";
import type { SceneDetail } from "./chamberEnvironment";

const PRESENCE_START = 0.28;
const PRESENCE_END = 0.62;

const SWEEP_INTRO = 1.15;
const SWEEP_DURATION = 1.4;
const SWEEP_GAP = 15;
const SWEEP_STRENGTH = 1.65;

type LayerSpec = {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity: number;
  phase: number;
  speed: number;
};

// Localized wisps with soft edges to avoid a visible canvas boundary.
const HAZE: readonly LayerSpec[] = [
  {
    position: [-0.16, -0.36, -0.65],
    scale: [1.95, 0.84, 1],
    color: "#0b2019",
    opacity: 0.24,
    phase: 0.4,
    speed: 0.045,
  },
  {
    position: [0.17, -0.48, -0.48],
    scale: [1.42, 0.64, 1],
    color: "#14241e",
    opacity: 0.19,
    phase: 1.3,
    speed: 0.062,
  },
  {
    position: [0.36, -0.19, -0.84],
    scale: [1.18, 1.02, 1],
    color: "#2a5741",
    opacity: 0.055,
    phase: 2.1,
    speed: 0.052,
  },
  {
    position: [-0.36, -0.23, -0.96],
    scale: [1.32, 0.92, 1],
    color: "#263e3d",
    opacity: 0.045,
    phase: 0.2,
    speed: 0.057,
  },
];

function smoothstep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Visible at rest and cleared before the camera enters the mouth. */
export function atmospherePresence(dive: number) {
  const progress = (dive - PRESENCE_START) / (PRESENCE_END - PRESENCE_START);

  return 1 - smoothstep(progress);
}

function sweepEnvelope(time: number) {
  if (time < SWEEP_INTRO) {
    return { strength: 0, across: 0 };
  }

  const cycle = SWEEP_DURATION + SWEEP_GAP;
  const local = (time - SWEEP_INTRO) % cycle;

  if (local > SWEEP_DURATION) {
    return { strength: 0, across: 1 };
  }

  const across = local / SWEEP_DURATION;

  const fadeIn = smoothstep(across / 0.28);
  const fadeOut = 1 - smoothstep((across - 0.62) / 0.38);

  return {
    strength: fadeIn * fadeOut,
    across,
  };
}

/**
 * Procedural alpha maps with no DOM access during rendering.
 * Both horizontal and vertical edges fade on the trace texture.
 */
function softTexture(width: number, height: number, column: boolean) {
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = ((x + 0.5) / width) * 2 - 1;
      const py = ((y + 0.5) / height) * 2 - 1;

      const distance = column ? Math.abs(py) : Math.sqrt(px * px + py * py);

      const fade = 1 - smoothstep(distance);

      const horizontal = column ? 1 - smoothstep(Math.abs(px)) : 1;

      const alpha = Math.pow(fade, column ? 1.5 : 1.7) * horizontal;

      const i = (y * width + x) * 4;

      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
      pixels[i + 3] = Math.round(255 * alpha);
    }
  }

  const texture = new THREE.DataTexture(
    pixels,
    width,
    height,
    THREE.RGBAFormat,
  );

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
}

type Props = {
  control: MutableRefObject<HeadControl>;
  detail: SceneDetail;
};

export default function SceneAtmosphere({ control, detail }: Props) {
  const full = detail === "full";

  const group = useRef<THREE.Group>(null);
  const sweep = useRef<THREE.SpotLight>(null);
  const sweepTarget = useRef<THREE.Object3D>(null);

  const haze = useRef<(THREE.Mesh | null)[]>([]);
  const shaft = useRef<THREE.Mesh>(null);
  const traces = useRef<(THREE.Mesh | null)[]>([]);

  const clock = useRef(0);

  const maps = useMemo(
    () => ({
      radial: softTexture(128, 128, false),
      column: softTexture(32, 128, true),
    }),
    [],
  );

  const layers = full ? HAZE : HAZE.slice(0, 2);

  useEffect(() => {
    return () => {
      maps.radial.dispose();
      maps.column.dispose();
    };
  }, [maps]);

  useFrame((_, rawDelta) => {
    const state = control.current;

    // Pause freezes the idle effects without resetting their phase.
    if (!state.paused && !state.reducedMotion) {
      clock.current += Math.min(rawDelta, 0.1);
    }

    const presence = state.reducedMotion ? 0 : atmospherePresence(state.dive);

    const show = presence > 0.004;

    if (group.current) {
      group.current.visible = show;
    }

    if (!show) return;

    const time = clock.current;

    layers.forEach((layer, index) => {
      const mesh = haze.current[index];
      if (!mesh) return;

      mesh.position.x =
        layer.position[0] + Math.sin(time * layer.speed + layer.phase) * 0.025;

      mesh.position.y =
        layer.position[1] +
        Math.cos(time * layer.speed * 0.73 + layer.phase) * 0.018;

      const material = mesh.material as THREE.MeshBasicMaterial;

      material.opacity = layer.opacity * presence;
    });

    if (shaft.current) {
      const material = shaft.current.material as THREE.MeshBasicMaterial;

      material.opacity = 0.022 * presence;

      shaft.current.position.x = 0.22 + Math.sin(time * 0.035 + 0.6) * 0.018;
    }

    traces.current.forEach((mesh, index) => {
      if (!mesh) return;

      const material = mesh.material as THREE.MeshBasicMaterial;

      const pulse = 0.75 + 0.25 * Math.sin(time * 0.12 + index * 1.7);

      material.opacity = 0.038 * pulse * presence;
    });

    const light = sweep.current;
    const target = sweepTarget.current;

    if (!light || !target) return;

    if (light.target !== target) {
      light.target = target;

      // MouthDark stays on layer 1.
      light.layers.set(0);
    }

    const pass = sweepEnvelope(time);
    const lit = pass.strength * presence;

    light.intensity = lit * SWEEP_STRENGTH;
    light.visible = lit > 0.02;

    const x = THREE.MathUtils.lerp(-0.3, 0.3, pass.across);

    light.position.set(x, 0.15, 0.5);
    target.position.set(x * 0.55, -0.015, 0.03);
  });

  return (
    <group ref={group}>
      {layers.map((layer, index) => (
        <mesh
          key={layer.phase}
          ref={(node) => {
            haze.current[index] = node;
          }}
          position={layer.position}
          scale={layer.scale}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1]} />

          <meshBasicMaterial
            map={maps.radial}
            color={layer.color}
            opacity={0}
            transparent
            depthWrite={false}
            toneMapped
          />
        </mesh>
      ))}

      {full && (
        <mesh
          ref={shaft}
          position={[0.22, 0.12, -0.98]}
          scale={[0.36, 1.9, 1]}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1]} />

          <meshBasicMaterial
            map={maps.radial}
            color="#7ccca3"
            opacity={0}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped
          />
        </mesh>
      )}

      {full &&
        (
          [
            [-0.58, 0.05, -1.4],
            [0.66, -0.02, -1.5],
          ] as [number, number, number][]
        ).map((position, index) => (
          <mesh
            key={position.join(":")}
            ref={(node) => {
              traces.current[index] = node;
            }}
            position={position}
            scale={[0.022, 1.5, 1]}
            renderOrder={1}
          >
            <planeGeometry args={[1, 1]} />

            <meshBasicMaterial
              map={maps.column}
              color="#6fc99c"
              opacity={0}
              transparent
              depthWrite={false}
              toneMapped
            />
          </mesh>
        ))}

      <spotLight
        ref={sweep}
        color="#c9e9db"
        intensity={0}
        angle={0.2}
        penumbra={1}
        distance={0.72}
        decay={2}
        position={[-0.3, 0.15, 0.5]}
      />

      <object3D ref={sweepTarget} position={[0, -0.015, 0.03]} />
    </group>
  );
}
