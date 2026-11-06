"use client";

import { m } from "motion/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const PreLogo = () => {
  // State to control drawer visibility and menu state
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

  return (
    <>
      {/* The silver-head dive fades this wrapper with the hero copy. At zero it is
          hidden, so it cannot be clicked or focused while the mouth has the screen. */}
      <div
        className="prelogo-mark fixed left-1/2 top-0 z-50 -translate-x-1/2"
        data-hero-chrome
      >
        <m.button
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center justify-center border-0 bg-transparent px-3 pt-[max(6px,env(safe-area-inset-top))] focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_#070B09,0_0_0_4px_#F2F0E8]"
          onClick={() => setIsDrawerOpen(true)}
          animate={{ opacity: isDrawerOpen ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          inert={isDrawerOpen ? true : undefined}
          aria-hidden={isDrawerOpen || undefined}
          aria-expanded={isDrawerOpen}
          aria-controls="site-menu"
          aria-label="Deschide meniul"
          disabled={isDrawerOpen}
          tabIndex={isDrawerOpen ? -1 : 0}
        >
          {/* Red banner stays: it is the site menu, not a hero accent. */}
          <div className="relative aspect-[5/1] w-[clamp(128px,25vw,240px)] lg:w-[clamp(160px,18vw,280px)]">
            <Image
              src="/images/menu-header.PNG"
              alt=""
              width={500}
              height={100}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              loading="eager"
            />

            {/* Hamburger menu lines overlay - 40% thinner lines */}
            <div className="absolute inset-0 z-[51] flex flex-col items-center justify-center">
              <div className="gradient mb-1 h-[1px] w-[32%] rounded-full bg-white lg:h-[2px] lg:w-[25%]"></div>
              <div className="gradient mb-1 h-[1px] w-[32%] rounded-full bg-white lg:h-[2px] lg:w-[25%]"></div>
              <div className="gradient h-[1px] w-[32%] rounded-full bg-white lg:h-[2px] lg:w-[25%]"></div>
            </div>
          </div>
        </m.button>
      </div>

      {/* Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Navigation Drawer - Using menu-bar.svg */}
      <m.div
        id="site-menu"
        className="fixed left-[10%] bottom-[27%] lg:bottom-[20%] md:left-[20%] lg:left-[calc(50%-15%)] w-[80%] md:w-[60%] lg:w-[30%] h-[95%] md:h-[80%] lg:h-[90%] z-50 overflow-hidden"
        style={{
          willChange: "transform",
          backfaceVisibility: "hidden",
          visibility: isDrawerOpen ? "visible" : "hidden", // Hide element completely when closed
        }}
        variants={{
          closed: {
            y: "-120%",
            opacity: 0,
            scale: 0.95,
            transition: {
              type: "tween",
              ease: [0.22, 1, 0.36, 1],
              duration: 0.8,
            },
          },
          open: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              type: "tween",
              ease: [0.16, 1, 0.3, 1],
              duration: 1.2,
              opacity: { duration: 0.6 },
            },
          },
        }}
        initial="closed"
        animate={isDrawerOpen ? "open" : "closed"}
        onAnimationComplete={(definition) => {
          // When the closing animation completes, ensure the element is fully hidden
          if (definition === "closed") {
            // Additional cleanup if needed
          }
        }}
      >
        {/* Menu bar SVG as background */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/images/menu-bar.svg"
            alt="Menu Background"
            fill
            style={{
              objectFit: "contain",
              transform: "translateZ(0)",
            }}
          />
        </div>

        <div className="flex flex-col items-center justify-center min-h-full px-4 py-14 relative z-10">
          {/* Menu items container - adjusted spacing to compensate for removed header */}
          <div className="space-y-2 sm:space-y-8 w-full text-center mt-4">
            {[
              { href: "/", text: "ACASA" },
              { href: "/portofoliu", text: "PORTOFOLIU" },
              { href: "/servicii", text: "SERVICII" },
              { href: "/contact", text: "CONTACT" },
            ].map((item, index) => (
              <m.div
                key={item.href}
                custom={index}
                initial="hidden"
                animate={isDrawerOpen ? "visible" : "hidden"}
                variants={menuItemVariants}
              >
                <Link
                  href={item.href}
                  className="text-lg sm:text-xl font-geist transition-colors block px-2 py-1"
                  onClick={() => setIsDrawerOpen(false)}
                  style={{
                    background:
                      "linear-gradient(to bottom, #b1b1b1, #bbbbbb, #c5c5c5, #cfcfcf, #d9d9d9, #dfdfdf, #e4e4e4, #eaeaea, #ededed, #f1f1f1, #f4f4f4, #f8f8f8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {item.text}
                </Link>
              </m.div>
            ))}
          </div>

          {/* Close button with just X */}
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="absolute top-[calc(72px+55%)] lg:top-[calc(72px+68%)] left-1/2 transform -translate-x-1/2 p-3 font-geist"
            style={{
              color: "#FFFFFF",
            }}
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
      </m.div>
    </>
  );
};

export default PreLogo;
