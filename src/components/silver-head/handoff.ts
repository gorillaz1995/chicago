import { EASES, gsap } from "./gsapClient";
import { HANDOFF } from "./diveStages";

/** Lamp states. Mirrored on the plate as `data-state` for CSS and tests. */
export type HandoffState = "hidden" | "blending" | "shown" | "reversing";

type LampListener = (shown: boolean) => void;

const listeners = new Set<LampListener>();
let lampShown = false;

/**
 * True once the blend has fully revealed the lamp. The beams play on true and
 * reset on false, which only happens after the reverse blend has hidden them.
 */
export function subscribeLampShown(listener: LampListener) {
  listeners.add(listener);
  listener(lampShown);

  return () => {
    listeners.delete(listener);
  };
}

export function setLampShown(next: boolean) {
  if (next === lampShown) return;

  lampShown = next;
  listeners.forEach((listener) => listener(next));
}

export type Handoff = {
  /** Move toward hidden (0) or shown (1). Same target twice does nothing. */
  to: (next: 0 | 1, immediate?: boolean) => void;
  /** Settle on the current target without a blend (tab return, refresh). */
  snap: () => void;
  target: () => 0 | 1;
  state: () => HandoffState;
  kill: () => void;
};

/**
 * One persistent timeline for the mouth-to-lamp blend. `play()` and
 * `reverse()` continue from the current value, so a crossing during the blend
 * turns it around instead of stacking a second tween.
 */
export function createHandoff(plate: HTMLElement): Handoff {
  let target: 0 | 1 = 0;
  let state: HandoffState = "hidden";

  const setState = (next: HandoffState) => {
    state = next;
    plate.dataset.state = next;
  };

  // Settled states write their opacity too, so a cleared inline style
  // (e.g. after the static layout) can never leave a hidden plate visible.
  const settleShown = () => {
    setState("shown");
    plate.style.opacity = "1";
    plate.style.pointerEvents = "auto";
    setLampShown(true);
  };

  const settleHidden = () => {
    setState("hidden");
    plate.style.opacity = "0";
    plate.style.pointerEvents = "none";
    setLampShown(false);
  };

  const timeline = gsap.timeline({
    paused: true,
    onComplete: settleShown,
    onReverseComplete: settleHidden,
  });

  // Starts hidden as soon as it exists, whatever the plate's inline style was.
  timeline.fromTo(
    plate,
    { opacity: 0 },
    {
      opacity: 1,
      duration: HANDOFF.ms / 1000,
      ease: EASES.handoff,
    },
  );

  const to = (next: 0 | 1, immediate = false) => {
    if (next === target && !immediate) return;

    target = next;

    if (immediate) {
      timeline.pause();
      timeline.progress(next, true);

      if (next) settleShown();
      else settleHidden();

      return;
    }

    if (next) {
      if (timeline.progress() >= 1) {
        settleShown();
        return;
      }

      setState("blending");
      timeline.play();
      return;
    }

    // Input on a fading plate would land on a section that is leaving.
    plate.style.pointerEvents = "none";

    if (timeline.progress() <= 0) {
      settleHidden();
      return;
    }

    setState("reversing");
    timeline.reverse();
  };

  return {
    to,
    snap: () => to(target, true),
    target: () => target,
    state: () => state,
    // The next build syncs the lamp from scroll, so a rebuild does not replay the beams.
    kill: () => timeline.kill(),
  };
}
