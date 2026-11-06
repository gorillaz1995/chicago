import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

/**
 * Named eases for the dive. CustomEase reproduces the cubic-bezier curves the
 * Motion version used, so the approved timing does not drift.
 */
export const EASES = {
  /** Lamp blend and the one-shot signal. Same curve as Motion's [0.22, 1, 0.36, 1]. */
  handoff: "sh-handoff",
  /** CSS ease-in-out. Ribbon drift and the Explorează tour. */
  cssInOut: "sh-css-in-out",
  /** easeInOutCubic: mouth, yaw and the camera aim. */
  cubicInOut: "power2.inOut",
  /** Settle snaps after the user stops scrolling. */
  settle: "power2.out",
} as const;

/** Hermite smoothstep as a GSAP ease. Matches the existing centering curve. */
export const smoothstepEase = (t: number) => t * t * (3 - 2 * t);

let registered = false;

/** Registers the plugins once, in the browser only. Server renders skip it. */
export function ensureGsap() {
  if (registered || typeof window === "undefined") return gsap;

  gsap.registerPlugin(
    ScrollTrigger,
    ScrollToPlugin,
    CustomEase,
    MotionPathPlugin,
    Draggable,
    InertiaPlugin,
    SplitText,
    useGSAP,
  );
  CustomEase.create(EASES.handoff, "0.22,1,0.36,1");
  CustomEase.create(EASES.cssInOut, "0.42,0,0.58,1");

  // Toolbar show/hide on phones must not rebuild the scroll map.
  ScrollTrigger.config({ ignoreMobileResize: true });

  registered = true;
  return gsap;
}

ensureGsap();

export {
  gsap,
  ScrollTrigger,
  ScrollToPlugin,
  CustomEase,
  MotionPathPlugin,
  Draggable,
  InertiaPlugin,
  SplitText,
  useGSAP,
};
