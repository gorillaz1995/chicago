"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import {
  advance,
  Canvas,
  useFrame,
  useLoader,
  useThree,
} from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  BLACK_COVERAGE,
  BLACK_MARGIN,
  CAMERA_LIPS_T,
  OLD_PIN,
  PERF,
  STAGE_FOV,
  STAGES,
  cameraAt,
  type PerfTier,
} from "./diveStages";
import { gsap } from "./gsapClient";
import {
  CHAMBER,
  createChamberEnvironment,
  mouthGlyphUniforms,
  tuneHeadMaterials,
  type MouthGlyphUniforms,
  type SceneDetail,
} from "./chamberEnvironment";
import SceneAtmosphere from "./sceneAtmosphere";

export type HeadFraming = {
  offsetX: number;
  offsetY: number;
  fovRest: number;
  fovCenter: number;
};

/**
 * Values the dive timeline writes during scroll, already eased.
 * The canvas only reads them.
 */
export type DiveChannels = {
  /** Raw pin progress, 0 to 1. */
  progress: number;
  /** Scroll distance from the pin start, in screen heights. */
  vh: number;
  /** Idle yaw to the nearest front angle. */
  yaw: number;
  /** Rest framing to the centered framing. */
  center: number;
  /** MouthOpen shape key. */
  mouth: number;
  /** Camera path: 0 at rest, CAMERA_LIPS_T at the lips, 1 deep in the cavity. */
  camera: number;
  /** Haze, shaft, traces and the light sweep. 1 at rest. */
  atmosphere: number;
  /** Glyph field strength inside the mouth. */
  glyph: number;
};

export type HeadControl = {
  channels: DiveChannels;
  paused: boolean;
  reducedMotion: boolean;
  /** Work budget. `low` is set at runtime when idle frames fall behind. */
  tier: PerfTier;
  framing: HeadFraming;
  tiltX: number;
  tiltY: number;
  kick: () => void;
  /** Uploads the mouth glyph canvas. No-op until that plane exists. */
  syncGlyph: () => void;
  /** Debug: share of the current frame covered by the mouth interior. */
  measureCoverage?: () => number;
  /** First fully covered frame for this layout, in screen heights. */
  calibrateBlack?: () => number | null;
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

const FALLBACK_APPROACH = new THREE.Vector3(0, -0.0714, 0.1266);
const FALLBACK_END = new THREE.Vector3(0, -0.0875, 0.086);
const FALLBACK_LOOK = new THREE.Vector3(0, -0.0875, 0.04);

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

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
  control: RefObject<HeadControl>;
  glbUrl: string;
  detail: SceneDetail;
  onReady: () => void;
  onPoorPerformance: () => void;
  /** Called once if idle frames fall behind and the scene steps down to `low`. */
  onTierChange: (tier: PerfTier) => void;
  /** First fully covered frame for this layout, measured at start and after resizes. */
  onCalibrate: (black: number) => void;
  /** Hidden glyph canvas. Null keeps the cavity empty. */
  glyphCanvas: HTMLCanvasElement | null;
};

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
  onTierChange,
  onCalibrate,
  glyphCanvas,
  detail,
  active,
}: Props & { active: boolean }) {
  const gltf = useLoader(GLTFLoader, glbUrl);

  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const scene = useThree((s) => s.scene);
  const setDpr = useThree((s) => s.setDpr);

  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const gl = useThree((s) => s.gl);

  const tilt = useRef<THREE.Group>(null);

  // The GSAP ticker is the only render clock. `dirty` asks for one frame;
  // the idle turn adds frames at the tier cap.
  const frame = useRef({ dirty: true, lastIdle: -Infinity });

  const markDirty = useRef(() => {
    frame.current.dirty = true;
  });

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

  const glyph = useRef<MouthGlyphUniforms | null>(null);

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
  });

  // Idle frame-rate check after the scene is ready. Median frame time per window,
  // so page-load stalls do not count; two slow windows in a row step down once.
  const monitor = useRef({
    on: false,
    skip: 0,
    t: 0,
    samples: [] as number[],
    good: 0,
    slow: 0,
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

    // Apply the procedural chamber before the first visible head frame.
    const chamber = createChamberEnvironment(gl, detail);
    try {
      tuneHeadMaterials(gltf.scene, chamber);
      // The glyph variant compiles now, not when the mouth first opens.
      glyph.current = mouthGlyphUniforms(gltf.scene);
    } catch (error) {
      chamber.dispose();
      throw error;
    }

    const shared = control.current;
    const kick = markDirty.current;
    shared.kick = kick;

    // Compile every program off the scroll path, then reveal the canvas.
    let cancelled = false;

    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        // Measure this layout's black point while the poster is still in front.
        reportBlack.current();
        kick();
        monitor.current = {
          on: true,
          skip: PERF.monitorDelay,
          t: 0,
          samples: [],
          good: 0,
          slow: 0,
        };
        onReady();
      });

    return () => {
      cancelled = true;
      shared.kick = () => {};
      // The GLTF loader can cache this scene; detach the released texture.
      gltf.scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        materials.forEach((entry) => {
          const material = entry as THREE.MeshStandardMaterial;
          if (material?.isMeshStandardMaterial && material.envMap === chamber) {
            material.envMap = null;
            material.needsUpdate = true;
          }
        });
      });
      chamber.dispose();
    };
  }, [onReady, control, gltf, spin, morphMeshes, gl, detail, scene, camera]);

  // Point the mouth texture at the hidden glyph canvas. Uploads follow each painted tick.
  useEffect(() => {
    const uniforms = glyph.current;
    if (!glyphCanvas || !uniforms) return;

    const texture = uniforms.uGlyphMap.value;
    texture.image = glyphCanvas;
    texture.needsUpdate = true;

    const shared = control.current;
    const kick = markDirty.current;

    shared.syncGlyph = () => {
      texture.needsUpdate = true;
      kick();
    };

    kick();

    return () => {
      shared.syncGlyph = () => {};
    };
  }, [glyphCanvas, control]);

  // A resized drawing buffer is blank until the next frame.
  useEffect(() => {
    markDirty.current();
  }, [size]);

  // One clock for every frame. Scroll marks the frame dirty inside the scroll
  // event, and this tick renders it in the same animation frame. The idle turn
  // renders at the tier cap. Nothing runs while the hero is off screen.
  useEffect(() => {
    if (!active) return;

    const f = frame.current;
    f.dirty = true;

    const tick = (time: number) => {
      const c = control.current;
      const idle =
        !c.paused && !c.reducedMotion && c.channels.progress <= 0.0001;
      const due =
        idle && time - f.lastIdle >= 1 / PERF.idleFps[c.tier] - 0.004;

      if (!f.dirty && !due) return;

      f.dirty = false;
      if (due) f.lastIdle = time;

      advance(time, true, get());
    };

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
    };
  }, [active, control, get]);

  // Camera, framing, yaw and mouth from the channels. Shared by the frame loop
  // and the coverage probe; refreshed after each render so it sees the latest size.
  // A probe poses the head front-facing without touching the idle turn.
  const applyScene = useRef<
    (dt: number, channels?: DiveChannels, probe?: boolean) => boolean
  >(() => true);

  useLayoutEffect(() => {
    applyScene.current = (dt, channels, probe = false) => {
      const c = control.current;
      const ch = channels ?? c.channels;
      const s = state.current;

      const resting = c.reducedMotion || ch.progress <= 0.0001;

      if (probe) {
        // The yaw below is set to the nearest front angle instead.
      } else if (!resting) {
        if (!s.captured) {
          s.captured = true;
          s.fromYaw = s.yaw;

          s.toYaw = Math.round(s.yaw / TWO_PI) * TWO_PI;
        }

        s.yaw = s.fromYaw + (s.toYaw - s.fromYaw) * ch.yaw;
      } else {
        s.captured = false;

        if (!c.paused && !c.reducedMotion) {
          s.yaw = (s.yaw + (dt * TWO_PI) / TURN_SECONDS) % TWO_PI;
        }
      }

      const centerT = c.reducedMotion ? 0 : ch.center;

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

      const mouth = resting ? 0 : ch.mouth;

      const camT = resting ? 0 : ch.camera;

      if (camT > 0) {
        const target = cavity.current;

        const approach = target?.approach ?? FALLBACK_APPROACH;

        const end = target?.end ?? FALLBACK_END;

        const look = target?.look ?? FALLBACK_LOOK;

        if (camT <= CAMERA_LIPS_T) {
          _pos.lerpVectors(CAM_FROM, approach, camT / CAMERA_LIPS_T);
        } else {
          _pos.lerpVectors(
            approach,
            end,
            (camT - CAMERA_LIPS_T) / (1 - CAMERA_LIPS_T),
          );
        }

        camera.position.copy(_pos);

        const aimT = easeInOutCubic(Math.min(1, camT / CAMERA_LIPS_T));

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

      spin.rotation.y = probe ? Math.round(s.yaw / TWO_PI) * TWO_PI : s.yaw;

      for (const mesh of morphMeshes) {
        if (mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[morphIndex] = mouth;
        }
      }

      const uniforms = glyph.current;

      if (uniforms && !probe) {
        // Drawing-buffer pixels, so one glyph canvas covers the frame exactly once.
        const pixelRatio = gl.getPixelRatio();
        uniforms.uResolution.value.set(
          Math.max(1, width * pixelRatio),
          Math.max(1, height * pixelRatio),
        );
        // Pause only stops the mutation loop; the field stays, frozen.
        uniforms.uGlyphMix.value = c.reducedMotion ? 0 : ch.glyph;
      }

      return resting;
    };
  });

  // Coverage session: the head alone, mouth white and silver black, rendered
  // into 64 px and read back. One setup for a whole search, then restored.
  const withCoverage = useRef<
    <T>(run: (probe: (channels?: DiveChannels) => number) => T) => T | null
  >(() => null);

  useLayoutEffect(() => {
    withCoverage.current = (run) => {
      const root = tilt.current;
      if (!root) return null;

      const width = 64;
      const height = Math.max(
        8,
        Math.round((64 * size.height) / Math.max(size.width, 1)),
      );
      const targetRT = new THREE.WebGLRenderTarget(width, height);
      // Double-sided like the GLB materials, so the probe sees the same surfaces.
      const white = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      const black = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,
      });
      const swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];

      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;

        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        const dark = materials.some((entry) => entry?.name === "MouthDark");

        swapped.push([mesh, mesh.material]);
        mesh.material = dark ? white : black;
      });

      const previousTarget = gl.getRenderTarget();
      const previousColor = gl.getClearColor(new THREE.Color());
      const previousAlpha = gl.getClearAlpha();
      const pixels = new Uint8Array(width * height * 4);

      const probe = (channels?: DiveChannels) => {
        applyScene.current(0, channels, Boolean(channels));

        gl.setRenderTarget(targetRT);
        gl.setClearColor(0x000000, 0);
        gl.clear();
        gl.render(root, camera);
        gl.readRenderTargetPixels(targetRT, 0, 0, width, height, pixels);

        let covered = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] > 200 && pixels[i + 3] > 200) covered += 1;
        }

        return covered / (width * height);
      };

      try {
        return run(probe);
      } finally {
        gl.setRenderTarget(previousTarget);
        gl.setClearColor(previousColor, previousAlpha);
        swapped.forEach(([mesh, material]) => {
          mesh.material = material;
        });
        targetRT.dispose();
        white.dispose();
        black.dispose();

        // Back to the live pose before the next visible frame.
        applyScene.current(0);
        markDirty.current();
      }
    };
  });

  // First fully covered frame for this layout: bisection over the camera path,
  // with the mouth open and the head centered and facing front, as in the dive.
  const calibrate = useRef(() =>
    withCoverage.current((probe) => {
      const at = (vh: number) =>
        probe({
          progress: 0.5,
          vh,
          yaw: 1,
          center: 1,
          mouth: 1,
          camera: cameraAt(vh),
          atmosphere: 0,
          glyph: 0,
        });

      const deepest =
        STAGES.camera.start +
        (STAGES.camera.lips - STAGES.camera.start) / CAMERA_LIPS_T;

      let lo = STAGES.camera.lips - 0.35;
      let hi = Math.min(OLD_PIN, deepest);

      // Never fully covered: the plate veil finishes the frame before the lamp.
      if (at(hi) < BLACK_COVERAGE) return hi;

      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        if (at(mid) >= BLACK_COVERAGE) hi = mid;
        else lo = mid;
      }

      return hi;
    }),
  );

  useEffect(() => {
    const c = control.current;

    c.measureCoverage = () => withCoverage.current((probe) => probe()) ?? 0;
    c.calibrateBlack = () => calibrate.current();

    return () => {
      delete c.measureCoverage;
      delete c.calibrateBlack;
    };
  }, [control]);

  // The framing changes with the layout, so the black point does too.
  const lastBlack = useRef<number | null>(null);

  const reportBlack = useRef(() => {
    const black = calibrate.current();
    if (black == null) return;

    const next = black + BLACK_MARGIN;
    if (lastBlack.current != null && Math.abs(lastBlack.current - next) < 0.002) {
      return;
    }

    lastBlack.current = next;
    onCalibrateRef.current(next);
  });

  const onCalibrateRef = useRef(onCalibrate);
  useLayoutEffect(() => {
    onCalibrateRef.current = onCalibrate;
  });

  useEffect(() => {
    if (lastBlack.current == null) return;

    // Debounced: a drag-resize or a rotation settles before measuring again.
    // The second pass confirms it once the hero's framing has caught up too.
    const first = window.setTimeout(() => reportBlack.current(), 300);
    const confirm = window.setTimeout(() => reportBlack.current(), 900);

    return () => {
      window.clearTimeout(first);
      window.clearTimeout(confirm);
    };
  }, [size]);

  useFrame((_, rawDelta) => {
    const c = control.current;
    const dt = Math.min(rawDelta, 0.1);

    const resting = applyScene.current(dt);

    // Idle frames must keep up with the cap. Steps down DPR, then the tier, then the poster.
    const m = monitor.current;

    if (
      m.on &&
      resting &&
      !c.paused &&
      !c.reducedMotion &&
      document.visibilityState === "visible"
    ) {
      if (m.skip > 0) {
        // Clamped: the first manual frame can report the whole load as one delta.
        m.skip -= Math.min(rawDelta, 0.1);
        return;
      }

      m.t += rawDelta;
      if (m.samples.length < 400) m.samples.push(rawDelta);

      if (m.t >= PERF.monitorWindow) {
        const sorted = m.samples.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] || 1;
        const fps = 1 / median;
        const cap = PERF.idleFps[c.tier];

        m.t = 0;
        m.samples = [];

        if (fps >= cap * PERF.downgradeBelow) {
          m.slow = 0;
          m.good += 1;
          if (m.good >= PERF.monitorWindows) m.on = false;
          return;
        }

        m.good = 0;
        m.slow += 1;
        if (m.slow < PERF.slowWindows) return;

        m.slow = 0;
        m.skip = 0.5;

        if (gl.getPixelRatio() > 1) {
          setDpr(1);
        } else if (c.tier !== "low") {
          c.tier = "low";
          onTierChange("low");
        } else if (fps < PERF.posterBelowFps) {
          m.on = false;
          onPoorPerformance();
        }
      }
    }
  });

  return (
    <group ref={tilt}>
      <primitive object={gltf.scene} />
    </group>
  );
}

export default function SilverHeadCanvas(props: Props & { active: boolean }) {
  const { active, detail, ...rest } = props;

  const dpr = useMemo<[number, number]>(() => {
    if (detail === "lean") {
      return [1, 1];
    }

    if (typeof window === "undefined") {
      return [1, PERF.desktopDpr];
    }

    return [1, Math.min(PERF.desktopDpr, window.devicePixelRatio || 1)];
  }, [detail]);

  return (
    <Canvas
      // Frames are driven from the GSAP ticker with `advance`, see Head.
      frameloop="never"
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
        gl.toneMappingExposure = CHAMBER.exposure;

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
        <Head {...rest} detail={detail} active={active} />
        <SceneAtmosphere control={rest.control} detail={detail} />
      </Suspense>
    </Canvas>
  );
}
