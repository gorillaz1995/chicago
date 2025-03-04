"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Ero component - Displays SVG images with responsive behavior, sudden transition animation,
 * and intense glitching effects for a digital/hacking aesthetic
 * The component adjusts the image size based on screen width,
 * includes a headline and subheadline, and abruptly transitions between two SVGs
 * with frequent glitching effects that simulate digital interference
 */
const Ero: React.FC = () => {
  // State to track which SVG is currently visible
  const [currentSvg, setCurrentSvg] = useState(0);
  // State to control glitch effect intensity
  const [isGlitching, setIsGlitching] = useState(false);
  // Generate glitch lines on the client side only
  const [glitchLines, setGlitchLines] = useState<React.ReactNode[]>([]);

  // Effect to create a sudden, disruptive transition between images
  useEffect(() => {
    // Set up the interval with a disruptive transition
    const interval = setInterval(() => {
      // Trigger glitching effect before image transition
      setIsGlitching(true);

      // Transition image after a brief delay
      setTimeout(() => {
        setCurrentSvg((prev) => (prev === 0 ? 1 : 0));
        // Keep glitching for a moment after transition
        setTimeout(() => {
          setIsGlitching(false);
        }, 200);
      }, 100);
    }, 1500); // 1.5 seconds between transitions

    // Clean up the interval when component unmounts
    return () => clearInterval(interval);
  }, []);

  // Effect to frequently trigger random glitch effects
  useEffect(() => {
    const triggerGlitch = () => {
      // More frequently trigger glitching (40% chance instead of 30%)
      if (Math.random() > 0.6) {
        setIsGlitching(true);
        // Turn off glitching after a short duration
        setTimeout(() => setIsGlitching(false), Math.random() * 150 + 100);
      }
    };

    // Set up interval for more frequent random glitching (every 400ms)
    const glitchInterval = setInterval(triggerGlitch, 1750);

    return () => clearInterval(glitchInterval);
  }, []);

  // Generate random glitch lines on client-side only to prevent hydration mismatch
  useEffect(() => {
    // Generate the glitch lines only on the client side
    const lines = Array.from({ length: 45 }).map((_, i) => {
      // Determine line type: horizontal, vertical, or diagonal (new)
      const lineType =
        Math.random() > 0.7
          ? "diagonal"
          : Math.random() > 0.5
          ? "horizontal"
          : "vertical";
      const isHorizontal = lineType === "horizontal";

      // Enhanced positioning with more variation
      const position = Math.random() * 100;

      // More varied thickness for visual interest
      const height = Math.random() * 5 + 0.5; // Range from 0.5px to 5.5px

      // More complex timing variations
      const delay = Math.random() * 0.5; // Wider range of delays

      // Color variations for some lines

      // Opacity variations

      // Z-index variation for layering effects

      // Generate a stable ID without using hooks in callback
      const id = `glitch-${i}-${Math.random().toString(36).substr(2, 9)}`;

      return (
        <motion.div
          key={id}
          className="absolute bg-black z-10"
          initial={{ opacity: 0 }}
          animate={{
            opacity: isGlitching ? [0, 0.9, 0] : 0, // More visible glitches
            x: isGlitching && isHorizontal ? ["-100%", "100%"] : 0,
            y: isGlitching && !isHorizontal ? ["-100%", "100%"] : 0,
          }}
          transition={{
            duration: 0.15, // Faster glitch movement
            delay: delay,
            ease: "linear",
          }}
          style={{
            left: isHorizontal ? 0 : `${position}%`,
            top: isHorizontal ? `${position}%` : 0,
            width: isHorizontal ? "100%" : `${height}px`,
            height: isHorizontal ? `${height}px` : "100%",
          }}
        />
      );
    });

    setGlitchLines(lines);
  }, [isGlitching]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4 md:p-8">
      {/* Headline and subheadline section */}
      <div className="text-center mb-8 md:mb-12 w-full max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">Main Headline</h1>
        <p className="text-lg md:text-xl text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui
          mauris. Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor
          neque eu tellus rhoncus ut eleifend nibh porttitor.
        </p>
      </div>

      {/* SVG image container with responsive sizing and enhanced glitch effect */}
      <motion.div
        className="w-full md:w-[70%] lg:w-[25%] relative overflow-hidden"
        style={{ aspectRatio: "1/1" }}
        animate={{
          x: isGlitching ? [0, -8, 8, -4, 0] : 0, // More extreme movement
          filter: isGlitching
            ? ["blur(0px)", "blur(1px)", "blur(0px)"]
            : "blur(2px)", // More intense blur
        }}
        transition={{
          duration: 0.5, // Faster glitch animation
          ease: "easeInOut",
        }}
      >
        {/* Glitch lines - rendered client-side only */}
        {glitchLines}

        {/* RGB split effect when glitching */}
        {isGlitching && (
          <>
            <motion.div
              className="absolute inset-0 opacity-80" // More visible color split
              style={{
                mixBlendMode: "screen",
                backgroundColor: "rgba(255, 255, 255, 1)",
                transform: "translateX(-16px)", // More extreme offset
              }}
            />
            <motion.div
              className="absolute inset-0 opacity-80" // More visible color split
              style={{
                mixBlendMode: "screen",
                backgroundColor: "rgba(255, 255, 255, 1))",
                transform: "translateX(16px)", // More extreme offset
              }}
            />
          </>
        )}

        {/* First SVG with sudden transition */}
        <motion.div
          animate={{
            opacity: currentSvg === 0 ? 1 : 0,
          }}
          transition={{
            duration: 0.05, // Sudden transition
          }}
          className="absolute inset-0"
        >
          <Image
            src="/images/zaviniks3-01.svg"
            alt="Decorative SVG illustration"
            fill
            priority
            style={{ objectFit: "contain" }}
            sizes="(max-width: 1000px) 100vw, 70vw"
          />
        </motion.div>

        {/* Second SVG with sudden transition */}
        <motion.div
          animate={{
            opacity: currentSvg === 1 ? 1 : 0,
          }}
          transition={{
            duration: 0.05, // Sudden transition
          }}
          className="absolute inset-0"
        >
          <Image
            src="/images/zavinkis.svg"
            alt="Second decorative SVG illustration"
            fill
            priority
            style={{ objectFit: "contain" }}
            sizes="(max-width: 1000px) 100vw, 70vw"
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Ero;
