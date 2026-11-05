"use client";

import { motion } from "framer-motion";
import { useId } from "react";

/**
 * Light closing section recycled from Cloxing copy — no dark gradient card,
 * so the quieted tree stays readable behind a soft white veil.
 */
export default function SakuraClose() {
  const componentId = useId();

  const letterVariants = {
    initial: { opacity: 0, y: 16 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.03,
        duration: 0.4,
      },
    }),
  };

  return (
    <section
      className="relative flex min-h-[90svh] items-center px-4 py-16 sm:px-6 lg:px-10 lg:py-24"
      aria-labelledby="sakura-close-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <p className="font-geist text-[0.72rem] uppercase tracking-[0.12em] text-[#6e6e6e]">
          Hai să vorbim
        </p>
        <h2
          id="sakura-close-title"
          className="mt-3 font-ogg text-3xl font-bold leading-tight tracking-tight text-[#111111] sm:text-4xl lg:text-5xl"
        >
          Ai o idee?
        </h2>
        <p className="mt-2 font-ogg text-2xl font-light text-[#d9728f] sm:text-3xl">
          Eu am tehnologia!
        </p>
        <p className="mt-6 font-geist text-sm font-semibold text-[#111111] sm:text-base">
          Fara termeni tehnici, doar rezultate.
        </p>
        <motion.p
          className="mt-3 font-geist text-sm font-thin text-[#6e6e6e] sm:text-base"
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
        </motion.p>
      </div>
    </section>
  );
}
