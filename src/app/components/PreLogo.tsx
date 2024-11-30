"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";

const PreLogo = () => {
  // State to control drawer visibility
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Animation variants for the overall SVG
  const svgVariants = {
    initial: {
      scale: 0,
      rotate: -180,
    },
    animate: {
      scale: 1,
      rotate: 0,
      transition: {
        duration: 1.5,
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
    hover: {
      scale: 1.1,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  };

  // Shine animation variants
  const shineVariants = {
    initial: { x: -300, opacity: 0 },
    animate: {
      x: 300,
      opacity: [0, 1, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: 3,
        ease: "easeInOut",
      },
    },
  };

  // E tips fluctuation variants
  const eTipsVariants = {
    animate: {
      y: [0, -5, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Drawer animation variants
  const drawerVariants = {
    closed: {
      x: "100%",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
      },
    },
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
      },
    },
  };

  // Menu items animation variants
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

  // New overlapping animation variants
  const overlappingVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 2,
        ease: "easeInOut",
      },
    },
  };

  return (
    <>
      {/* Animated SVG Logo */}
      <motion.svg
        width="275"
        height="275"
        viewBox="0 0 300 300"
        className="fixed top-4 left-4 w-[70px] h-[70px] md:w-[90px] md:h-[90px] lg:w-[110px] lg:h-[110px] cursor-pointer z-50"
        variants={svgVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        onClick={() => setIsDrawerOpen(true)}
        style={{
          filter: "drop-shadow(0 0 10px rgba(220,20,60,0.2))",
        }}
      >
        {/* Shine effect */}
        <motion.rect
          width="50"
          height="300"
          fill="url(#shine-gradient)"
          variants={shineVariants}
          initial="initial"
          animate="animate"
          style={{ mixBlendMode: "overlay" }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="shine-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgba(255,255,255,0)" />
            <stop offset="0.5" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* T path */}
        <motion.path
          d="M 60 50 L 240 50 M 150 50 L 150 250"
          stroke="#DC143C"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
          variants={overlappingVariants}
          initial="hidden"
          animate="visible"
        />

        {/* E path base */}
        <motion.path
          d="M 90 100 L 90 250"
          stroke="#DC143C"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
          variants={overlappingVariants}
          initial="hidden"
          animate="visible"
        />

        {/* E tips with perpetual animation */}
        <motion.path
          d="M 90 100 L 210 100"
          stroke="#DC143C"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
          variants={eTipsVariants}
          animate="animate"
        />
        <motion.path
          d="M 90 175 L 190 175"
          stroke="#DC143C"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
          variants={eTipsVariants}
          animate="animate"
        />
        <motion.path
          d="M 90 250 L 210 250"
          stroke="#DC143C"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
          variants={eTipsVariants}
          animate="animate"
        />
      </motion.svg>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Navigation Drawer */}
      <motion.div
        className="fixed top-0 right-0 h-full w-full sm:w-[80%] md:w-[65%] lg:w-[35%] bg-white dark:bg-gray-900 z-50 shadow-lg overflow-y-auto"
        variants={drawerVariants}
        initial="closed"
        animate={isDrawerOpen ? "open" : "closed"}
      >
        <button
          onClick={() => setIsDrawerOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
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
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex flex-col items-center justify-center min-h-full px-4 py-16 sm:px-8">
          {/* Overlapping T and E SVG Logo */}
          <motion.svg
            width="150"
            height="100"
            viewBox="0 0 200 100"
            className="mb-8"
          >
            {/* T path */}
            <motion.path
              d="M 60 20 L 140 20 M 100 20 L 100 80"
              stroke="#DC143C"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              variants={overlappingVariants}
              initial="hidden"
              animate="visible"
            />

            {/* E path base */}
            <motion.path
              d="M 80 30 L 80 80"
              stroke="#DC143C"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              variants={overlappingVariants}
              initial="hidden"
              animate="visible"
            />

            {/* E tips */}
            <motion.path
              d="M 80 30 L 120 30"
              stroke="#DC143C"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              variants={eTipsVariants}
              animate="animate"
            />
            <motion.path
              d="M 80 55 L 110 55"
              stroke="#DC143C"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              variants={eTipsVariants}
              animate="animate"
            />
            <motion.path
              d="M 80 80 L 120 80"
              stroke="#DC143C"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              variants={eTipsVariants}
              animate="animate"
            />
          </motion.svg>

          <motion.h2
            className="text-2xl font-bold mb-8 sm:mb-12 text-gray-800 dark:text-white font-muller"
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
                  className="text-lg sm:text-xl text-gray-700 hover:text-crimson dark:text-gray-200 dark:hover:text-crimson transition-colors font-averta block px-2 py-1"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  {item.text}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default PreLogo;
