"use client";

import React, { useId, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TextRevealCard, TextRevealCardTitle } from "../ui/text-reveal-card";

/**
 * Cloxing component that displays a section with animated text reveal card
 * This component creates an engaging text reveal animation with custom typography
 * Uses client-side only rendering to prevent hydration mismatches
 */
const Cloxing = () => {
  // Generate a stable ID to help with hydration
  const componentId = useId();
  // State to track viewport width for responsive adjustments
  const [isMobile, setIsMobile] = useState(false);

  // Effect to handle responsive behavior
  useEffect(() => {
    // Function to check if viewport is mobile size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Letter animation variants for the animated text
  const letterVariants = {
    initial: { opacity: 0, y: 20 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.5,
      },
    }),
  };

  return (
    <section className="py-12 md:py-24 lg:py-32 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Using suppressHydrationWarning to prevent hydration errors with dynamic content */}
        <div suppressHydrationWarning>
          <TextRevealCard
            text="Ai o idee?"
            revealText="Eu am tehnologia!"
            key={componentId}
          >
            <TextRevealCardTitle>
              <div
                className={`text-center font-geist font-bold pt-10 ${
                  isMobile ? "text-sm" : ""
                }`}
              >
                Fara termeni tehnici, doar rezultate.
              </div>
              <motion.div
                className={`text-center mt-4 font-geist font-thin ${
                  isMobile ? "text-base" : ""
                }`}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, amount: 0.8 }}
              >
                {"Transparenta totala, tu detii controlul asupra proiectului."
                  .split("")
                  .map((letter, index) => (
                    <motion.span
                      key={`${componentId}-letter-${index}`}
                      custom={index}
                      variants={letterVariants}
                    >
                      {letter}
                    </motion.span>
                  ))}
              </motion.div>
            </TextRevealCardTitle>
          </TextRevealCard>
        </div>
      </div>
    </section>
  );
};

export default Cloxing;
