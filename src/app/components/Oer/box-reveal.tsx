"use client";
import { m, useAnimation, useInView } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

interface BoxRevealProps {
  children: React.JSX.Element;
  width?: "fit-content" | "100%";
  boxColor?: string;
  duration?: number;
}

export const BoxReveal = ({
  children,
  width = "fit-content",

  duration,
}: BoxRevealProps) => {
  const mainControls = useAnimation();
  const slideControls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false });

  const startAnimation = useCallback(async () => {
    // Reset positions, then play the reveal again.
    await slideControls.start("hidden");
    await mainControls.start("hidden");
    slideControls.start("visible");
    mainControls.start("visible");
  }, [mainControls, slideControls]);

  useEffect(() => {
    if (!isInView) return;

    startAnimation();
    // Replay on a long interval so the reveal does not run every scroll frame.
    const interval = setInterval(() => {
      startAnimation();
    }, 72000);

    return () => clearInterval(interval);
  }, [isInView, startAnimation]);

  return (
    <div ref={ref} style={{ position: "relative", width, overflow: "hidden" }}>
      <m.div
        variants={{
          hidden: { opacity: 0, y: 75 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate={mainControls}
        transition={{ duration: duration ? duration : 0.75, delay: 0.5 }}
      >
        {children}
      </m.div>
      <m.div
        variants={{
          hidden: { left: 0 },
          visible: { left: "100%" },
        }}
        initial="hidden"
        animate={slideControls}
        transition={{ duration: duration ? duration : 0.75, ease: "easeIn" }}
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          zIndex: 20,
          background:
            "linear-gradient(to right, #d84040, #b2393a, #8e3134, #6a2a2c, #482223, #391e1f, #2b1a1a, #1d1616, #1d1616, #1d1616, #1d1616, #1d1616)",
        }}
      />
    </div>
  );
};
