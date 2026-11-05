/** Quiet gap that means the wheel gesture, including trackpad inertia, has finished. */
const WHEEL_GAP_MS = 160;

/** How long a touch flick stays pinned after the finger lifts. Momentum has no events to cancel. */
const TOUCH_HOLD_MS = 400;

let latched = false;
let listening = false;
let releaseTimer = 0;
let holdFrame = 0;
let lastTouchY: number | null = null;

/** Document offset where the lamp plate sits flush with the viewport. */
function lampTop() {
  const plate = document.querySelector<HTMLElement>("[data-mouth-reveal]");
  if (!plate) return null;

  return plate.getBoundingClientRect().top + window.scrollY;
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

function onWheel(event: WheelEvent) {
  if (!latched) return;

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
  pinToLamp();
  latched = true;
  attach();
  cancelAnimationFrame(holdFrame);
  holdFrame = requestAnimationFrame(hold);
  // A crossing with no further events still has to let go.
  armRelease(TOUCH_HOLD_MS);
}
