"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { Draggable, EASES, gsap } from "./gsapClient";
import { LAMP_HEADING_ID } from "./lampSection";
import { registerLampSystem } from "./handoff";

/** Four connected roles revealed under the lamp. */
const ROLES = [
  {
    id: "directie",
    label: "Direcție.",
    body: "Înțelegem afacerea înainte să construim.",
  },
  {
    id: "atentie",
    label: "Atenție.",
    body: "Conținut și campanii, ca mesajul să ajungă la cine trebuie.",
  },
  {
    id: "actiune",
    label: "Acțiune.",
    body: "Un site sau o pagină unde vizitatorul poate face pasul următor.",
  },
  {
    id: "continuitate",
    label: "Continuitate.",
    body: "Răspuns după primul contact și o privire limpede asupra a ce merită continuat.",
  },
] as const;

type Props = {
  /**
   * True once the mouth-exit blend has fully revealed the plate.
   * Used only to settle the timeline open after a remount at the lamp.
   */
  play?: boolean;
};

const CSS = `
.lamp-system{
  --ls-ink:#E8EBF0;
  --ls-muted:#A8B1BC;
  --ls-faint:rgba(168,177,188,.72);
  --ls-line:rgba(232,235,240,.14);
  --ls-cyan:#77E1DD;
  --ls-plate:#080B0D;
  position:relative;
  z-index:2;
  display:flex;
  flex-direction:column;
  align-items:center;
  width:min(100%,920px);
  margin-inline:auto;
  padding:0 20px;
  color:var(--ls-ink);
  font-family:var(--font-geist),ui-sans-serif,system-ui,sans-serif;
  text-align:center;
  pointer-events:auto;
}

.lamp-system-copy{
  width:min(100%,38rem);
}

.lamp-system-title{
  margin:0;
  color:var(--ls-ink);
  font-size:clamp(1.75rem,4.2vw,2.75rem);
  font-weight:600;
  line-height:1.12;
  letter-spacing:-.03em;
  text-wrap:balance;
}

.lamp-system-lead{
  max-width:36ch;
  margin:14px auto 0;
  color:var(--ls-muted);
  font-size:16px;
  line-height:1.65;
  text-wrap:pretty;
}

.lamp-system-roles{
  position:relative;
  width:100%;
  margin-top:clamp(28px,5vh,48px);
}

.lamp-system-track{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:14px;
  width:100%;
}

.lamp-system-role{
  appearance:none;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:8px;
  min-height:100%;
  margin:0;
  padding:16px 14px;
  border:1px solid var(--ls-line);
  border-radius:16px;
  background:rgba(232,235,240,.03);
  color:inherit;
  font:inherit;
  text-align:left;
  cursor:pointer;
  transition:border-color .22s,background .22s,box-shadow .22s;
}

.lamp-system-role:hover,
.lamp-system-role[aria-current="true"]{
  border-color:rgba(119,225,221,.45);
  background:rgba(119,225,221,.05);
  box-shadow:0 0 0 1px rgba(119,225,221,.08);
}

.lamp-system-role:focus-visible{
  outline:2px solid var(--ls-cyan);
  outline-offset:3px;
}

.lamp-system-role-label{
  color:var(--ls-ink);
  font-size:15px;
  font-weight:600;
  letter-spacing:.01em;
}

.lamp-system-role-body{
  margin:0;
  color:var(--ls-muted);
  font-size:15px;
  line-height:1.55;
}

.lamp-system-path{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  overflow:visible;
  pointer-events:none;
}

.lamp-system-path path{
  fill:none;
  stroke:rgba(119,225,221,.35);
  stroke-width:1;
  stroke-linecap:round;
}

.lamp-system-signal{
  position:absolute;
  top:0;
  left:0;
  width:6px;
  height:6px;
  margin:-3px 0 0 -3px;
  border-radius:50%;
  background:var(--ls-cyan);
  box-shadow:0 0 10px rgba(119,225,221,.55);
  opacity:0;
  pointer-events:none;
  will-change:transform,opacity;
}

.lamp-system-closing{
  max-width:34ch;
  margin:22px auto 0;
  color:var(--ls-faint);
  font-size:14px;
  line-height:1.55;
}

.lamp-system-cta{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:48px;
  margin-top:22px;
  padding:0 22px;
  border:1px solid rgba(232,235,240,.55);
  border-radius:999px;
  background:rgba(232,235,240,.92);
  color:#101318;
  font-size:13px;
  font-weight:500;
  letter-spacing:.01em;
  text-decoration:none;
  transition:background .2s,border-color .2s;
}

.lamp-system-cta:hover{
  background:#fff;
  border-color:var(--ls-cyan);
}

.lamp-system-cta:focus-visible{
  outline:2px solid var(--ls-cyan);
  outline-offset:4px;
}

.lamp-system-nav{
  display:none;
  align-items:center;
  justify-content:center;
  gap:10px;
  margin-top:18px;
}

.lamp-system-nav button{
  appearance:none;
  min-width:44px;
  min-height:44px;
  border:1px solid var(--ls-line);
  border-radius:999px;
  background:transparent;
  color:var(--ls-muted);
  font:inherit;
  font-size:13px;
  cursor:pointer;
}

.lamp-system-nav button:focus-visible,
.lamp-system-nav button[aria-current="true"]{
  border-color:rgba(119,225,221,.55);
  color:var(--ls-ink);
}

@media(max-width:760px){
  .lamp-system{
    padding:0 18px;
    align-items:stretch;
  }

  .lamp-system-title{
    font-size:clamp(1.55rem,7vw,1.9rem);
  }

  .lamp-system-lead{
    font-size:16px;
    margin-top:12px;
  }

  .lamp-system-roles{
    margin-top:26px;
    overflow:hidden;
  }

  .lamp-system-track{
    display:flex;
    width:400%;
    gap:0;
    will-change:transform;
  }

  .lamp-system-role{
    flex:0 0 25%;
    width:25%;
    min-height:9.5rem;
    padding:18px 16px;
    border-radius:18px;
    pointer-events:none;
  }

  .lamp-system-role[aria-current="true"]{
    pointer-events:auto;
  }

  .lamp-system-path{
    display:none;
  }

  .lamp-system-nav{
    display:flex;
  }

  .lamp-system-closing{
    margin-top:18px;
  }
}

@media(prefers-reduced-motion:reduce){
  .lamp-system-signal{
    display:none;
  }

  .lamp-system-track{
    will-change:auto;
  }
}
`;

/**
 * Builds a shallow arc through the four role centers on desktop, or a short
 * vertical stem beside the active role on portrait.
 */
function buildPath(
  nodes: HTMLElement[],
  host: HTMLElement,
  portrait: boolean,
  active: number,
) {
  const hostBox = host.getBoundingClientRect();
  const points = nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return {
      x: box.left + box.width / 2 - hostBox.left,
      y: box.top + box.height / 2 - hostBox.top,
    };
  });

  if (portrait) {
    const point = points[active] ?? points[0];
    const x = Math.max(18, point.x - hostBox.width * 0.42);
    return `M ${x.toFixed(1)} ${(point.y - 28).toFixed(1)} L ${x.toFixed(1)} ${(point.y + 28).toFixed(1)}`;
  }

  const [a, b, c, d] = points;
  const midY = Math.min(a.y, b.y, c.y, d.y) - 18;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${a.x.toFixed(1)} ${midY.toFixed(1)}, ${b.x.toFixed(1)} ${midY.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)} S ${c.x.toFixed(1)} ${midY.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)} S ${d.x.toFixed(1)} ${midY.toFixed(1)}, ${d.x.toFixed(1)} ${d.y.toFixed(1)}`;
}

/**
 * Readable interface under the lamp: four roles, one connecting signal, and
 * an optional portrait strip with button and keyboard alternatives.
 */
export default function LampSystem({ play = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const signalRef = useRef<HTMLSpanElement>(null);
  const roleRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const dragRef = useRef<Draggable[] | null>(null);
  const indexRef = useRef(0);

  const [index, setIndex] = useState(0);

  const goTo = useCallback((next: number, animate = true) => {
    const clamped = Math.max(0, Math.min(ROLES.length - 1, next));
    indexRef.current = clamped;
    setIndex(clamped);

    const track = trackRef.current;
    const host = rolesRef.current;
    if (!track || !host || window.matchMedia("(min-width: 761px)").matches) {
      return;
    }

    const x = -clamped * host.clientWidth;
    if (
      animate &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      gsap.to(track, {
        x,
        duration: 0.45,
        ease: EASES.handoff,
        overwrite: true,
      });
    } else {
      gsap.set(track, { x });
    }
  }, []);

  // Rebuild the SVG route from the live node centers.
  const rebuildPath = useCallback(() => {
    const host = rolesRef.current;
    const path = pathRef.current;
    const nodes = roleRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (!host || !path || nodes.length !== ROLES.length) return;

    const portrait = window.matchMedia("(max-width: 760px)").matches;
    path.setAttribute("d", buildPath(nodes, host, portrait, indexRef.current));
  }, []);

  // One lamp-system timeline: open the line, fade roles, then travel the thread.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const signal = signalRef.current;
    const path = pathRef.current;
    if (!root || !signal || !path) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    rebuildPath();

    const line = root.querySelector<HTMLElement>("[data-lamp-line]");
    const glow = root.querySelector<HTMLElement>("[data-lamp-glow]");
    const copy = root.querySelectorAll<HTMLElement>("[data-lamp-fade]");

    const timeline = gsap.timeline({ paused: true });

    if (line) {
      timeline.fromTo(
        line,
        { scaleX: 0.42, opacity: 0.55 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.55,
          ease: EASES.handoff,
        },
        0,
      );
    }

    if (glow) {
      timeline.fromTo(
        glow,
        { opacity: 0.35, scale: 0.86 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.55,
          ease: EASES.handoff,
        },
        0,
      );
    }

    timeline.fromTo(
      copy,
      { autoAlpha: 0, y: 18 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.05,
        ease: EASES.handoff,
      },
      0.08,
    );

    if (!reducedMotion) {
      timeline.fromTo(
        signal,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.12 },
        0.55,
      );

      timeline.to(
        signal,
        {
          duration: 1.15,
          ease: EASES.handoff,
          motionPath: {
            path,
            align: path,
            alignOrigin: [0.5, 0.5],
            autoRotate: false,
          },
        },
        0.55,
      );

      timeline.to(signal, { autoAlpha: 0.35, duration: 0.25 }, ">-0.05");
    }

    timelineRef.current = timeline;
    registerLampSystem(timeline);

    // Settle open when remounting already on the lamp, or under reduced motion.
    const plateShown =
      play ||
      document.querySelector<HTMLElement>("[data-mouth-reveal]")?.dataset
        .state === "shown";

    if (plateShown || reducedMotion) {
      timeline.progress(1, true);
    }

    return () => {
      registerLampSystem(null);
      timeline.kill();
      timelineRef.current = null;
    };
    // Rebuild path geometry can change; the handoff owns play/reverse after this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebuildPath]);

  // Portrait strip: optional drag with buttons and keyboard as the real control.
  useEffect(() => {
    const track = trackRef.current;
    const host = rolesRef.current;
    if (!track || !host) return;

    const mq = window.matchMedia("(max-width: 760px)");
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const clearDrag = () => {
      dragRef.current?.forEach((instance) => instance.kill());
      dragRef.current = null;
    };

    const setup = () => {
      clearDrag();
      goTo(indexRef.current, false);
      rebuildPath();

      if (!mq.matches || reducedMq.matches) return;

      const width = host.clientWidth || 1;

      // Keep vertical scrolling free; only horizontal flicks change roles.
      dragRef.current = Draggable.create(track, {
        type: "x",
        inertia: true,
        bounds: {
          minX: -width * (ROLES.length - 1),
          maxX: 0,
          minY: 0,
          maxY: 0,
        },
        edgeResistance: 0.85,
        allowNativeTouchScrolling: true,
        minimumMovement: 8,
        onDragEnd() {
          const step = host.clientWidth || 1;
          const next = Math.round(Math.abs(this.x) / step);
          goTo(next, true);
        },
        snap: {
          x: (value: number) => {
            const step = host.clientWidth || 1;
            return (
              -gsap.utils.clamp(
                0,
                ROLES.length - 1,
                Math.round(Math.abs(value) / step),
              ) * step
            );
          },
        },
      });
    };

    setup();
    mq.addEventListener("change", setup);
    reducedMq.addEventListener("change", setup);
    window.addEventListener("resize", rebuildPath);

    return () => {
      clearDrag();
      mq.removeEventListener("change", setup);
      reducedMq.removeEventListener("change", setup);
      window.removeEventListener("resize", rebuildPath);
    };
  }, [goTo, rebuildPath]);

  useEffect(() => {
    rebuildPath();
  }, [index, rebuildPath]);

  const onRoleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      goTo(indexRef.current + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      goTo(indexRef.current - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(ROLES.length - 1);
    }
  };

  return (
    <div ref={rootRef} className="lamp-system">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Decorative lamp line and pool. ScaleX is owned by the GSAP timeline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-0 mb-8 flex w-full flex-col items-center sm:mb-10"
      >
        <div
          data-lamp-glow
          className="h-20 w-[min(72%,20rem)] rounded-full opacity-80 blur-2xl sm:h-24"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(119,225,221,.26) 0%, rgba(119,225,221,.07) 46%, transparent 74%)",
          }}
        />
        <div
          data-lamp-line
          className="mt-[-2.75rem] h-px w-[min(68%,17rem)] origin-center sm:mt-[-3.25rem]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(232,235,240,.55) 18%, #77E1DD 50%, rgba(232,235,240,.55) 82%, transparent)",
          }}
        />
      </div>

      <div className="lamp-system-copy relative z-10" data-lamp-fade>
        <h2 id={LAMP_HEADING_ID} className="lamp-system-title">
          Fiecare idee are nevoie de un sistem.
        </h2>
        <p className="lamp-system-lead">
          Conectăm site-ul cu mesajele, campaniile și pașii de după primul
          contact.
        </p>
      </div>

      <div
        ref={rolesRef}
        className="lamp-system-roles relative z-10"
        data-lamp-fade
        onKeyDown={onRoleKey}
      >
        <svg className="lamp-system-path" aria-hidden="true">
          <path ref={pathRef} d="" />
        </svg>

        <span
          ref={signalRef}
          className="lamp-system-signal"
          aria-hidden="true"
        />

        <div
          ref={trackRef}
          className="lamp-system-track"
          role="list"
          aria-label="Cum se leagă munca noastră"
        >
          {ROLES.map((role, roleIndex) => (
            <button
              key={role.id}
              ref={(node) => {
                roleRefs.current[roleIndex] = node;
              }}
              type="button"
              className="lamp-system-role"
              role="listitem"
              aria-current={index === roleIndex ? "true" : undefined}
              onClick={() => goTo(roleIndex)}
            >
              <span className="lamp-system-role-label">{role.label}</span>
              <p className="lamp-system-role-body">{role.body}</p>
            </button>
          ))}
        </div>

        <div className="lamp-system-nav" aria-label="Roluri">
          {ROLES.map((role, roleIndex) => (
            <button
              key={`nav-${role.id}`}
              type="button"
              aria-label={role.label}
              aria-current={index === roleIndex ? "true" : undefined}
              onClick={() => goTo(roleIndex)}
            >
              {roleIndex + 1}
            </button>
          ))}
        </div>
      </div>

      <p className="lamp-system-closing relative z-10" data-lamp-fade>
        Un parcurs clar, de la primul clic la pasul următor.
      </p>

      <Link
        href="/contact"
        className="lamp-system-cta relative z-10"
        data-lamp-fade
      >
        Hai să vorbim despre proiectul tău
      </Link>
    </div>
  );
}
