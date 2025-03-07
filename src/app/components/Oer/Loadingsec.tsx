"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlipWords } from "./FlipWords";

// Create a preloadable loading component that can be controlled externally
const LoadingSec = ({
  isLoading = true,
  onLoadingComplete = () => {},
  duration = 1250,
}) => {
  // Array of greetings in different languages
  const greetings = [
    "SALUT!",
    "HELLO!",
    "HOLA!",
    "CIAO!",
    "BONJOUR!",
    "HALLO!",
    "ПРИВЕТ!",
    "你好",
    "!こんにちは",
  ];

  // Handle auto-completion of loading if not controlled externally
  useEffect(() => {
    // Only start the timer if isLoading is true and we're using the default behavior
    if (isLoading) {
      const timer = setTimeout(() => {
        onLoadingComplete();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isLoading, onLoadingComplete, duration]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-50 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          {/* Fluid bezier curve split animation */}
          <div className="absolute inset-0 flex">
            {/* Left panel with bezier curve edge */}
            <motion.div
              className="relative w-1/2 h-full overflow-hidden"
              initial={{ x: 0 }}
              exit={{
                x: "-100%",
                transition: {
                  duration: 0.8,
                  ease: [0.65, 0, 0.35, 1], // Bezier curve easing
                },
              }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-200"
                initial={{ x: 0 }}
                exit={{
                  x: [-5, 0, -10, 0], // Subtle movement before exit
                  transition: {
                    duration: 0.4,
                    times: [0, 0.3, 0.7, 1],
                  },
                }}
              >
                {/* Subtle texture overlay */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)",
                  }}
                />
              </motion.div>

              {/* Bezier curve edge - right side of left panel */}
              <motion.div
                className="absolute top-0 right-0 w-16 h-full"
                style={{
                  background:
                    "linear-gradient(to right, rgba(229,231,235,0), rgba(229,231,235,1))",
                }}
                initial={{ x: 0 }}
                exit={{
                  x: 0,
                  transition: {
                    duration: 0.8,
                  },
                }}
              />

              {/* SVG for bezier curve edge */}
              <motion.div
                className="absolute top-0 right-0 h-full w-16 pointer-events-none"
                initial={{ x: 0 }}
                exit={{
                  x: 0,
                  transition: {
                    duration: 0.8,
                  },
                }}
              >
                <svg
                  width="100%"
                  height="100%"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 1000"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100,0 C30,250 170,750 100,1000"
                    fill="rgba(229,231,235,1)"
                    stroke="none"
                  />
                </svg>
              </motion.div>
            </motion.div>

            {/* Right panel with bezier curve edge */}
            <motion.div
              className="relative w-1/2 h-full overflow-hidden"
              initial={{ x: 0 }}
              exit={{
                x: "100%",
                transition: {
                  duration: 0.8,
                  ease: [0.65, 0, 0.35, 1], // Bezier curve easing
                },
              }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-l from-gray-100 to-gray-200"
                initial={{ x: 0 }}
                exit={{
                  x: [5, 0, 10, 0], // Subtle movement before exit
                  transition: {
                    duration: 0.4,
                    times: [0, 0.3, 0.7, 1],
                  },
                }}
              >
                {/* Subtle texture overlay */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)",
                  }}
                />
              </motion.div>

              {/* Bezier curve edge - left side of right panel */}
              <motion.div
                className="absolute top-0 left-0 w-16 h-full"
                style={{
                  background:
                    "linear-gradient(to left, rgba(229,231,235,0), rgba(229,231,235,1))",
                }}
                initial={{ x: 0 }}
                exit={{
                  x: 0,
                  transition: {
                    duration: 0.8,
                  },
                }}
              />

              {/* SVG for bezier curve edge */}
              <motion.div
                className="absolute top-0 left-0 h-full w-16 pointer-events-none"
                initial={{ x: 0 }}
                exit={{
                  x: 0,
                  transition: {
                    duration: 0.8,
                  },
                }}
              >
                <svg
                  width="100%"
                  height="100%"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 1000"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0,0 C70,250 -70,750 0,1000"
                    fill="rgba(229,231,235,1)"
                    stroke="none"
                  />
                </svg>
              </motion.div>
            </motion.div>
          </div>

          {/* Center content with greeting text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="relative"
              exit={{
                scale: [1, 1.05, 0],
                opacity: [1, 1, 0],
                transition: { duration: 0.35, times: [0, 0.7, 1] },
              }}
            >
              <FlipWords
                words={greetings}
                duration={1000} // 1 second duration between words
                className="text-6xl md:text-8xl text-black font-geist font-extralight tracking-tight"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Export a default instance with internal state management for backward compatibility
export default function DefaultLoadingSec() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <LoadingSec
      isLoading={isLoading}
      onLoadingComplete={() => setIsLoading(false)}
    />
  );
}

// Export the component for dynamic imports and external control
export { LoadingSec };
