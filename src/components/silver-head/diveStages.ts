/**
 * Stage map for the silver-head dive. Single source of truth for timing.
 *
 * Distances are screen heights of scroll (one pinned frame, 100svh) measured
 * from the start of the pin. Everything up to `black` keeps the approved
 * pacing. Only the stretch after the mouth fills the screen was shortened.
 */

export type AspectBucket = "portrait" | "middle" | "landscape";

/** Vertical field of view the square stage was authored with. */
export const STAGE_FOV = 24;

/**
 * Aspect buckets. Phones in portrait, desktops and landscape phones, and the
 * square-ish windows in between. At exactly 3:4 or 4:3 the edge bucket wins,
 * in CSS (rule order) and in `bucketFor`.
 */
export const BUCKET_QUERIES = {
  portrait: "(max-aspect-ratio: 3/4)",
  landscape: "(min-aspect-ratio: 4/3)",
} as const;

export function bucketFor(portrait: boolean, landscape: boolean): AspectBucket {
  if (portrait) return "portrait";
  if (landscape) return "landscape";
  return "middle";
}

/** Scroll-scrubbed ranges, in screen heights from the pin start. */
export const STAGES = {
  /** Copy, menu, caption and ribbons clear; the head turns to face the viewer. */
  intent: { start: 0, end: 0.352 },
  /** Rest framing to the centered framing (field of view and view offset). */
  centering: { start: 0, end: 0.44 },
  /** MouthOpen shape key. */
  mouth: { start: 0.264, end: 0.924 },
  /** Haze, shaft, traces and the light sweep clear before the lips. */
  atmosphere: { start: 0.517, end: 1.146 },
  /** Glyph field fades in once the opening is visible. */
  glyphIn: { start: 0.4, end: 0.6 },
  /** Camera dolly: reaches the lips at `lips`, then pushes in at the same speed. */
  camera: { start: 0.792, lips: 1.328 },
} as const;

/** Share of the camera path spent reaching the lips. The rest is the push inside. */
export const CAMERA_LIPS_T = 0.58;

/** Camera path parameter at a stage distance. 1 is the deepest point in the cavity. */
export function cameraAt(vh: number) {
  const span = (STAGES.camera.lips - STAGES.camera.start) / CAMERA_LIPS_T;
  return Math.min(1, Math.max(0, (vh - STAGES.camera.start) / span));
}

/** Pin length before this refinement, in screen heights. Never exceeded. */
export const OLD_PIN = 1.848;

/**
 * Plate-only stretch after `black`: this share of the old dead zone
 * (old pin end minus `black`), so every layout keeps about 40% of it.
 */
export const POST_BLACK_SHARE = 0.4;

/** Shortest plate-only stretch, so the dim-out never becomes a flash. */
export const POST_BLACK_MIN = 0.12;

/**
 * First frame fully covered by the mouth interior. The 3D scene measures it
 * for the actual layout (64 px readback, glyphs off) and overrides these.
 * They are the first-paint values and the poster fallback.
 * Measured: phones 1.379–1.400, square 1.327–1.349, desktops 1.319–1.351,
 * 1440p 1.440, 21:9 1.418–1.497.
 */
export const BLACK_DEFAULT: Record<AspectBucket, number> = {
  portrait: 1.4,
  middle: 1.355,
  landscape: 1.35,
};

/** Coverage that counts as "the mouth fills the frame". */
export const BLACK_COVERAGE = 0.995;

/** Extra distance after the measured frame, against rounding at the edges. */
export const BLACK_MARGIN = 0.005;

/** The glyphs dim out over this share of the post-black stretch, from its start. */
export const GLYPH_OUT_SHARE = 0.85;

/** The plate veil fades in over this share of the post-black stretch, at its end. */
export const VEIL_SHARE = 0.3;

export function postBlackFor(black: number) {
  return Math.max(POST_BLACK_MIN, POST_BLACK_SHARE * (OLD_PIN - black));
}

/** Pin length for a black distance. The handoff plays where the pin ends. */
export function pinFor(black: number) {
  return Math.min(OLD_PIN, black + postBlackFor(black));
}

/** Named checkpoints, used as timeline labels, by the debug overlay and in tests. */
export function checkpoints(black: number) {
  return {
    /** Hero at rest. */
    rest: 0,
    /** The interface is visibly clearing and the head starts to turn. */
    intent: 0.1,
    /** Head and camera are aligned with the mouth. */
    centering: STAGES.centering.end,
    /** The camera starts toward the face; the mouth is opening. */
    approach: STAGES.camera.start,
    /** The camera reaches the lips; text, ribbons and atmosphere are gone. */
    entry: STAGES.camera.lips,
    /** The mouth interior covers the whole frame. */
    black,
    /** Pin end: the lamp blend plays from here. */
    handoff: pinFor(black),
  } as const;
}

export type CheckpointName = keyof ReturnType<typeof checkpoints>;

/** Time-based lamp blend at the pin end. */
export const HANDOFF = {
  /** Blend length. Tunable within the 150–300 ms target. */
  ms: 200,
  /** Scroll back this far above the pin end before the blend reverses. */
  reverseBelowPx: 12,
  /** A move larger than this many screens sets the end state without a blend. */
  jumpScreens: 1,
} as const;

/** Settle snaps. Both wait for the finger to lift and yield to any new input. */
export const SETTLE = {
  /** Resting between `black` and the lamp while moving down settles onto the lamp. */
  blackZone: true,
  /** A crossing that comes to rest this close past the lamp top settles back onto it. */
  lampLandingScreens: 0.4,
  /** Snap duration range, in seconds. */
  duration: { min: 0.15, max: 0.35 },
  /** Quiet time before a snap starts, in seconds. */
  delay: 0.08,
  /** A new wheel burst after this gap counts as a new gesture. */
  wheelGestureGapMs: 250,
} as const;

/** The Explorează tour. Same length as before (twice Chrome's smooth scroll for the old pin). */
export const EXPLORE = {
  seconds: 1.4,
  /** CSS ease-in-out. `SlowMo` was evaluated as the alternative. */
  ease: "sh-css-in-out",
} as const;

export type PerfTier = "full" | "lean" | "low";

/** Work budgets per tier. `lean` is picked by media query, `low` by measured frame time. */
export const PERF = {
  /** Idle turn render cap. */
  idleFps: { full: 60, lean: 60, low: 30 } as Record<PerfTier, number>,
  /** Ribbon text and drift update cap. */
  ribbonFps: { fine: 60, coarse: 30, low: 30 },
  /** Desktop canvas DPR cap. Phones stay at 1. */
  desktopDpr: 1.5,
  /** Glyph canvas longest edge, in CSS pixels. */
  glyphMaxEdge: { full: 960, lean: 960, low: 640 } as Record<PerfTier, number>,
  /** Wait for the page load to settle before judging idle frames, in seconds. */
  monitorDelay: 2,
  /** Idle frame-rate check window, in seconds. Judged on the median frame time. */
  monitorWindow: 2.5,
  /** Good windows in a row that end the check. */
  monitorWindows: 2,
  /** Slow windows in a row before each step down, so one stall cannot trigger it. */
  slowWindows: 2,
  /** Below this share of the cap, step down one level (DPR, then tier). */
  downgradeBelow: 0.6,
  /** Below this frame rate after the last step, use the poster. */
  posterBelowFps: 20,
} as const;

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Track height per bucket, as CSS. First paint and rotation get a close pin
 * without JS; the measured layout then sets `--sh-pin` on the track itself.
 */
export function trackCss() {
  return `
.sh-track{--sh-pin:${round3(pinFor(BLACK_DEFAULT.middle))}}
@media ${BUCKET_QUERIES.portrait}{.sh-track{--sh-pin:${round3(pinFor(BLACK_DEFAULT.portrait))}}}
@media ${BUCKET_QUERIES.landscape}{.sh-track{--sh-pin:${round3(pinFor(BLACK_DEFAULT.landscape))}}}
`;
}
