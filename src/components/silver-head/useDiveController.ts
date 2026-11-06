"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import {
  EASES,
  gsap,
  ScrollTrigger,
  smoothstepEase,
  useGSAP,
} from "./gsapClient";
import {
  BLACK_DEFAULT,
  BUCKET_QUERIES,
  EXPLORE,
  HANDOFF,
  SETTLE,
  STAGES,
  VEIL_SHARE,
  bucketFor,
  cameraAt,
  checkpoints,
  pinFor,
  type AspectBucket,
} from "./diveStages";
import { createHandoff, setLampShown, type Handoff } from "./handoff";
import type { DiveChannels, HeadControl } from "./SilverHeadCanvas";

/** Layout numbers the hero measures for the poster and ribbon transforms. */
export type PosterMetrics = {
  /** Offset from the rest composition to the frame center, in px. */
  shiftX: number;
  shiftY: number;
  /** Scale that takes the rest stage to the centered pose. */
  centerScale: number;
  /** Scale at which the poster covers the frame. */
  cover: number;
};

/** Hero state the loops depend on. Updated without re-rendering. */
export type DiveFlags = {
  active: boolean;
  paused: boolean;
  reduced: boolean;
  mode: "poster" | "3d";
};

type DiveRefs = {
  track: RefObject<HTMLDivElement | null>;
  sticky: RefObject<HTMLDivElement | null>;
  veil: RefObject<HTMLDivElement | null>;
  posterFrame: RefObject<HTMLDivElement | null>;
  viewPoster: RefObject<HTMLImageElement | null>;
  ribbons: RefObject<HTMLDivElement | null>;
};

type DiveHooks = {
  /** Ribbon idle loop on or off. */
  ribbons: (running: boolean) => void;
  /** The dive left the rest pose, so the pointer tilt should drop. */
  leaveRest: () => void;
};

/** `probe` exposes `window.__shDive` for tests; `overlay` adds ScrollTrigger markers too. */
export type DiveDebugMode = "off" | "probe" | "overlay";

/** `?shDebug` opens the overlay, `?shProbe` only exposes the handle. */
export function readDebugMode(): DiveDebugMode {
  if (typeof window === "undefined") return "off";

  const params = new URLSearchParams(window.location.search);
  if (params.has("shDebug")) return "overlay";
  if (params.has("shProbe")) return "probe";
  return "off";
}

type Options = {
  refs: DiveRefs;
  control: RefObject<HeadControl>;
  metrics: RefObject<PosterMetrics>;
  hooks: DiveHooks;
};

export type DiveController = {
  explore: () => void;
  setFlags: (flags: Partial<DiveFlags>) => void;
  /** Re-apply layout-dependent transforms after a measurement. */
  relayout: () => void;
  /** First fully covered frame measured by the scene for this layout, in screen heights. */
  setBlack: (black: number) => void;
};

/** Debug handle on `window.__shDive`. Only set with `?shDebug` or `?shProbe`. */
export type DiveDebugHandle = {
  bucket: AspectBucket;
  /** True when `black` came from the scene's measurement, not the bucket default. */
  measured: boolean;
  pin: number;
  checkpoints: ReturnType<typeof checkpoints>;
  channels: DiveChannels;
  trigger: ScrollTrigger;
  timeline: gsap.core.Timeline;
  handoff: Handoff;
  /** Scroll position of a stage distance, in px. */
  scrollFor: (vh: number) => number;
  /** Current camera framing and a fresh black measurement, for tests. */
  framing: () => HeadControl["framing"];
  measureBlack: () => number | null;
};

declare global {
  interface Window {
    __shDive?: DiveDebugHandle;
  }
}

/** Keys that move the page. A press during Explorează hands scroll back to the user. */
const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

const REST_CHANNELS: DiveChannels = {
  progress: 0,
  vh: 0,
  yaw: 0,
  center: 0,
  mouth: 0,
  camera: 0,
  atmosphere: 1,
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

type Runtime = {
  dive: ScrollTrigger | null;
  applyLayout: () => void;
  updateGates: () => void;
  /**
   * Place to return to after a layout change: progress, px past the pin end,
   * the pin length when captured, and whether a rebuild captured it.
   */
  anchor: {
    progress: number;
    beyond: number;
    length: number;
    rebuild: boolean;
  } | null;
  exploreKill: (() => void) | null;
};

/**
 * Scroll controller for the silver-head dive.
 *
 * One ScrollTrigger maps native scroll onto one timeline built from
 * `diveStages.ts`. The timeline writes the DOM layers and the canvas
 * channels inside the scroll event, so the WebGL frame and the overlays
 * change in the same frame. The lamp blend is the only time-based state,
 * and its target is always derived from the scroll position.
 */
export function useDiveController({
  refs,
  control,
  metrics,
  hooks,
}: Options): DiveController {
  const flags = useRef<DiveFlags>({
    active: true,
    paused: false,
    reduced: false,
    mode: "poster",
  });

  // Latest hero callbacks without rebuilding the timeline.
  const hooksRef = useRef(hooks);
  useLayoutEffect(() => {
    hooksRef.current = hooks;
  });

  const runtime = useRef<Runtime>({
    dive: null,
    applyLayout: () => {},
    updateGates: () => {},
    anchor: null,
    exploreKill: null,
  });

  // Measured by the 3D scene for the current layout. Null until then.
  const measuredBlack = useRef<number | null>(null);

  useGSAP(
    () => {
      const track = refs.track.current;
      const sticky = refs.sticky.current;
      if (!track || !sticky) return;

      const plate = document.querySelector<HTMLElement>("[data-mouth-reveal]");
      const menu = document.querySelector<HTMLElement>("[data-hero-chrome]");
      const channels = control.current.channels;
      const debug = readDebugMode();

      const gates = { ribbons: false };

      const setGate = (name: "ribbons", on: boolean) => {
        if (gates[name] === on) return;
        gates[name] = on;
        hooksRef.current[name](on);
      };

      const resetChannels = () => {
        Object.assign(channels, REST_CHANNELS);
      };

      // Poster and ribbons follow the centering and the camera from measured
      // layout. Written directly so a resize never needs a timeline rebuild.
      const applyLayout = () => {
        const m = metrics.current;
        const center = channels.center;
        const x = m.shiftX * center;
        const y = m.shiftY * center;
        const centered = 1 + (m.centerScale - 1) * center;
        const cover = smoothstepEase(clamp01(channels.camera));
        const scale = centered + (m.cover - centered) * cover;
        const poster = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;

        if (refs.posterFrame.current) {
          refs.posterFrame.current.style.transform = poster;
        }

        if (refs.viewPoster.current) {
          refs.viewPoster.current.style.transform = poster;
        }

        if (refs.ribbons.current) {
          refs.ribbons.current.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${centered.toFixed(4)})`;
        }
      };

      const clearLayout = () => {
        refs.posterFrame.current?.style.removeProperty("transform");
        refs.viewPoster.current?.style.removeProperty("transform");
        refs.ribbons.current?.style.removeProperty("transform");
      };

      runtime.current.applyLayout = applyLayout;

      // Reduced motion, or a controller error: no pin, lamp visible, rest pose.
      const buildStatic = (failed: boolean) => {
        resetChannels();
        // No pin in this layout, so the canvas must stay a live layer.
        control.current.covered = false;
        delete track.dataset.covered;
        applyLayout();
        if (failed) track.dataset.dive = "static";

        if (plate) {
          plate.dataset.state = "shown";
          plate.style.opacity = "1";
          plate.style.pointerEvents = "auto";
        }

        setLampShown(true);

        runtime.current.updateGates = () => {
          setGate("ribbons", false);
        };
        runtime.current.updateGates();
        control.current.kick();

        return () => {
          delete track.dataset.dive;
          if (plate) {
            delete plate.dataset.state;
            plate.style.removeProperty("opacity");
            plate.style.removeProperty("pointer-events");
          }
          runtime.current.updateGates = () => {};
        };
      };

      const buildDive = (bucket: AspectBucket) => {
        const measured = measuredBlack.current;
        const black = measured ?? BLACK_DEFAULT[bucket];
        const pin = pinFor(black);
        const postBlack = pin - black;
        const veilStart = pin - postBlack * VEIL_SHARE;
        const cameraAtPin = cameraAt(pin);
        const marks = checkpoints(black);

        // The measured pin overrides the bucket default from the stylesheet.
        if (measured != null) {
          track.style.setProperty("--sh-pin", pin.toFixed(4));
        } else {
          track.style.removeProperty("--sh-pin");
        }

        const chrome = [
          ...gsap.utils.toArray<HTMLElement>("[data-sh-chrome]", track),
          ...(menu ? [menu] : []),
        ];

        // Timeline time is measured in screen heights, so positions read like the config.
        const timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });

        (Object.keys(marks) as (keyof typeof marks)[]).forEach((name) => {
          timeline.addLabel(name, marks[name]);
        });

        timeline.fromTo(
          chrome,
          { autoAlpha: 1 },
          { autoAlpha: 0, duration: STAGES.intent.end - STAGES.intent.start },
          STAGES.intent.start,
        );
        // Opacity only. The headline entrance owns its own transforms and
        // must stay at the revealed pose when this fade reverses.

        timeline.fromTo(
          channels,
          { yaw: 0 },
          {
            yaw: 1,
            ease: EASES.cubicInOut,
            duration: STAGES.intent.end - STAGES.intent.start,
          },
          STAGES.intent.start,
        );

        timeline.fromTo(
          channels,
          { center: 0 },
          {
            center: 1,
            ease: smoothstepEase,
            duration: STAGES.centering.end - STAGES.centering.start,
          },
          STAGES.centering.start,
        );

        timeline.fromTo(
          channels,
          { mouth: 0 },
          {
            mouth: 1,
            ease: EASES.cubicInOut,
            duration: STAGES.mouth.end - STAGES.mouth.start,
          },
          STAGES.mouth.start,
        );

        timeline.fromTo(
          channels,
          { atmosphere: 1 },
          {
            atmosphere: 0,
            ease: smoothstepEase,
            duration: STAGES.atmosphere.end - STAGES.atmosphere.start,
          },
          STAGES.atmosphere.start,
        );

        // Linear in scroll, at the approved speed. The pin ends inside the cavity.
        timeline.fromTo(
          channels,
          { camera: 0 },
          { camera: cameraAtPin, duration: pin - STAGES.camera.start },
          STAGES.camera.start,
        );

        // Ribbons stay after the chrome clears, then contract into the mouth.
        // Opacity lives on the wrapper; scale lives on the contract layer so
        // applyLayout can keep writing the wrapper's centering transform.
        // Query from the sticky frame so a late ribbon mount still matches.
        const ribbonWrap =
          refs.ribbons.current ??
          sticky.querySelector<HTMLElement>(".sh-orbits");
        const ribbonContract = ribbonWrap?.querySelector<HTMLElement>(
          "[data-ribbon-contract]",
        );

        if (ribbonWrap) {
          timeline.fromTo(
            ribbonWrap,
            { autoAlpha: 1 },
            {
              autoAlpha: 0,
              duration: STAGES.ribbons.end - STAGES.ribbons.start,
              ease: smoothstepEase,
            },
            STAGES.ribbons.start,
          );
        }

        if (ribbonContract) {
          timeline.fromTo(
            ribbonContract,
            { scale: 1, transformOrigin: "50% 52%" },
            {
              scale: 0.28,
              duration: STAGES.ribbons.end - STAGES.ribbons.start,
              ease: smoothstepEase,
            },
            STAGES.ribbons.start,
          );
        }

        if (refs.veil.current) {
          timeline.fromTo(
            refs.veil.current,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: pin - veilStart },
            veilStart,
          );
        }

        // Pads the timeline to exactly the pin length.
        timeline.set({}, {}, pin);

        const handoff = plate ? createHandoff(plate) : null;

        const trackTop = () => track.getBoundingClientRect().top + window.scrollY;
        // Matches the CSS sticky (100svh), not innerHeight, so the phone toolbar cannot shift it.
        const diveEnd = () => trackTop() + track.offsetHeight - sticky.offsetHeight;

        let lastScroll = window.scrollY;
        let lastProgress = 0;
        let lastStart = 0;
        let lastEnd = 0;
        let atRest = true;

        // A crossing arms one landing. Any new gesture disarms it.
        let gesture = 0;
        let lastWheel = 0;
        const landing = { armed: false, gesture: -1 };

        const newGesture = () => {
          gesture += 1;
          landing.armed = false;
          // The user is moving; a pending layout restore must not fight them.
          runtime.current.anchor = null;
        };

        const onWheel = () => {
          const now = performance.now();
          if (now - lastWheel > SETTLE.wheelGestureGapMs) newGesture();
          lastWheel = now;
        };

        const updateGates = () => {
          const f = flags.current;
          const live = f.active && !f.paused && !f.reduced;

          // Drift stops when the ribbons begin to contract.
          setGate("ribbons", live && channels.vh < STAGES.ribbons.start);
        };

        runtime.current.updateGates = updateGates;

        const update = (self: ScrollTrigger, immediate: boolean) => {
          lastProgress = self.progress;
          lastStart = self.start;
          lastEnd = self.end;
          channels.progress = self.progress;
          channels.vh = self.progress * pin;

          // Retire the WebGL layer once the mouth covers the frame. The veil
          // is the same black, so this is invisible, and the canvas cannot
          // leave a compositor still on the lamp section.
          const wasCovered = control.current.covered;
          const covered = channels.vh >= black;
          if (wasCovered !== covered) {
            control.current.covered = covered;
            if (covered) track.dataset.covered = "true";
          }

          applyLayout();
          // While covered, skip so the hidden canvas does not refresh the
          // snapshot it would leak. On the way back, paint the live pose
          // before the canvas is shown, or the frozen cavity still flashes.
          if (!covered) {
            control.current.kick();
            if (wasCovered) {
              requestAnimationFrame(() => {
                if (!control.current.covered) delete track.dataset.covered;
              });
            }
          }
          updateGates();

          if (atRest && channels.vh > 0.001) {
            atRest = false;
            hooksRef.current.leaveRest();
          } else if (!atRest && channels.vh <= 0.001) {
            atRest = true;
          }

          // Rasterize the lamp only after the canvas is hidden, and drop the
          // layer once the plate has settled so it does not stay promoted.
          const promote = covered && handoff?.state() !== "shown";
          if (plate && (plate.dataset.promote === "true") !== promote) {
            if (promote) plate.dataset.promote = "true";
            else delete plate.dataset.promote;
          }

          if (!handoff) return;

          const scroll = self.scroll();
          const jump =
            immediate ||
            Math.abs(scroll - lastScroll) > window.innerHeight * HANDOFF.jumpScreens;
          const movingDown = scroll > lastScroll;
          lastScroll = scroll;

          if (scroll >= self.end - 0.5) {
            if (handoff.target() === 0 && movingDown && !jump) {
              landing.armed = true;
              landing.gesture = gesture;
            }

            handoff.to(1, jump);
          } else if (scroll < self.end - HANDOFF.reverseBelowPx) {
            handoff.to(0, jump);
          } else if (immediate) {
            handoff.snap();
          }
        };

        const dive = ScrollTrigger.create({
          id: "silver-head-dive",
          trigger: track,
          start: trackTop,
          end: diveEnd,
          scrub: true,
          animation: timeline,
          markers: debug === "overlay",
          onUpdate: (self) => update(self, false),
          onRefresh: (self) => update(self, true),
          // Resting in the black stretch while moving down settles onto the lamp.
          snap: SETTLE.blackZone
            ? {
                snapTo: (value, self) => {
                  const vh = value * pin;
                  return self && self.direction > 0 && vh > black && vh < pin
                    ? 1
                    : value;
                },
                delay: SETTLE.delay,
                duration: SETTLE.duration,
                ease: EASES.settle,
                inertia: false,
              }
            : undefined,
        });

        // A crossing that comes to rest just past the lamp top settles back onto it.
        const lampTrigger = plate
          ? ScrollTrigger.create({
              id: "silver-head-lamp",
              trigger: plate,
              start: diveEnd,
              end: () => diveEnd() + sticky.offsetHeight * SETTLE.lampLandingScreens,
              markers: debug === "overlay",
              snap: {
                snapTo: (value) => {
                  if (landing.armed && landing.gesture === gesture) {
                    landing.armed = false;
                    return 0;
                  }

                  return value;
                },
                delay: SETTLE.delay,
                duration: SETTLE.duration,
                ease: EASES.settle,
                inertia: false,
              },
            })
          : null;

        runtime.current.dive = dive;

        // Keyboard users reach the lamp button while the lamp is still hidden.
        // One frame later, so the browser's own focus scroll cannot override it.
        const onPlateFocus = () => {
          if (!handoff || handoff.target() === 1) return;
          requestAnimationFrame(() => {
            window.scrollTo({ top: dive.end, behavior: "auto" });
          });
        };

        const onVisibility = () => {
          if (document.visibilityState !== "visible") return;
          handoff?.snap();
          control.current.kick();
        };

        const onPageShow = (event: PageTransitionEvent) => {
          if (event.persisted) ScrollTrigger.refresh();
        };

        // Same place in the dive after a layout change. ScrollTrigger restores
        // the old pixel offset at the end of its refresh, so this runs a frame later.
        let restoreFrame = 0;

        const restoreAnchor = () => {
          const anchor = runtime.current.anchor;
          runtime.current.anchor = null;
          if (!anchor) return;

          const length = dive.end - dive.start;

          // A plain refresh that kept the pin length (load, tab return) keeps the
          // browser's own position, including its restore after a reload.
          if (!anchor.rebuild && Math.abs(length - anchor.length) < 1) return;

          let target: number | null = null;

          if (anchor.progress > 0 && anchor.progress < 1) {
            target = dive.start + anchor.progress * length;
          } else if (anchor.progress >= 1) {
            target = dive.end + anchor.beyond;
          }

          if (target != null && Math.abs(window.scrollY - target) > 0.5) {
            window.scrollTo(0, target);
            ScrollTrigger.update();
          }
        };

        const scheduleRestore = () => {
          if (!runtime.current.anchor) return;
          cancelAnimationFrame(restoreFrame);
          restoreFrame = requestAnimationFrame(restoreAnchor);
        };

        // First capture of a burst wins; later ones already see moved pixels.
        // An unchanged layout restores to where it already is, which is a no-op.
        const onRefreshInit = () => {
          runtime.current.anchor ??= {
            progress: lastProgress,
            beyond: Math.max(0, lastScroll - lastEnd),
            length: lastEnd - lastStart,
            rebuild: false,
          };
        };

        const onRefreshDone = scheduleRestore;

        // A width change (rotation, window resize) is captured before anything
        // moves: resize runs before the browser's own scroll adjustment and
        // before the media-query rebuild. Toolbar height changes are ignored.
        let lastWidth = window.innerWidth;

        const onResize = () => {
          if (window.innerWidth === lastWidth) return;
          lastWidth = window.innerWidth;

          runtime.current.anchor ??= {
            progress: lastProgress,
            beyond: Math.max(0, lastScroll - lastEnd),
            length: lastEnd - lastStart,
            rebuild: true,
          };
        };

        // The track height can change after the build (React applies data-reduced
        // later, fonts, a new pin). Positions follow it without a window resize.
        let trackHeight = track.offsetHeight;
        const trackObserver = new ResizeObserver(() => {
          const next = track.offsetHeight;
          if (Math.abs(next - trackHeight) <= 1) return;
          trackHeight = next;
          ScrollTrigger.refresh();
        });
        trackObserver.observe(track);

        window.addEventListener("resize", onResize);
        window.addEventListener("touchstart", newGesture, { passive: true });
        window.addEventListener("pointerdown", newGesture, { passive: true });
        window.addEventListener("keydown", newGesture);
        window.addEventListener("wheel", onWheel, { passive: true });
        plate?.addEventListener("focusin", onPlateFocus);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pageshow", onPageShow);
        ScrollTrigger.addEventListener("refreshInit", onRefreshInit);
        ScrollTrigger.addEventListener("refresh", onRefreshDone);

        // After a rebuild (rotation, a new measurement), return to the same place.
        scheduleRestore();

        update(dive, true);

        if (debug !== "off" && handoff) {
          window.__shDive = {
            bucket,
            measured: measured != null,
            pin,
            checkpoints: marks,
            channels,
            trigger: dive,
            timeline,
            handoff,
            scrollFor: (vh: number) => dive.start + (vh / pin) * (dive.end - dive.start),
            framing: () => ({ ...control.current.framing }),
            measureBlack: () => control.current.calibrateBlack?.() ?? null,
          };
        }

        // Runs after GSAP has reverted the tweens, so it reads its own copies.
        // A restore still pending from an earlier rebuild keeps its capture.
        return () => {
          cancelAnimationFrame(restoreFrame);
          runtime.current.anchor ??= {
            progress: lastProgress,
            beyond: Math.max(0, lastScroll - lastEnd),
            length: lastEnd - lastStart,
            rebuild: true,
          };

          trackObserver.disconnect();
          window.removeEventListener("resize", onResize);
          window.removeEventListener("touchstart", newGesture);
          window.removeEventListener("pointerdown", newGesture);
          window.removeEventListener("keydown", newGesture);
          window.removeEventListener("wheel", onWheel);
          plate?.removeEventListener("focusin", onPlateFocus);
          document.removeEventListener("visibilitychange", onVisibility);
          window.removeEventListener("pageshow", onPageShow);
          ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
          ScrollTrigger.removeEventListener("refresh", onRefreshDone);

          lampTrigger?.kill();
          dive.kill();
          timeline.kill();
          handoff?.kill();

          if (plate) {
            delete plate.dataset.state;
            delete plate.dataset.promote;
            plate.style.removeProperty("pointer-events");
          }

          track.style.removeProperty("--sh-pin");
          delete track.dataset.covered;
          control.current.covered = false;
          runtime.current.dive = null;
          runtime.current.updateGates = () => {};
          setGate("ribbons", false);
          resetChannels();
          clearLayout();
          if (ribbonContract) {
            gsap.set(ribbonContract, { clearProps: "transform" });
          }
          if (ribbonWrap) {
            gsap.set(ribbonWrap, { clearProps: "opacity,visibility" });
          }
          if (window.__shDive?.trigger === dive) delete window.__shDive;
        };
      };

      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
          portrait: BUCKET_QUERIES.portrait,
          landscape: BUCKET_QUERIES.landscape,
        },
        (context) => {
          const conditions = (context.conditions ?? {}) as Record<string, boolean>;

          if (conditions.reduce) return buildStatic(false);

          try {
            return buildDive(bucketFor(conditions.portrait, conditions.landscape));
          } catch (error) {
            console.error("Silver-head dive fell back to the static layout.", error);
            ScrollTrigger.getById("silver-head-dive")?.kill();
            ScrollTrigger.getById("silver-head-lamp")?.kill();
            return buildStatic(true);
          }
        },
      );

      return () => {
        runtime.current.exploreKill?.();
        mm.revert();
      };
    },
    { scope: refs.track, dependencies: [] },
  );

  const setFlags = useCallback((next: Partial<DiveFlags>) => {
    Object.assign(flags.current, next);
    runtime.current.updateGates();
  }, []);

  const relayout = useCallback(() => {
    runtime.current.applyLayout();
  }, []);

  // A new measurement rebuilds the timeline at the same place in the dive.
  const setBlack = useCallback((black: number) => {
    const current = measuredBlack.current;
    if (current != null && Math.abs(current - black) < 0.002) return;

    measuredBlack.current = black;
    gsap.matchMediaRefresh();
  }, []);

  // The tour ends at the handoff point. Any wheel, touch, scroll key or outside
  // scroll stops it where the user took over. Killed, never reverted, on unmount.
  const explore = useCallback(() => {
    runtime.current.exploreKill?.();

    const plate = document.querySelector<HTMLElement>("[data-mouth-reveal]");
    const focusPlate = () => plate?.focus({ preventScroll: true });
    const dive = runtime.current.dive;

    if (!dive || flags.current.reduced) {
      plate?.scrollIntoView({ block: "start", behavior: "auto" });
      focusPlate();
      return;
    }

    const target = dive.end;
    if (Math.abs(target - window.scrollY) < 1) {
      focusPlate();
      return;
    }

    let tween: gsap.core.Tween | null = null;

    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) stop();
    };

    function stop() {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", onKey);
      tween?.kill();
      tween = null;
      runtime.current.exploreKill = null;
    }

    tween = gsap.to(window, {
      duration: EXPLORE.seconds,
      ease: EXPLORE.ease,
      scrollTo: { y: target, autoKill: true, onAutoKill: stop },
      onComplete: () => {
        stop();
        focusPlate();
      },
    });

    // The tween writes scroll itself, so a scroll listener would cancel it immediately.
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", onKey);
    runtime.current.exploreKill = stop;
  }, []);

  // Stable identity, so hero effects that depend on it do not re-run each render.
  return useMemo(
    () => ({ explore, setFlags, relayout, setBlack }),
    [explore, setFlags, relayout, setBlack],
  );
}
