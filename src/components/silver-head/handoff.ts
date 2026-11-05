'use client';

import {
  animate,
  motionValue,
  type AnimationPlaybackControls,
} from 'framer-motion';
import { HANDOFF_EASE, HANDOFF_MS } from './dive';

/** 0 = mouth only, 1 = next section. Owned by the time blend, not by scroll. */
export const handoff = motionValue(0);

let target: 0 | 1 | null = null;
let running: AnimationPlaybackControls | null = null;

/**
 * Tween toward 0 or 1 from the current value.
 * Calling it again with the same target does nothing, so a wobble at the
 * threshold cannot restart the blend.
 */
export function setHandoffTarget(next: 0 | 1, immediate = false) {
  if (
    target === next &&
    (!immediate || Math.abs(handoff.get() - next) < 0.001)
  ) {
    return;
  }

  target = next;
  running?.stop();
  running = null;

  if (immediate || Math.abs(handoff.get() - next) < 0.001) {
    handoff.set(next);
    return;
  }

  running = animate(handoff, next, {
    duration: HANDOFF_MS / 1000,
    ease: HANDOFF_EASE,
  });
}
