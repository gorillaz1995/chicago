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
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className={cn(
        "bg-white border border-black/[0.08] w-full max-w-[200rem] rounded-xl p-4 relative overflow-hidden transform-gpu",
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
        duration: 4,
        ease: "easeInOut",
        repeat: Infinity,
      }}
      style={{
        boxShadow:
          "8px 8px 24px rgba(0,0,0,0.2), 12px 12px 16px rgba(0,0,0,0.1)",
      }}
    >
      {children}

      <div className="h-[50vh] lg:h-[70vh] relative flex items-center justify-center overflow-hidden">
        <motion.div
          style={{
            width: "100%",
            minWidth: "100%", // Ensure full width
          }}
          animate={{
            opacity: isRevealed ? 1 : 0,
            clipPath: `inset(0 ${isRevealed ? 0 : 100}% 0 0)`,
          }}
          transition={{ duration: 0.4 }}
          className="absolute bg-white z-20 will-change-transform flex justify-center w-full"
        >
          <p
            style={{
              textShadow: "6px 6px 20px rgba(255,255,255,0.5)",
              whiteSpace: "nowrap", // Prevent text wrapping
            }}
            className="text-3xl sm:text-[2rem] lg:text-[3rem] py-16  text-black bg-clip-text text-transparent bg-gradient-to-b from-black to-neutral-700 w-auto px-8 font-muller "
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
          className="h-60 w-[12px] bg-gradient-to-b from-transparent via-neutral-200 to-transparent absolute z-50 will-change-transform"
        ></motion.div>

        <div className="overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black,transparent)] w-full flex justify-center">
          <p
            style={{
              whiteSpace: "nowrap", // Prevent text wrapping
            }}
            className="text-4xl sm:text-[8rem] lg:text-[5rem] py-16 font-bold bg-clip-text text-transparent bg-[#CDCDCD] w-auto px-8 font-averta"
          >
            {text}
          </p>
          <MemoizedStars />
        </div>
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
    <h2 className={twMerge("text-black text-3xl mb-4 font-muller", className)}>
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
    <p className={twMerge("text-[#565656] text-xl font-averta", className)}>
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
            backgroundColor: "black",
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
