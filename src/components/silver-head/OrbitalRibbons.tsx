"use client";

import {
  animate,
  m,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useId, useRef } from "react";

type Props = {
  opacity: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  active: boolean;
  paused: boolean;
  reducedMotion: boolean;
  hidden: boolean;
};

const PATH_LENGTH = 1000;
const MOBILE_CYCLE_FALLBACK = 480;
const SERVICES = "WEBSITES  •  GOOGLE ADS  •  E-COMMERCE  •  ";
const MOBILE_COPIES = [-1, 0, 1, 2] as const;
const MOBILE_GREEN_ROTATION = "rotate(-9 512 475)";
const MOBILE_BLUE_ROTATION = "rotate(7 512 585)";
const MOBILE_ORBIT_SPAN = 380;

const CSS = `
.sh-orbits{
  --orbit-front:108;
  --orbit-rear:60;
  --orbit-type:54px;
  --orbit-mobile-type:20px;
  --orbit-mobile-tracking:.9px;
  position:absolute;
  inset:0;
  z-index:2;
  pointer-events:none;
  transform-origin:50% 50%;
  will-change:transform,opacity;
}
.sh-orbits svg{
  display:block;
  width:100%;
  height:100%;
  overflow:visible;
}
.sh-orbit-band{
  fill:none;
  stroke-linecap:round;
  stroke-linejoin:round;
}
.sh-orbit-rear{
  stroke-width:var(--orbit-rear);
  opacity:.38;
}
.sh-orbit-front{
  stroke-width:var(--orbit-front);
  filter:drop-shadow(0 7px 8px rgba(0,0,0,.18));
}
.sh-orbit-highlight{
  fill:none;
  stroke:rgba(255,255,255,.22);
  stroke-width:4;
  stroke-linecap:round;
}
.sh-orbit-text{
  font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  font-size:var(--orbit-type);
  font-weight:750;
  letter-spacing:4.8px;
  text-transform:uppercase;
}
.sh-orbit-tight .sh-orbit-text,
.sh-orbit-measure{
  font-size:var(--orbit-mobile-type);
  font-weight:700;
  letter-spacing:var(--orbit-mobile-tracking);
  white-space:pre;
}
.sh-orbit-measure{visibility:hidden}

/* Rear and front are two halves of ONE shallow band, sharing endpoints. */
.sh-orbit-tight .sh-orbit-rear{
  stroke-width:9;
  stroke-linecap:butt;
  opacity:.16;
}
.sh-orbit-tight .sh-orbit-front{filter:none}

@media(max-width:760px){
  .sh-orbits{--orbit-front:38}
  .sh-orbit-wide{display:none}
}
@media(max-width:380px){
  .sh-orbits{
    --orbit-front:34;
    --orbit-mobile-type:18px;
    --orbit-mobile-tracking:.8px;
  }
}
@media(min-width:761px){
  .sh-orbit-tight{display:none}
}
`;

/** Each copy gets its own baseline; additional copies prevent gaps on short arcs. */
function MobileTextCopy({
  pathId,
  phase,
  cycle,
  copy,
  color,
}: {
  pathId: string;
  phase: MotionValue<number>;
  cycle: MotionValue<number>;
  copy: number;
  color: string;
}) {
  const offset = useTransform(
    [phase, cycle],
    ([position, length]: number[]) =>
      (position / PATH_LENGTH) * length + copy * length,
  );

  return (
    <text
      className="sh-orbit-text"
      fill={color}
      dy="0.34em"
      xmlSpace="preserve"
    >
      <m.textPath href={`#${pathId}`} startOffset={offset}>
        {SERVICES}
      </m.textPath>
    </text>
  );
}

export default function OrbitalRibbons({
  opacity,
  x,
  y,
  scale,
  active,
  paused,
  reducedMotion,
  hidden,
}: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const greenPath = `${id}-green-front`;
  const bluePath = `${id}-blue-front`;
  const greenTight = `${id}-green-tight`;
  const blueTight = `${id}-blue-tight`;
  const rearMask = `${id}-rear-mask`;
  const rearMaskTight = `${id}-rear-mask-tight`;
  const maskBlur = `${id}-mask-blur`;
  const maskBlurTight = `${id}-mask-blur-tight`;
  const mobileTextFade = `${id}-mobile-text-fade`;
  const mobileTextMask = `${id}-mobile-text-mask`;

  const greenOffset = useMotionValue(0);
  const blueOffset = useMotionValue(0);
  const mobileCycle = useMotionValue(MOBILE_CYCLE_FALLBACK);
  const mobileFit = useMotionValue(1);
  const mobileTransform = useTransform(
    mobileFit,
    (value) => `translate(512 520) scale(${value}) translate(-512 -520)`,
  );
  const greenTwin = useTransform(greenOffset, (value) => value + PATH_LENGTH);
  const blueTwin = useTransform(blueOffset, (value) => value - PATH_LENGTH);

  const svgRef = useRef<SVGSVGElement>(null);
  const measureRef = useRef<SVGTextElement>(null);
  const controls = useRef<ReturnType<typeof animate>[]>([]);
  const shouldRun = active && !paused && !reducedMotion && !hidden;
  const shouldRunRef = useRef(shouldRun);

  // Pause/resume does not rebuild the animation or reset its phase.
  useEffect(() => {
    shouldRunRef.current = shouldRun;
    controls.current.forEach((control) => {
      if (shouldRun) control.play();
      else control.pause();
    });
  }, [shouldRun]);

  useEffect(() => {
    controls.current.forEach((control) => control.stop());
    controls.current = [];

    if (reducedMotion) {
      greenOffset.set(-180);
      blueOffset.set(180);
      return;
    }

    greenOffset.set(0);
    blueOffset.set(0);

    const green = animate(greenOffset, -PATH_LENGTH, {
      duration: 22,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    });
    const blue = animate(blueOffset, PATH_LENGTH, {
      duration: 27,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    });

    controls.current = [green, blue];
    if (!shouldRunRef.current) {
      green.pause();
      blue.pause();
    }

    return () => {
      green.stop();
      blue.stop();
      controls.current = [];
    };
  }, [blueOffset, greenOffset, reducedMotion]);

  // Measure exactly the font/spacing used by the mobile text, including spaces.
  // Recheck after fonts load and when responsive font sizes change.
  useEffect(() => {
    let disposed = false;
    let frame: number | null = null;

    const read = () => {
      frame = null;
      if (disposed || !measureRef.current) return;
      const length = measureRef.current.getComputedTextLength();
      if (Number.isFinite(length) && length > 1) mobileCycle.set(length);
      const svg = svgRef.current;
      if (svg && window.innerWidth <= 760) {
        // Keep the angled ends inside the phone, even when the parent stage
        // is intentionally wider than the viewport to frame the 3D head.
        const svgScale = Math.min(svg.clientWidth, svg.clientHeight) / 1024;
        const availableWidth = window.innerWidth * 0.94;
        mobileFit.set(
          svgScale > 0
            ? Math.min(1, availableWidth / (MOBILE_ORBIT_SPAN * svgScale))
            : 1,
        );
      } else {
        mobileFit.set(1);
      }
    };
    const schedule = () => {
      if (disposed || frame !== null) return;
      frame = window.requestAnimationFrame(read);
    };

    read();
    schedule();
    window.addEventListener("resize", schedule, { passive: true });

    const fonts = document.fonts;
    fonts?.addEventListener("loadingdone", schedule);
    if (fonts) void fonts.ready.then(schedule);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    if (svgRef.current) observer?.observe(svgRef.current);

    return () => {
      disposed = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      fonts?.removeEventListener("loadingdone", schedule);
      observer?.disconnect();
    };
  }, [mobileCycle, mobileFit]);

  return (
    <m.div
      className="sh-orbits"
      style={{ opacity, x, y, scale }}
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
          {/* Original desktop geometry and type sizing. */}
          <path
            id={greenPath}
            pathLength={PATH_LENGTH}
            d="M18 386 C246 426 758 442 1006 394"
          />
          <path
            id={bluePath}
            pathLength={PATH_LENGTH}
            d="M16 587 C270 547 766 529 1008 569"
          />

          {/* Wider mobile tracks. Their parent groups provide opposing tilts. */}
          <path id={greenTight} d="M344 458 C428 480 596 480 680 458" />
          <path id={blueTight} d="M344 568 C428 590 596 590 680 568" />

          <filter id={maskBlur} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="13" />
          </filter>
          <mask
            id={rearMask}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1024"
            height="1024"
          >
            <rect width="1024" height="1024" fill="white" />
            <ellipse
              cx="512"
              cy="520"
              rx="286"
              ry="400"
              fill="black"
              filter={`url(#${maskBlur})`}
            />
          </mask>

          <filter
            id={maskBlurTight}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <mask
            id={rearMaskTight}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1024"
            height="1024"
          >
            <rect width="1024" height="1024" fill="white" />
            <ellipse
              cx="512"
              cy="520"
              rx="128"
              ry="288"
              fill="black"
              filter={`url(#${maskBlurTight})`}
            />
          </mask>

          <linearGradient
            id={mobileTextFade}
            gradientUnits="userSpaceOnUse"
            x1="344"
            y1="0"
            x2="680"
            y2="0"
          >
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.07" stopColor="white" stopOpacity="1" />
            <stop offset="0.93" stopColor="white" stopOpacity="1" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask
            id={mobileTextMask}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1024"
            height="1024"
          >
            <rect width="1024" height="1024" fill={`url(#${mobileTextFade})`} />
          </mask>
        </defs>

        <g className="sh-orbit-wide">
          <g mask={`url(#${rearMask})`}>
            <path
              className="sh-orbit-band sh-orbit-rear sh-orbit--green"
              d="M1006 394 C762 306 258 302 18 386"
              stroke="#B6FF36"
            />
            <path
              className="sh-orbit-band sh-orbit-rear sh-orbit--blue"
              d="M1008 569 C762 673 264 665 16 587"
              stroke="#315CFF"
            />
          </g>

          <g className="sh-orbit--green">
            <use
              href={`#${greenPath}`}
              className="sh-orbit-band sh-orbit-front"
              stroke="#B6FF36"
            />
            <use href={`#${greenPath}`} className="sh-orbit-highlight" />
            <text className="sh-orbit-text" fill="#10170A" dy="0.34em">
              <m.textPath
                href={`#${greenPath}`}
                startOffset={greenOffset}
                textLength={PATH_LENGTH}
                lengthAdjust="spacing"
              >
                {SERVICES}
              </m.textPath>
              <m.textPath
                href={`#${greenPath}`}
                startOffset={greenTwin}
                textLength={PATH_LENGTH}
                lengthAdjust="spacing"
              >
                {SERVICES}
              </m.textPath>
            </text>
          </g>
          <g className="sh-orbit--blue">
            <use
              href={`#${bluePath}`}
              className="sh-orbit-band sh-orbit-front"
              stroke="#315CFF"
            />
            <use href={`#${bluePath}`} className="sh-orbit-highlight" />
            <text className="sh-orbit-text" fill="#F7F8FF" dy="0.34em">
              <m.textPath
                href={`#${bluePath}`}
                startOffset={blueOffset}
                textLength={PATH_LENGTH}
                lengthAdjust="spacing"
              >
                {SERVICES}
              </m.textPath>
              <m.textPath
                href={`#${bluePath}`}
                startOffset={blueTwin}
                textLength={PATH_LENGTH}
                lengthAdjust="spacing"
              >
                {SERVICES}
              </m.textPath>
            </text>
          </g>
        </g>

        <m.g className="sh-orbit-tight" transform={mobileTransform}>
          {/* No detached far circles or large looping side hooks on mobile. */}
          <g mask={`url(#${rearMaskTight})`}>
            <g transform={MOBILE_GREEN_ROTATION}>
              <path
                className="sh-orbit-band sh-orbit-rear"
                d="M680 458 C596 432 428 432 344 458"
                stroke="#B6FF36"
              />
            </g>
            <g transform={MOBILE_BLUE_ROTATION}>
              <path
                className="sh-orbit-band sh-orbit-rear"
                d="M680 568 C596 608 428 608 344 568"
                stroke="#315CFF"
              />
            </g>
          </g>

          <g className="sh-orbit--green" transform={MOBILE_GREEN_ROTATION}>
            <use
              href={`#${greenTight}`}
              className="sh-orbit-band sh-orbit-front"
              stroke="#B6FF36"
            />
            <g mask={`url(#${mobileTextMask})`}>
              {MOBILE_COPIES.map((copy) => (
                <MobileTextCopy
                  key={copy}
                  pathId={greenTight}
                  phase={greenOffset}
                  cycle={mobileCycle}
                  copy={copy}
                  color="#10170A"
                />
              ))}
            </g>
          </g>
          <g className="sh-orbit--blue" transform={MOBILE_BLUE_ROTATION}>
            <use
              href={`#${blueTight}`}
              className="sh-orbit-band sh-orbit-front"
              stroke="#315CFF"
            />
            <g mask={`url(#${mobileTextMask})`}>
              {MOBILE_COPIES.map((copy) => (
                <MobileTextCopy
                  key={copy}
                  pathId={blueTight}
                  phase={blueOffset}
                  cycle={mobileCycle}
                  copy={copy}
                  color="#F7F8FF"
                />
              ))}
            </g>
          </g>
        </m.g>

        <text
          ref={measureRef}
          className="sh-orbit-text sh-orbit-measure"
          xmlSpace="preserve"
        >
          {SERVICES}
        </text>
      </svg>
    </m.div>
  );
}
