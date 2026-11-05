/**
 * Scroll clock for the pinned mouth dive.
 * Progress 1 is the frame that used to be 0.84: the veil is opaque and the
 * camera is already inside the mouth. Knots are the old ones divided by 0.84,
 * so the approach still takes the same scroll distance.
 */
const OLD_BLACK = 0.84;
const OLD_RANGE_VIEWPORTS = 2.2;

const remap = (t: number) => t / OLD_BLACK;

export const DIVE = {
  /** Foreground chrome and orbital ribbons clear before the mouth approach. */
  clear: [0, remap(0.16)] as const,
  /** The head travels from its rest composition to the approved centered pose. */
  center: [0, remap(0.2)] as const,
  /** Idle yaw eases to the nearest front-facing angle. */
  yawEnd: remap(0.16),
  /** MouthOpen shape key, finished before the camera reaches the lips. */
  mouth: [remap(0.12), remap(0.42)] as const,
  /** Camera dolly into the cavity. The poster fallback scales across this same span. */
  camera: [remap(0.36), remap(0.78)] as const,
  /** Full-viewport black. Ends at progress 1, which is also where the pin ends. */
  veil: [remap(0.62), 1] as const,
  /** Enter the time-based section blend at the pin end. */
  black: 1,
  /** Scroll back past this before the blend reverses. The gap avoids flicker. */
  exit: 0.97,
  /** Chrome becomes inert when its scroll-scrubbed fade has completed. */
  chrome: remap(0.16),
} as const;

/** Section crossfade. Inside the 120–180ms window. */
export const HANDOFF_MS = 150;

export const HANDOFF_EASE = [0.22, 1, 0.36, 1] as const;

/** Small rise so the section settles instead of popping. */
export const HANDOFF_LIFT = 20;

/**
 * Sticky viewport plus the approach.
 * 1 + 2.2 * 0.84 = 2.848 viewports. The old 0.16 tail is not included.
 */
export const TRACK_IN_VIEWPORTS = 1 + OLD_RANGE_VIEWPORTS * OLD_BLACK;

/** Vertical field of view the square stage was authored with. */
export const STAGE_FOV = 24;

/**
 * Chrome's delta-based programmatic smooth scroll, in seconds.
 * `min(sqrt(|px|), 180) / 60`, so a long jump caps at 3s.
 */
export function nativeSmoothSeconds(distancePx: number) {
  return Math.min(Math.sqrt(Math.abs(distancePx)), 180) / 60;
}

/** Explorează keeps that curve and plays it for twice as long. */
export const EXPLORE_SCROLL_SCALE = 2;

/** CSS ease-in-out. Same shape Chrome uses for that smooth scroll. */
export const EXPLORE_SCROLL_EASE = [0.42, 0, 0.58, 1] as const;
