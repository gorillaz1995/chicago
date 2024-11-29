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
        De la <i>A</i> la <i>Z</i>
      </motion.h2>
      <motion.p
        className="text-base md:text-lg leading-relaxed font-averta"
        style={{
          color: useTransform(progress, [0, 0.3], ["#f9fafb", "#1f2937"]),
        }}
      >
        Fie ca ai nevoie de imagini atractive pentru social media, texte care
        ies in evidenta, identitate vizuala pentru brandul tau sau un website
        modern, sunt aici sa te ajut.
        <br />
        Lucrez fie sub micro-management (adica, tu decizi tot), fie cu minim de
        supervizare, depinde cum iti place. Adaptabilitatea este cheia mea,
        astfel incat tu sa ai controlul pe care il doresti.
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
      >
        Tehnologie de Ultima Generatie
      </motion.h2>
      <motion.p
        className="text-lg md:text-xl leading-relaxed font-muller"
        style={{
          color: useTransform(progress, [0, 0.3], ["#000000", "#ffffff"]),
        }}
      >
        Fara limitari de la teme WordPress sau sabloane plictisitoare. Asta
        inseamna ca nu facem lucrurile &ldquo;ca la scoala veche&rdquo; &ndash;
        fiecare proiect este unic, creat special pentru tine si adaptat in
        functie de cum evoluezi. Scalabilitatea si flexibilitatea sunt parte din
        abordarea mea, pentru a asigura succesul pe termen lung.
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
          <div className="text-center">
            Custom nu mai inseamna complicat sau scump.
          </div>
          {/* Animated text that only plays when section is in view */}
          <motion.div
            className="text-center mt-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.8 }}
          >
            {/* Split text into array for letter-by-letter animation */}
            {[
              "I",
              "n",
              "s",
              "e",
              "a",
              "m",
              "n",
              "a",
              " ",
              "a",
              "l",
              " ",
              "t",
              "a",
              "u",
              ".",
            ].map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.1,
                  delay: 0.3 + index * 0.1, // Stagger the animations
                }}
              >
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
