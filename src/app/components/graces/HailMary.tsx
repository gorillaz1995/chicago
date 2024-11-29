"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { LampDemo } from "../ui/lamp";
import { TextRevealCard, TextRevealCardTitle } from "../ui/text-reveal-card";
import { Spotlight } from "../ui/Spotlight";

// Define animation variants for headline and text with staggered timing
const wildTextVariants = {
  initial: {
    opacity: 0,
    y: 30,
    scale: 0.95,
    rotateX: 15,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0.75,
      ease: [0.25, 0.1, 0, 1], // Custom cubic bezier for fluid motion
      delay: 0.55,
    },
  },
};

const letterVariants = {
  initial: {
    opacity: 0,
    y: 25,
    scale: 0.9,
    rotateY: 45,
  },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.65,
      ease: [0.34, 1.56, 0.64, 1], // Spring-like easing
      delay: index * 0.03, // Faster stagger between letters
    },
  }),
};

// Component for Section 2 with animated text
const Section2 = ({ progress }: { progress: MotionValue<number> }) => (
  <motion.div
    className="flex items-center justify-center h-screen p-8"
    initial="initial"
    whileInView="animate"
    viewport={{ once: true, amount: 0.8 }}
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
        className="text-4xl md:text-6xl font-light mb-8 bg-clip-text text-transparent font-muller"
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
        {/* Split text into letters for individual animation */}
        {"De la A la Z".split("").map((letter, index) => (
          <motion.span key={index} custom={index} variants={letterVariants}>
            {letter}
          </motion.span>
        ))}
      </motion.h2>
      <motion.div
        className="text-lg md:text-xl leading-relaxed font-muller overflow-hidden"
        style={{
          color: useTransform(progress, [0, 0.3], ["#f9fafb", "#1f2937"]),
        }}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.p
          variants={{
            initial: { x: -100, opacity: 0 },
            animate: {
              x: 0,
              opacity: 1,
              transition: { duration: 0.8, ease: "easeOut" },
            },
          }}
        >
          Fie ca ai nevoie de imagini atractive pentru social media, texte care
          ies în evidență
        </motion.p>

        <motion.p
          variants={{
            initial: { x: 100, opacity: 0 },
            animate: {
              x: 0,
              opacity: 1,
              transition: { duration: 0.8, ease: "easeOut", delay: 0.2 },
            },
          }}
        >
          identitate vizuală pentru brandul tău sau un website modern, sunt aici
          să te ajut.
        </motion.p>

        <motion.p
          variants={{
            initial: { y: 50, opacity: 0, rotateX: 45 },
            animate: {
              y: 0,
              opacity: 1,
              rotateX: 0,
              transition: {
                duration: 1,
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.4,
              },
            },
          }}
        >
          Lucrez fie sub micro-management (adică, tu decizi tot), fie cu minim
          de supervizare, depinde cum îți place.
        </motion.p>

        <motion.p
          variants={{
            initial: { scale: 0.8, opacity: 0 },
            animate: {
              scale: 1,
              opacity: 1,
              transition: {
                duration: 1.2,
                ease: [0.25, 0.1, 0, 1.1],
                delay: 0.6,
              },
            },
          }}
        >
          Adaptabilitatea este cheia mea, astfel încât tu să ai controlul pe
          care îl dorești.
        </motion.p>
      </motion.div>
    </div>
  </motion.div>
);

// Component for Section 3 with animated text
const Section3 = ({ progress }: { progress: MotionValue<number> }) => (
  <motion.div
    className="flex items-center justify-center h-screen p-8 relative"
    initial="initial"
    whileInView="animate"
    viewport={{ once: true, amount: 0.8 }}
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
    <Spotlight className="hidden md:block" />
    <div className="max-w-4xl relative z-10">
      <motion.h2
        className="text-4xl md:text-6xl font-light mb-8 bg-clip-text text-transparent font-averta"
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
        variants={wildTextVariants}
      >
        {/* Split text into letters for individual animation */}
        {"Tehnologie de Ultima Generatie".split("").map((letter, index) => (
          <motion.span key={index} custom={index} variants={letterVariants}>
            {letter}
          </motion.span>
        ))}
      </motion.h2>
      <motion.div
        className="text-lg md:text-xl leading-relaxed font-muller overflow-hidden"
        style={{
          color: useTransform(progress, [0, 0.3], ["#000000", "#ffffff"]),
        }}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }} // Reduced threshold to trigger animation earlier
      >
        {/* Split paragraph into rows for fluid animations */}
        <motion.p
          variants={{
            initial: { x: -100, opacity: 0 },
            animate: {
              x: 0,
              opacity: 1,
              transition: { duration: 0.8, ease: "easeOut" },
            },
          }}
        >
          Fără limitări de la teme WordPress sau șabloane plictisitoare.
        </motion.p>

        <motion.p
          variants={{
            initial: { x: 100, opacity: 0 },
            animate: {
              x: 0,
              opacity: 1,
              transition: { duration: 0.8, ease: "easeOut", delay: 0.2 },
            },
          }}
        >
          Asta înseamnă că nu facem lucrurile &ldquo;ca la școala veche&rdquo;
        </motion.p>

        <motion.p
          variants={{
            initial: { y: 50, opacity: 0, rotateX: 45 },
            animate: {
              y: 0,
              opacity: 1,
              rotateX: 0,
              transition: {
                duration: 1,
                ease: [0.34, 1.56, 0.64, 1],
                delay: 0.4,
              },
            },
          }}
        >
          fiecare proiect este unic, creat special pentru tine și adaptat în
          funcție de cum evoluezi.
        </motion.p>

        <motion.p
          variants={{
            initial: { scale: 0.8, opacity: 0 },
            animate: {
              scale: 1,
              opacity: 1,
              transition: {
                duration: 1.2,
                ease: [0.25, 0.1, 0, 1.1],
                delay: 0.6,
              },
            },
          }}
        >
          Scalabilitatea și flexibilitatea sunt parte din abordarea mea, pentru
          a asigura succesul pe termen lung.
        </motion.p>
      </motion.div>
    </div>
  </motion.div>
);

// Component for Section 4 with animated text
const Section4 = ({ progress }: { progress: MotionValue<number> }) => (
  <motion.div
    className="flex items-center justify-center h-screen p-8"
    initial="initial"
    whileInView="animate"
    viewport={{ once: true, amount: 0.8 }}
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
      <TextRevealCard
        text="Ai o idee?"
        revealText="Eu am tehnologia!"
        className="w-full max-w-[320rem]"
      >
        <TextRevealCardTitle>
          <div className="text-center">
            Custom nu mai înseamnă complicat sau scump.
          </div>
          {/* Animated text that only plays when section is in view */}
          <motion.div
            className="text-center mt-4"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.8 }}
          >
            {/* Split text into array for letter-by-letter animation */}
            {"Înseamnă al tău.".split("").map((letter, index) => (
              <motion.span key={index} custom={index} variants={letterVariants}>
                {letter}
              </motion.span>
            ))}
          </motion.div>
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

    return () => {
      window.removeEventListener("resize", checkDevice);
    };
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
      className="relative h-[550vh] md:h-[400vh]" // Responsive height based on viewport width
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
