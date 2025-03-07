"use client";
import React, { useEffect, useState, memo } from "react";
import { motion } from "framer-motion";
import { twMerge } from "tailwind-merge";
import { cn } from "@/app/lib/utils";

export const TextRevealCard = ({
  text,
  revealText,
  children,
  className,
}: {
  text: string;
  revealText: string;
  children?: React.ReactNode;
  className?: string;
}) => {
  // State to track if text is revealed
  const [isRevealed, setIsRevealed] = useState(false);

  // Automatically toggle reveal state every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRevealed((prev) => !prev);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Define the gradient for reuse
  const cardGradient =
    "linear-gradient(to left, #d84040, #b2393a, #8e3134, #6a2a2c, #482223, #391e1f, #2b1a1a, #1d1616, #1d1616, #1d1616, #1d1616, #1d1616)";

  return (
    <motion.div
      className={cn(
        "w-full max-w-[200rem] rounded-xl p-4 relative overflow-hidden transform-gpu pb-12",
        className
      )}
      animate={{
        transform: [
          "perspective(1000px) rotateX(0deg) rotateY(0deg)",
          "perspective(1000px) rotateX(2.4deg) rotateY(-1.2deg)",
          "perspective(1000px) rotateX(0deg) rotateY(0deg)",
        ],
      }}
      transition={{
        duration: 10,
        ease: "easeInOut",
        repeat: Infinity,
      }}
      style={{
        background: cardGradient,
        boxShadow:
          "8px 8px 24px rgba(0,0,0,0.2), 12px 12px 16px rgba(0,0,0,0.1)",
      }}
    >
      {children}

      <div className="h-[40vh] lg:h-[70vh] relative flex items-center justify-center overflow-hidden">
        <motion.div
          style={{
            width: "100%",
            minWidth: "100%", // Ensure full width
            background: cardGradient, // Use the same gradient as the card
          }}
          animate={{
            opacity: isRevealed ? 1 : 0,
            clipPath: `inset(0 ${isRevealed ? 0 : 100}% 0 0)`,
          }}
          transition={{ duration: 0.4 }}
          className="absolute z-20 will-change-transform flex justify-center w-full"
        >
          <p
            style={{
              textShadow: "2px 2px 10px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap", // Prevent text wrapping
            }}
            className="text-3xl sm:text-[2rem] lg:text-[3rem] py-16 text-white w-auto px-8 font-geist font-light"
          >
            {revealText}
          </p>
        </motion.div>
        <motion.div
          animate={{
            left: isRevealed ? "100%" : "0%",
            rotate: isRevealed ? "5deg" : "-5deg",
            opacity: 1,
          }}
          transition={{ duration: 0.4 }}
          className="h-60  w-[8px] bg-gradient-to-b from-transparent via-white to-transparent absolute z-50 will-change-transform"
        ></motion.div>

        <div className="overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black,transparent)] w-full flex justify-center">
          <p
            style={{
              whiteSpace: "nowrap", // Prevent text wrapping
            }}
            className="text-4xl sm:text-[8rem] lg:text-[5rem] py-16  text-white w-auto px-8  font-geist font-thin"
          >
            {text}
          </p>
          <MemoizedStars />
        </div>
      </div>

      {/* Call to action button */}
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => {
            navigator.clipboard.writeText("0721 792 999");

            const popup = document.createElement("div");
            popup.style.position = "fixed";
            popup.style.top = "50%";
            popup.style.left = "50%";
            popup.style.transform = "translate(-50%, -50%)";
            popup.style.backgroundColor = "black";
            popup.style.color = "white";
            popup.style.padding = "1rem 2rem";
            popup.style.borderRadius = "0.5rem";
            popup.style.zIndex = "1000";
            popup.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
            popup.style.opacity = "0";
            popup.style.transition = "opacity 0.3s ease";
            popup.innerText = "Număr de telefon copiat";
            document.body.appendChild(popup);

            // Show and then hide the popup
            setTimeout(() => {
              popup.style.opacity = "1";
              setTimeout(() => {
                popup.style.opacity = "0";
                setTimeout(() => {
                  document.body.removeChild(popup);
                }, 300);
              }, 2000);
            }, 10);
          }}
          className="px-8 py-2 rounded-full text-2xl lg:text-3xl text-white focus:ring-2 focus:ring-blue-400 hover:shadow-xl transition duration-200"
          style={{
            transform: "scale(1)",
            backgroundImage:
              "radial-gradient(circle, #353535, #2c2c2c, #232323, #1b1b1b, #121212, #121212, #121212, #121212, #1b1b1b, #232323, #2c2c2c, #353535)",
            boxShadow: "4px 4px 8px rgba(255, 255, 255, 0.2)", // Added white shadow for 3D effect
          }}
        >
          <div className="absolute inset-x-0 h-px w-1/2 mx-auto -top-px shadow-4xl bg-gradient-to-r from-transparent via-red-600 to-transparent" />
          <span className="relative z-20">Hai sa discutam</span>
        </button>
      </div>
    </motion.div>
  );
};

export const TextRevealCardTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h2
      className={twMerge(
        "text-white text-3xl mb-4 font-muller font-geist",
        className
      )}
    >
      {children}
    </h2>
  );
};

export const TextRevealCardDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p className={twMerge("text-white text-xl  font-geist", className)}>
      {children}
    </p>
  );
};

const Stars = () => {
  const randomMove = () => Math.random() * 6 - 3;
  const randomOpacity = () => Math.random();
  const random = () => Math.random();
  return (
    <div className="absolute inset-0">
      {[...Array(120)].map((_, i) => (
        <motion.span
          key={`star-${i}`}
          animate={{
            top: `calc(${random() * 100}% + ${randomMove()}px)`,
            left: `calc(${random() * 100}% + ${randomMove()}px)`,
            opacity: randomOpacity(),
            scale: [1, 1.4, 0],
          }}
          transition={{
            duration: random() * 10 + 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            top: `${random() * 100}%`,
            left: `${random() * 100}%`,
            width: `3px`,
            height: `3px`,
            backgroundColor: "white",
            borderRadius: "50%",
            zIndex: 1,
          }}
          className="inline-block"
        ></motion.span>
      ))}
    </div>
  );
};

export const MemoizedStars = memo(Stars);
