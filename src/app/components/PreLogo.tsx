"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";

const PreLogo = () => {
  // State to control drawer visibility
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Effect to handle body scroll lock when drawer is open
  useEffect(() => {
    // Lock body scroll when drawer is open
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Clean up function to ensure we reset everything properly
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  // Menu items animation variants - staggered entrance for menu items
  const menuItemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.15,
        delay: index * 0.1,
      },
    }),
  };

  // Cloud floating animation variants
  const cloudFloatingVariants = {
    float: {
      y: [0, -8, 0],
      scale: [1, 1.02, 1],
      transition: {
        duration: 4,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut",
      },
    },
  };

  return (
    <>
      {/* Futuristic Shape Container */}
      <motion.div
        className="fixed top-0 left-1/2 transform -translate-x-1/2 w-[60vw] h-[15vh] z-50 cursor-pointer"
        onClick={() => setIsDrawerOpen(true)}
        animate={{ opacity: isDrawerOpen ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Cloud Logo with Gradient and Floating Animation */}
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          viewBox="0 0 800 800"
          width="100%"
          height="150%"
          preserveAspectRatio="xMidYMid meet"
          style={{
            filter: "drop-shadow(0 0 10px rgba(220,20,60,0.3))",
          }}
          variants={cloudFloatingVariants}
          animate="float"
        >
          <defs>
            <linearGradient
              x1="50%"
              y1="0%"
              x2="50%"
              y2="100%"
              id="cccloud-grad"
            >
              <stop
                stopColor="hsla(0, 0%, 100%, 1.00)"
                stopOpacity="1"
                offset="0%"
              ></stop>
              <stop
                stopColor="hsla(0, 96%, 45%, 1.00)"
                stopOpacity="1"
                offset="100%"
              ></stop>
            </linearGradient>
          </defs>
          <g
            fill="url(#cccloud-grad)"
            id="cloud"
            transform="matrix(1,0,0,1,20,-330)"
          >
            <path
              d="M 300 600 A  1 1 0 1 1 200 400 A  1 1 0 1 1 200 250 A  1 1 0 1 1 350 200 A  1 1 0 1 1 500 250 A  1 1 0 1 1 650 400 A  1 1 0 1 1 550 500 A  1 1 0 1 1 450 550 A  1 1 0 1 1 300 600 Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </g>
        </motion.svg>
      </motion.div>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Navigation Drawer - With chandelier-like descent animation */}
      <motion.div
        className="fixed left-[20%] lg:left-[calc(50%-15%)] w-[60%] lg:w-[30%] h-[70%] md:h-[65%] lg:h-[90%] bg-[#FF1212] z-50 shadow-lg overflow-y-auto"
        style={{
          // Using a custom path to create a shape with straight top instead of triangle
          clipPath: "polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)",
          // Adding a more pronounced shadow for depth
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        }}
        variants={{
          closed: {
            y: "-120%",
            opacity: 0.8,
            scale: 0.95,
            transition: {
              type: "tween",
              ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for elegant chandelier-like movement
              duration: 0.8,
            },
          },
          open: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              type: "tween",
              ease: [0.16, 1, 0.3, 1], // Smooth easing for elegant descent
              duration: 1.2, // Slower duration for more elegant movement
              opacity: { duration: 0.6 }, // Fade in slightly faster than position change
            },
          },
        }}
        initial="closed"
        animate={isDrawerOpen ? "open" : "closed"}
      >
        <div className="flex flex-col items-center justify-center min-h-full px-4 py-16 sm:px-8">
          {/* Menu icon in drawer */}

          <motion.h2
            className="text-4xl font-bold mb-8 sm:mb-12 text-white font-ogg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            MENIU
          </motion.h2>
          <div className="space-y-6 sm:space-y-8 w-full text-center">
            {[
              { href: "/", text: "ACASA" },
              { href: "/portofoliu", text: "PORTOFOLIU" },
              { href: "/servicii", text: "SERVICII" },
              { href: "/contact", text: "CONTACT" },
            ].map((item, index) => (
              <motion.div
                key={item.href}
                custom={index}
                initial="hidden"
                animate={isDrawerOpen ? "visible" : "hidden"}
                variants={menuItemVariants}
              >
                <Link
                  href={item.href}
                  className="text-lg sm:text-xl text-white hover:text-gray-200 transition-colors font-dexa block px-2 py-1"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  {item.text}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Close button with just X */}
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 p-3 text-white hover:text-gray-200 font-ogg rounded-full border border-white/30 mt-8"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default PreLogo;
