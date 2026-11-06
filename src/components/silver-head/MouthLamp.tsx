"use client";

import { useEffect, useState } from "react";
import { LampDemo } from "@/app/components/ui/lamp";
import { subscribeLampShown } from "./handoff";

/**
 * The lamp that comes out of the silver-head mouth.
 * The beams play once the blend has fully revealed the lamp, and reset
 * only after the reverse blend has hidden it, so each new visit replays.
 */
export default function MouthLamp() {
  const [play, setPlay] = useState(false);

  useEffect(() => subscribeLampShown(setPlay), []);

  return <LampDemo play={play} />;
}
