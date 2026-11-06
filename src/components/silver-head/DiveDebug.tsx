"use client";

import { useEffect, useState, type RefObject } from "react";
import { gsap } from "./gsapClient";
import type { HeadControl } from "./SilverHeadCanvas";
import type { DiveDebugHandle } from "./useDiveController";

type Props = {
  control: RefObject<HeadControl>;
};

const CSS = `
.sh-debug{
  position:fixed;
  left:8px;
  bottom:8px;
  z-index:2147483000;
  max-width:min(92vw,360px);
  padding:10px 12px;
  border:1px solid rgba(120,232,170,.35);
  border-radius:10px;
  background:rgba(7,11,9,.86);
  color:#d8f5e5;
  font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;
  white-space:pre-wrap;
  pointer-events:auto;
}
.sh-debug button{
  margin:8px 6px 0 0;
  padding:4px 8px;
  border:1px solid rgba(120,232,170,.5);
  border-radius:6px;
  background:transparent;
  color:inherit;
  font:inherit;
  cursor:pointer;
}
`;

/** Last checkpoint at or before the current distance. */
function currentStage(handle: DiveDebugHandle, vh: number) {
  let name = "rest";

  for (const [label, at] of Object.entries(handle.checkpoints)) {
    if (vh + 1e-6 >= at) name = label;
  }

  return name;
}

/**
 * Tuning overlay for `?shDebug`. Shows the live stage and re-measures the
 * first fully covered frame for this viewport, the same way the scene does.
 */
export default function DiveDebug({ control }: Props) {
  const [live, setLive] = useState("waiting for the dive…");
  const [result, setResult] = useState("");

  useEffect(() => {
    let frames = 0;
    let since = performance.now();
    let fps = 0;
    let shown = 0;

    const tick = () => {
      frames += 1;
      const now = performance.now();

      if (now - since >= 500) {
        fps = (frames * 1000) / (now - since);
        frames = 0;
        since = now;
      }

      if (now - shown < 120) return;
      shown = now;

      const handle = window.__shDive;
      if (!handle) return;

      const vh = handle.channels.vh;
      const trigger = handle.trigger;
      const length = trigger.end - trigger.start;
      const screen = length / handle.pin;

      setLive(
        [
          `bucket ${handle.bucket}  pin ${handle.pin.toFixed(3)} vh = ${Math.round(length)} px`,
          `stage ${currentStage(handle, vh)}  at ${vh.toFixed(3)} vh  (${(handle.channels.progress * 100).toFixed(1)}%)`,
          `scroll ${Math.round(window.scrollY)} px  handoff ${handle.handoff.state()}`,
          `black ${handle.checkpoints.black.toFixed(3)} vh (${handle.measured ? "measured" : "default"})  post-black ${Math.round((handle.pin - handle.checkpoints.black) * screen)} px`,
          `fps ${fps.toFixed(0)}  tier ${control.current.tier}`,
        ].join("\n"),
      );
    };

    gsap.ticker.add(tick);

    return () => gsap.ticker.remove(tick);
  }, [control]);

  const measureNow = () => {
    if (
      control.current.channels.progress > 0.0001 ||
      control.current.covered
    ) {
      setResult("skipped: coverage probe waits until the dive is at rest");
      return;
    }

    const coverage = control.current.measureCoverage?.();
    setResult(
      coverage == null
        ? "no 3D scene (poster mode)"
        : `coverage now ${(coverage * 100).toFixed(2)}%`,
    );
  };

  const findBlack = () => {
    const handle = window.__shDive;

    if (!handle || !control.current.calibrateBlack) {
      setResult("no 3D scene (poster mode)");
      return;
    }

    // The probe paints a flat head into the live buffer. It waits for rest
    // so a measurement cannot stamp that frame onto the page.
    const black = control.current.calibrateBlack();

    if (black == null) {
      setResult("skipped: coverage probe waits until the dive is at rest");
      return;
    }

    setResult(
      [
        `first covered frame ${black.toFixed(3)} vh (in use ${handle.checkpoints.black.toFixed(3)})`,
        `viewport ${window.innerWidth}×${window.innerHeight}, bucket ${handle.bucket}`,
      ].join("\n"),
    );
  };

  return (
    <div className="sh-debug" role="status" aria-live="off">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {live}
      {result ? `\n\n${result}` : ""}
      <div>
        <button type="button" onClick={measureNow}>
          Coverage now
        </button>
        <button type="button" onClick={findBlack}>
          Find black
        </button>
      </div>
    </div>
  );
}
