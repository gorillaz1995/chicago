"use client";

import { m } from "motion/react";

const letterVariants = {
  initial: {
    opacity: 0,
    y: 25,
    scale: 0.9,
    rotateY: 45,
  },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.65,
      ease: [0.34, 1.56, 0.64, 1] as const, // Spring-like easing
      delay: index * 0.03, // Faster stagger between letters
    },
  }),
};

/**
 * Opening of /servicii. The lamp now lives on the homepage mouth exit,
 * so this section uses the light colors that used to settle at the end
 * of that crossfade, and the letters still arrive on scroll into view.
 */
export default function HailMary() {
  return (
    <m.div
      className="flex min-h-[100svh] items-center justify-center p-6 sm:p-8"
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0.8 }}
      style={{
        background: "linear-gradient(to bottom, #b1b1b1, #d9d9d9, #b1b1b1)",
      }}
    >
      <div className="max-w-4xl">
        <m.h2
          className="mb-8 bg-clip-text text-4xl font-semibold font-geist text-transparent md:text-6xl"
          style={{
            backgroundImage:
              "radial-gradient(circle, #8e1616, #7d1c38, #602b49, #433346, #333333)",
          }}
        >
          {/* Split text into letters for individual animation */}
          {"De la A la Z".split("").map((letter, index) => (
            <m.span key={index} custom={index} variants={letterVariants}>
              {letter}
            </m.span>
          ))}
        </m.h2>
        <m.div
          className="overflow-hidden text-lg font-light leading-relaxed font-geist text-[#1f2937] md:text-xl"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
        >
          <m.p
            variants={{
              initial: { x: -100, opacity: 0 },
              animate: {
                x: 0,
                opacity: 1,
                transition: { duration: 0.8, ease: "easeOut" },
              },
            }}
          >
            Fie ca ai nevoie de imagini atractive pentru social media, texte care
            ies în evidență
          </m.p>

          <m.p
            variants={{
              initial: { x: 100, opacity: 0 },
              animate: {
                x: 0,
                opacity: 1,
                transition: { duration: 0.8, ease: "easeOut", delay: 0.2 },
              },
            }}
          >
            identitate vizuală pentru brandul tău sau un website modern, sunt aici
            să te ajut.
          </m.p>

          <m.p
            variants={{
              initial: { y: 50, opacity: 0, rotateX: 45 },
              animate: {
                y: 0,
                opacity: 1,
                rotateX: 0,
                transition: {
                  duration: 1,
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.15,
                },
              },
            }}
          >
            Lucrez fie sub micro-management (adică, tu decizi tot), fie cu minim
            de supervizare, depinde cum îți place.
          </m.p>

          <m.p
            variants={{
              initial: { scale: 0.8, opacity: 0 },
              animate: {
                scale: 1,
                opacity: 1,
                transition: {
                  duration: 1.2,
                  ease: [0.25, 0.1, 0, 1.1],
                  delay: 0.15,
                },
              },
            }}
          >
            Adaptabilitatea este cheia mea, astfel încât tu să ai controlul pe
            care îl dorești.
          </m.p>
        </m.div>
      </div>
    </m.div>
  );
}
