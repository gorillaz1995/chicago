"use client";
import React from "react";
import { m, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LAMP_NEXT_SECTION_ID } from "@/components/silver-head/lampSection";

/** Same ease and timing the beams used when they were tied to whileInView. */
const EXPAND = {
  delay: 0.3,
  duration: 0.8,
  ease: "easeInOut" as const,
};

/** Snap back to the resting pose so a reverse fade does not replay the beams. */
const REST = { duration: 0 };

type LampMotion = {
  /** True once the mouth-exit blend has reached the reveal point. */
  play?: boolean;
};

/**
 * Holds the narrow resting pose until `play`, then runs the original expansion.
 * Reduced motion jumps straight to the finished lamp.
 */
function useLampMotion(play: boolean) {
  const reduced = useReducedMotion() === true;
  const open = reduced || play;

  return {
    open,
    transition: open && !reduced ? EXPAND : REST,
  };
}

export function LampDemo({ play = false }: LampMotion) {
  const { open, transition } = useLampMotion(play);

  return (
    <LampContainer play={play}>
      {/* Headline rises with the beams, using the same delay and ease. */}
      <m.div
        initial={false}
        animate={open ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 100 }}
        transition={transition}
        className="mt-8 py-4 text-center tracking-tight"
      >
        <span
          className="font-geist font-extrabold text-4xl md:text-8xl"
          style={{
            backgroundImage:
              "linear-gradient(to right bottom, #333333, #525252, #747474, #979797, #bcbcbc, #cecece, #e0e0e0, #f2f2f2, #f3f3f3, #f4f5f4, #f6f6f6, #f7f7f7)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Fii vizibil in mediul digital
        </span>
        <br />
        <span
          className="font-geist font-thin text-4xl md:text-7xl"
          style={{
            backgroundImage:
              "linear-gradient(to right bottom, #333333, #525252, #747474, #979797, #bcbcbc, #cecece, #e0e0e0, #f2f2f2, #f3f3f3, #f4f5f4, #f6f6f6, #f7f7f7)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Autentic si relevant.
        </span>
      </m.div>
    </LampContainer>
  );
}

export const LampContainer = ({
  children,
  className,
  play = false,
}: {
  children: React.ReactNode;
  className?: string;
  play?: boolean;
}) => {
  const { open, transition } = useLampMotion(play);

  // Lands on the bento that follows the lamp, at whatever scroll depth the mouth left us.
  const scrollToContent = () => {
    const target = document.getElementById(LAMP_NEXT_SECTION_ID);
    if (!target) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    target.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div
      suppressHydrationWarning
      className={cn(
        "relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden bg-[rgba(15,15,25,1)] z-0",
        className,
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0 ">
        {/* Left conic beam. Width is driven by play so it does not start on intersection. */}
        <m.div
          initial={false}
          animate={
            open
              ? { opacity: 1, width: "15rem" }
              : { opacity: 0.5, width: "8rem" }
          }
          transition={transition}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[15rem] min-[900px]:w-[39rem] bg-gradient-conic from-[#b4c6ff] via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute w-[100%] left-0 bg-[rgba(15,15,25,1)] h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-[rgba(15,15,25,1)] bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </m.div>
        {/* Right conic beam, mirrored. */}
        <m.div
          initial={false}
          animate={
            open
              ? { opacity: 1, width: "15rem" }
              : { opacity: 0.5, width: "8rem" }
          }
          transition={transition}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-1/2 h-56 w-[15rem] min-[900px]:w-[39rem] bg-gradient-conic from-transparent via-transparent to-[#b4c6ff] text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute w-40 h-[100%] right-0 bg-[rgba(15,15,25,1)] bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-[rgba(15,15,25,1)] h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </m.div>
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-[rgba(15,15,25,1)] blur-2xl"></div>
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md"></div>
        <div className="absolute inset-auto z-50 h-36 w-[14rem] min-[900px]:w-[36.4rem] -translate-y-1/2 rounded-full bg-[#b4c6ff] opacity-50 blur-3xl"></div>
        {/* Soft core glow above the lamp line. */}
        <m.div
          initial={false}
          animate={open ? { width: "8rem" } : { width: "4rem" }}
          transition={transition}
          className="absolute inset-auto z-30 h-36 w-32 min-[900px]:w-[83.2px] -translate-y-[6rem] rounded-full bg-[#e0e0ff] blur-2xl"
        ></m.div>
        {/* The thin lamp line the conic light hangs from. */}
        <m.div
          initial={false}
          animate={open ? { width: "15rem" } : { width: "8rem" }}
          transition={transition}
          className="absolute inset-auto z-50 h-0.5 w-[15rem] min-[900px]:w-[39rem] -translate-y-[7rem] bg-[#b4c6ff]"
        ></m.div>

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-[rgba(15,15,25,1)]"></div>
      </div>

      <div className="relative z-50 flex -translate-y-80 flex-col items-center px-5 ">
        {children}
      </div>

      {/* Spinning border stays; the click now finds the section after the mouth. */}
      <button
        type="button"
        onClick={scrollToContent}
        className="absolute top-[85%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
      >
        <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#333333_0%,#979797_50%,#f7f7f7_75%,#333333_100%)]" />
        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full px-3 py-1 text-sm font-medium font-geist text-black backdrop-blur-3xl">
          Alege viitorul
        </span>
      </button>
    </div>
  );
};
