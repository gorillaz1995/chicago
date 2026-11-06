import type { ReactNode } from "react";
import { LAMP_HEADING_ID, LAMP_PLATE } from "./lampSection";

type Props = {
  children: ReactNode;
};

const CSS = `
.mouth-reveal{
  position:relative;
  z-index:2;
  /* Same height as the pinned frame, so the plate is one viewport
     and the white section below cannot show through the fade. */
  height:var(--sh-sticky, 100svh);
  overflow:hidden;
  background:${LAMP_PLATE};
  /* The section top sits on the viewport at the end of the pin.
     The sticky height is published as --sh-sticky. This is alignment,
     not an extra black scroll range. */
  margin-top:calc(var(--sh-sticky, 100svh) * -1);
}

/* Programmatic focus target after Explorează. Not in the tab order. */
.mouth-reveal:focus{outline:none}

/* Rasterized during the black stretch, so the blend is a compositor fade. */
.mouth-reveal[data-promote="true"]{will-change:opacity}

/* No spinning border while nobody can see it. */
.mouth-reveal:not([data-state="shown"]) .lamp-spin{animation-play-state:paused}

@media(prefers-reduced-motion:reduce){
  .mouth-reveal{
    margin-top:0!important;
    opacity:1!important;
    transform:none!important;
    pointer-events:auto!important;
  }
}
`;

/**
 * The lamp plate that comes out of the mouth. The dive controller fades it
 * with a 200 ms blend at the pin end and reverses it on the way back up.
 * The plate itself does not move, so the section under it stays below the fold.
 */
export default function MouthReveal({ children }: Props) {
  return (
    <div
      data-mouth-reveal
      data-state="hidden"
      className="mouth-reveal"
      role="region"
      aria-labelledby={LAMP_HEADING_ID}
      tabIndex={-1}
      style={{ opacity: 0, pointerEvents: "none" }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {children}
    </div>
  );
}
