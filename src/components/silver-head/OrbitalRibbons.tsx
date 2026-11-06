"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
  type RefObject,
} from "react";
import { EASES, gsap } from "./gsapClient";

/** Start or stop the idle loop. The dive controller calls it; no React render. */
export type RibbonsHandle = {
  setRunning: (running: boolean) => void;
};

type Props = {
  /** Wrapper element. The dive timeline fades it and moves it with the head. */
  wrapperRef?: Ref<HTMLDivElement>;
  handleRef?: Ref<RibbonsHandle>;
  reducedMotion: boolean;
  /** Attribute writes per second while the loop runs. */
  fps: number;
};

type Point = {
  x: number;
  y: number;
};

const HEAD_X = 512;
const HEAD_Y = 520;
const HEAD_WIDTH = 494;

const RADIUS_X = 304;
const RADIUS_Y = 44;
const BAND_WIDTH = 54;
const ORBIT_SPAN = 632;

const SERVICES = "WEBSITES  •  GOOGLE ADS  •  E-COMMERCE  •  ";

const COPIES = [-1, 0, 1, 2] as const;
const SAMPLES = 96;

/** Loop lengths in seconds, as before. */
const CYAN_SECONDS = 32;
const VIOLET_SECONDS = 38;
const DRIFT_SECONDS = 22;
const REFLECTION_SECONDS = 12.5;

/** Drift keyframes, eased per segment like the old Motion keyframes. */
const DRIFT_KEYS = [0, 1, 0, -1, 0] as const;

/** Initial text cycle before the ruler is measured. */
const DEFAULT_CYCLE = 620;

const fract = (value: number) => value - Math.floor(value);

const line = (points: Point[]) =>
  points
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
    .join(" ");

const surface = (a: Point[], b: Point[]) =>
  `${line(a)} ${line([...b].reverse()).replace(/^M/, "L")} Z`;

/**
 * A standing sheet around an ellipse.
 * Front and rear share the same side seams.
 */
function makeOrbit(degrees: number, centerY: number) {
  const angle = (degrees * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  const build = (rear: boolean) => {
    const center: Point[] = [];
    const top: Point[] = [];
    const bottom: Point[] = [];

    const innerTop: Point[] = [];
    const innerBottom: Point[] = [];
    const sheenBottom: Point[] = [];

    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i / SAMPLES) * Math.PI;
      const depth = Math.sin(t);

      const px = -RADIUS_X * Math.cos(t);
      const py = RADIUS_Y * depth * (rear ? -1 : 1);

      const p = {
        x: px * c - py * s,
        y: px * s + py * c + centerY,
      };

      const width = BAND_WIDTH * (0.86 + (rear ? -0.08 : 0.14) * depth);

      const offset = (amount: number) => ({
        x: p.x - s * amount,
        y: p.y + c * amount,
      });

      center.push(p);
      top.push(offset(-width / 2));
      bottom.push(offset(width / 2));

      innerTop.push(offset(-width * 0.32));
      innerBottom.push(offset(width * 0.32));
      sheenBottom.push(offset(-width * 0.1));
    }

    return {
      center: line(center),
      top: line(top),
      bottom: line(bottom),
      surface: surface(top, bottom),
      ink: surface(innerTop, innerBottom),
      sheen: surface(top, sheenBottom),
    };
  };

  return {
    front: build(false),
    rear: build(true),
  };
}

const CYAN = makeOrbit(17, -110);
const VIOLET = makeOrbit(-17, 20);

type Orbit = typeof CYAN;
type Tone = "cyan" | "violet";

/** Every animated value at a given loop time. Pure, so SSR and the loop agree. */
function ribbonState(time: number, driftEase: (t: number) => number) {
  const segment = DRIFT_SECONDS / (DRIFT_KEYS.length - 1);
  const local = time % DRIFT_SECONDS;
  const index = Math.min(DRIFT_KEYS.length - 2, Math.floor(local / segment));
  const u = (local - index * segment) / segment;
  const drift =
    DRIFT_KEYS[index] + (DRIFT_KEYS[index + 1] - DRIFT_KEYS[index]) * driftEase(u);
  const reflection = fract(time / REFLECTION_SECONDS);

  return {
    phase: {
      cyan: 0.07 - fract(time / CYAN_SECONDS),
      violet: -0.22 + fract(time / VIOLET_SECONDS),
    },
    drift: {
      cyan: `translate(0 ${(drift * 0.45).toFixed(3)}) rotate(${(drift * 0.55).toFixed(3)})`,
      violet: `translate(0 ${(-drift * 0.55).toFixed(3)}) rotate(${(-drift * 0.7).toFixed(3)})`,
    },
    light: {
      cyan: `translate(${(-650 + reflection * 1300).toFixed(3)} 0) rotate(-18)`,
      violet: `translate(${(-650 + ((reflection + 0.45) % 1) * 1300).toFixed(3)} 0) rotate(18)`,
    },
  };
}

const INITIAL = ribbonState(0, (t) => t);

const systemTransform = (scale: number, anchorY: number) =>
  `translate(${HEAD_X} ${anchorY}) scale(${scale})`;

const CSS = `
.sh-orbits{
  position:absolute;
  inset:0;
  z-index:2;
  pointer-events:none;
  transform-origin:50% 50%;
  will-change:transform,opacity;
  --orbit-font:30px;
}

.sh-orbits>svg{
  display:block;
  width:100%;
  height:100%;
  overflow:visible;
}

.sh-orbits .sh-orbit-label,
.sh-orbits .sh-orbit-ruler{
  font-family:Arial,Helvetica,sans-serif;
  font-size:var(--orbit-font);
  font-weight:600;
  letter-spacing:.65px;
  font-kerning:none;
  font-variant-ligatures:none;
  white-space:pre;
}

.sh-orbits .sh-orbit-label{
  fill:#f5fcff;
  stroke:rgba(3,12,22,.66);
  stroke-width:.65px;
  paint-order:stroke fill;
  stroke-linejoin:round;
}

.sh-orbits .sh-orbit-ruler{
  visibility:hidden;
}

.sh-orbits .sh-orbit-edge{
  fill:none;
  stroke-linecap:round;
  stroke-linejoin:round;
}

@media(prefers-reduced-motion:reduce){
  .sh-orbits{
    will-change:auto;
  }
}
`;

/** Collects the nodes the loop writes to. */
type Registry = {
  text: Record<Tone, (SVGTextPathElement | null)[]>;
  drift: Record<Tone, SVGGElement[]>;
  light: Record<Tone, SVGGElement | null>;
};

/** Ref callback that adds a drift group once. Groups never unmount on their own. */
function driftRef(registry: RefObject<Registry>, tone: Tone) {
  return (node: SVGGElement | null) => {
    const list = registry.current.drift[tone];
    if (node && !list.includes(node)) list.push(node);
  };
}

function lightRef(registry: RefObject<Registry>, tone: Tone) {
  return (node: SVGGElement | null) => {
    registry.current.light[tone] = node;
  };
}

function textRef(registry: RefObject<Registry>, tone: Tone, index: number) {
  return (node: SVGTextPathElement | null) => {
    registry.current.text[tone][index] = node;
  };
}

function GlassRibbon({
  orbit,
  tone,
  id,
  registry,
}: {
  orbit: Orbit;
  tone: Tone;
  id: string;
  registry: RefObject<Registry>;
}) {
  const front = orbit.front;

  return (
    <g
      className="sh-orbit-front"
      transform={INITIAL.drift[tone]}
      ref={driftRef(registry, tone)}
    >
      <g mask={`url(#${id}-surface-mask)`}>
        <path
          className="sh-orbit-glass"
          d={front.surface}
          fill={`url(#${id}-${tone}-film)`}
        />

        <path d={front.sheen} fill={`url(#${id}-reflection)`} />

        {/* Local contrast behind labels; outer glass stays clear. */}
        <g mask={`url(#${id}-text-mask)`}>
          <path d={front.ink} fill="#07131f" fillOpacity=".32" />
        </g>

        <path
          className="sh-orbit-edge"
          d={front.top}
          stroke={`url(#${id}-${tone}-edge)`}
          strokeWidth="3.2"
          opacity=".95"
        />

        <path
          className="sh-orbit-edge"
          d={front.top}
          stroke={`url(#${id}-${tone}-edge)`}
          strokeWidth="1.1"
          opacity=".96"
        />

        <path
          className="sh-orbit-edge"
          d={front.bottom}
          stroke={`url(#${id}-${tone}-edge)`}
          strokeWidth=".75"
          opacity=".55"
        />

        {/* Broad reflection, clipped inside the glass. */}
        <g clipPath={`url(#${id}-${tone}-clip)`}>
          <g
            className="sh-orbit-reflection"
            transform={INITIAL.light[tone]}
            ref={lightRef(registry, tone)}
          >
            <rect
              x="-80"
              y="-440"
              width="160"
              height="880"
              fill={`url(#${id}-light)`}
            />
          </g>
        </g>
      </g>

      <g className="sh-orbit-readout" mask={`url(#${id}-text-mask)`}>
        {COPIES.map((copy, index) => (
          <text
            key={copy}
            className="sh-orbit-label"
            dy=".34em"
            xmlSpace="preserve"
          >
            <textPath
              ref={textRef(registry, tone, index)}
              href={`#${id}-${tone}-path`}
              startOffset={(INITIAL.phase[tone] + copy) * DEFAULT_CYCLE}
            >
              {SERVICES}
            </textPath>
          </text>
        ))}
      </g>
    </g>
  );
}

function RearRibbon({
  orbit,
  tone,
  id,
  registry,
}: {
  orbit: Orbit;
  tone: Tone;
  id: string;
  registry: RefObject<Registry>;
}) {
  return (
    <g
      className="sh-orbit-rear"
      transform={INITIAL.drift[tone]}
      ref={driftRef(registry, tone)}
    >
      <path
        d={orbit.rear.surface}
        fill={`url(#${id}-${tone}-film)`}
        opacity=".62"
      />

      <path
        d={orbit.rear.sheen}
        fill={`url(#${id}-reflection)`}
        opacity=".32"
      />
    </g>
  );
}

export default function OrbitalRibbons({
  wrapperRef,
  handleRef,
  reducedMotion,
  fps,
}: Props) {
  const id = `orb-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const svgRef = useRef<SVGSVGElement>(null);
  const rulerRef = useRef<SVGTextElement>(null);
  const systemRef = useRef<SVGGElement>(null);

  const registry = useRef<Registry>({
    text: { cyan: [], violet: [] },
    drift: { cyan: [], violet: [] },
    light: { cyan: null, violet: null },
  });

  // Loop state lives in refs: the controller toggles it during scroll.
  const loop = useRef({
    time: 0,
    lastWrite: -Infinity,
    cycle: DEFAULT_CYCLE,
    running: false,
    listening: false,
    fps,
    reduced: reducedMotion,
    ease: (t: number) => t,
  });

  const write = useCallback(() => {
    const state = loop.current;
    const values = ribbonState(state.time, state.ease);
    const nodes = registry.current;

    (["cyan", "violet"] as const).forEach((tone) => {
      nodes.text[tone].forEach((node, index) => {
        node?.setAttribute(
          "startOffset",
          ((values.phase[tone] + COPIES[index]) * state.cycle).toFixed(2),
        );
      });

      nodes.drift[tone].forEach((node) => {
        node.setAttribute("transform", values.drift[tone]);
      });

      nodes.light[tone]?.setAttribute("transform", values.light[tone]);
    });
  }, []);

  const tick = useCallback(
    (_time: number, deltaTime: number) => {
      const state = loop.current;

      state.time += Math.min(deltaTime / 1000, 0.1);

      if (state.time - state.lastWrite < 1 / state.fps - 0.004) return;

      state.lastWrite = state.time;
      write();
    },
    [write],
  );

  const sync = useCallback(() => {
    const state = loop.current;
    const listen = state.running && !state.reduced;

    if (listen === state.listening) return;

    state.listening = listen;

    if (listen) gsap.ticker.add(tick);
    else gsap.ticker.remove(tick);
  }, [tick]);

  useImperativeHandle(
    handleRef,
    () => ({
      setRunning: (running: boolean) => {
        loop.current.running = running;
        sync();
      },
    }),
    [sync],
  );

  useEffect(() => {
    loop.current.fps = fps;
  }, [fps]);

  // Reduced motion holds the first frame; otherwise the loop resumes where it paused.
  useEffect(() => {
    const state = loop.current;

    state.ease = gsap.parseEase(EASES.cssInOut) ?? ((t: number) => t);
    state.reduced = reducedMotion;

    if (reducedMotion) {
      state.time = 0;
      state.lastWrite = -Infinity;
      write();
    }

    sync();
  }, [reducedMotion, sync, write]);

  useEffect(() => {
    const state = loop.current;

    return () => {
      gsap.ticker.remove(tick);
      state.listening = false;
    };
  }, [tick]);

  useLayoutEffect(() => {
    let disposed = false;
    let frame: number | null = null;

    const read = () => {
      frame = null;
      if (disposed) return;

      const svg = svgRef.current;
      if (!svg) return;

      const pixelsPerUnit = Math.min(svg.clientWidth, svg.clientHeight) / 1024;

      if (pixelsPerUnit <= 0) return;

      const mobile = window.innerWidth <= 760;
      const box = svg.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      const margin = mobile ? 12 : 24;

      const sideRoom = Math.min(centerX, window.innerWidth - centerX) - margin;

      const available =
        sideRoom > 0 ? sideRoom * 2 : window.innerWidth - margin * 2;

      const viewportFit = available / (ORBIT_SPAN * pixelsPerUnit);

      let targetScale = 1.08;

      if (mobile) {
        const headPixels = HEAD_WIDTH * pixelsPerUnit;

        targetScale =
          (Math.min(headPixels * 0.82, window.innerWidth * 0.88) / headPixels) *
          1.12;
      }

      const fitted = Math.max(0.001, Math.min(targetScale, viewportFit));

      systemRef.current?.setAttribute(
        "transform",
        systemTransform(fitted, HEAD_Y + (mobile ? -18 : 0)),
      );

      const effective = pixelsPerUnit * fitted;

      const targetText = mobile
        ? Math.max(14, Math.min(16, (window.innerWidth / 390) * 15.5))
        : Math.max(22, Math.min(27, (window.innerWidth / 1635) * 26));

      const fontPixels = Math.min(targetText, BAND_WIDTH * effective * 0.58);

      svg.style.setProperty(
        "--orbit-font",
        `${(fontPixels / effective).toFixed(3)}px`,
      );

      const length = rulerRef.current?.getComputedTextLength();

      if (length && Number.isFinite(length)) {
        loop.current.cycle = length;
      }

      write();
    };

    const schedule = () => {
      if (!disposed && frame === null) {
        frame = requestAnimationFrame(read);
      }
    };

    read();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;

    if (svgRef.current) {
      observer?.observe(svgRef.current);
    }

    window.addEventListener("resize", schedule, {
      passive: true,
    });

    document.fonts?.addEventListener("loadingdone", schedule);

    void document.fonts?.ready.then(schedule);

    return () => {
      disposed = true;

      if (frame !== null) {
        cancelAnimationFrame(frame);
      }

      observer?.disconnect();

      window.removeEventListener("resize", schedule);

      document.fonts?.removeEventListener("loadingdone", schedule);
    };
  }, [write]);

  return (
    <div
      ref={wrapperRef}
      className="sh-orbits"
      data-sh-chrome
      aria-hidden="true"
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <svg
        ref={svgRef}
        viewBox="0 0 1024 1024"
        role="presentation"
        focusable="false"
      >
        <defs>
          {(
            [
              { orbit: CYAN, tone: "cyan" },
              { orbit: VIOLET, tone: "violet" },
            ] as const
          ).map(({ orbit, tone }) => (
            <g key={tone}>
              <path id={`${id}-${tone}-path`} d={orbit.front.center} />

              <clipPath
                id={`${id}-${tone}-clip`}
                clipPathUnits="userSpaceOnUse"
              >
                <path d={orbit.front.surface} />
              </clipPath>
            </g>
          ))}

          <linearGradient
            id={`${id}-cyan-film`}
            gradientUnits="userSpaceOnUse"
            x1="-310"
            x2="310"
          >
            <stop offset="0" stopColor="#54f4e2" stopOpacity=".15" />
            <stop offset=".45" stopColor="#d8f8ff" stopOpacity=".055" />
            <stop offset="1" stopColor="#ae9bff" stopOpacity=".15" />
          </linearGradient>

          <linearGradient
            id={`${id}-violet-film`}
            gradientUnits="userSpaceOnUse"
            x1="-310"
            x2="310"
          >
            <stop offset="0" stopColor="#b496ff" stopOpacity=".15" />
            <stop offset=".5" stopColor="#ebdfff" stopOpacity=".055" />
            <stop offset="1" stopColor="#6eeeff" stopOpacity=".15" />
          </linearGradient>

          <linearGradient
            id={`${id}-cyan-edge`}
            gradientUnits="userSpaceOnUse"
            x1="-310"
            x2="310"
          >
            <stop offset="0" stopColor="#5ff4df" />
            <stop offset=".48" stopColor="#c7f7ff" />
            <stop offset="1" stopColor="#ac9bff" />
          </linearGradient>

          <linearGradient
            id={`${id}-violet-edge`}
            gradientUnits="userSpaceOnUse"
            x1="-310"
            x2="310"
          >
            <stop offset="0" stopColor="#bc9cff" />
            <stop offset=".5" stopColor="#e6d7ff" />
            <stop offset="1" stopColor="#82e9ff" />
          </linearGradient>

          <linearGradient
            id={`${id}-reflection`}
            gradientUnits="userSpaceOnUse"
            x1="-310"
            x2="310"
          >
            <stop offset="0" stopColor="#dfffff" stopOpacity=".02" />
            <stop offset=".45" stopColor="white" stopOpacity=".11" />
            <stop offset="1" stopColor="#e5dcff" stopOpacity=".025" />
          </linearGradient>

          <linearGradient id={`${id}-light`}>
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset=".45" stopColor="#efffff" stopOpacity=".015" />
            <stop offset=".6" stopColor="white" stopOpacity=".16" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id={`${id}-surface-fade`}
            gradientUnits="userSpaceOnUse"
            x1="-315"
            x2="315"
          >
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset=".07" stopColor="white" stopOpacity=".4" />
            <stop offset=".2" stopColor="white" />
            <stop offset=".8" stopColor="white" />
            <stop offset=".93" stopColor="white" stopOpacity=".4" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id={`${id}-text-fade`}
            gradientUnits="userSpaceOnUse"
            x1="-310"
            x2="96"
          >
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset=".1" stopColor="white" />
            <stop offset=".85" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <radialGradient
            id={`${id}-occlusion`}
            gradientUnits="userSpaceOnUse"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="scale(252 354)"
          >
            <stop offset="0" stopColor="black" />
            <stop offset=".86" stopColor="black" />
            <stop offset="1" stopColor="white" />
          </radialGradient>

          <mask
            id={`${id}-surface-mask`}
            maskUnits="userSpaceOnUse"
            x="-360"
            y="-280"
            width="720"
            height="560"
            style={{ maskType: "luminance" }}
          >
            <rect
              x="-360"
              y="-280"
              width="720"
              height="560"
              fill={`url(#${id}-surface-fade)`}
            />
          </mask>

          <mask
            id={`${id}-text-mask`}
            maskUnits="userSpaceOnUse"
            x="-310"
            y="-280"
            width="406"
            height="560"
            style={{ maskType: "luminance" }}
          >
            <rect
              x="-310"
              y="-280"
              width="406"
              height="560"
              fill={`url(#${id}-text-fade)`}
            />
          </mask>

          <mask
            id={`${id}-rear-mask`}
            maskUnits="userSpaceOnUse"
            x="-360"
            y="-400"
            width="720"
            height="800"
            style={{ maskType: "luminance" }}
          >
            <rect
              x="-360"
              y="-400"
              width="720"
              height="800"
              fill={`url(#${id}-occlusion)`}
            />
          </mask>
        </defs>

        <g
          ref={systemRef}
          className="sh-orbit-system"
          transform={systemTransform(1, HEAD_Y)}
        >
          {/* Filled rear surfaces, softly hidden behind the head. */}
          <g mask={`url(#${id}-rear-mask)`}>
            <RearRibbon orbit={CYAN} tone="cyan" id={id} registry={registry} />
            <RearRibbon
              orbit={VIOLET}
              tone="violet"
              id={id}
              registry={registry}
            />
          </g>

          <GlassRibbon
            orbit={VIOLET}
            tone="violet"
            id={id}
            registry={registry}
          />

          <GlassRibbon orbit={CYAN} tone="cyan" id={id} registry={registry} />
        </g>

        <text ref={rulerRef} className="sh-orbit-ruler" xmlSpace="preserve">
          {SERVICES}
        </text>
      </svg>
    </div>
  );
}
