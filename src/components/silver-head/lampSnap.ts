/** Quiet gap that means the wheel gesture, including trackpad inertia, has finished. */
const WHEEL_GAP_MS = 160;

/** How long a touch flick stays pinned after the finger lifts. Momentum has no events to cancel. */
const TOUCH_HOLD_MS = 400;

let latched = false;
let listening = false;
let releaseTimer = 0;
let holdFrame = 0;
let lastTouchY: number | null = null;
/** True after this approach has already been pinned, until the dive scrolls back out. */
let visitLatched = false;

function plateElement() {
  return document.querySelector<HTMLElement>("[data-mouth-reveal]");
}

/** Document offset where the lamp plate sits flush with the viewport. */
function lampTop() {
  const plate = plateElement();
  if (!plate) return null;

  return plate.getBoundingClientRect().top + window.scrollY;
}

/**
 * Distance from the viewport top to the lamp plate.
 * Positive means the lamp is still below the fold, in the glyph dive.
 */
function plateEdge() {
  const plate = plateElement();
  if (!plate) return null;

  return plate.getBoundingClientRect().top;
}

/** Pull the viewport back to the lamp without a smooth scroll that can overshoot. */
function pinToLamp() {
  const top = lampTop();
  if (top == null) return;

  if (Math.abs(window.scrollY - top) > 0.5) {
    window.scrollTo({ top, behavior: "auto" });
  }
}

function hold() {
  if (!latched) return;

  pinToLamp();
  holdFrame = requestAnimationFrame(hold);
}

function detach() {
  window.removeEventListener("wheel", onWheel);
  window.removeEventListener("touchstart", onTouchStart);
  window.removeEventListener("touchmove", onTouchMove);
  window.removeEventListener("touchend", onTouchEnd);
  window.removeEventListener("touchcancel", onTouchEnd);
  listening = false;
}

function attach() {
  if (listening) return;

  listening = true;
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd);
  window.addEventListener("touchcancel", onTouchEnd);
}

function armRelease(delay: number) {
  window.clearTimeout(releaseTimer);
  releaseTimer = window.setTimeout(releaseLampLatch, delay);
}

/** Drop the latch so the next gesture can leave the lamp. */
export function releaseLampLatch() {
  latched = false;
  lastTouchY = null;
  window.clearTimeout(releaseTimer);
  cancelAnimationFrame(holdFrame);
  detach();
}

/** Allow the next mouth entry to pin again. The timeout release must not call this. */
export function resetLampVisit() {
  visitLatched = false;
}

/** A load that is already on the lamp must not pin the first scroll. */
export function noteLampVisit() {
  visitLatched = true;
}

function onWheel(event: WheelEvent) {
  if (!latched) return;

  // A toolbar resize can report the pin end while the plate is still below.
  // Blocking that gesture is what freezes the glyphs.
  const edge = plateEdge();
  if (edge == null || edge > 2) {
    releaseLampLatch();
    return;
  }

  // Scrolling back into the mouth must not stay pinned.
  if (event.deltaY < 0) {
    releaseLampLatch();
    return;
  }

  if (event.deltaY > 0) {
    event.preventDefault();
    pinToLamp();
    armRelease(WHEEL_GAP_MS);
  }
}

function onTouchStart(event: TouchEvent) {
  if (!latched) return;

  lastTouchY = event.touches[0]?.clientY ?? null;
}

function onTouchMove(event: TouchEvent) {
  if (!latched) return;

  const edge = plateEdge();
  if (edge == null || edge > 2) {
    releaseLampLatch();
    return;
  }

  const y = event.touches[0]?.clientY;
  if (y == null) return;

  if (lastTouchY == null) {
    lastTouchY = y;
    return;
  }

  const downward = lastTouchY - y;
  lastTouchY = y;

  // Finger moving down scrolls the page back toward the head.
  if (downward < -1) {
    releaseLampLatch();
    return;
  }

  if (downward > 0) {
    event.preventDefault();
    pinToLamp();
    window.clearTimeout(releaseTimer);
  }
}

function onTouchEnd() {
  if (!latched) return;

  lastTouchY = null;
  pinToLamp();
  armRelease(TOUCH_HOLD_MS);
}

/**
 * Land on the lamp the moment the mouth entry finishes, and swallow the
 * rest of that downward gesture so it cannot reach the white section.
 */
export function latchOnLamp() {
  const edge = plateEdge();

  // Progress can hit the pin end before the plate is on screen. Pinning then
  // yanks the viewport back onto the glyphs and swallows the downward swipe.
  if (edge == null || edge > 2) {
    if (latched) releaseLampLatch();
    return;
  }

  // Already pinned this visit. Repeating the pin would trap the page on the lamp.
  if (latched || visitLatched) return;

  visitLatched = true;

  pinToLamp();
  latched = true;
  attach();
  cancelAnimationFrame(holdFrame);
  holdFrame = requestAnimationFrame(hold);
  // A crossing with no further events still has to let go.
  armRelease(TOUCH_HOLD_MS);
}
