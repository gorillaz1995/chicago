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
  clearMouthGlyphPatch,
  createChamberEnvironment,
  tuneHeadMaterials,
  type SceneDetail,
} from "./chamberEnvironment";
import { LAMP_PLATE } from "./lampSection";
import SceneAtmosphere from "./sceneAtmosphere";
import {
  applyGlassHead,
  BURST,
  startHeadBurst,
  updateGlassHead,
} from "./glassHead";

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
};

export type HeadControl = {
  channels: DiveChannels;
  paused: boolean;
  reducedMotion: boolean;
  /**
   * Mouth fills the frame. The canvas is hidden and must not render, or the
   * browser keeps a still of the head and paints it onto the next section.
   */
  covered: boolean;
  /** Work budget. `low` is set at runtime when idle frames fall behind. */
  tier: PerfTier;
  framing: HeadFraming;
  tiltX: number;
  tiltY: number;
  kick: () => void;
  /** Debug: share of the current frame covered by the mouth interior. */
  measureCoverage?: () => number;
  /** First fully covered frame for this layout, in screen heights. */
  calibrateBlack?: () => number | null;
};

export const TURN_SECONDS = 20;

// Match the stage at rest. Values below 1 pull the head back and
// leave it smaller than the stage the ribbons are drawn in.
const MOBILE_REST_SCALE = 1;

// The rotation envelope may approach the viewport, with a small margin,
// so the front face can occupy about 70% of a phone's width.
const MOBILE_MAX_HEAD_WIDTH = 0.96;
const MOBILE_MAX_HEAD_HEIGHT = 0.94;
const MOBILE_EDGE = 0.035;
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

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/**
 * Idle orbit on the rest-camera sphere. Looking at the origin keeps the head
 * centered under the ribbons. Distance stays put: a dolly would scale the head
 * against ribbons that do not move. 18s is out of step with the 20s head turn.
 * Angles are radians. Each pose dwells, then eases to the next.
 */
const CINEMATIC_SECONDS = 18;
const CINEMATIC_SETTLE_VH = 0.2;
/** Ease off the authored rest camera so the first pose does not cut in. */
const CINEMATIC_INTRO_SECONDS = 1.2;
/** Matches the canvas fade, so the poster and the rest camera stay aligned. */
const CINEMATIC_REVEAL_MS = 600;
/** Quiet after the last wheel or scroll before the tour may continue. */
const CINEMATIC_QUIET_MS = 250;
const CINEMATIC_SWIPE_PX = 12;

const CINEMATIC_POSES = [
  { azimuth: 0, elevation: -0.07 },
  { azimuth: -0.24, elevation: 0.03 },
  { azimuth: 0.06, elevation: 0.09 },
  { azimuth: 0.24, elevation: -0.03 },
] as const;

const CINEMATIC_KEYS = new Set(["ArrowDown", "PageDown", "End", " "]);

type TourClock = {
  tourTouch: boolean;
  tourKeys: number;
  tourWheelAt: number;
  tourScrollAt: number;
};

function cinematicPose(phase: number, target: THREE.Vector3) {
  const count = CINEMATIC_POSES.length;
  const scaled = (phase / CINEMATIC_SECONDS) * count;
  const looped = ((scaled % count) + count) % count;
  const index = Math.floor(looped);
  const from = CINEMATIC_POSES[index];
  const to = CINEMATIC_POSES[(index + 1) % count];
  const blended = easeInOutCubic(looped - index);
  const azimuth = from.azimuth + (to.azimuth - from.azimuth) * blended;
  const elevation = from.elevation + (to.elevation - from.elevation) * blended;
  const cosElevation = Math.cos(elevation);
  const radius = CAM_FROM.z;

  target.set(
    radius * Math.sin(azimuth) * cosElevation,
    radius * Math.sin(elevation),
    radius * Math.cos(azimuth) * cosElevation,
  );
}

function cinematicHeld(tour: TourClock, now: number) {
  return (
    tour.tourTouch ||
    tour.tourKeys > 0 ||
    now - tour.tourWheelAt < CINEMATIC_QUIET_MS ||
    now - tour.tourScrollAt < CINEMATIC_QUIET_MS
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

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
  const compact = width <= MOBILE_BREAKPOINT && height > width;

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

  const edgeX = width * MOBILE_EDGE;
  const edgeY = height * MOBILE_EDGE;

  const left = Math.max(edgeX, width * 0.5 + offsetX - padX);

  const right = Math.max(edgeX, width * 0.5 - offsetX - padX);

  const top = Math.max(edgeY, height * 0.5 + offsetY - padY);

  const bottom = Math.max(edgeY, height * 0.5 - offsetY - padY);

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

  // The spun envelope can ask for a much wider lens than the stage.
  // Cap that pullback so the face stays the size of the stage, with a
  // few percent of margin, instead of shrinking into the box.
  const stageHalf = Math.tan(THREE.MathUtils.degToRad(baseFov) / 2);
  const cap = stageHalf / 0.96;
  if (halfTan > cap) halfTan = cap;

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
  // the idle turn adds frames at the tier cap. `held` marks a gap while the
  // mouth covered the frame, so that gap is not scored as a slow frame.
  const frame = useRef({ dirty: true, lastIdle: -Infinity, held: false });

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
    tourPhase: 0,
    tourIntro: 0,
    revealAt: -1,
    tourTouch: false,
    tourKeys: 0,
    tourWheelAt: Number.NEGATIVE_INFINITY,
    tourScrollAt: Number.NEGATIVE_INFINITY,
    tourScrollY: 0,
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
      // Drop any leftover MouthDark glyph patch from a prior build.
      clearMouthGlyphPatch(gltf.scene);
      tuneHeadMaterials(gltf.scene, chamber);
      // v6: glass shell, wire build/deconstruct and diamond eyes (replaces the Silver/Gem materials).
      applyGlassHead(gltf.scene, chamber);
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
        if (state.current.revealAt < 0) {
          state.current.revealAt = performance.now();
        }
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
    const tour = state.current;
    f.dirty = true;

    const tick = (time: number) => {
      const c = control.current;

      // Hidden once the mouth covers the frame. Painting would refresh the
      // GPU snapshot that sticks to the next section when sticky unsticks.
      if (c.covered) {
        f.dirty = false;
        f.held = true;
        return;
      }

      if (f.held) {
        f.held = false;
        // Time spent hidden is not a stalled frame. Drop it from the monitor.
        monitor.current.skip = Math.max(monitor.current.skip, 0.1);
      }

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

    // The tour stops on the gesture, before scroll position has to change.
    // A tap does not count. Resume waits until the wheel, swipe, key, or scroll goes quiet.
    let swipeX = 0;
    let swipeY = 0;
    let swipeArmed = false;

    const hold = () => {
      markDirty.current();
    };

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0) return;

      tour.tourWheelAt = performance.now();
      hold();
    };

    const onScroll = () => {
      const y = window.scrollY;

      if (Math.abs(y - tour.tourScrollY) < 0.5) return;

      tour.tourScrollY = y;
      tour.tourScrollAt = performance.now();
      hold();
    };

    const onTouchStart = (event: TouchEvent) => {
      const point = event.touches[0];

      if (!point) return;

      swipeX = point.clientX;
      swipeY = point.clientY;
      swipeArmed = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!swipeArmed) return;

      const point = event.touches[0];

      if (!point) return;

      const dx = point.clientX - swipeX;
      const dy = swipeY - point.clientY;

      // Finger moving up scrolls the page down. A sideways drag is not a swipe.
      if (dy <= CINEMATIC_SWIPE_PX || dy <= Math.abs(dx)) return;

      tour.tourTouch = true;
      hold();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) return;

      swipeArmed = false;
      tour.tourTouch = false;
      hold();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !CINEMATIC_KEYS.has(event.key)) return;

      if (isTypingTarget(event.target)) return;

      tour.tourKeys += 1;
      hold();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!CINEMATIC_KEYS.has(event.key) || tour.tourKeys <= 0) return;

      tour.tourKeys -= 1;
      hold();
    };

    const onBlur = () => {
      swipeArmed = false;
      tour.tourTouch = false;
      tour.tourKeys = 0;
      hold();
    };

    tour.tourScrollY = window.scrollY;

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      gsap.ticker.remove(tick);

      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);

      tour.tourTouch = false;
      tour.tourKeys = 0;
    };
  }, [active, control, get]);

  // Automatic cube burst loop: whole head BURST.restSeconds, then the head
  // breaks into cubes, stays out ~0.75 s, reassembles, and repeats.
  const burstRest = useRef(0);

  // Camera, framing, yaw and mouth from the channels. Shared by the frame loop
  // and the coverage probe; refreshed after each render so it sees the latest size.
  // A probe poses the head front-facing without touching the idle turn or the tour.
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

      // Gesture and pause freeze the phase. Leaving rest eases the held angle
      // back home; the clock stays where it stopped until the hero is idle again.
      const atRest = ch.progress <= 0.0001;
      const now = performance.now();
      const shown =
        s.revealAt >= 0 && now - s.revealAt >= CINEMATIC_REVEAL_MS;

      const touring =
        !probe &&
        atRest &&
        shown &&
        !c.paused &&
        !c.reducedMotion &&
        !cinematicHeld(s, now);

      if (touring) {
        s.tourPhase += dt;

        s.tourIntro = Math.min(1, s.tourIntro + dt / CINEMATIC_INTRO_SECONDS);
      }

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
      } else {
        // Gone before the ribbons contract and before the mouth dolly starts.
        const settle =
          probe || c.reducedMotion
            ? 0
            : 1 - smoothstep(ch.vh / CINEMATIC_SETTLE_VH);

        const weight = settle * s.tourIntro;

        if (weight > 0.0001) {
          cinematicPose(s.tourPhase, _aim);

          _pos.lerpVectors(CAM_FROM, _aim, weight);

          camera.position.copy(_pos);

          camera.lookAt(ORIGIN);

          if (camera.near !== CAM_NEAR) {
            camera.near = CAM_NEAR;
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
      }

      spin.rotation.y = probe ? Math.round(s.yaw / TWO_PI) * TWO_PI : s.yaw;

      for (const mesh of morphMeshes) {
        if (mesh.morphTargetInfluences) {
          mesh.morphTargetInfluences[morphIndex] = mouth;
        }
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

    // The white/black probe renders into the same context. Never run it while
    // the dive is moving, or that frame is what the compositor keeps.
    const atRest = () =>
      c.channels.progress <= 0.0001 && !c.covered;

    c.measureCoverage = () =>
      atRest() ? (withCoverage.current((probe) => probe()) ?? 0) : 0;
    c.calibrateBlack = () => (atRest() ? calibrate.current() : null);

    return () => {
      delete c.measureCoverage;
      delete c.calibrateBlack;
    };
  }, [control]);

  // The framing changes with the layout, so the black point does too.
  const lastBlack = useRef<number | null>(null);
  // Waits out a dive before measuring, then cancelled on unmount.
  const blackRetry = useRef(0);

  const reportBlack = useRef(() => {
    window.clearTimeout(blackRetry.current);
    blackRetry.current = 0;

    // A mid-dive resize must not swap the head to the probe materials.
    // Retry once the user is back at rest instead of flashing a photocopy.
    if (
      control.current.channels.progress > 0.0001 ||
      control.current.covered
    ) {
      blackRetry.current = window.setTimeout(() => reportBlack.current(), 500);
      return;
    }

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
    // reportBlack itself waits if this fires during the dive.
    const first = window.setTimeout(() => reportBlack.current(), 300);
    const confirm = window.setTimeout(() => reportBlack.current(), 900);

    return () => {
      window.clearTimeout(first);
      window.clearTimeout(confirm);
    };
  }, [size]);

  useEffect(() => () => window.clearTimeout(blackRetry.current), []);

  useFrame((_, rawDelta) => {
    const c = control.current;
    const dt = Math.min(rawDelta, 0.1);

    const resting = applyScene.current(dt);

    // Glass build/deconstruct waves (independent of MouthOpen and the turn,
    // frozen when paused or reduced motion) and the automatic cube burst.
    // Leaving rest sends a running burst straight to reassembly.
    let bursting = updateGlassHead(
      gltf.scene,
      dt,
      c.paused || c.reducedMotion,
      c.channels.progress > 0.0001,
    );

    if (
      !bursting &&
      c.channels.progress <= 0.0001 &&
      !c.covered &&
      !c.paused &&
      !c.reducedMotion
    ) {
      burstRest.current += dt;

      if (burstRest.current >= BURST.restSeconds) {
        burstRest.current = 0;
        bursting = startHeadBurst(gltf.scene);
      }
    } else if (!bursting) {
      // Leaving rest or pausing restarts the whole-head wait.
      burstRest.current = 0;
    }

    // A running burst keeps frames coming, even when the idle turn is paused.
    if (bursting) markDirty.current();

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
      gl={(defaults) => {
        // Three r163+ ignores `alpha: false` and always requests a transparent
        // buffer. That buffer is what gets stamped as a head-shaped cutout,
        // so the context is created opaque and handed to the renderer.
        const canvas = defaults.canvas as unknown as HTMLCanvasElement;
        const context = canvas.getContext("webgl2", {
          alpha: false,
          depth: true,
          stencil: false,
          antialias: true,
          powerPreference: "high-performance",
          premultipliedAlpha: true,
        });

        return new THREE.WebGLRenderer({
          canvas,
          context: context ?? undefined,
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        });
      }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = CHAMBER.exposure;

        gl.setClearColor(LAMP_PLATE, 1);

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
