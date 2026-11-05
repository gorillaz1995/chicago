"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { DIVE, STAGE_FOV } from "./dive";
import type { SceneDetail } from "./chamberEnvironment";

export type HeadFraming = {
  offsetX: number;
  offsetY: number;
  fovRest: number;
  fovCenter: number;
};

export type HeadControl = {
  dive: number;
  paused: boolean;
  reducedMotion: boolean;
  framing: HeadFraming;
  tiltX: number;
  tiltY: number;
  kick: () => void;
  /** Uploads the mouth glyph canvas. No-op until that plane exists. */
  syncGlyph: () => void;
};

export const TURN_SECONDS = 20;

// Initial mobile framing only.
// Lower values give the head more breathing room.
const MOBILE_REST_SCALE = 0.82;

// Maximum share of the viewport occupied by the rotation envelope.
const MOBILE_MAX_HEAD_WIDTH = 0.88;
const MOBILE_MAX_HEAD_HEIGHT = 0.8;
const MOBILE_BREAKPOINT = 760;

const TWO_PI = Math.PI * 2;

const CAM_FROM = new THREE.Vector3(0, 0, 0.8);
const ORIGIN = new THREE.Vector3();

const CAM_NEAR = 0.05;
const CAM_NEAR_DIVE = 0.01;

const _pos = new THREE.Vector3();
const _aim = new THREE.Vector3();

const PUSH = 0.42;

const FALLBACK_APPROACH = new THREE.Vector3(0, -0.0714, 0.1266);
const FALLBACK_END = new THREE.Vector3(0, -0.0875, 0.086);
const FALLBACK_LOOK = new THREE.Vector3(0, -0.0875, 0.04);

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

const seg = (t: number, a: number, b: number) =>
  easeInOutCubic(Math.min(1, Math.max(0, (t - a) / (b - a))));

const span = (t: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (t - a) / (b - a)));

type Cavity = {
  approach: THREE.Vector3;
  end: THREE.Vector3;
  look: THREE.Vector3;
};

/**
 * Measure the closed head once.
 * The envelope allows for its complete idle rotation.
 */
function measureRestEnvelope(root: THREE.Object3D, spin: THREE.Object3D) {
  root.updateWorldMatrix(true, true);

  const box = new THREE.Box3();
  const pivot = spin.getWorldPosition(new THREE.Vector3());
  const point = new THREE.Vector3();

  let radius = 0;

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const positions = mesh.geometry?.getAttribute("position");

    if (!mesh.isMesh || !positions) return;

    for (let i = 0; i < positions.count; i++) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);

      box.expandByPoint(point);

      radius = Math.max(
        radius,
        Math.hypot(point.x - pivot.x, point.z - pivot.z),
      );
    }
  });

  if (box.isEmpty()) return null;

  box.min.x = pivot.x - radius;
  box.max.x = pivot.x + radius;
  box.min.z = pivot.z - radius;
  box.max.z = pivot.z + radius;

  // Small allowance for pointer tilt.
  box.expandByScalar((box.max.y - box.min.y) * 0.02);

  return box;
}

/**
 * Pull back only the initial compact-screen framing.
 * Model scale and mouth-target coordinates remain intact.
 */
function getRestFov(
  baseFov: number,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  envelope: THREE.Box3 | null,
) {
  const compact =
    width <= MOBILE_BREAKPOINT || (height <= 500 && width <= 1024);

  if (!compact || width <= 0 || height <= 0) {
    return baseFov;
  }

  let halfTan =
    Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) / MOBILE_REST_SCALE;

  if (!envelope) {
    return THREE.MathUtils.radToDeg(2 * Math.atan(halfTan));
  }

  const padX = width * (1 - MOBILE_MAX_HEAD_WIDTH) * 0.5;

  const padY = height * (1 - MOBILE_MAX_HEAD_HEIGHT) * 0.5;

  const left = Math.max(width * 0.1, width * 0.5 + offsetX - padX);

  const right = Math.max(width * 0.1, width * 0.5 - offsetX - padX);

  const top = Math.max(height * 0.1, height * 0.5 + offsetY - padY);

  const bottom = Math.max(height * 0.1, height * 0.5 - offsetY - padY);

  const cx = (envelope.min.x + envelope.max.x) * 0.5;
  const cz = (envelope.min.z + envelope.max.z) * 0.5;
  const rx = (envelope.max.x - envelope.min.x) * 0.5;
  const rz = (envelope.max.z - envelope.min.z) * 0.5;

  // Sample the rotation envelope without per-frame allocations.
  for (let i = 0; i < 32; i++) {
    const angle = (i * Math.PI * 2) / 32;

    const x = cx + Math.cos(angle) * rx - CAM_FROM.x;

    const z = cz + Math.sin(angle) * rz;

    const depth = Math.max(CAM_NEAR, CAM_FROM.z - z);

    halfTan = Math.max(
      halfTan,
      (Math.abs(x) * height) / (2 * depth * (x >= 0 ? right : left)),
    );

    for (let side = 0; side < 2; side++) {
      const y = (side === 0 ? envelope.min.y : envelope.max.y) - CAM_FROM.y;

      halfTan = Math.max(
        halfTan,
        (Math.abs(y) * height) / (2 * depth * (y >= 0 ? top : bottom)),
      );
    }
  }

  return THREE.MathUtils.radToDeg(2 * Math.atan(halfTan));
}

type Props = {
  control: MutableRefObject<HeadControl>;
  glbUrl: string;
  envUrl: string;
  detail: SceneDetail;
  onReady: () => void;
  onPoorPerformance: () => void;
  /** Hidden glyph canvas. Null keeps the cavity empty. */
  glyphCanvas: HTMLCanvasElement | null;
};

function Environment({ url }: { url: string }) {
  const { gl, scene } = useThree();
  const hdr = useLoader(RGBELoader, url);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);

    hdr.mapping = THREE.EquirectangularReflectionMapping;

    const env = pmrem.fromEquirectangular(hdr).texture;

    scene.environment = env;
    pmrem.dispose();

    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene, hdr]);

  return null;
}

function measureCavity(root: THREE.Object3D): Cavity | null {
  root.updateWorldMatrix(true, true);

  const box = new THREE.Box3();
  const v = new THREE.Vector3();

  let count = 0;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;

    if (!mesh.isMesh) return;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    if (!mats.some((mat) => mat?.name === "MouthDark")) {
      return;
    }

    const pos = mesh.geometry.getAttribute("position");
    const morphIndex = mesh.morphTargetDictionary?.MouthOpen;

    const morph =
      morphIndex === undefined
        ? undefined
        : mesh.geometry.morphAttributes.position?.[morphIndex];

    const relative = mesh.geometry.morphTargetsRelative !== false;

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos as THREE.BufferAttribute, i);

      if (morph) {
        if (relative) {
          v.x += morph.getX(i);
          v.y += morph.getY(i);
          v.z += morph.getZ(i);
        } else {
          v.fromBufferAttribute(morph as THREE.BufferAttribute, i);
        }
      }

      v.applyMatrix4(mesh.matrixWorld);
      box.expandByPoint(v);
      count += 1;
    }
  });

  if (!count || box.isEmpty()) return null;

  const size = box.getSize(new THREE.Vector3());

  if (size.z < 0.005) return null;

  const center = box.getCenter(new THREE.Vector3());
  const inset = Math.max(size.z * 0.28, 0.008);

  const approach = new THREE.Vector3(center.x, center.y, box.max.z + 0.03);

  const end = new THREE.Vector3(center.x, center.y, box.max.z - inset);

  const look = new THREE.Vector3(center.x, center.y, box.min.z + size.z * 0.15);

  if (look.z >= end.z - 0.005) {
    look.z = end.z - Math.max(size.z * 0.5, 0.02);
  }

  return { approach, end, look };
}

function Head({
  control,
  glbUrl,
  onReady,
  onPoorPerformance,
  glyphCanvas,
}: Omit<Props, "detail" | "envUrl">) {
  const gltf = useLoader(GLTFLoader, glbUrl);

  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);

  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const gl = useThree((s) => s.gl);

  const tilt = useRef<THREE.Group>(null);

  const { spin, morphMeshes, morphIndex } = useMemo(() => {
    const spin = gltf.scene.getObjectByName("SpinRoot") ?? gltf.scene;

    const morphMeshes: THREE.Mesh[] = [];
    let morphIndex = 0;

    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;

      if (
        mesh.isMesh &&
        mesh.morphTargetDictionary &&
        "MouthOpen" in mesh.morphTargetDictionary
      ) {
        morphMeshes.push(mesh);
        morphIndex = mesh.morphTargetDictionary.MouthOpen;
      }
    });

    return { spin, morphMeshes, morphIndex };
  }, [gltf]);

  const cavity = useRef<Cavity | null>(null);

  const glyphResolution = useRef<THREE.Vector2 | null>(null);

  // One texture for the life of the head. Three caches the mouth shader and
  // will not bind a replacement texture on the next visit.
  const glyphTextureRef = useRef<THREE.CanvasTexture | null>(null);

  const restEnvelope = useRef<THREE.Box3 | null>(null);

  const state = useRef({
    yaw: 0,
    fromYaw: 0,
    toYaw: 0,
    captured: false,
    cameraMoved: false,
    fov: -1,
    ox: Number.NaN,
    oy: Number.NaN,
    width: 0,
    height: 0,
    perfT: 0,
    perfFrames: 0,
    perfDone: false,
  });

  useLayoutEffect(() => {
    const previousYaw = spin.rotation.y;

    const previousMorphs = morphMeshes.map((mesh) =>
      mesh.morphTargetInfluences?.slice(),
    );

    // Measure the neutral pose before applying scroll state.
    spin.rotation.y = 0;

    for (const mesh of morphMeshes) {
      mesh.morphTargetInfluences?.fill(0);
    }

    gltf.scene.updateWorldMatrix(true, true);

    restEnvelope.current = measureRestEnvelope(gltf.scene, spin);

    cavity.current = measureCavity(gltf.scene);

    // Restore the existing pose after measurement.
    spin.rotation.y = previousYaw;

    morphMeshes.forEach((mesh, i) => {
      const values = previousMorphs[i];

      if (values && mesh.morphTargetInfluences) {
        values.forEach((value, index) => {
          mesh.morphTargetInfluences![index] = value;
        });
      }
    });

    gltf.scene.updateWorldMatrix(true, true);

    control.current.kick = () => invalidate();
    onReady();

    return () => {
      control.current.kick = () => {};
    };
  }, [onReady, invalidate, control, gltf, spin, morphMeshes]);

  // The cavity is a curved shell, so a card behind it only peeks through a gap.
  // Sampling the glyph canvas in screen space keeps every character sharp and
  // lets the opening reveal the grid as the camera moves in.
  useEffect(() => {
    const source = glyphCanvas;

    if (!source) return;

    let texture = glyphTextureRef.current;

    if (!texture) {
      texture = new THREE.CanvasTexture(source);
      // Mixed in after the color transform, so the canvas white stays white.
      texture.colorSpace = THREE.NoColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
      glyphTextureRef.current = texture;

      // Drawing-buffer pixels, so one glyph canvas covers the frame exactly once.
      const resolution = new THREE.Vector2(1, 1);
      const pixelRatio = gl.getPixelRatio();
      resolution.set(
        Math.max(1, size.width * pixelRatio),
        Math.max(1, size.height * pixelRatio),
      );
      glyphResolution.current = resolution;

      const bound = texture;

      gltf.scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;

        if (!mesh.isMesh) return;

        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        for (const entry of list) {
          const mat = entry as THREE.MeshStandardMaterial;

          if (!mat?.isMeshStandardMaterial || mat.name !== "MouthDark") continue;

          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uGlyphMap = { value: bound };
            shader.uniforms.uResolution = { value: resolution };

            shader.fragmentShader = shader.fragmentShader
              .replace(
                "#include <common>",
                "#include <common>\nuniform sampler2D uGlyphMap;\nuniform vec2 uResolution;",
              )
              .replace(
                "#include <colorspace_fragment>",
                `#include <colorspace_fragment>
vec2 glyphUv = clamp(gl_FragCoord.xy / uResolution, 0.0, 1.0);
vec4 glyph = texture2D(uGlyphMap, glyphUv);
gl_FragColor.rgb = mix(gl_FragColor.rgb, glyph.rgb, glyph.a);`,
              );
          };

          mat.customProgramCacheKey = () => "mouth-glyph-v6";
          mat.needsUpdate = true;
        }
      });
    } else {
      // The cached shader already samples this texture. Point it at the new canvas.
      texture.image = source;
      texture.needsUpdate = true;
    }

    const live = texture;

    control.current.syncGlyph = () => {
      live.needsUpdate = true;
      invalidate();
    };

    invalidate();

    return () => {
      control.current.syncGlyph = () => {};
    };
  }, [glyphCanvas, gl, gltf, size, control, invalidate]);

  useFrame((_, rawDelta) => {
    const c = control.current;
    const s = state.current;

    const dt = Math.min(rawDelta, 0.1);

    const resolution = glyphResolution.current;

    if (resolution) {
      const pixelRatio = gl.getPixelRatio();
      const width = Math.max(1, size.width * pixelRatio);
      const height = Math.max(1, size.height * pixelRatio);

      if (resolution.x !== width || resolution.y !== height) {
        resolution.set(width, height);
      }
    }

    const dive = c.reducedMotion ? 0 : THREE.MathUtils.clamp(c.dive, 0, 1);

    const resting = dive <= 0.0001;

    let moving = false;

    if (!resting) {
      if (!s.captured) {
        s.captured = true;
        s.fromYaw = s.yaw;

        s.toYaw = Math.round(s.yaw / TWO_PI) * TWO_PI;
      }

      const yawT = easeInOutCubic(Math.min(1, dive / DIVE.yawEnd));

      s.yaw = s.fromYaw + (s.toYaw - s.fromYaw) * yawT;
    } else {
      s.captured = false;

      if (!c.paused && !c.reducedMotion) {
        s.yaw = (s.yaw + (dt * TWO_PI) / TURN_SECONDS) % TWO_PI;

        moving = true;
      }
    }

    const centerSpan = DIVE.center[1] - DIVE.center[0];

    const centerT = smoothstep(
      centerSpan <= 0 ? 1 : (dive - DIVE.center[0]) / centerSpan,
    );

    const framing = c.framing;
    const width = size.width;
    const height = size.height;

    const restFov = getRestFov(
      framing.fovRest || STAGE_FOV,
      width,
      height,
      framing.offsetX,
      framing.offsetY,
      restEnvelope.current,
    );

    // Mobile pullback blends into the original centered framing.
    const fov = THREE.MathUtils.lerp(
      restFov,
      framing.fovCenter || STAGE_FOV,
      centerT,
    );

    const ox = framing.offsetX * (1 - centerT);

    const oy = framing.offsetY * (1 - centerT);

    if (
      width > 0 &&
      height > 0 &&
      (fov !== s.fov ||
        ox !== s.ox ||
        oy !== s.oy ||
        width !== s.width ||
        height !== s.height)
    ) {
      camera.fov = fov;
      camera.aspect = width / Math.max(height, 1);

      if (Math.abs(ox) < 0.5 && Math.abs(oy) < 0.5) {
        if (camera.view?.enabled) {
          camera.clearViewOffset();
        }
      } else {
        camera.setViewOffset(width, height, -ox, -oy, width, height);
      }

      camera.updateProjectionMatrix();

      s.fov = fov;
      s.ox = ox;
      s.oy = oy;
      s.width = width;
      s.height = height;
    }

    if (tilt.current) {
      tilt.current.rotation.x = THREE.MathUtils.degToRad(c.tiltX);

      tilt.current.rotation.y = THREE.MathUtils.degToRad(c.tiltY);
    }

    const mouth = resting ? 0 : seg(dive, DIVE.mouth[0], DIVE.mouth[1]);

    const camT = resting ? 0 : span(dive, DIVE.camera[0], DIVE.camera[1]);

    if (camT > 0) {
      const target = cavity.current;

      const approach = target?.approach ?? FALLBACK_APPROACH;

      const end = target?.end ?? FALLBACK_END;

      const look = target?.look ?? FALLBACK_LOOK;

      const approachEnd = 1 - PUSH;

      if (camT <= approachEnd) {
        _pos.lerpVectors(CAM_FROM, approach, camT / approachEnd);
      } else {
        _pos.lerpVectors(approach, end, (camT - approachEnd) / PUSH);
      }

      camera.position.copy(_pos);

      const aimT = easeInOutCubic(Math.min(1, camT / approachEnd));

      camera.lookAt(_aim.lerpVectors(ORIGIN, look, aimT));

      const near = THREE.MathUtils.lerp(CAM_NEAR, CAM_NEAR_DIVE, camT);

      if (Math.abs(camera.near - near) > 1e-4) {
        camera.near = near;
        camera.updateProjectionMatrix();
      }

      s.cameraMoved = true;
    } else if (s.cameraMoved) {
      camera.position.copy(CAM_FROM);
      camera.lookAt(0, 0, 0);

      if (camera.near !== CAM_NEAR) {
        camera.near = CAM_NEAR;
        camera.updateProjectionMatrix();
      }

      s.cameraMoved = false;
    }

    spin.rotation.y = s.yaw;

    for (const mesh of morphMeshes) {
      if (mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[morphIndex] = mouth;
      }
    }

    if (!s.perfDone && resting && !c.paused && !c.reducedMotion) {
      s.perfT += rawDelta;
      s.perfFrames += 1;

      if (s.perfT > 4) {
        s.perfDone = true;

        if (s.perfFrames / s.perfT < 20) {
          onPoorPerformance();
        }
      }
    }

    if (moving) {
      invalidate();
    }
  });

  return (
    <group ref={tilt}>
      <primitive object={gltf.scene} />
    </group>
  );
}

export default function SilverHeadCanvas(props: Props & { active: boolean }) {
  const { active, detail, envUrl, ...rest } = props;

  const dpr = useMemo<[number, number]>(() => {
    if (detail === "lean") {
      return [1, 1];
    }

    if (typeof window === "undefined") {
      return [1, 1.5];
    }

    return [1, Math.min(1.5, window.devicePixelRatio || 1)];
  }, [detail]);

  return (
    <Canvas
      frameloop={active ? "demand" : "never"}
      dpr={dpr}
      camera={{
        fov: 24,
        near: CAM_NEAR,
        far: 10,
        position: [0, 0, 0.8],
      }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.NeutralToneMapping;

        gl.setClearColor(0x000000, 0);

        // MouthDark is on layer 1 so the scan light cannot reach the cavity.
        camera.layers.enable(1);
      }}
      style={{
        position: "absolute",
        inset: 0,
      }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Environment url={envUrl} />
        <Head {...rest} />
      </Suspense>
    </Canvas>
  );
}
