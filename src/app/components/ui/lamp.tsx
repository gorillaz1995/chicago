"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils"; // Fixed import path

export function LampDemo() {
  // Remove unused scrollToContent from LampDemo since it's only used in LampContainer
  return (
    <LampContainer>
      <motion.div
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mt-8 bg-gradient-to-br from-[#e0e0ff] to-[#b4c6ff] py-4 bg-clip-text text-center  font-medium tracking-tight text-transparent "
      >
        <span className="font-muller font-extrabold text-4xl md:text-8xl ">
          Fii fizibil in mediul digital!
        </span>
        <br />
        <span className="font-averta text-4xl md:text-7xl">
          Autentic si relevant.
        </span>
      </motion.div>
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
  // Enhanced smooth scroll animation that accounts for full viewport height
  const scrollToContent = () => {
    const viewportHeight = window.innerHeight;
    const startPosition = window.scrollY;
    // Adjust scroll distance based on viewport width
    const targetPosition =
      window.innerWidth > 1000
        ? viewportHeight * 1.4 // For larger screens
        : viewportHeight * 2.6; // For mobile/tablet screens
    const duration = 1500;
    const startTime = performance.now();

    // Enhanced easing function for smoother animation with longer scroll
    const easeOutExpo = (t: number) => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easeOutExpo(progress);
      const currentPosition =
        startPosition + (targetPosition - startPosition) * easedProgress;

      // Force full height scroll
      window.scrollTo({
        top: Math.max(currentPosition, viewportHeight),
        behavior: "auto",
      });

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  return (
    <div
      suppressHydrationWarning // Add this prop to suppress hydration warning
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[rgba(15,15,25,1)] w-full rounded-md z-0",
        className
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0 ">
        <motion.div
          initial={{ opacity: 0.5, width: "8rem" }}
          whileInView={{ opacity: 1, width: "15rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[15rem] min-[900px]:w-[39rem] bg-gradient-conic from-[#b4c6ff] via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute w-[100%] left-0 bg-[rgba(15,15,25,1)] h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-[rgba(15,15,25,1)] bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0.5, width: "8rem" }}
          whileInView={{ opacity: 1, width: "15rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-1/2 h-56 w-[15rem] min-[900px]:w-[39rem] bg-gradient-conic from-transparent via-transparent to-[#b4c6ff] text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute w-40 h-[100%] right-0 bg-[rgba(15,15,25,1)] bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-[rgba(15,15,25,1)] h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-[rgba(15,15,25,1)] blur-2xl"></div>
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md"></div>
        <div className="absolute inset-auto z-50 h-36 w-[14rem] min-[900px]:w-[36.4rem] -translate-y-1/2 rounded-full bg-[#b4c6ff] opacity-50 blur-3xl"></div>
        <motion.div
          initial={{ width: "4rem" }}
          whileInView={{ width: "8rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-36 w-32 min-[900px]:w-[83.2px] -translate-y-[6rem] rounded-full bg-[#e0e0ff] blur-2xl"
        ></motion.div>
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "15rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-50 h-0.5 w-[15rem] min-[900px]:w-[39rem] -translate-y-[7rem] bg-[#b4c6ff]"
        ></motion.div>

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-[rgba(15,15,25,1)]"></div>
      </div>

      <div className="relative z-50 flex -translate-y-80 flex-col items-center px-5">
        {children}
      </div>

      <button
        onClick={scrollToContent}
        className="absolute top-[85%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
      >
        <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
          Alege viitorul
        </span>
      </button>
    </div>
  );
};
