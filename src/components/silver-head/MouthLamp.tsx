'use client';

import { useEffect, useState } from 'react';
import { LampDemo } from '@/app/components/ui/lamp';
import { handoff } from './handoff';

/** Beam expansion starts once the mouth-exit blend is this far along. */
const PLAY_AT = 0.95;

/**
 * Reset only after the return fade has covered the lamp.
 * Snapping earlier would show the beams collapse on screen.
 */
const RESET_BELOW = 0.5;

/**
 * The lamp that comes out of the silver-head mouth.
 * Intersection would start the light while the dive is still closing,
 * so playback follows the handoff clock instead.
 */
export default function MouthLamp() {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    // Cross the thresholds once. Values between them keep the current pose.
    const sync = (value: number) => {
      setPlay((current) => {
        if (value >= PLAY_AT) return true;
        if (value < RESET_BELOW) return false;
        return current;
      });
    };

    sync(handoff.get());
    return handoff.on('change', sync);
  }, []);

  return <LampDemo play={play} />;
}
