'use client';

/**
 * World-space haze, a soft shaft, two distant traces, and one scan sweep.
 * Nothing here writes React state. Opacity is a pure function of `control.dive`,
 * so a reverse scroll restores the same frame without restarting the intro.
 * The group is not parented to the head, and it is hidden before the camera
 * reaches the mouth so the black interior stays empty.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HeadControl } from './SilverHeadCanvas';
import type { SceneDetail } from './chamberEnvironment';

const PRESENCE_START = 0.28;
const PRESENCE_END = 0.62;

const SWEEP_INTRO = 1.15;
const SWEEP_DURATION = 1.05;
const SWEEP_GAP = 13.5;
const SWEEP_STRENGTH = 3.2;

type LayerSpec = {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity: number;
  phase: number;
  speed: number;
};

const HAZE: readonly LayerSpec[] = [
  {
    position: [-0.15, 0.08, -1.15],
    scale: [2.6, 1.8, 1],
    color: '#9fb2a8',
    opacity: 0.11,
    phase: 0.4,
    speed: 0.07,
  },
  {
    position: [0.02, -0.3, -0.5],
    scale: [1.5, 0.78, 1],
    color: '#c5d4cc',
    opacity: 0.16,
    phase: 1.3,
    speed: 0.11,
  },
  {
    position: [0.4, 0.06, -0.72],
    scale: [1.15, 1.4, 1],
    color: '#6fbf9a',
    opacity: 0.1,
    phase: 2.1,
    speed: 0.09,
  },
  {
    position: [0.08, 0.04, -0.86],
    scale: [1.7, 1.15, 1],
    color: '#d5e2da',
    opacity: 0.14,
    phase: 0.2,
    speed: 0.13,
  },
];

function smoothstep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Full at rest, gone by the time the dolly reaches the lips. */
export function atmospherePresence(dive: number) {
  const t = (dive - PRESENCE_START) / (PRESENCE_END - PRESENCE_START);
  return 1 - smoothstep(t);
}

/** 0 outside a pass. The first pass waits, then each pass is about a second. */
function sweepEnvelope(time: number) {
  if (time < SWEEP_INTRO) return { strength: 0, across: 0 };

  const cycle = SWEEP_DURATION + SWEEP_GAP;
  const local = (time - SWEEP_INTRO) % cycle;
  if (local > SWEEP_DURATION) return { strength: 0, across: 1 };

  const across = local / SWEEP_DURATION;
  const fadeIn = smoothstep(across / 0.22);
  const fadeOut = 1 - smoothstep((across - 0.68) / 0.32);
  return { strength: fadeIn * fadeOut, across };
}

function radialTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.04,
    size / 2,
    size / 2,
    size * 0.5,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(0.74, 'rgba(255,255,255,0.06)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function columnTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 256;

  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.78, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

type Props = {
  control: React.MutableRefObject<HeadControl>;
  detail: SceneDetail;
};

export default function SceneAtmosphere({ control, detail }: Props) {
  const full = detail === 'full';
  const group = useRef<THREE.Group>(null);
  const sweep = useRef<THREE.SpotLight>(null);
  const sweepTarget = useRef<THREE.Object3D>(null);
  const haze = useRef<(THREE.Mesh | null)[]>([]);
  const shaft = useRef<THREE.Mesh>(null);
  const traces = useRef<(THREE.Mesh | null)[]>([]);
  const clock = useRef(0);

  const maps = useMemo(() => {
    const radial = radialTexture();
    const column = columnTexture();
    return { radial, column };
  }, []);

  const layers = full ? HAZE : HAZE.slice(0, 2);

  useEffect(() => {
    return () => {
      maps.radial.dispose();
      maps.column.dispose();
    };
  }, [maps]);

  useFrame((_, rawDelta) => {
    const state = control.current;
    const paused = state.paused || state.reducedMotion;
    // Pause freezes the clock. Scroll does not reset it, so the intro cannot replay.
    if (!paused) clock.current += Math.min(rawDelta, 0.1);

    const presence = state.reducedMotion
      ? 0
      : atmospherePresence(state.dive);
    const show = presence > 0.004;

    if (group.current) group.current.visible = show;
    if (!show) return;

    const time = clock.current;

    layers.forEach((layer, index) => {
      const mesh = haze.current[index];
      if (!mesh) return;

      mesh.position.x =
        layer.position[0] +
        Math.sin(time * layer.speed + layer.phase) * 0.045;
      mesh.position.y =
        layer.position[1] +
        Math.cos(time * layer.speed * 0.73 + layer.phase) * 0.03;

      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = layer.opacity * presence;
    });

    if (shaft.current) {
      const material = shaft.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.05 * presence;
      shaft.current.position.x =
        0.22 + Math.sin(time * 0.05 + 0.6) * 0.03;
    }

    traces.current.forEach((mesh, index) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshBasicMaterial;
      const pulse = 0.62 + 0.38 * Math.sin(time * 0.22 + index * 1.7);
      material.opacity = 0.09 * pulse * presence;
    });

    const light = sweep.current;
    const target = sweepTarget.current;
    if (!light || !target) return;

    if (light.target !== target) {
      light.target = target;
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
            opacity={layer.opacity}
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
          scale={[0.42, 2.15, 1]}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={maps.radial}
            color="#8fe0b4"
            opacity={0.05}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped
          />
        </mesh>
      )}

      {full &&
        [
          [-0.58, 0.05, -1.4],
          [0.66, -0.02, -1.5],
        ].map((position, index) => (
          <mesh
            key={position.join(':')}
            ref={(node) => {
              traces.current[index] = node;
            }}
            position={position as [number, number, number]}
            scale={[0.035, 1.7, 1]}
            renderOrder={1}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={maps.column}
              color="#78E8AA"
              opacity={0.09}
              transparent
              depthWrite={false}
              toneMapped
            />
          </mesh>
        ))}

      {/* Layer 0 only, so MouthDark on layer 1 never catches the streak. */}
      <spotLight
        ref={sweep}
        color="#d7f3e6"
        intensity={0}
        angle={0.18}
        penumbra={1}
        distance={0.72}
        decay={2}
        position={[-0.3, 0.15, 0.5]}
      />
      <object3D ref={sweepTarget} position={[0, -0.015, 0.03]} />
    </group>
  );
}
