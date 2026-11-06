"use client";

import { useEffect, useState } from "react";
import { LampDemo } from "@/app/components/ui/lamp";
import { subscribeLampShown } from "./handoff";

/**
 * The lamp that comes out of the silver-head mouth.
 * `play` flips only after the blend fully reveals the plate, so the system
 * timeline can settle open on refresh without replaying the beams mid-mouth.
 */
export default function MouthLamp() {
  const [play, setPlay] = useState(false);

  useEffect(() => subscribeLampShown(setPlay), []);

  return <LampDemo play={play} />;
}
