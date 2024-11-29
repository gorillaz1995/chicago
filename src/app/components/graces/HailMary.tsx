"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { LampDemo } from "../ui/lamp";
import { TextRevealCard, TextRevealCardTitle } from "../ui/text-reveal-card";

// Component for Section 2 with inverted colors initially
const Section2 = ({ progress }: { progress: MotionValue<number> }) => (
  <motion.div
    className="flex items-center justify-center h-screen p-8"
    style={{
      background: useTransform(
        progress,
        [0, 0.3],
        [
          "linear-gradient(to bottom, #0f0f0f, #000000)",
          "linear-gradient(to bottom, #f9fafb, #ffffff)",
        ]
      ),
    }}
  >
    <div className="max-w-4xl">
      <motion.h2
        className="text-4xl md:text-6xl font-light mb-8 bg-clip-text text-transparent"
        style={{
          backgroundImage: useTransform(
            progress,
            [0, 0.3],
            [
              "linear-gradient(to bottom right, #f9fafb, #ffffff)",
              "linear-gradient(to bottom right, #1f2937, #111827)",
            ]
          ),
        }}
      >
        Section Two
      </motion.h2>
      <motion.p
        className="text-lg md:text-xl leading-relaxed"
        style={{
          color: useTransform(progress, [0, 0.3], ["#f9fafb", "#1f2937"]),
        }}
      >
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris.
      </motion.p>
    </div>
  </motion.div>
);

// Component for Section 3 with inverted colors initially
const Section3 = ({ progress }: { progress: MotionValue<number> }) => (
  <motion.div
    className="flex items-center justify-center h-screen p-8"
    style={{
      background: useTransform(
        progress,
        [0, 0.3],
        [
          "linear-gradient(to bottom, #ffffff, #ffffff)",
          "linear-gradient(to bottom, #000000, #000000)",
        ]
      ),
    }}
  >
    <div className="max-w-4xl">
      <motion.h2
        className="text-4xl md:text-6xl font-light mb-8 bg-clip-text text-transparent"
        style={{
          backgroundImage: useTransform(
            progress,
            [0, 0.3],
            [
              "linear-gradient(to bottom right, #000000, #000000)",
              "linear-gradient(to bottom right, #ffffff, #ffffff)",
            ]
          ),
        }}
      >
        Section Three
      </motion.h2>
      <motion.p
        className="text-lg md:text-xl leading-relaxed"
        style={{
          color: useTransform(progress, [0, 0.3], ["#000000", "#ffffff"]),
        }}
      >
        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
        dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
        proident.
      </motion.p>
    </div>
  </motion.div>
);

// Component for Section 4 with inverted colors initially
const Section4 = ({ progress }: { progress: MotionValue<number> }) => (
  <motion.div
    className="flex items-center justify-center h-screen p-8"
    style={{
      background: useTransform(
        progress,
        [0, 0.3],
        [
          "linear-gradient(to bottom, #0f0f0f, #000000)",
          "linear-gradient(to bottom, #f9fafb, #ffffff)",
        ]
      ),
    }}
  >
    <div className="max-w-4xl">
      <motion.h2
        className="text-4xl md:text-6xl font-light mb-8 bg-clip-text text-transparent"
        style={{
          backgroundImage: useTransform(
            progress,
            [0, 0.3],
            [
              "linear-gradient(to bottom right, #f9fafb, #ffffff)",
              "linear-gradient(to bottom right, #1f2937, #111827)",
            ]
          ),
        }}
      ></motion.h2>
      <TextRevealCard
        text="Ai o idee?"
        revealText="Eu am tehnologia!"
        className="w-full max-w-[320rem]"
      >
        <TextRevealCardTitle>
          Custom nu inseamna complicat. Inseamna al tau.
        </TextRevealCardTitle>
      </TextRevealCard>
    </div>
  </motion.div>
);

export default function HailMary() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Check if device is touch device based on screen width
  useEffect(() => {
    const checkDevice = () => {
      setIsTouchDevice(window.innerWidth < 1000);
    };

    // Initial check
    checkDevice();

    // Add resize listener
    window.addEventListener("resize", checkDevice);

    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Add smooth scroll behavior only for touch devices
  useEffect(() => {
    if (!isTouchDevice) return;

    const smoothScroll = (e: WheelEvent) => {
      e.preventDefault();

      const delta = e.deltaY;
      const smoothingFactor = 0.03; // Adjust this value to control smoothness
      const currentScroll = window.scrollY;
      const targetScroll = currentScroll + delta * smoothingFactor;

      window.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    };

    window.addEventListener("wheel", smoothScroll, { passive: false });

    return () => {
      window.removeEventListener("wheel", smoothScroll);
    };
  }, [isTouchDevice]);

  // Transform values for sections with smoother transitions
  const section2Y = useTransform(
    scrollYProgress,
    [0, 0.15, 0.25, 0.35, 0.4, 0.5],
    ["100vh", "75vh", "50vh", "25vh", "10vh", "0vh"]
  );
  const section2Opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const section2Progress = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);

  const section3Y = useTransform(
    scrollYProgress,
    [0.5, 0.65, 0.75],
    ["100vh", "0vh", "0vh"]
  );
  const section3Opacity = useTransform(scrollYProgress, [0.5, 0.65], [0, 1]);
  const section3Progress = useTransform(scrollYProgress, [0.5, 0.65], [0, 1]);

  const section4Y = useTransform(
    scrollYProgress,
    [0.75, 0.9, 1],
    ["100vh", "0vh", "0vh"]
  );
  const section4Opacity = useTransform(scrollYProgress, [0.75, 0.9], [0, 1]);
  const section4Progress = useTransform(scrollYProgress, [0.75, 0.9], [0, 1]);

  return (
    <div
      ref={containerRef}
      className="relative h-[700vh] md:h-[400vh]" // Responsive height based on viewport width
    >
      {/* Main container with sticky positioning */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Lamp Section - Initially pinned */}
        <motion.div
          className="absolute inset-0 z-10 bg-[rgba(15,15,25,1)]"
          style={{
            opacity: useTransform(scrollYProgress, [0, 0.3], [1, 0]),
          }}
        >
          <LampDemo />
        </motion.div>

        {/* Section 2 - With color transition */}
        <motion.div
          className="absolute inset-0 z-20"
          style={{
            y: section2Y,
            opacity: section2Opacity,
          }}
        >
          <Section2 progress={section2Progress} />
        </motion.div>

        {/* Section 3 - With color transition */}
        <motion.div
          className="absolute inset-0 z-30"
          style={{
            y: section3Y,
            opacity: section3Opacity,
          }}
        >
          <Section3 progress={section3Progress} />
        </motion.div>

        {/* Section 4 - With color transition */}
        <motion.div
          className="absolute inset-0 z-40"
          style={{
            y: section4Y,
            opacity: section4Opacity,
          }}
        >
          <Section4 progress={section4Progress} />
        </motion.div>
      </div>
    </div>
  );
}
