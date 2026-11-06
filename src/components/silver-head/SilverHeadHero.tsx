"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import type { HeadControl } from "./SilverHeadCanvas";
import type { SceneDetail } from "./chamberEnvironment";
import { PERF, STAGE_FOV, trackCss, type PerfTier } from "./diveStages";
import { gsap, SplitText, useGSAP } from "./gsapClient";
import { LAMP_PLATE } from "./lampSection";

import OrbitalRibbons, { type RibbonsHandle } from "./OrbitalRibbons";

import {
  readDebugMode,
  useDiveController,
  type DiveDebugMode,
  type PosterMetrics,
} from "./useDiveController";

const SilverHeadCanvas = dynamic(() => import("./SilverHeadCanvas"), {
  ssr: false,
  loading: () => null,
});

const DiveDebug = dynamic(() => import("./DiveDebug"), {
  ssr: false,
  loading: () => null,
});

// Both must be the same version: the poster is rendered from this GLB and crossfades into it.
export const SILVER_HEAD_ASSETS = {
  glb: "/silver-head/silver-head_v6.glb?v=v6",
  poster: "/silver-head/silver-head-poster_v6.webp",
};

type HeroProps = {
  children?: ReactNode;
  assets?: typeof SILVER_HEAD_ASSETS;
  className?: string;
  studioLabel?: string;
  eyebrow?: string;
  title?: ReactNode;
  description?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

/** Short eased follow for desktop pointers; touch remains scroll-only. */
const TILT_FOLLOW = {
  duration: 0.38,
  ease: "power3.out",
} as const;

const subscribeNever = () => () => {};
const serverDebugMode = (): DiveDebugMode => "off";

const NOSCRIPT_CSS = `
<style>
  .sh-track{height:100svh!important}
  .sh-veil{display:none!important}
  .mouth-reveal{
    margin-top:0!important;
    opacity:1!important;
    pointer-events:auto!important
  }
  .mouth-reveal .lamp-spin{
    animation-play-state:running!important
  }
</style>
`;

const CSS = `
.sh-hero,.sh-hero *{box-sizing:border-box}

.sh-track{
  position:relative;
  background:#080B0D;
  height:calc(100svh * (1 + var(--sh-pin)));
  overflow-anchor:none;
}

${trackCss()}

.sh-track[data-reduced="true"],
.sh-track[data-dive="static"]{
  height:100svh;
}

.sh-track[data-dive="static"] + .mouth-reveal{
  margin-top:0!important;
  opacity:1!important;
  pointer-events:auto!important;
}

.sh-sticky{
  position:sticky;
  top:0;
  height:100svh;
  overflow:clip;
  background:#080B0D;
}

.sh-view{
  position:absolute;
  inset:0;
  z-index:0;
  overflow:hidden;
  pointer-events:none;
}

/* Mouth covers the frame: drop the WebGL compositor layer without
   destroying the context. display:none would resize it and lose the GL. */
.sh-track[data-covered="true"] .sh-view{
  visibility:hidden;
  pointer-events:none;
}

.sh-view-canvas,
.sh-view-canvas .sh-canvas-wrap{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
}

.sh-view-poster{
  position:absolute;
  max-width:none;
  object-fit:contain;
  transform-origin:center center;
  mask-image:radial-gradient(
    ellipse 54% 55% at 50% 50%,
    #000 0%,#000 70%,rgba(0,0,0,.92) 78%,transparent 100%
  );
  -webkit-mask-image:radial-gradient(
    ellipse 54% 55% at 50% 50%,
    #000 0%,#000 70%,rgba(0,0,0,.92) 78%,transparent 100%
  );
  pointer-events:none;
  user-select:none;
  -webkit-user-drag:none;
}

.sh-view-poster[data-visible="false"]{display:none}

.sh-veil{
  position:absolute;
  inset:0;
  z-index:6;
  background:${LAMP_PLATE};
  pointer-events:none;
  opacity:0;
  visibility:hidden;
}

.sh-hero{
  --sh-bg:#080B0D;
  --sh-ink:#E8EBF0;
  --sh-muted:#A8B1BC;
  --sh-faint:rgba(168,177,188,.78);
  --sh-accent:#77E1DD;
  --sh-line:rgba(232,235,240,.14);

  position:relative;
  z-index:2;
  isolation:isolate;
  display:flex;
  flex-direction:column;
  height:100%;
  min-height:100%;
  padding:28px clamp(22px,4.5vw,76px);
  overflow:hidden;
  overflow:clip;
  background:transparent;
  color:var(--sh-ink);
  font-family:var(
    --sh-font-sans,
    ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif
  );
}

.sh-hero-fade{
  position:absolute;
  inset:auto 0 0;
  height:110px;
  background:linear-gradient(transparent,var(--sh-bg));
  pointer-events:none;
  z-index:0;
}

.sh-atmosphere{
  position:absolute;
  inset:0;
  z-index:0;
  pointer-events:none;
  overflow:hidden;
  mask-image:linear-gradient(90deg,#000 0%,#000 38%,transparent 62%);
  -webkit-mask-image:linear-gradient(
    90deg,#000 0%,#000 38%,transparent 62%
  );
}

.sh-backword{
  position:absolute;
  left:2%;
  top:48%;
  translate:0 -50%;
  font-size:clamp(120px,16vw,300px);
  font-weight:600;
  line-height:.8;
  letter-spacing:-.085em;
  white-space:nowrap;
  color:transparent;
  -webkit-text-stroke:1px rgba(205,214,209,.04);
  user-select:none;
}

.sh-header,
.sh-layout,
.sh-footer{
  position:relative;
  z-index:4;
  width:min(100%,1440px);
  margin-inline:auto;
}

.sh-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
  padding-bottom:22px;
  border-bottom:1px solid var(--sh-line);
}

.sh-brand{
  display:inline-flex;
  align-items:center;
  gap:11px;
  font-size:12px;
  font-weight:600;
  letter-spacing:.16em;
  line-height:1.4;
  text-transform:uppercase;
}

.sh-mark{
  width:25px;
  height:25px;
  flex:none;
  color:#CDD6D1;
}

.sh-header-note{
  font-size:12px;
  color:var(--sh-faint);
  letter-spacing:.03em;
}

.sh-layout{
  flex:1;
  display:flex;
  align-items:center;
  min-height:0;
  padding-block:22px;
}

.sh-copy{
  position:relative;
  z-index:5;
  isolation:isolate;
  width:min(55%,760px);
  min-width:0;
  padding-block:28px;
}

.sh-copy::before{
  content:'';
  position:absolute;
  z-index:-1;
  inset:-6% -4% -10% -2%;
  background:radial-gradient(
    ellipse at 18% 42%,
    rgba(8,11,13,.62) 0%,
    rgba(8,11,13,.28) 38%,
    transparent 68%
  );
  pointer-events:none;
}

.sh-eyebrow{
  display:flex;
  align-items:center;
  gap:10px;
  margin:0 0 26px;
  color:var(--sh-faint);
  font-size:12px;
  font-weight:500;
  letter-spacing:.14em;
  line-height:1.6;
  text-transform:uppercase;
}

.sh-eyebrow-thread{
  width:36px;
  height:12px;
  flex:none;
  overflow:visible;
}

.sh-eyebrow-thread path{
  fill:none;
  stroke:currentColor;
  stroke-width:1;
  stroke-linecap:round;
}

.sh-title{
  margin:0;
  color:var(--sh-ink);
  font-size:clamp(60px,6.8vw,112px);
  line-height:1.05;
  letter-spacing:-.065em;
  font-weight:500;
  text-wrap:wrap;
}

.sh-title-line,
.sh-title em{
  display:block;
}

.sh-title em{
  padding:0.06em 0.16em 0.16em 0;
  font-family:var(--sh-font-serif,Georgia,'Times New Roman',serif);
  font-style:italic;
  font-weight:400;
  letter-spacing:-.065em;
  color:#E8EBF0;
}

/* Preserve the italic overhang inside SplitText masks. */
.sh-title-line > div,
.sh-title-italic > div{
  padding:0.08em 0.22em 0.24em 0.04em;
  margin:-0.08em -0.22em -0.24em -0.04em;
}

.sh-description{
  max-width:36ch;
  margin:26px 0 0;
  color:var(--sh-muted);
  font-size:16px;
  line-height:1.7;
  text-wrap:pretty;
}

.sh-actions{
  display:flex;
  align-items:center;
  flex-wrap:wrap;
  gap:22px;
  margin-top:30px;
}

.sh-primary{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:26px;
  min-height:52px;
  padding:0 23px;
  border:1px solid #E8EBF0;
  border-radius:999px;
  background:#E8EBF0;
  color:#101318;
  font:inherit;
  font-size:12px;
  font-weight:500;
  line-height:1.2;
  letter-spacing:.01em;
  text-decoration:none;
  cursor:pointer;
  transition:
    background .22s,
    color .22s,
    border-color .22s,
    scale .18s;
}

.sh-primary:hover{
  background:#f4f6f8;
  border-color:var(--sh-accent);
}

.sh-primary:active{scale:.98}

.sh-arrow{
  width:17px;
  height:17px;
  flex:none;
  transition:transform .25s;
}

.sh-primary:hover .sh-arrow{
  transform:translateY(3px);
}

.sh-secondary{
  color:var(--sh-muted);
  font-size:12px;
  text-decoration:none;
  text-underline-offset:5px;
}

.sh-secondary:hover{text-decoration:underline}

.sh-primary:focus-visible,
.sh-secondary:focus-visible,
.sh-pause:focus-visible{
  outline:2px solid var(--sh-accent);
  outline-offset:5px;
}

.sh-stage{
  position:absolute;
  z-index:1;
  left:65%;
  top:50%;
  translate:-50% -50%;
  width:min(72vw,90svh,920px);
  aspect-ratio:1;
  perspective:1100px;
  pointer-events:none;
  will-change:transform,opacity;
}

.sh-dive-target{
  position:absolute;
  left:50%;
  top:50%;
  width:min(54vw,720px);
  aspect-ratio:1;
  translate:-50% -50%;
  visibility:hidden;
  pointer-events:none;
}

.sh-frame-position,
.sh-frame,
.sh-poster,
.sh-canvas,
.sh-canvas-wrap{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
}

.sh-frame-position{
  z-index:1;
  transform-origin:center;
  will-change:transform;
}

.sh-frame{
  z-index:0;
  transform-style:preserve-3d;
}

.sh-ribbon-depth{
  position:absolute;
  inset:0;
  z-index:2;
  pointer-events:none;
  transform-style:preserve-3d;
}

.sh-stage-halo{
  position:absolute;
  inset:8% 4% 2%;
  z-index:0;
  pointer-events:none;
  background:
    radial-gradient(
      ellipse at 68% 34%,
      rgba(0,240,255,.07),
      transparent 60%
    ),
    radial-gradient(
      ellipse at 32% 68%,
      rgba(181,92,255,.06),
      transparent 58%
    );
}

.sh-poster{
  display:block;
  max-width:none;
  object-fit:contain;
  opacity:1;
  mask-image:radial-gradient(
    ellipse 54% 55% at 50% 50%,
    #000 0%,#000 70%,rgba(0,0,0,.92) 78%,transparent 100%
  );
  -webkit-mask-image:radial-gradient(
    ellipse 54% 55% at 50% 50%,
    #000 0%,#000 70%,rgba(0,0,0,.92) 78%,transparent 100%
  );
  transition:opacity .55s ease;
  user-select:none;
  -webkit-user-drag:none;
}

.sh-canvas{
  opacity:0;
  transition:opacity .6s ease;
}

.sh-canvas canvas{
  display:block!important;
  width:100%!important;
  height:100%!important;
}

.sh-stage[data-ready="true"] .sh-canvas{
  opacity:1;
}

.sh-stage[data-ready="true"] .sh-poster,
.sh-stage[data-full-poster="true"] .sh-poster{
  opacity:0;
  visibility:hidden;
}

.sh-caption{
  position:absolute;
  z-index:3;
  left:50%;
  bottom:7%;
  translate:-50% 0;
  width:max-content;
  max-width:calc(100% - 12px);
  white-space:normal;
  text-align:center;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:9px;
  color:var(--sh-faint);
  font-size:12px;
  font-weight:500;
  letter-spacing:.12em;
  line-height:1.5;
  text-transform:uppercase;
  pointer-events:none;
}

.sh-caption::before{
  content:'';
  width:4px;
  height:4px;
  border-radius:50%;
  background:var(--sh-accent);
}

.sh-footer{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
  min-height:52px;
  padding-top:18px;
  border-top:1px solid var(--sh-line);
}

.sh-footer-note{
  font-size:12px;
  color:var(--sh-faint);
  letter-spacing:.04em;
  line-height:1.6;
}

.sh-footer-right{
  display:flex;
  align-items:center;
  gap:22px;
}

.sh-scroll-cue{
  display:flex;
  align-items:center;
  gap:12px;
  color:var(--sh-muted);
  font-size:12px;
  letter-spacing:.02em;
}

.sh-scroll-line{
  position:relative;
  width:1px;
  height:25px;
  overflow:hidden;
  background:rgba(255,255,255,.12);
}

.sh-scroll-line::after{
  content:'';
  position:absolute;
  inset:0 0 35%;
  background:linear-gradient(transparent,#dce1eb);
}

.sh-pause{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  min-height:36px;
  padding:8px 11px;
  border:1px solid var(--sh-line);
  border-radius:999px;
  background:transparent;
  color:var(--sh-muted);
  font:inherit;
  font-size:12px;
  cursor:pointer;
  transition:background .2s,border-color .2s,color .2s;
}

.sh-pause:hover{
  background:rgba(119,225,221,.06);
  border-color:var(--sh-accent);
  color:var(--sh-ink);
}

.sh-pause svg{
  width:11px;
  height:11px;
  flex:none;
}

@media(pointer:coarse){
  .sh-copy,
  .sh-atmosphere{will-change:opacity}
}

@media(min-width:1600px){
  .sh-layout{gap:70px}
  .sh-title{font-size:116px}
}

@media(max-width:760px){
  .sh-hero{
    padding:20px 22px;
    padding-top:max(56px,calc(env(safe-area-inset-top) + 48px));
    padding-bottom:max(16px,env(safe-area-inset-bottom));
  }

  .sh-header{
    padding-bottom:12px;
    gap:10px;
  }

  .sh-header-note{
    font-size:10px;
    white-space:nowrap;
  }

  .sh-brand{
    font-size:10.5px;
    letter-spacing:.12em;
    white-space:nowrap;
  }

  .sh-mark{
    width:22px;
    height:22px;
  }

  .sh-layout{
    align-items:flex-end;
    justify-content:center;
    padding-block:0 clamp(12px,2svh,24px);
  }

  .sh-stage{
    left:50%;
    top:39%;
    width:min(136vw,82svh,600px);
  }

  .sh-dive-target{width:min(64vw,46svh,340px)}
  .sh-caption{display:none}

  .sh-copy{
    width:100%;
    max-width:560px;
    margin-top:0;
    margin-inline:auto;
    padding:0;
    text-align:center;
  }

  .sh-copy::before{
    inset:-4% -4% 0;
    background:radial-gradient(
      ellipse at 50% 30%,
      rgba(8,11,13,.42) 0%,
      rgba(8,11,13,.16) 46%,
      transparent 72%
    );
  }

  .sh-eyebrow{
    justify-content:center;
    font-size:12px;
    letter-spacing:.12em;
    margin-bottom:14px;
  }

  .sh-title{
    font-size:clamp(44px,12.3vw,56px);
    line-height:1.02;
    letter-spacing:-.055em;
  }

  .sh-title em{letter-spacing:-.06em}

  .sh-description{
    max-width:34ch;
    margin:14px auto 0;
    font-size:16px;
    line-height:1.6;
  }

  .sh-actions{
    justify-content:center;
    margin-top:18px;
    gap:14px;
  }

  .sh-primary{
    min-height:48px;
    padding-inline:22px;
    gap:22px;
  }

  .sh-footer{
    padding-top:10px;
    min-height:44px;
    gap:10px;
    flex-wrap:nowrap;
    align-items:center;
  }

  .sh-footer-note{display:none}

  .sh-footer-right{
    gap:10px;
    margin-left:auto;
  }

  .sh-scroll-cue{
    font-size:12px;
    gap:8px;
    white-space:nowrap;
  }

  .sh-scroll-label-full{display:none}

  .sh-pause{
    min-height:44px;
    padding:8px 12px;
  }

  .sh-pause svg{
    width:12px;
    height:12px;
  }

  .sh-backword{display:none}
}

@media(max-height:700px) and (min-aspect-ratio:4/3){
  .sh-hero{
    padding:14px clamp(18px,3vw,40px);
    padding-top:max(64px,calc(env(safe-area-inset-top) + 52px));
  }

  .sh-header{padding-bottom:8px}
  .sh-header-note{display:none}

  .sh-layout{
    align-items:center;
    padding-block:0;
  }

  .sh-copy{
    width:min(42%,340px);
    margin-top:0;
    padding-block:0;
  }

  .sh-eyebrow{margin-bottom:10px}

  .sh-title{
    font-size:clamp(30px,4.8vw,56px);
    line-height:1.02;
  }

  .sh-description{
    margin-top:12px;
    font-size:15px;
    line-height:1.5;
    max-width:32ch;
  }

  .sh-actions{
    margin-top:12px;
    gap:14px;
  }

  .sh-primary{min-height:44px}

  .sh-stage{
    left:80%;
    top:54%;
    width:min(32vw,68svh,280px);
  }

  .sh-dive-target{width:min(34vw,62svh,320px)}

  .sh-caption,
  .sh-footer-note,
  .sh-scroll-cue{display:none}

  .sh-footer{
    min-height:36px;
    padding-top:8px;
    justify-content:flex-end;
  }
}

@media(max-height:700px) and (min-width:761px)
  and (max-aspect-ratio:4/3){
  .sh-hero{padding-block:18px}
  .sh-header{padding-bottom:14px}
  .sh-layout{padding-block:0}
  .sh-stage{width:min(70vw,94svh,820px)}
  .sh-dive-target{width:min(49vw,590px)}
  .sh-title{font-size:clamp(54px,6.7vw,92px)}
}

@media(max-width:760px) and (max-height:700px)
  and (orientation:portrait){
  .sh-stage{
    top:34%;
    width:min(124vw,70svh,500px);
  }

  .sh-eyebrow{
    font-size:10px;
    margin-bottom:10px;
  }

  .sh-title{font-size:clamp(40px,11.5vw,50px)}

  .sh-description{
    font-size:15px;
    line-height:1.45;
    margin-top:12px;
  }

  .sh-actions{margin-top:14px}
}

@media(prefers-reduced-motion:reduce){
  .sh-hero *{
    scroll-behavior:auto!important;
  }

  .sh-frame,
  .sh-ribbon-depth,
  .sh-stage-halo,
  .sh-copy,
  .sh-backword{
    transform:none!important;
  }

  .sh-poster,
  .sh-canvas,
  .sh-primary,
  .sh-arrow,
  .sh-veil{
    transition:none!important;
  }

  .sh-veil{opacity:0!important}

  .sh-primary:hover .sh-arrow{
    transform:none;
  }
}
`;

/**
 * Neon light rig composited onto the 3D render.
 *
 * These layers live inside .sh-view, the same stacking context as the WebGL
 * canvas, so blend modes act on the rendered head itself:
 *   - screen  adds coloured light (rim glow around the silhouette)
 *   - overlay only brightens bright pixels, so scan lines and the scan beam
 *     land on the silver head and leave the dark background untouched.
 * Nothing here may create a stacking context on .sh-view-fx itself (no
 * opacity < 1, transform, filter or isolation), or the blends would stop
 * seeing the canvas. Fading is done per layer through --fx-fade.
 *
 * Head ellipse, as a share of the stage box (poster and camera share framing).
 */
const FX_CSS = `
.sh-view-fx{
  position:absolute;
  left:0;
  top:0;
  width:0;
  height:0;
  pointer-events:none;
  --fx-fade:1;
  --hx:50%;
  --hy:44.5%;
  --hrx:26.5%;
  --hry:30%;
}

.sh-view-fx[data-hidden="true"]{display:none}

.sh-fx{
  position:absolute;
  inset:0;
  pointer-events:none;
}

/* Rim light: two coloured sources orbit the head; the face stays clean. */
.sh-fx-aura{
  mix-blend-mode:screen;
  opacity:var(--fx-fade);
  background:radial-gradient(
    ellipse calc(var(--hrx) * 1.35) calc(var(--hry) * 1.25)
      at var(--hx) var(--hy),
    rgba(70,215,255,.1) 0%,
    rgba(70,215,255,.07) 62%,
    transparent 100%
  );
  -webkit-mask-image:radial-gradient(
    ellipse calc(var(--hrx) * .9) calc(var(--hry) * .92)
      at var(--hx) var(--hy),
    transparent 0%,transparent 70%,#000 100%
  );
  mask-image:radial-gradient(
    ellipse calc(var(--hrx) * .9) calc(var(--hry) * .92)
      at var(--hx) var(--hy),
    transparent 0%,transparent 70%,#000 100%
  );
}

.sh-fx-aura::before,
.sh-fx-aura::after{
  content:'';
  position:absolute;
  inset:0;
  transform-origin:var(--hx) var(--hy);
}

.sh-fx-aura::before{
  background:radial-gradient(
    ellipse 38% 32% at 72% 30%,
    rgba(0,240,255,.4) 0%,
    rgba(0,200,255,.13) 48%,
    transparent 76%
  );
  animation:
    sh-fx-orbit 18s linear infinite,
    sh-fx-breathe 4.6s ease-in-out infinite alternate;
}

.sh-fx-aura::after{
  background:radial-gradient(
    ellipse 38% 32% at 28% 63%,
    rgba(181,92,255,.4) 0%,
    rgba(255,63,196,.11) 48%,
    transparent 76%
  );
  animation:
    sh-fx-orbit 24s linear infinite reverse,
    sh-fx-breathe 5.8s ease-in-out -2s infinite alternate;
}

/* Fine hologram lines, only visible on the lit metal. */
.sh-fx-lines{
  mix-blend-mode:overlay;
  opacity:calc(var(--fx-fade) * .32);
  background:repeating-linear-gradient(
    180deg,
    rgba(255,255,255,0) 0 3px,
    rgba(196,252,255,.6) 3px 4px
  );
  -webkit-mask-image:radial-gradient(
    ellipse calc(var(--hrx) * 1.12) calc(var(--hry) * 1.1)
      at var(--hx) var(--hy),
    #000 68%,transparent 100%
  );
  mask-image:radial-gradient(
    ellipse calc(var(--hrx) * 1.12) calc(var(--hry) * 1.1)
      at var(--hx) var(--hy),
    #000 68%,transparent 100%
  );
}

/* Scan beam sweeping crown to chin, then resting. */
.sh-fx-scan{
  overflow:hidden;
  mix-blend-mode:overlay;
  opacity:var(--fx-fade);
  -webkit-mask-image:radial-gradient(
    ellipse calc(var(--hrx) * 1.2) calc(var(--hry) * 1.15)
      at var(--hx) var(--hy),
    #000 72%,transparent 100%
  );
  mask-image:radial-gradient(
    ellipse calc(var(--hrx) * 1.2) calc(var(--hry) * 1.15)
      at var(--hx) var(--hy),
    #000 72%,transparent 100%
  );
}

.sh-fx-scan::before{
  content:'';
  position:absolute;
  inset:0;
  background:linear-gradient(
    180deg,
    transparent 0%,
    transparent 41%,
    rgba(0,240,255,.28) 48.6%,
    rgba(230,255,255,.95) 50%,
    rgba(0,240,255,.12) 50.6%,
    transparent 51.4%,
    transparent 100%
  );
  opacity:0;
  animation:sh-fx-scan 7.5s cubic-bezier(.45,.05,.55,.95) 1.2s infinite;
}

/* Holographic emitter ring under the bust (desktop). */
.sh-fx-base{
  inset:auto;
  left:23%;
  top:53%;
  width:54%;
  aspect-ratio:1;
  transform:scaleY(.15);
  mix-blend-mode:screen;
  opacity:calc(var(--fx-fade) * .85);
}

.sh-fx-base::before{
  content:'';
  position:absolute;
  inset:-8%;
  border-radius:50%;
  background:radial-gradient(
    circle,
    rgba(0,220,255,.22) 0%,
    rgba(120,90,255,.1) 40%,
    transparent 66%
  );
}

.sh-fx-base::after{
  content:'';
  position:absolute;
  inset:0;
  border-radius:50%;
  background:conic-gradient(
    rgba(0,240,255,0) 0deg,
    rgba(0,240,255,.95) 60deg,
    rgba(181,92,255,0) 125deg,
    rgba(181,92,255,.9) 200deg,
    rgba(255,63,196,0) 262deg,
    rgba(0,240,255,.55) 320deg,
    rgba(0,240,255,0) 360deg
  );
  -webkit-mask-image:radial-gradient(
    circle,transparent 60%,#000 63.5%,#000 66.5%,transparent 70.5%
  );
  mask-image:radial-gradient(
    circle,transparent 60%,#000 63.5%,#000 66.5%,transparent 70.5%
  );
  animation:sh-fx-spin 9s linear infinite;
}

@keyframes sh-fx-orbit{to{rotate:360deg}}
@keyframes sh-fx-spin{to{rotate:360deg}}
@keyframes sh-fx-breathe{from{opacity:.62}to{opacity:1}}
@keyframes sh-fx-scan{
  0%{translate:0 -38%;opacity:0}
  5%{opacity:1}
  40%{translate:0 29%;opacity:1}
  46%{translate:0 31%;opacity:0}
  100%{translate:0 31%;opacity:0}
}

.sh-view-fx[data-paused="true"] .sh-fx::before,
.sh-view-fx[data-paused="true"] .sh-fx::after{
  animation-play-state:paused;
}

/* Lean devices keep the rim light; the heavier layers go. */
.sh-view-fx[data-tier="low"] .sh-fx-lines,
.sh-view-fx[data-tier="low"] .sh-fx-scan,
.sh-view-fx[data-tier="low"] .sh-fx-base{
  display:none;
}

@media(max-width:760px){
  .sh-fx-base{display:none}
  .sh-fx-lines{opacity:calc(var(--fx-fade) * .22)}
}

@media(prefers-reduced-motion:reduce){
  .sh-fx::before,
  .sh-fx::after{animation:none!important}
  .sh-fx-scan{display:none}
}
`;

/** 0 at rest, 1 once the dive is underway. */
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

class CanvasBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

    gl?.getExtension("WEBGL_lose_context")?.loseContext();

    return Boolean(gl);
  } catch {
    return false;
  }
}

function ArrowDown() {
  return (
    <svg
      className="sh-arrow"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4v15m-6-6 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SilverHeadHero({
  children,
  assets = SILVER_HEAD_ASSETS,
  className = "",
  studioLabel = "Studio digital",
  eyebrow = "Strategie. Design. Tehnologie.",
  title,
  description = "Punem strategia, designul și tehnologia în aceeași direcție.",
  ctaLabel = "Explorează",
  secondaryHref,
  secondaryLabel = "Hai să vorbim",
}: HeroProps) {
  const threadId = `sh-thread-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const heroRef = useRef<HTMLElement>(null);
  const ribbonDepth = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const pointerBounds = useRef<DOMRect | null>(null);

  const intro = useRef<gsap.core.Timeline | null>(null);
  const introPlayed = useRef(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const diveTarget = useRef<HTMLDivElement>(null);
  const canvasWrap = useRef<HTMLDivElement>(null);
  const posterFrame = useRef<HTMLDivElement>(null);
  const tiltFrame = useRef<HTMLDivElement>(null);
  const viewPoster = useRef<HTMLImageElement>(null);
  const viewFx = useRef<HTMLDivElement>(null);
  const ribbonsWrap = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);

  const ribbons = useRef<RibbonsHandle | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // The existing dive controller owns these scroll channels.
  const control = useRef<HeadControl>({
    channels: {
      progress: 0,
      vh: 0,
      yaw: 0,
      center: 0,
      mouth: 0,
      camera: 0,
      atmosphere: 1,
    },
    paused: false,
    reducedMotion: false,
    covered: false,
    tier: "full",
    framing: {
      offsetX: 0,
      offsetY: 0,
      fovRest: STAGE_FOV,
      fovCenter: STAGE_FOV,
    },
    tiltX: 0,
    tiltY: 0,
    kick: () => {},
  });

  const metrics = useRef<PosterMetrics>({
    shiftX: 0,
    shiftY: 0,
    centerScale: 1,
    cover: 1,
  });

  const mounted = useRef(false);
  const failed = useRef(false);
  const finePointer = useRef(false);
  const readyRef = useRef(false);
  const pausedRef = useRef(false);
  const activeRef = useRef(true);
  const modeRef = useRef<"poster" | "3d">("poster");

  const tilt = useRef({ px: 0, py: 0 });

  const tiltTo = useRef<{
    x: gsap.QuickToFunc;
    y: gsap.QuickToFunc;
  } | null>(null);

  const applyTilt = useRef<() => void>(() => {});

  const [mode, setMode] = useState<"poster" | "3d">("poster");
  const [detail, setDetail] = useState<SceneDetail>("full");
  const [tier, setTier] = useState<PerfTier>("full");
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [fullPoster, setFullPoster] = useState(false);

  const debugMode = useSyncExternalStore(
    subscribeNever,
    readDebugMode,
    serverDebugMode,
  );

  // Keep quickTo instances reusable after a dive, pause or pointer change.
  const dropTilt = useCallback(() => {
    const current = tiltTo.current;

    if (current) {
      current.x(0, 0);
      current.y(0, 0);
      current.x.tween.pause();
      current.y.tween.pause();
    }

    tilt.current.px = 0;
    tilt.current.py = 0;
    applyTilt.current();
  }, []);

  useGSAP(
    (context) => {
      const heading = titleRef.current;
      if (!heading || reduced) return;

      const sans = heading.querySelector<HTMLElement>(".sh-title-line");

      const italic = heading.querySelector<HTMLElement>(".sh-title-italic");

      if (!sans || !italic) return;

      let cancelled = false;
      let frame: number | null = null;
      let width = -1;
      let force = true;

      const splits: InstanceType<typeof SplitText>[] = [];

      const build = () => {
        frame = null;

        if (cancelled) return;

        const nextWidth = heading.clientWidth;

        // Mobile browser chrome changes height without changing line wraps.
        if (!force && Math.abs(nextWidth - width) < 1) return;

        force = false;
        width = nextWidth;

        intro.current?.kill();
        intro.current = null;

        splits.forEach((split) => split.revert());
        splits.length = 0;

        const first = SplitText.create(sans, {
          type: "lines",
          mask: "lines",
          aria: "auto",
        });

        const second = SplitText.create(italic, {
          type: "lines",
          mask: "lines",
          aria: "auto",
        });

        splits.push(first, second);

        const lines = [...first.lines, ...second.lines];

        // Reflow must never replay the entrance or conceal a scrolled headline.
        if (introPlayed.current || control.current.channels.vh > 0.001) {
          gsap.set(lines, {
            yPercent: 0,
            y: 0,
            rotationX: 0,
            rotation: 0,
          });

          return;
        }

        introPlayed.current = true;

        const timeline = gsap.timeline();

        timeline.fromTo(
          first.lines,
          {
            yPercent: 95,
            rotationX: 5,
            transformOrigin: "50% 100%",
            transformPerspective: 850,
          },
          {
            yPercent: 0,
            rotationX: 0,
            duration: 0.58,
            stagger: 0.06,
            ease: "power3.out",
          },
          0,
        );

        timeline.fromTo(
          second.lines,
          {
            yPercent: 36,
            rotation: 2.5,
            transformOrigin: "0% 100%",
          },
          {
            yPercent: 0,
            rotation: 0,
            duration: 0.62,
            stagger: 0.05,
            ease: "power3.out",
          },
          0.1,
        );

        intro.current = timeline;

        if (
          pausedRef.current ||
          !activeRef.current ||
          document.visibilityState !== "visible"
        ) {
          timeline.pause();
        }
      };

      const schedule = () => {
        if (!cancelled && frame === null) {
          frame = requestAnimationFrame(() => context.add(build));
        }
      };

      const fontsChanged = () => {
        force = true;
        schedule();
      };

      const observer = new ResizeObserver(schedule);

      void document.fonts.ready.then(() => {
        if (cancelled) return;

        observer.observe(heading);
        schedule();
      });

      document.fonts.addEventListener("loadingdone", fontsChanged);

      return () => {
        cancelled = true;

        if (frame !== null) cancelAnimationFrame(frame);

        observer.disconnect();
        document.fonts.removeEventListener("loadingdone", fontsChanged);

        intro.current?.kill();
        intro.current = null;

        splits.forEach((split) => split.revert());
      };
    },
    {
      dependencies: [reduced],
      revertOnUpdate: true,
      scope: trackRef,
    },
  );

  const dive = useDiveController({
    refs: {
      track: trackRef,
      sticky: stickyRef,
      veil,
      posterFrame,
      viewPoster,
      ribbons: ribbonsWrap,
    },
    control,
    metrics,
    hooks: {
      ribbons: (running) => ribbons.current?.setRunning(running),
      leaveRest: () => {
        intro.current?.progress(1).pause();
        dropTilt();
      },
    },
  });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  // Both numeric tweens share one flush per GSAP update.
  useGSAP(
    () => {
      const proxy = tilt.current;

      let disposed = false;
      let queued = false;

      const flush = () => {
        queued = false;

        if (disposed) return;

        applyTilt.current();
      };

      const schedule = () => {
        if (!queued) {
          queued = true;
          queueMicrotask(flush);
        }
      };

      applyTilt.current = () => {
        const c = control.current;

        const allowed =
          finePointer.current &&
          activeRef.current &&
          !c.reducedMotion &&
          !pausedRef.current &&
          c.channels.vh <= 0.001;

        const px = allowed ? proxy.px : 0;
        const py = allowed ? proxy.py : 0;

        const rotateX = py * -2;
        const rotateY = px * 2.7;

        c.tiltX = rotateX;
        c.tiltY = rotateY;

        if (tiltFrame.current) {
          tiltFrame.current.style.transform =
            `translate3d(${(px * 5).toFixed(2)}px, ` +
            `${(py * 3).toFixed(2)}px, 0) ` +
            `rotateX(${rotateX.toFixed(3)}deg) ` +
            `rotateY(${rotateY.toFixed(3)}deg)`;
        }

        // A separate parent keeps pointer transforms independent of the dive.
        if (ribbonDepth.current) {
          ribbonDepth.current.style.transform =
            `translate3d(${(px * 3).toFixed(2)}px, ` +
            `${(py * 2).toFixed(2)}px, 0) ` +
            `rotateX(${(rotateX * 0.65).toFixed(3)}deg) ` +
            `rotateY(${(rotateY * 0.65).toFixed(3)}deg)`;
        }

        if (halo.current) {
          halo.current.style.transform =
            `translate3d(${(-px * 7).toFixed(2)}px, ` +
            `${(-py * 5).toFixed(2)}px, 0)`;
        }

        c.kick();
      };

      const xTo = gsap.quickTo(proxy, "px", {
        ...TILT_FOLLOW,
        onUpdate: schedule,
      });

      const yTo = gsap.quickTo(proxy, "py", {
        ...TILT_FOLLOW,
        onUpdate: schedule,
      });

      tiltTo.current = { x: xTo, y: yTo };

      return () => {
        disposed = true;

        xTo.tween.kill();
        yTo.tween.kill();

        tiltTo.current = null;
        control.current.tiltX = 0;
        control.current.tiltY = 0;
        applyTilt.current = () => {};
      };
    },
    { scope: trackRef },
  );

  useEffect(() => {
    if (!active || paused || reduced) {
      intro.current?.pause();
      dropTilt();
    } else {
      intro.current?.resume();
    }
  }, [active, paused, reduced, dropTilt]);

  const toPoster = useCallback(() => {
    if (!mounted.current) return;

    failed.current = true;
    readyRef.current = false;
    modeRef.current = "poster";

    setReady(false);
    setMode("poster");
    setFullPoster(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 760px)");

    const apply = () => {
      const next: SceneDetail = mq.matches ? "lean" : "full";

      setDetail(next);
      setTier((current) => (current === "low" ? current : next));
    };

    apply();
    mq.addEventListener("change", apply);

    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    control.current.tier = tier;
  }, [tier]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const pointerQuery = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    );

    const supported = webglAvailable();

    const apply = () => {
      const c = control.current;

      c.reducedMotion = mq.matches;
      finePointer.current = pointerQuery.matches;

      setReduced(mq.matches);

      if (mq.matches || !pointerQuery.matches) dropTilt();

      const next =
        supported && !mq.matches && !failed.current ? "3d" : "poster";

      if (next !== modeRef.current) {
        readyRef.current = false;
        setReady(false);
      }

      modeRef.current = next;

      setMode(next);
      setFullPoster(next === "poster");

      c.kick();
    };

    apply();

    mq.addEventListener("change", apply);
    pointerQuery.addEventListener("change", apply);

    return () => {
      mq.removeEventListener("change", apply);
      pointerQuery.removeEventListener("change", apply);
    };
  }, [dropTilt]);

  useEffect(() => {
    dive.setFlags({ active, paused, reduced, mode });
  }, [active, paused, reduced, mode, dive]);

  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    let visible = rect.bottom > 0 && rect.top < window.innerHeight;

    const update = () => {
      const on = visible && document.visibilityState === "visible";

      activeRef.current = on;
      setActive(on);

      if (on) control.current.kick();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });

    observer.observe(el);

    document.addEventListener("visibilitychange", update);
    update();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (mode !== "3d") return;

    const el = canvasWrap.current;

    const onLost = (event: Event) => {
      event.preventDefault();
      toPoster();
    };

    el?.addEventListener("webglcontextlost", onLost, true);

    const timeout = !ready ? window.setTimeout(toPoster, 15000) : undefined;

    return () => {
      el?.removeEventListener("webglcontextlost", onLost, true);
      window.clearTimeout(timeout);
    };
  }, [mode, ready, toPoster]);

  // The light rig belongs to the resting pose: fade it out as the dive starts.
  // Written per layer via --fx-fade so .sh-view-fx never isolates its blends.
  useEffect(() => {
    const fx = viewFx.current;
    if (!fx) return;

    let last = -1;

    const update = () => {
      const c = control.current;
      const fade = c.covered ? 0 : 1 - smoothstep(0, 0.14, c.channels.vh);
      const value = Math.round(fade * 100) / 100;

      if (value === last) return;
      last = value;

      fx.style.setProperty("--fx-fade", String(value));
      fx.dataset.hidden = value <= 0 ? "true" : "false";
    };

    update();

    if (!active) return;

    gsap.ticker.add(update);

    return () => {
      gsap.ticker.remove(update);
    };
  }, [active]);

  // Measure only when geometry changes; never inside pointermove.
  useLayoutEffect(() => {
    const frame = stickyRef.current;
    const stageEl = stage.current;
    const targetEl = diveTarget.current;

    if (!frame || !stageEl || !targetEl) return;

    const half = (STAGE_FOV * Math.PI) / 360;
    const tanHalf = Math.tan(half);

    const fovFor = (viewportH: number, subjectH: number) => {
      if (subjectH < 1) return STAGE_FOV;

      return (2 * Math.atan(tanHalf * (viewportH / subjectH)) * 180) / Math.PI;
    };

    let pending: number | null = null;
    let previous = "";

    const measure = () => {
      pending = null;

      const frameBox = frame.getBoundingClientRect();
      const stageBox = stageEl.getBoundingClientRect();
      const targetBox = targetEl.getBoundingClientRect();

      pointerBounds.current = heroRef.current?.getBoundingClientRect() ?? null;

      const key = [
        frameBox.left,
        frameBox.top,
        frameBox.width,
        frameBox.height,
        stageBox.left,
        stageBox.top,
        stageBox.width,
        stageBox.height,
        targetBox.height,
      ]
        .map((value) => Math.round(value * 4))
        .join(":");

      if (key === previous) return;
      previous = key;

      const stageH = stageBox.height;
      const centeredSubjectH = targetBox.height * 1.2;

      const offsetX =
        stageBox.left +
        stageBox.width / 2 -
        (frameBox.left + frameBox.width / 2);

      const offsetY =
        stageBox.top +
        stageBox.height / 2 -
        (frameBox.top + frameBox.height / 2);

      control.current.framing = {
        offsetX,
        offsetY,
        fovRest: fovFor(frameBox.height, stageH),
        fovCenter: fovFor(frameBox.height, centeredSubjectH),
      };

      metrics.current = {
        shiftX: -offsetX,
        shiftY: -offsetY,
        centerScale: stageH > 1 ? centeredSubjectH / stageH : 1,
        cover:
          stageH > 1
            ? Math.max(
                frameBox.width / stageBox.width,
                frameBox.height / stageH,
              ) * 1.2
            : 1,
      };

      const poster = viewPoster.current;

      if (poster) {
        poster.style.left = `${stageBox.left - frameBox.left}px`;
        poster.style.top = `${stageBox.top - frameBox.top}px`;
        poster.style.width = `${stageH}px`;
        poster.style.height = `${stageH}px`;
      }

      // The light rig tracks the stage box, like the full-frame poster.
      const fx = viewFx.current;

      if (fx) {
        fx.style.left = `${stageBox.left - frameBox.left}px`;
        fx.style.top = `${stageBox.top - frameBox.top}px`;
        fx.style.width = `${stageBox.width}px`;
        fx.style.height = `${stageH}px`;
      }

      dive.relayout();
      control.current.kick();
    };

    measure();

    const schedule = () => {
      if (pending === null) {
        pending = requestAnimationFrame(measure);
      }
    };

    const observer = new ResizeObserver(schedule);

    observer.observe(frame);
    observer.observe(stageEl);
    observer.observe(targetEl);

    return () => {
      observer.disconnect();

      if (pending !== null) cancelAnimationFrame(pending);
    };
  }, [dive]);

  // Stable svh prevents the mobile URL bar from rewinding the pinned journey.
  useLayoutEffect(() => {
    const frame = stickyRef.current;
    if (!frame) return;

    const applySize = () => {
      const root = document.documentElement;

      if (control.current.reducedMotion) {
        root.style.removeProperty("--sh-sticky");
        return;
      }

      const height = Math.round(frame.offsetHeight);
      const value = `${height}px`;

      if (root.style.getPropertyValue("--sh-sticky") !== value) {
        root.style.setProperty("--sh-sticky", value);
      }
    };

    applySize();
    window.addEventListener("resize", applySize);

    return () => {
      window.removeEventListener("resize", applySize);

      document.documentElement.style.removeProperty("--sh-sticky");
    };
  }, [reduced]);

  const onReady = useCallback(() => {
    if (!mounted.current || failed.current) return;

    readyRef.current = true;

    setReady(true);
    setFullPoster(false);

    control.current.kick();
  }, []);

  const onTierChange = useCallback((next: PerfTier) => {
    setTier(next);
  }, []);

  const resetPointer = useCallback(() => {
    if (pausedRef.current || control.current.reducedMotion) {
      dropTilt();
      return;
    }

    tiltTo.current?.x(0);
    tiltTo.current?.y(0);
  }, [dropTilt]);

  const onPointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") {
      pointerBounds.current = event.currentTarget.getBoundingClientRect();
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      !finePointer.current ||
      event.pointerType !== "mouse" ||
      control.current.reducedMotion ||
      pausedRef.current ||
      control.current.channels.vh > 0.001
    ) {
      return;
    }

    const rect = pointerBounds.current;

    if (!rect || rect.width < 1 || rect.height < 1) return;

    tiltTo.current?.x(
      clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
    );

    tiltTo.current?.y(
      clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
    );
  };

  const togglePause = () => {
    const next = !pausedRef.current;

    pausedRef.current = next;
    setPaused(next);

    control.current.paused = next;

    if (next) dropTilt();

    control.current.kick();
  };

  const ribbonFps =
    tier === "low"
      ? PERF.ribbonFps.low
      : detail === "lean"
        ? PERF.ribbonFps.coarse
        : PERF.ribbonFps.fine;

  return (
    <div
      ref={trackRef}
      className="sh-track"
      data-reduced={reduced ? "true" : "false"}
    >
      <noscript dangerouslySetInnerHTML={{ __html: NOSCRIPT_CSS }} />

      <div ref={stickyRef} className="sh-sticky">
        <div className="sh-view" aria-hidden="true">
          {mode === "3d" && (
            <div ref={canvasWrap} className="sh-view-canvas">
              <CanvasBoundary onError={toPoster}>
                <SilverHeadCanvas
                  active={active}
                  control={control}
                  glbUrl={assets.glb}
                  detail={detail}
                  onReady={onReady}
                  onPoorPerformance={toPoster}
                  onTierChange={onTierChange}
                  onCalibrate={dive.setBlack}
                />
              </CanvasBoundary>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={viewPoster}
            className="sh-view-poster"
            data-visible={fullPoster ? "true" : "false"}
            src={assets.poster}
            alt=""
            width={1024}
            height={1024}
            draggable={false}
          />

          <div
            ref={viewFx}
            className="sh-view-fx"
            data-tier={tier}
            data-paused={paused || !active ? "true" : "false"}
          >
            <div className="sh-fx sh-fx-aura" />
            <div className="sh-fx sh-fx-lines" />
            <div className="sh-fx sh-fx-scan" />
            <div className="sh-fx sh-fx-base" />
          </div>
        </div>

        <section
          ref={heroRef}
          className={`sh-hero ${className}`}
          aria-label="Introducere"
          onPointerEnter={onPointerEnter}
          onPointerMove={onPointerMove}
          onPointerLeave={resetPointer}
        >
          <style dangerouslySetInnerHTML={{ __html: CSS + FX_CSS }} />

          <div className="sh-atmosphere" data-sh-chrome aria-hidden="true">
            <div className="sh-backword">FORMĂ</div>
          </div>

          <div ref={diveTarget} className="sh-dive-target" aria-hidden="true" />

          <div
            ref={stage}
            className="sh-stage"
            data-ready={mode === "3d" && ready ? "true" : "false"}
            data-full-poster={fullPoster ? "true" : "false"}
          >
            <div
              ref={halo}
              className="sh-stage-halo"
              data-sh-chrome
              aria-hidden="true"
            />

            <div ref={posterFrame} className="sh-frame-position">
              <div ref={tiltFrame} className="sh-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="sh-poster"
                  src={assets.poster}
                  alt="Cap sculptural argintiu"
                  width={1024}
                  height={1024}
                  fetchPriority="high"
                  decoding="async"
                  draggable={false}
                />
              </div>
            </div>

            <div ref={ribbonDepth} className="sh-ribbon-depth">
              <OrbitalRibbons
                wrapperRef={ribbonsWrap}
                handleRef={ribbons}
                reducedMotion={reduced}
                fps={ribbonFps}
              />
            </div>

            <span className="sh-caption" data-sh-chrome aria-hidden="true">
              Din idee, în experiență.
            </span>
          </div>

          <header className="sh-header" data-sh-chrome>
            <div className="sh-brand">
              <svg
                className="sh-mark"
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="14"
                  cy="14"
                  r="11"
                  stroke="currentColor"
                  strokeWidth=".75"
                />

                <path
                  d="M14 3v22M3 14h22M6.2 6.2l15.6 15.6M6.2 21.8 21.8 6.2"
                  stroke="currentColor"
                  strokeWidth=".75"
                />
              </svg>

              <span>{studioLabel}</span>
            </div>

            <span className="sh-header-note">O perspectivă diferită.</span>
          </header>

          <div className="sh-layout">
            <div className="sh-copy" data-sh-chrome>
              {children ?? (
                <>
                  <p className="sh-eyebrow">
                    <svg
                      className="sh-eyebrow-thread"
                      viewBox="0 0 36 12"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient
                          id={threadId}
                          x1="0"
                          y1="6"
                          x2="36"
                          y2="6"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop
                            offset="0"
                            stopColor="#E8EBF0"
                            stopOpacity=".35"
                          />
                          <stop
                            offset="1"
                            stopColor="#77E1DD"
                            stopOpacity=".95"
                          />
                        </linearGradient>
                      </defs>

                      <path
                        d="M1 8 C 12 2, 22 2, 35 6"
                        style={{
                          stroke: `url(#${threadId})`,
                        }}
                      />
                    </svg>

                    {eyebrow}
                  </p>

                  <h1 className="sh-title" ref={titleRef}>
                    {title ?? (
                      <>
                        <span className="sh-title-line">Idei care</span>

                        <em className="sh-title-italic">prind formă.</em>
                      </>
                    )}
                  </h1>

                  <p className="sh-description">{description}</p>

                  <div className="sh-actions">
                    <button
                      type="button"
                      className="sh-primary"
                      onClick={dive.explore}
                    >
                      {ctaLabel}
                      <ArrowDown />
                    </button>

                    {secondaryHref && (
                      <a className="sh-secondary" href={secondaryHref}>
                        {secondaryLabel} ↗
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <footer className="sh-footer" data-sh-chrome>
            <span className="sh-footer-note">
              Claritate în idee. Caracter în fiecare detaliu.
            </span>

            <div className="sh-footer-right">
              {!reduced && (
                <button
                  type="button"
                  className="sh-pause"
                  onClick={togglePause}
                  aria-pressed={paused}
                  aria-label={paused ? "Pornește animația" : "Oprește animația"}
                >
                  <svg
                    viewBox="0 0 12 12"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    {paused ? (
                      <path d="m3 1 8 5-8 5V1Z" />
                    ) : (
                      <>
                        <rect x="2" y="1" width="2.5" height="10" rx=".5" />
                        <rect x="7.5" y="1" width="2.5" height="10" rx=".5" />
                      </>
                    )}
                  </svg>

                  <span>{paused ? "Pornește" : "Pauză"}</span>
                </button>
              )}

              <span className="sh-scroll-cue">
                <span className="sh-scroll-label">Derulează</span>

                <span className="sh-scroll-label-full">
                  {" "}
                  pentru a descoperi
                </span>

                <span className="sh-scroll-line" aria-hidden="true" />
              </span>
            </div>
          </footer>

          <div className="sh-hero-fade" data-sh-chrome aria-hidden="true" />
        </section>

        <div ref={veil} className="sh-veil" aria-hidden="true" />
      </div>

      {debugMode === "overlay" && <DiveDebug control={control} />}
    </div>
  );
}
