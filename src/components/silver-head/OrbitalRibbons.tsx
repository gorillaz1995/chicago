"use client";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
  type RefObject,
} from "react";
import { gsap } from "./gsapClient";

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

type Point = { x: number; y: number };
type Tone = "cyan" | "violet";
const TONES = ["cyan", "violet"] as const;

/* ------------------------------------------------------------------ */
/* Geometry (SVG system units, before the responsive fit)              */
/* ------------------------------------------------------------------ */

const HEAD_X = 512;
const HEAD_Y = 520;
/** Half-width of the ring. After the fit it sits clearly outside the head. */
const RADIUS_X = 350;
/** Depth of the ellipse. Deeper than before, so the band reads as a ring. */
const RADIUS_Y = 62;
/** Band thickness. */
const BAND_WIDTH = 96;
/** Ring centre heights: crown band above the eyes, lower band at the jaw. */
const LANE: Record<Tone, number> = { cyan: -128, violet: 122 };

/**
 * Both rings rock in the same direction, the lower one lagging a little.
 * The tilt difference stays under ~13°, so at the ring ends the bands move
 * at most ~80 units relative to each other; the lanes are 250 apart and the
 * bands need ~110. They never touch, at any point of the loop.
 */
const ATOM = {
  seconds: 26,
  tilt: 11,
  wobble: 2.2,
  lag: 0.9,
  bob: 8,
  pitch: 0.045,
  xTravel: 14,
  mobileXTravel: 4,
} as const;

/** Viewbox-unit ellipse of the head, relative to HEAD_Y. Hides the rear arcs. */
const HEAD_SHAPE = { rx: 365, ry: 435, cy: -73 } as const;
const MOBILE_ANCHOR = -18;
const TARGET_SCALE = 1.28;

/** Horizontal room the animated system needs, in system units. */
const orbitSpan = (travel: number) =>
  2 * (Math.hypot(RADIUS_X, BAND_WIDTH / 2) - 10 + travel + 6);

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

const SEPARATOR = "  •  ";
const SERVICES: Record<Tone, readonly string[]> = {
  cyan: ["WEBSITE-URI & ECOMM", "GOOGLE ADS", "META ADS", "SEO"],
  violet: ["SOCIAL MEDIA", "GRAPHIC DESIGN", "LOGOS", "BRAND STRATEGY"],
};
const LOOP_TEXT: Record<Tone, string> = {
  cyan: SERVICES.cyan.join(SEPARATOR) + SEPARATOR,
  violet: SERVICES.violet.join(SEPARATOR) + SEPARATOR,
};
const COPIES = [-1, 0, 1, 2] as const;
/** Text layers per ribbon: neon halo underneath, crisp label on top. */
const LAYERS = 2;

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

/** Seconds for one full text loop. The rings counter-rotate. */
const TEXT_SECONDS: Record<Tone, number> = { cyan: 40, violet: 44 };
/** Light scan across the glass; it sweeps, then rests. */
const SWEEP_SECONDS = 7;
/** Energy pulses along the rails [top, bottom]. */
const PULSE_SECONDS: Record<Tone, readonly [number, number]> = {
  cyan: [3.4, 5.3],
  violet: [3.9, 5.9],
};
const PULSE_LENGTH = 70;
const PULSE_PERIOD = 1400; // rail pathLength is 1000, so pulses rest between runs
const TICK_PERIOD = 15;
/** Initial text cycle before the ruler is measured. */
const DEFAULT_CYCLE = 760;

const PALETTE: Record<
  Tone,
  { a: string; mid: string; b: string; core: string; sep: string; halo: string }
> = {
  cyan: {
    a: "#00f0ff",
    mid: "#c4fdff",
    b: "#3f7dff",
    core: "#eaffff",
    sep: "#4ff6ff",
    halo: "#00d9ff",
  },
  violet: {
    a: "#b55cff",
    mid: "#ffd3fb",
    b: "#ff3fc4",
    core: "#fff0ff",
    sep: "#ff7ae2",
    halo: "#c44dff",
  },
};

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const SAMPLES = 64;
const fract = (value: number) => value - Math.floor(value);
const smooth = (u: number) => u * u * (3 - 2 * u);
const line = (points: Point[]) =>
  points
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
    .join(" ");
const surface = (a: Point[], b: Point[]) =>
  `${line(a)} ${line([...b].reverse()).replace(/^M/, "L")} Z`;

/**
 * A standing sheet around an ellipse. Front and rear share the side seams,
 * so whole rings can tilt without opening a gap.
 */
function makeRing() {
  const build = (rear: boolean) => {
    const rows: Record<
      | "center"
      | "top"
      | "bottom"
      | "inkTop"
      | "inkBottom"
      | "sheen"
      | "trackTop"
      | "trackBottom",
      Point[]
    > = {
      center: [],
      top: [],
      bottom: [],
      inkTop: [],
      inkBottom: [],
      sheen: [],
      trackTop: [],
      trackBottom: [],
    };
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i / SAMPLES) * Math.PI;
      const depth = Math.sin(t);
      const x = -RADIUS_X * Math.cos(t);
      const y = RADIUS_Y * depth * (rear ? -1 : 1);
      const width = BAND_WIDTH * (0.86 + (rear ? -0.08 : 0.14) * depth);
      const at = (k: number) => ({ x, y: y + width * k });
      rows.center.push({ x, y });
      rows.top.push(at(-0.5));
      rows.bottom.push(at(0.5));
      rows.inkTop.push(at(-0.3));
      rows.inkBottom.push(at(0.3));
      rows.sheen.push(at(-0.14));
      rows.trackTop.push(at(-0.39));
      rows.trackBottom.push(at(0.39));
    }
    return {
      center: line(rows.center),
      top: line(rows.top),
      bottom: line(rows.bottom),
      trackTop: line(rows.trackTop),
      trackBottom: line(rows.trackBottom),
      surface: surface(rows.top, rows.bottom),
      ink: surface(rows.inkTop, rows.inkBottom),
      sheen: surface(rows.top, rows.sheen),
    };
  };
  return { front: build(false), rear: build(true) };
}

const RING = makeRing();

/** Every animated value at a given loop time. Pure, so SSR and the loop agree. */
function ribbonState(time: number, travel: number) {
  const turn = fract(time / ATOM.seconds) * TAU;
  const tiltAt = (t: number) =>
    ATOM.tilt * Math.sin(t) + ATOM.wobble * Math.sin(2 * t + 0.7);

  const lagged = turn - ATOM.lag;
  const drift = (tone: Tone, t: number, bobPhase: number) => {
    const x = travel * Math.sin(t + 1.2);
    const y = LANE[tone] + ATOM.bob * Math.sin(2 * t + bobPhase);
    const pitch = 1 + ATOM.pitch * Math.sin(t + 0.5);
    return `translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${tiltAt(t).toFixed(3)}) scale(1 ${pitch.toFixed(4)})`;
  };

  const sweep = (shift: number) =>
    -720 +
    smooth(Math.min(1, fract(time / SWEEP_SECONDS + shift) / 0.42)) * 1440;

  // Right-to-left: dash enters at the far end; left-to-right: the reverse.
  const pulse = (seconds: number, leftward: boolean, shift: number) => {
    const u = fract(time / seconds + shift);
    return leftward ? u * PULSE_PERIOD - 1000 : PULSE_LENGTH - u * PULSE_PERIOD;
  };

  const breathe = (shift: number) =>
    0.8 + 0.2 * (0.5 + 0.5 * Math.sin((time / 3.4) * TAU + shift));

  return {
    phase: {
      cyan: 0.07 - fract(time / TEXT_SECONDS.cyan),
      violet: -0.22 + fract(time / TEXT_SECONDS.violet),
    },
    drift: {
      cyan: drift("cyan", turn, 0),
      violet: drift("violet", lagged, 0.4),
    },
    light: {
      cyan: `translate(${sweep(0).toFixed(2)} 0) rotate(-16)`,
      violet: `translate(${sweep(0.5).toFixed(2)} 0) rotate(16)`,
    },
    // Cyan text runs leftward, violet rightward; top pulses follow the text.
    pulse: {
      cyan: [
        pulse(PULSE_SECONDS.cyan[0], true, 0),
        pulse(PULSE_SECONDS.cyan[1], false, 0.35),
      ],
      violet: [
        pulse(PULSE_SECONDS.violet[0], false, 0.6),
        pulse(PULSE_SECONDS.violet[1], true, 0.15),
      ],
    },
    glow: { cyan: breathe(0), violet: breathe(2.1) },
  };
}

const INITIAL = ribbonState(0, ATOM.xTravel);

const systemTransform = (scale: number, anchorY: number) =>
  `translate(${HEAD_X} ${anchorY}) scale(${scale})`;

const occlusionTransform = (scale: number, anchorOffset: number) =>
  `translate(0 ${((HEAD_SHAPE.cy - anchorOffset) / scale).toFixed(2)}) scale(${(
    HEAD_SHAPE.rx / scale
  ).toFixed(2)} ${(HEAD_SHAPE.ry / scale).toFixed(2)})`;

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

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
/* Dive timeline scales this layer; applyLayout keeps writing the outer wrap. */
.sh-orbits-contract{
  position:absolute;
  inset:0;
  transform-origin:50% 52%;
  will-change:transform;
}
.sh-orbits svg{
  display:block;
  width:100%;
  height:100%;
  overflow:visible;
}
.sh-orbits .sh-orbit-label,
.sh-orbits .sh-orbit-halo,
.sh-orbits .sh-orbit-ruler{
  font-family:var(--orbit-family,"Arial",Helvetica,sans-serif);
  font-size:var(--orbit-font);
  font-weight:700;
  letter-spacing:calc(var(--orbit-font) * .09);
  font-kerning:none;
  font-variant-ligatures:none;
  white-space:pre;
}
.sh-orbits .sh-orbit-label{
  fill:#f3fdff;
  stroke:rgba(2,6,16,.72);
  stroke-width:calc(var(--orbit-font) * .045);
  paint-order:stroke fill;
  stroke-linejoin:round;
}
.sh-orbits .sh-orbit-halo{
  fill:none;
  stroke-width:calc(var(--orbit-font) * .22);
  stroke-opacity:.34;
  stroke-linejoin:round;
}
.sh-orbits .sh-orbit-ruler{
  visibility:hidden;
}
.sh-orbits .sh-orbit-rail{
  fill:none;
  stroke-linecap:round;
  stroke-linejoin:round;
}
.sh-orbits-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(prefers-reduced-motion:reduce){
  .sh-orbits,.sh-orbits-contract{will-change:auto}
}
`;

/* ------------------------------------------------------------------ */
/* Node registry: the loop writes attributes directly, no React render */
/* ------------------------------------------------------------------ */

type Registry = {
  /** Slot = layer * COPIES.length + copy index. */
  text: Record<Tone, (SVGTextPathElement | null)[]>;
  drift: Record<Tone, SVGGElement[]>;
  light: Record<Tone, SVGGElement | null>;
  ticks: Record<Tone, SVGGElement | null>;
  glow: Record<Tone, SVGGElement | null>;
  pulse: Record<Tone, (SVGGElement | null)[]>;
};

/** Ref callback that adds a drift group once. Groups never unmount on their own. */
function driftRef(registry: RefObject<Registry>, tone: Tone) {
  let previous: SVGGElement | null = null;
  return (node: SVGGElement | null) => {
    const list = registry.current.drift[tone];
    if (previous) {
      const index = list.indexOf(previous);
      if (index !== -1) list.splice(index, 1);
    }
    if (node && !list.includes(node)) list.push(node);
    previous = node;
  };
}

type RibbonProps = {
  tone: Tone;
  id: string;
  registry: RefObject<Registry>;
};

/** Text along the band, with the separators lit in the ring's neon colour. */
function LoopLabel({ tone }: { tone: Tone }) {
  return (
    <>
      {SERVICES[tone].map((item) => (
        <Fragment key={item}>
          <tspan>{item}</tspan>
          <tspan fill={PALETTE[tone].sep} stroke="none">
            {SEPARATOR}
          </tspan>
        </Fragment>
      ))}
    </>
  );
}

function FrontRibbon({ tone, id, registry }: RibbonProps) {
  const front = RING.front;
  const colors = PALETTE[tone];
  return (
    <g
      className="sh-orbit-front"
      transform={INITIAL.drift[tone]}
      ref={driftRef(registry, tone)}
    >
      <g mask={`url(#${id}-surface-mask)`}>
        {/* Smoked glass body with neon-tinted ends. */}
        <path d={front.surface} fill={`url(#${id}-${tone}-body)`} />
        <path d={front.sheen} fill={`url(#${id}-reflection)`} />
        <g mask={`url(#${id}-text-mask)`}>
          <path d={front.ink} fill="#020812" fillOpacity=".5" />
        </g>

        {/* HUD tick tracks; they scroll with the text. */}
        <g
          ref={(node) => {
            registry.current.ticks[tone] = node;
          }}
          className="sh-orbit-rail"
          stroke={`url(#${id}-${tone}-rim)`}
          strokeWidth="5"
          strokeDasharray={`2 ${TICK_PERIOD - 2}`}
          strokeLinecap="butt"
          opacity=".34"
        >
          <path d={front.trackTop} />
          <path d={front.trackBottom} />
        </g>

        {/* Neon tubes: wide soft glow, then a bright core. */}
        <g
          ref={(node) => {
            registry.current.glow[tone] = node;
          }}
          className="sh-orbit-rail"
          opacity={INITIAL.glow[tone]}
        >
          <path
            d={front.top}
            stroke={`url(#${id}-${tone}-rim)`}
            strokeWidth="12"
            strokeOpacity=".12"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={front.top}
            stroke={`url(#${id}-${tone}-rim)`}
            strokeWidth="5"
            strokeOpacity=".38"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={front.bottom}
            stroke={`url(#${id}-${tone}-rim)`}
            strokeWidth="9"
            strokeOpacity=".1"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={front.bottom}
            stroke={`url(#${id}-${tone}-rim)`}
            strokeWidth="3.5"
            strokeOpacity=".3"
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <path
          className="sh-orbit-rail"
          d={front.top}
          stroke={`url(#${id}-${tone}-core)`}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="sh-orbit-rail"
          d={front.bottom}
          stroke={`url(#${id}-${tone}-core)`}
          strokeWidth="1.1"
          strokeOpacity=".8"
          vectorEffect="non-scaling-stroke"
        />

        {/* Energy pulses running along the rails. */}
        {([front.top, front.bottom] as const).map((d, index) => (
          <g
            key={index}
            ref={(node) => {
              registry.current.pulse[tone][index] = node;
            }}
            className="sh-orbit-rail"
            strokeDasharray={`${PULSE_LENGTH} ${PULSE_PERIOD - PULSE_LENGTH}`}
            strokeDashoffset={INITIAL.pulse[tone][index]}
          >
            <path
              d={d}
              pathLength={1000}
              stroke={colors.a}
              strokeWidth={index ? 9 : 13}
              strokeOpacity=".32"
            />
            <path
              d={d}
              pathLength={1000}
              stroke={colors.core}
              strokeWidth={index ? 2.4 : 3.4}
            />
          </g>
        ))}

        {/* Light scan, clipped inside the glass. */}
        <g clipPath={`url(#${id}-clip)`}>
          <g
            transform={INITIAL.light[tone]}
            ref={(node) => {
              registry.current.light[tone] = node;
            }}
          >
            <rect
              x="-70"
              y="-440"
              width="140"
              height="880"
              fill={`url(#${id}-light)`}
            />
          </g>
        </g>
      </g>

      <g className="sh-orbit-readout" mask={`url(#${id}-text-mask)`}>
        {Array.from({ length: LAYERS }, (_, layer) =>
          COPIES.map((copy, index) => (
            <text
              key={`${layer}-${copy}`}
              className={layer === 0 ? "sh-orbit-halo" : "sh-orbit-label"}
              stroke={layer === 0 ? colors.halo : undefined}
              dy=".35em"
              xmlSpace="preserve"
            >
              <textPath
                ref={(node) => {
                  registry.current.text[tone][layer * COPIES.length + index] =
                    node;
                }}
                href={`#${id}-path`}
                startOffset={(INITIAL.phase[tone] + copy) * DEFAULT_CYCLE}
              >
                {layer === 0 ? LOOP_TEXT[tone] : <LoopLabel tone={tone} />}
              </textPath>
            </text>
          )),
        )}
      </g>
    </g>
  );
}

/** The arc behind the head: dimmer glass and rails, faded where the head is. */
function RearRibbon({ tone, id, registry }: RibbonProps) {
  const rear = RING.rear;
  return (
    <g
      className="sh-orbit-rear"
      transform={INITIAL.drift[tone]}
      ref={driftRef(registry, tone)}
    >
      <path d={rear.surface} fill={`url(#${id}-${tone}-body)`} opacity=".55" />
      <path
        className="sh-orbit-rail"
        d={rear.top}
        stroke={`url(#${id}-${tone}-rim)`}
        strokeWidth="7"
        strokeOpacity=".1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="sh-orbit-rail"
        d={rear.top}
        stroke={`url(#${id}-${tone}-rim)`}
        strokeWidth="1.2"
        strokeOpacity=".6"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="sh-orbit-rail"
        d={rear.bottom}
        stroke={`url(#${id}-${tone}-rim)`}
        strokeWidth=".9"
        strokeOpacity=".35"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function OrbitalRibbons({
  wrapperRef,
  handleRef,
  reducedMotion,
  fps,
}: Props) {
  const id = `orb-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const systemRef = useRef<SVGGElement>(null);
  const occlusionRef = useRef<SVGRadialGradientElement>(null);
  const rulers = useRef<Record<Tone, SVGTextElement | null>>({
    cyan: null,
    violet: null,
  });
  const registry = useRef<Registry>({
    text: { cyan: [], violet: [] },
    drift: { cyan: [], violet: [] },
    light: { cyan: null, violet: null },
    ticks: { cyan: null, violet: null },
    glow: { cyan: null, violet: null },
    pulse: { cyan: [], violet: [] },
  });

  // Loop state lives in refs: the controller toggles it during scroll.
  const loop = useRef({
    time: 0,
    lastWrite: -Infinity,
    cycle: { cyan: DEFAULT_CYCLE, violet: DEFAULT_CYCLE },
    running: false,
    listening: false,
    fps,
    reduced: reducedMotion,
    travel: ATOM.xTravel as number,
    visible: true,
    tabVisible: true,
  });

  const write = useCallback(() => {
    const state = loop.current;
    const values = ribbonState(state.time, state.travel);
    const nodes = registry.current;
    for (const tone of TONES) {
      const cycle = state.cycle[tone];
      const offset = values.phase[tone] * cycle;
      nodes.text[tone].forEach((node, slot) => {
        node?.setAttribute(
          "startOffset",
          (offset + COPIES[slot % COPIES.length] * cycle).toFixed(2),
        );
      });
      for (const node of nodes.drift[tone]) {
        node.setAttribute("transform", values.drift[tone]);
      }
      nodes.light[tone]?.setAttribute("transform", values.light[tone]);
      nodes.ticks[tone]?.setAttribute(
        "stroke-dashoffset",
        (-offset % TICK_PERIOD).toFixed(2),
      );
      nodes.pulse[tone].forEach((node, index) => {
        node?.setAttribute(
          "stroke-dashoffset",
          values.pulse[tone][index].toFixed(1),
        );
      });
      nodes.glow[tone]?.setAttribute("opacity", values.glow[tone].toFixed(3));
    }
  }, []);

  const tick = useCallback(
    (_time: number, deltaTime: number) => {
      const state = loop.current;
      if (!state.listening) return;
      state.time += Math.min(Math.max(deltaTime / 1000, 0), 0.1);
      const interval = 1 / state.fps;
      const elapsed = state.time - state.lastWrite;
      if (elapsed < interval - 0.0001) return;
      state.lastWrite = Number.isFinite(elapsed)
        ? state.time - (elapsed % interval)
        : state.time;
      write();
    },
    [write],
  );

  const sync = useCallback(() => {
    const state = loop.current;
    const listen =
      state.running && !state.reduced && state.visible && state.tabVisible;
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
    loop.current.fps = Number.isFinite(fps)
      ? Math.max(12, Math.min(60, fps))
      : 30;
  }, [fps]);

  // Reduced motion holds the first frame; otherwise the loop resumes where it paused.
  useEffect(() => {
    const state = loop.current;
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

  // A standalone ribbon also stops when hidden; the hero controller remains authoritative.
  useEffect(() => {
    const node = svgRef.current;
    if (!node) return;
    const state = loop.current;
    const visibility = () => {
      state.tabVisible = document.visibilityState === "visible";
      sync();
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            state.visible = entry.isIntersecting;
            sync();
          })
        : null;
    observer?.observe(node);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [sync]);

  // Responsive fit: the ring is sized to clear the head, capped by the viewport.
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
      const margin = mobile ? 6 : 24;
      const sideRoom = Math.min(centerX, window.innerWidth - centerX) - margin;
      const available =
        sideRoom > 0 ? sideRoom * 2 : window.innerWidth - margin * 2;
      const state = loop.current;
      state.travel = mobile ? ATOM.mobileXTravel : ATOM.xTravel;
      const viewportFit = available / (orbitSpan(state.travel) * pixelsPerUnit);
      const fitted = Math.max(0.001, Math.min(TARGET_SCALE, viewportFit));
      const anchorOffset = mobile ? MOBILE_ANCHOR : 0;
      systemRef.current?.setAttribute(
        "transform",
        systemTransform(fitted, HEAD_Y + anchorOffset),
      );
      occlusionRef.current?.setAttribute(
        "gradientTransform",
        occlusionTransform(fitted, anchorOffset),
      );
      const effective = pixelsPerUnit * fitted;
      const targetText = mobile
        ? Math.max(15.5, Math.min(18.5, (window.innerWidth / 390) * 17.5))
        : Math.max(22, Math.min(30, (window.innerWidth / 1635) * 28));
      const fontPixels = Math.min(targetText, BAND_WIDTH * effective * 0.5);
      svg.style.setProperty(
        "--orbit-font",
        `${(fontPixels / effective).toFixed(3)}px`,
      );
      for (const tone of TONES) {
        const length = rulers.current[tone]?.getComputedTextLength();
        if (length && Number.isFinite(length)) state.cycle[tone] = length;
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
    if (svgRef.current) observer?.observe(svgRef.current);
    window.addEventListener("resize", schedule, { passive: true });
    document.fonts?.addEventListener("loadingdone", schedule);
    void document.fonts?.ready.then(schedule);
    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      document.fonts?.removeEventListener("loadingdone", schedule);
    };
  }, [write]);

  return (
    <div ref={wrapperRef} className="sh-orbits">
      <span className="sh-orbits-sr">
        Website-uri &amp; Ecomm, Google Ads, Meta Ads, SEO, Social Media,
        Graphic Design, Logos, Brand Strategy.
      </span>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* Contraction target for the dive timeline. */}
      <div className="sh-orbits-contract" data-ribbon-contract>
        <svg
          ref={svgRef}
          viewBox="0 0 1024 1024"
          aria-hidden="true"
          role="presentation"
          focusable="false"
        >
          <defs>
            <path id={`${id}-path`} d={RING.front.center} />
            <clipPath id={`${id}-clip`} clipPathUnits="userSpaceOnUse">
              <path d={RING.front.surface} />
            </clipPath>

            {TONES.map((tone) => {
              const c = PALETTE[tone];
              return (
                <Fragment key={tone}>
                  <linearGradient
                    id={`${id}-${tone}-body`}
                    gradientUnits="userSpaceOnUse"
                    x1="-340"
                    x2="340"
                  >
                    <stop offset="0" stopColor={c.a} stopOpacity=".34" />
                    <stop offset=".22" stopColor="#06111f" stopOpacity=".6" />
                    <stop offset=".5" stopColor="#040b16" stopOpacity=".66" />
                    <stop offset=".78" stopColor="#06111f" stopOpacity=".6" />
                    <stop offset="1" stopColor={c.b} stopOpacity=".34" />
                  </linearGradient>
                  <linearGradient
                    id={`${id}-${tone}-rim`}
                    gradientUnits="userSpaceOnUse"
                    x1="-340"
                    x2="340"
                  >
                    <stop offset="0" stopColor={c.a} />
                    <stop offset=".5" stopColor={c.mid} />
                    <stop offset="1" stopColor={c.b} />
                  </linearGradient>
                  <linearGradient
                    id={`${id}-${tone}-core`}
                    gradientUnits="userSpaceOnUse"
                    x1="-340"
                    x2="340"
                  >
                    <stop offset="0" stopColor={c.a} />
                    <stop offset=".3" stopColor={c.core} />
                    <stop offset=".7" stopColor={c.core} />
                    <stop offset="1" stopColor={c.b} />
                  </linearGradient>
                </Fragment>
              );
            })}

            <linearGradient
              id={`${id}-reflection`}
              gradientUnits="userSpaceOnUse"
              x1="-310"
              x2="310"
            >
              <stop offset="0" stopColor="#dfffff" stopOpacity=".03" />
              <stop offset=".45" stopColor="white" stopOpacity=".1" />
              <stop offset="1" stopColor="#f2dcff" stopOpacity=".03" />
            </linearGradient>
            <linearGradient id={`${id}-light`}>
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset=".42" stopColor="#dfffff" stopOpacity=".04" />
              <stop offset=".58" stopColor="white" stopOpacity=".3" />
              <stop offset=".66" stopColor="white" stopOpacity=".06" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id={`${id}-surface-fade`}
              gradientUnits="userSpaceOnUse"
              x1="-360"
              x2="360"
            >
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset=".06" stopColor="white" stopOpacity=".45" />
              <stop offset=".17" stopColor="white" />
              <stop offset=".83" stopColor="white" />
              <stop offset=".94" stopColor="white" stopOpacity=".45" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id={`${id}-text-fade`}
              gradientUnits="userSpaceOnUse"
              x1="-355"
              x2="355"
            >
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset=".12" stopColor="white" />
              <stop offset=".88" stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            {/* Dark inside the head: the rear arcs only show past its silhouette. */}
            <radialGradient
              ref={occlusionRef}
              id={`${id}-occlusion`}
              gradientUnits="userSpaceOnUse"
              cx="0"
              cy="0"
              r="1"
              gradientTransform={occlusionTransform(TARGET_SCALE, 0)}
            >
              <stop offset="0" stopColor="#1c1c1c" />
              <stop offset=".84" stopColor="#1c1c1c" />
              <stop offset="1" stopColor="white" />
            </radialGradient>
            <mask
              id={`${id}-surface-mask`}
              maskUnits="userSpaceOnUse"
              x="-400"
              y="-300"
              width="800"
              height="600"
              style={{ maskType: "luminance" }}
            >
              <rect
                x="-400"
                y="-300"
                width="800"
                height="600"
                fill={`url(#${id}-surface-fade)`}
              />
            </mask>
            <mask
              id={`${id}-text-mask`}
              maskUnits="userSpaceOnUse"
              x="-380"
              y="-300"
              width="760"
              height="600"
              style={{ maskType: "luminance" }}
            >
              <rect
                x="-380"
                y="-300"
                width="760"
                height="600"
                fill={`url(#${id}-text-fade)`}
              />
            </mask>
            <mask
              id={`${id}-rear-mask`}
              maskUnits="userSpaceOnUse"
              x="-600"
              y="-560"
              width="1200"
              height="1120"
              style={{ maskType: "luminance" }}
            >
              <rect
                x="-600"
                y="-560"
                width="1200"
                height="1120"
                fill={`url(#${id}-occlusion)`}
              />
            </mask>
          </defs>

          <g
            ref={systemRef}
            className="sh-orbit-system"
            transform={systemTransform(TARGET_SCALE, HEAD_Y)}
          >
            {/* Rear arcs first, hidden where they pass behind the head. */}
            <g mask={`url(#${id}-rear-mask)`}>
              <RearRibbon tone="cyan" id={id} registry={registry} />
              <RearRibbon tone="violet" id={id} registry={registry} />
            </g>
            <FrontRibbon tone="violet" id={id} registry={registry} />
            <FrontRibbon tone="cyan" id={id} registry={registry} />
          </g>

          {TONES.map((tone) => (
            <text
              key={tone}
              ref={(node) => {
                rulers.current[tone] = node;
              }}
              className="sh-orbit-ruler"
              xmlSpace="preserve"
            >
              {LOOP_TEXT[tone]}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
