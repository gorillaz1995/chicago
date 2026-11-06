"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { m } from "motion/react";
import type { HeadControl } from "./SilverHeadCanvas";
import type { SceneDetail } from "./chamberEnvironment";
import { PERF, STAGE_FOV, trackCss, type PerfTier } from "./diveStages";
import { gsap, useGSAP } from "./gsapClient";
import { LAMP_PLATE } from "./lampSection";
import OrbitalRibbons, { type RibbonsHandle } from "./OrbitalRibbons";
import {
  readDebugMode,
  useDiveController,
  type DiveDebugMode,
  type PosterMetrics,
} from "./useDiveController";
import {
  GlyphMatrix,
  type GlyphMatrixHandle,
} from "@/components/ui/glyph-matrix";

const SilverHeadCanvas = dynamic(() => import("./SilverHeadCanvas"), {
  ssr: false,
  loading: () => null,
});

// Tuning overlay, only fetched with `?shDebug`.
const DiveDebug = dynamic(() => import("./DiveDebug"), {
  ssr: false,
  loading: () => null,
});

export const SILVER_HEAD_ASSETS = {
  // v=v4 drops a cached copy of the previous head.
  glb: "/silver-head/silver-head_v4.glb?v=v4",
  poster: "/silver-head/silver-head-poster_v4.webp",
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

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

/** Pointer tilt follow. Close to the old spring (stiffness 85, damping 23). */
const TILT_FOLLOW = { duration: 0.55, ease: "power3.out" } as const;

// The query string does not change while the page is open.
const subscribeNever = () => () => {};
const serverDebugMode = (): DiveDebugMode => "off";

/** Without JS there is no pin: the hero, the lamp and the content stack normally. */
const NOSCRIPT_CSS = `<style>.sh-track{height:100svh!important}.sh-veil{display:none!important}.mouth-reveal{margin-top:0!important;opacity:1!important;pointer-events:auto!important}.mouth-reveal .lamp-spin{animation-play-state:running!important}</style>`;

const CSS = `
.sh-hero,.sh-hero *{box-sizing:border-box}

.sh-track{
  position:relative;
  background:#070B09;
  height:calc(100svh * (1 + var(--sh-pin)));
  /* The controller restores the dive position after layout changes;
     the browser's own scroll anchoring would move it first. */
  overflow-anchor:none;
}
${trackCss()}
.sh-track[data-reduced="true"],
.sh-track[data-dive="static"]{height:100svh}

/* A controller error leaves a normal page: no pin, lamp visible. */
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
  background:#070B09;
}

.sh-view{
  position:absolute;
  inset:0;
  z-index:0;
  overflow:hidden;
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
  mask-image:radial-gradient(ellipse 54% 55% at 50% 50%,#000 0%,#000 70%,rgba(0,0,0,.92) 78%,transparent 100%);
  -webkit-mask-image:radial-gradient(ellipse 54% 55% at 50% 50%,#000 0%,#000 70%,rgba(0,0,0,.92) 78%,transparent 100%);
  pointer-events:none;
  user-select:none;
  -webkit-user-drag:none;
}

.sh-view-poster[data-visible="false"]{display:none}

/* One grid for the whole frame. Opacity hides it; the bitmap still paints. */
.sh-glyph-source{
  position:absolute;
  inset:0;
  opacity:0;
  overflow:hidden;
  pointer-events:none;
}

/* Same plate as the lamp. Covers the last stretch of the mouth before the blend. */
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
  --sh-bg:#070B09;
  --sh-ink:#F2F0E8;
  --sh-muted:#B3BDB7;
  --sh-faint:#9EACA3;
  --sh-accent:#78E8AA;
  --sh-line:rgba(205,214,209,.16);
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
  font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
}

/* Bottom fade. A real element so it clears with the chrome and the black frame stays flat. */
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
  -webkit-mask-image:linear-gradient(90deg,#000 0%,#000 38%,transparent 62%);
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

.sh-header,.sh-layout,.sh-footer{
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
  inset:-18% -22% -20% -12%;
  background:radial-gradient(ellipse at 28% 52%,rgba(7,11,9,.86) 0%,rgba(7,11,9,.58) 46%,rgba(7,11,9,.18) 68%,transparent 78%);
  filter:blur(12px);
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

.sh-eyebrow::before{
  content:'';
  width:26px;
  height:1px;
  background:linear-gradient(90deg,#e4e6ea,#626975);
  flex:none;
}

.sh-title{
  margin:0;
  color:var(--sh-ink);
  font-size:clamp(60px,6.8vw,112px);
  line-height:.99;
  letter-spacing:-.065em;
  font-weight:500;
  text-wrap:balance;
}

.sh-title-line{
  display:block;
}

.sh-title em{
  display:block;
  padding-right:.08em;
  font-family:Georgia,'Times New Roman',serif;
  font-weight:400;
  letter-spacing:-.065em;
  color:#CDD6D1;
}

.sh-description{
  max-width:36ch;
  margin:26px 0 0;
  color:var(--sh-muted);
  font-size:15px;
  line-height:1.85;
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
  border:1px solid #F2F0E8;
  border-radius:999px;
  background:#F2F0E8;
  color:#13161b;
  font:inherit;
  font-size:12px;
  font-weight:500;
  line-height:1.2;
  letter-spacing:.01em;
  text-decoration:none;
  cursor:pointer;
  transition:background .22s,color .22s,border-color .22s;
}

.sh-primary:hover{
  background:#F7F6F1;
  border-color:var(--sh-accent);
}

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

.sh-secondary:hover{
  text-decoration:underline;
}

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
  width:min(72vw,90dvh,920px);
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
  transform-origin:center;
  will-change:transform;
}

.sh-frame{
  z-index:0;
  transform-style:preserve-3d;
}

.sh-poster{
  display:block;
  max-width:none;
  object-fit:contain;
  opacity:1;
  mask-image:radial-gradient(ellipse 54% 55% at 50% 50%,#000 0%,#000 70%,rgba(0,0,0,.92) 78%,transparent 100%);
  -webkit-mask-image:radial-gradient(ellipse 54% 55% at 50% 50%,#000 0%,#000 70%,rgba(0,0,0,.92) 78%,transparent 100%);
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
  background:#9EACA3;
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
  background:rgba(120,232,170,.06);
  border-color:var(--sh-accent);
  color:var(--sh-ink);
}

.sh-pause svg{
  width:11px;
  height:11px;
  flex:none;
}

/* Phones fade the blurred scrim and the outline word on their own layers,
   so the clearing stage does not repaint the blur every frame. */
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
    /* The fixed menu sits on the top edge. Keep the header row beneath it. */
    padding-top:max(56px,calc(env(safe-area-inset-top) + 48px));
    padding-bottom:max(20px,env(safe-area-inset-bottom));
  }

  .sh-header{padding-bottom:12px}
  .sh-header-note{font-size:12px}
  .sh-brand{font-size:12px;letter-spacing:.14em}

  .sh-layout{
    align-items:flex-end;
    justify-content:center;
    padding-block:8px 18px;
  }

  .sh-stage{
    left:50%;
    top:43%;
    width:min(112svh,245vw);
    width:min(112dvh,245vw);
  }

  .sh-dive-target{width:min(78vw,420px,46svh)}
  .sh-caption{display:none}

  .sh-copy{
    width:100%;
    max-width:560px;
    margin-inline:auto;
    padding:0;
    text-align:center;
  }

  .sh-copy::before{
    inset:-22% -8% -20%;
    background:radial-gradient(ellipse at 50% 55%,rgba(7,11,9,.9) 0%,rgba(7,11,9,.62) 48%,rgba(7,11,9,.2) 70%,transparent 82%);
    filter:blur(10px);
  }

  .sh-eyebrow{
    justify-content:center;
    font-size:12px;
    letter-spacing:.12em;
    margin-bottom:14px;
  }

  .sh-title{
    font-size:clamp(44px,12vw,74px);
    line-height:1.01;
    letter-spacing:-.06em;
  }

  .sh-title em{letter-spacing:-.065em}

  .sh-description{
    max-width:34ch;
    margin:16px auto 0;
    font-size:15px;
    line-height:1.7;
  }

  .sh-actions{
    justify-content:center;
    margin-top:22px;
    gap:18px;
  }

  .sh-primary{
    min-height:48px;
    padding-inline:22px;
    gap:22px;
  }

  .sh-footer{
    padding-top:15px;
    min-height:44px;
    gap:12px;
    flex-wrap:wrap;
    align-items:flex-start;
  }

  .sh-footer-note{
    font-size:12px;
    max-width:22ch;
  }

  .sh-footer-right{gap:12px}
  .sh-scroll-cue{font-size:12px;gap:8px}
  .sh-pause{min-height:44px;padding:8px 12px}
  .sh-pause svg{width:12px;height:12px}
  .sh-backword{display:none}
}

@media(max-height:700px) and (min-width:761px){
  .sh-hero{padding-block:18px}
  .sh-header{padding-bottom:14px}
  .sh-layout{padding-block:0}
  .sh-stage{
    width:min(70vw,94svh,820px);
    width:min(70vw,94dvh,820px);
  }
  .sh-dive-target{width:min(49vw,590px)}
  .sh-title{font-size:clamp(54px,6.7vw,92px)}
}

@media(prefers-reduced-motion:reduce){
  .sh-hero *{
    scroll-behavior:auto!important;
  }

  .sh-frame,
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

class CanvasBoundary extends Component<
  {
    onError: () => void;
    children: ReactNode;
  },
  {
    failed: boolean;
  }
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
  description = "Transformăm ideile în experiențe digitale care se simt diferit. Clare, memorabile, construite cu intenție.",
  ctaLabel = "Explorează",
  secondaryHref,
  secondaryLabel = "Hai să vorbim",
}: HeroProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const diveTarget = useRef<HTMLDivElement>(null);
  const canvasWrap = useRef<HTMLDivElement>(null);
  const posterFrame = useRef<HTMLDivElement>(null);
  const tiltFrame = useRef<HTMLDivElement>(null);
  const viewPoster = useRef<HTMLImageElement>(null);
  const ribbonsWrap = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);

  const ribbons = useRef<RibbonsHandle | null>(null);
  const glyph = useRef<GlyphMatrixHandle | null>(null);

  // Shared with the canvas. The dive timeline writes `channels` during scroll.
  const control = useRef<HeadControl>({
    channels: {
      progress: 0,
      vh: 0,
      yaw: 0,
      center: 0,
      mouth: 0,
      camera: 0,
      atmosphere: 1,
      glyph: 0,
    },
    paused: false,
    reducedMotion: false,
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
    syncGlyph: () => {},
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
  const modeRef = useRef<"poster" | "3d">("poster");

  // Pointer tilt, eased with quickTo and read by the canvas.
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
  const [glyphCanvas, setGlyphCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );

  // `?shDebug` opens the tuning overlay. Hydrates as "off", then reads the URL.
  const debugMode = useSyncExternalStore(
    subscribeNever,
    readDebugMode,
    serverDebugMode,
  );

  // Back to the neutral pose without easing, e.g. when the dive starts.
  const dropTilt = useCallback(() => {
    gsap.killTweensOf(tilt.current);
    tilt.current.px = 0;
    tilt.current.py = 0;
    applyTilt.current();
  }, []);

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
      glyph: (running) => {
        if (running) glyph.current?.start();
        else glyph.current?.stop();
      },
      leaveRest: dropTilt,
    },
  });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  // Tilt writes the canvas tilt and the loading poster in one place.
  useGSAP(() => {
    const proxy = tilt.current;

    applyTilt.current = () => {
      const rotateX = proxy.py * -2.5;
      const rotateY = proxy.px * 3;

      control.current.tiltX = rotateX;
      control.current.tiltY = rotateY;

      const frame = tiltFrame.current;
      if (frame) {
        frame.style.transform = `translate3d(${(proxy.px * 7).toFixed(2)}px, ${(proxy.py * 5).toFixed(2)}px, 0) rotateX(${rotateX.toFixed(3)}deg) rotateY(${rotateY.toFixed(3)}deg)`;
      }

      control.current.kick();
    };

    tiltTo.current = {
      x: gsap.quickTo(proxy, "px", { ...TILT_FOLLOW, onUpdate: applyTilt.current }),
      y: gsap.quickTo(proxy, "py", { ...TILT_FOLLOW, onUpdate: applyTilt.current }),
    };

    return () => {
      tiltTo.current = null;
      applyTilt.current = () => {};
    };
  }, []);

  const toPoster = useCallback(() => {
    if (!mounted.current) return;

    failed.current = true;
    readyRef.current = false;
    modeRef.current = "poster";

    setReady(false);
    setMode("poster");
    setFullPoster(true);
  }, []);

  // Coarse pointers and narrow layouts skip the shaft, traces, and the larger map.
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

  // Reduced motion uses the poster instead of mounting the 3D scene.
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

  // The loops read these through the controller, without re-rendering anything.
  useEffect(() => {
    dive.setFlags({ active, paused, reduced, mode });
  }, [active, paused, reduced, mode, dive]);

  // Suspend the scene when offscreen or when the tab is hidden.
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    let visible = rect.bottom > 0 && rect.top < window.innerHeight;

    const update = () => {
      const on = visible && document.visibilityState === "visible";

      setActive(on);

      if (on) {
        control.current.kick();
      }
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

  // Recover from a lost context or a scene that never becomes ready.
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

  // Stage rectangle to fullscreen framing. The stage is not transformed, so this
  // stays valid while the dive runs. Resize does not touch the handoff.
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

    const measure = () => {
      const frameBox = frame.getBoundingClientRect();
      const stageBox = stageEl.getBoundingClientRect();
      const targetBox = targetEl.getBoundingClientRect();
      const stageH = stageBox.height;
      // Keep the approved centered pose independent of the larger rest frame.
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

      // The fallback poster sits on the stage rectangle, outside the stage.
      const poster = viewPoster.current;
      if (poster) {
        poster.style.left = `${stageBox.left - frameBox.left}px`;
        poster.style.top = `${stageBox.top - frameBox.top}px`;
        poster.style.width = `${stageH}px`;
        poster.style.height = `${stageH}px`;
      }

      dive.relayout();
      control.current.kick();
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(stageEl);
    observer.observe(targetEl);

    return () => observer.disconnect();
  }, [dive]);

  // The track and the lamp plate stay on the small viewport (100svh).
  // visualViewport.height changes when Chrome hides the URL bar, and rewriting
  // the track from that value rewinds the dive into the glyphs.
  useLayoutEffect(() => {
    const frame = stickyRef.current;
    if (!frame) return;

    const applySize = () => {
      const root = document.documentElement;

      if (control.current.reducedMotion) {
        root.style.removeProperty("--sh-sticky");
        return;
      }

      // CSS 100svh is stable while the toolbar shows and hides.
      const height = Math.round(frame.offsetHeight);
      root.style.setProperty("--sh-sticky", `${height}px`);
    };

    applySize();

    // Width changes (rotation) update svh. Toolbar height changes do not.
    window.addEventListener("resize", applySize);

    return () => {
      window.removeEventListener("resize", applySize);
      document.documentElement.style.removeProperty("--sh-sticky");
    };
  }, [reduced]);

  // The glyph canvas uploads to the mouth texture after each painted tick.
  const syncGlyphDraw = useCallback(() => {
    control.current.syncGlyph();
  }, []);

  const bindGlyphCanvas = useCallback((node: HTMLCanvasElement | null) => {
    setGlyphCanvas(node);
  }, []);

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
    tiltTo.current?.x(0);
    tiltTo.current?.y(0);
  }, []);

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

    const rect = event.currentTarget.getBoundingClientRect();

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
            <div className="sh-glyph-source">
              <GlyphMatrix
                color="#ffffff"
                fadeBottom={0}
                cellSize={16}
                interval={140}
                mutationRate={0.03}
                maxDpr={1}
                maxEdge={PERF.glyphMaxEdge[tier]}
                minOpacity={0.55}
                maxOpacity={1}
                active={active}
                autoStart={false}
                handleRef={glyph}
                canvasRef={bindGlyphCanvas}
                onDraw={syncGlyphDraw}
              />
            </div>
          )}

          {mode === "3d" && (
            <div ref={canvasWrap} className="sh-view-canvas">
              <CanvasBoundary onError={toPoster}>
                <SilverHeadCanvas
                  active={active}
                  control={control}
                  glbUrl={assets.glb}
                  detail={detail}
                  glyphCanvas={glyphCanvas}
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
        </div>

        <section
          className={`sh-hero ${className}`}
          aria-label="Introducere"
          onPointerMove={onPointerMove}
          onPointerLeave={resetPointer}
        >
          <style dangerouslySetInnerHTML={{ __html: CSS }} />

          <div className="sh-atmosphere" data-sh-chrome aria-hidden="true">
            <div className="sh-backword">FORMĂ</div>
          </div>

          <div
            ref={diveTarget}
            className="sh-dive-target"
            aria-hidden="true"
          />

          <div
            ref={stage}
            className="sh-stage"
            data-ready={mode === "3d" && ready ? "true" : "false"}
            data-full-poster={fullPoster ? "true" : "false"}
          >
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

            <OrbitalRibbons
              wrapperRef={ribbonsWrap}
              handleRef={ribbons}
              reducedMotion={reduced}
              fps={ribbonFps}
            />

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
                  <p className="sh-eyebrow">{eyebrow}</p>

                  <h1 className="sh-title">
                    {title ?? (
                      <>
                        <m.span
                          className="sh-title-line"
                          initial={{ y: 16 }}
                          animate={{ y: 0 }}
                          transition={{
                            duration: reduced ? 0 : 0.85,
                            ease: EASE,
                          }}
                        >
                          Idei care
                        </m.span>

                        <m.em
                          initial={{ y: 22 }}
                          animate={{ y: 0 }}
                          transition={{
                            duration: reduced ? 0 : 1,
                            delay: reduced ? 0 : 0.08,
                            ease: EASE,
                          }}
                        >
                          prind formă.
                        </m.em>
                      </>
                    )}
                  </h1>

                  <p className="sh-description">{description}</p>

                  <div className="sh-actions">
                    <m.button
                      type="button"
                      className="sh-primary"
                      onClick={dive.explore}
                      whileTap={reduced ? undefined : { scale: 0.97 }}
                    >
                      {ctaLabel}
                      <ArrowDown />
                    </m.button>

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
                  aria-label={
                    paused ? "Pornește animația" : "Oprește animația"
                  }
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
                Derulează pentru a descoperi
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
