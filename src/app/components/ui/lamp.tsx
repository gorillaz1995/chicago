"use client";

import { cn } from "@/lib/utils";
import LampSystem from "@/components/silver-head/LampSystem";
import { LAMP_PLATE } from "@/components/silver-head/lampSection";

type LampMotion = {
  /** True once the mouth-exit blend has reached the reveal point. */
  play?: boolean;
};

/**
 * Lamp plate that emerges from the silver-head mouth.
 * The decorative light and the readable system live in LampSystem so one
 * GSAP timeline can own the reveal with the handoff.
 */
export function LampDemo({ play = false }: LampMotion) {
  return (
    <LampContainer>
      <LampSystem play={play} />
    </LampContainer>
  );
}

export const LampContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      suppressHydrationWarning
      className={cn(
        "relative z-0 flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden",
        className,
      )}
      style={{ background: LAMP_PLATE }}
    >
      {/* Quiet depth behind the line. One soft veil, no stacked blurs. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[42%] opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 50% 0%, rgba(119,225,221,.08) 0%, rgba(8,11,13,0) 72%)",
        }}
      />
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-0 pb-10 pt-16 sm:pb-12 sm:pt-20">
        {children}
      </div>
    </div>
  );
};
