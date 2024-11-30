"use client";

import { useRef, useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  MotionValue,
  useAnimation,
} from "framer-motion";
import { LampDemo } from "../ui/lamp";
import { TextRevealCard, TextRevealCardTitle } from "../ui/text-reveal-card";

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

// Enhanced SVG animation variants with path drawing
const svgVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 0.3,
    transition: {
      duration: 1.2,
      ease: "easeOut",
    },
  },
};

// Path drawing animation variant
const pathVariants = {
  initial: {
    pathLength: 0,
    opacity: 0,
  },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 1.5,
      ease: "easeInOut",
    },
  },
};

// Generate random SVG circles with crimson red variations
const generateRandomSVGs = (count: number) => {
  // Different shades of crimson red
  const colors = [
    "#DC143C", // Crimson
    "#B01030", // Darker crimson
    "#E32636", // Brighter crimson
    "#C41E3A", // Medium crimson
  ];

  // Create pairs of T and I shapes with modified arrangement
  const fixedShapes = [
    {
      id: 0,
      x: 30, // Left side
      y: 30,
      size: 40,
      color: colors[0],
      type: "T",
    },
    {
      id: 1,
      x: 70, // Right side
      y: 30,
      size: 40,
      color: colors[1],
      type: "I",
    },
    {
      id: 2,
      x: 40, // Lower left
      y: 70,
      size: 40,
      color: colors[2],
      type: "I",
    },
    {
      id: 3,
      x: 60, // Lower right
      y: 70,
      size: 40,
      color: colors[3],
      type: "T",
    },
  ];
  return fixedShapes.slice(0, Math.min(count, 4));
};

// Component for Section 2 with animated text and SVG background
const Section2 = ({ progress }: { progress: MotionValue<number> }) => {
  const [showSVGs, setShowSVGs] = useState(false);
  const shapes = generateRandomSVGs(4);
  const controls = useAnimation();

  useEffect(() => {
    const unsubscribe = progress.onChange((value) => {
      if (value >= 0.1) {
        controls.start("animate");
        if (!showSVGs) {
          setShowSVGs(true);
        }
      } else {
        controls.start("initial");
      }
    });
    return () => unsubscribe();
  }, [progress, controls, showSVGs]);

  return (
    <motion.div
      className="flex items-center justify-center h-screen p-8 relative"
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
      {/* SVG Overlay with elegant, centered smaller shapes */}
      {showSVGs && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] pointer-events-none"
          style={{ mixBlendMode: "normal" }}
        >
          {shapes.map((shape) => (
            <motion.g
              key={shape.id}
              variants={svgVariants}
              initial="initial"
              animate="animate"
            >
              {shape.type === "T" ? (
                <g>
                  <motion.path
                    d={`M ${shape.x - 10} ${shape.y - 10} L ${shape.x + 10} ${
                      shape.y - 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.path
                    d={`M ${shape.x} ${shape.y - 10} L ${shape.x} ${
                      shape.y + 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                </g>
              ) : (
                <g>
                  <motion.path
                    d={`M ${shape.x - 5} ${shape.y - 10} L ${shape.x + 5} ${
                      shape.y - 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.path
                    d={`M ${shape.x} ${shape.y - 10} L ${shape.x} ${
                      shape.y + 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.path
                    d={`M ${shape.x - 5} ${shape.y + 10} L ${shape.x + 5} ${
                      shape.y + 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                </g>
              )}
            </motion.g>
          ))}
        </svg>
      )}

      <div className="max-w-4xl relative z-10">
        <motion.h2
          className="text-4xl md:text-6xl font-light mb-8 bg-clip-text text-transparent font-muller relative"
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
          initial="initial"
          animate={controls}
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
          animate={controls}
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
            Fie ca ai nevoie de imagini atractive pentru social media, texte
            care ies în evidență
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
            identitate vizuală pentru brandul tău sau un website modern, sunt
            aici să te ajut.
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
};

// Component for Section 3 with animated text and SVG background
const Section3 = ({ progress }: { progress: MotionValue<number> }) => {
  const [showSVGs, setShowSVGs] = useState(false);
  const shapes = generateRandomSVGs(4);
  const controls = useAnimation();

  useEffect(() => {
    const unsubscribe = progress.onChange((value) => {
      if (value >= 0.1) {
        controls.start("animate");
        if (!showSVGs) {
          setShowSVGs(true);
        }
      } else {
        controls.start("initial");
      }
    });
    return () => unsubscribe();
  }, [progress, controls, showSVGs]);

  return (
    <motion.div
      className="flex items-center justify-center h-screen p-8 relative"
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
      {/* SVG Overlay with elegant, centered smaller shapes */}
      {showSVGs && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] pointer-events-none"
          style={{ mixBlendMode: "normal" }}
        >
          {shapes.map((shape) => (
            <motion.g
              key={shape.id}
              variants={svgVariants}
              initial="initial"
              animate="animate"
            >
              {shape.type === "T" ? (
                <g>
                  <motion.path
                    d={`M ${shape.x - 10} ${shape.y - 10} L ${shape.x + 10} ${
                      shape.y - 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.path
                    d={`M ${shape.x} ${shape.y - 10} L ${shape.x} ${
                      shape.y + 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                </g>
              ) : (
                <g>
                  <motion.path
                    d={`M ${shape.x - 5} ${shape.y - 10} L ${shape.x + 5} ${
                      shape.y - 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.path
                    d={`M ${shape.x} ${shape.y - 10} L ${shape.x} ${
                      shape.y + 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.path
                    d={`M ${shape.x - 5} ${shape.y + 10} L ${shape.x + 5} ${
                      shape.y + 10
                    }`}
                    stroke={shape.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    variants={pathVariants}
                    initial="initial"
                    animate="animate"
                  />
                </g>
              )}
            </motion.g>
          ))}
        </svg>
      )}

      <div className="max-w-4xl relative z-10">
        <motion.h2
          className="text-4xl md:text-6xl font-light mb-8 bg-clip-text text-transparent font-averta relative"
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
          initial="initial"
          animate={controls}
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
          animate={controls}
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
            Scalabilitatea și flexibilitatea sunt parte din abordarea mea,
            pentru a asigura succesul pe termen lung.
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Component for Section 4 with animated text (unchanged)
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
          <motion.div
            className="text-center mt-4"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.8 }}
          >
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

  useEffect(() => {
    const checkDevice = () => {
      setIsTouchDevice(window.innerWidth < 1000);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    if (!isTouchDevice) return;

    const smoothScroll = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      const smoothingFactor = 0.03;
      const currentScroll = window.scrollY;
      const targetScroll = currentScroll + delta * smoothingFactor;

      window.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    };

    window.addEventListener("wheel", smoothScroll, { passive: false });
    return () => window.removeEventListener("wheel", smoothScroll);
  }, [isTouchDevice]);

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
  const section3Opacity = useTransform(scrollYProgress, [0.5, 0.65], [1, 1]);
  const section3Progress = useTransform(scrollYProgress, [0.5, 0.65], [0, 1]);

  const section4Y = useTransform(
    scrollYProgress,
    [0.75, 0.9, 1],
    ["100vh", "0vh", "0vh"]
  );
  const section4Opacity = useTransform(scrollYProgress, [0.75, 0.9], [1, 1]);
  const section4Progress = useTransform(scrollYProgress, [0.75, 0.9], [0, 1]);

  return (
    <div ref={containerRef} className="relative h-[410vh] md:h-[400vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          className="absolute inset-0 z-10 bg-[rgba(15,15,25,1)]"
          style={{
            opacity: useTransform(scrollYProgress, [0, 0.3], [1, 0]),
          }}
        >
          <LampDemo />
        </motion.div>

        <motion.div
          className="absolute inset-0 z-20"
          style={{
            y: section2Y,
            opacity: section2Opacity,
          }}
        >
          <Section2 progress={section2Progress} />
        </motion.div>

        <motion.div
          className="absolute inset-0 z-30"
          style={{
            y: section3Y,
            opacity: section3Opacity,
          }}
        >
          <Section3 progress={section3Progress} />
        </motion.div>

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
