'use client';

import type { ReactNode } from 'react';
import {
  LazyMotion,
  domAnimation,
  m,
  useTransform,
} from 'framer-motion';
import { handoff } from './handoff';

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
  background:rgb(15, 15, 25);
  /* The section top sits on the viewport at the end of the pin.
     The sticky height is published as --sh-sticky. This is alignment,
     not an extra black scroll range. */
  margin-top:calc(var(--sh-sticky, 100svh) * -1);
}

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
 * The lamp fades in over the black mouth. Opacity reads `handoff` only,
 * which is a 150ms tween started when the pin ends. The plate itself
 * does not move, so the section under it stays below the fold.
 */
export default function MouthReveal({ children }: Props) {
  const pointerEvents = useTransform(handoff, (value) =>
    value > 0.92 ? 'auto' : 'none',
  );

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        data-mouth-reveal
        className="mouth-reveal"
        style={{ opacity: handoff, pointerEvents }}
      >
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        {children}
      </m.div>
    </LazyMotion>
  );
}
