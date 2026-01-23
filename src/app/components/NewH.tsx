"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function NewH() {
  const [mounted, setMounted] = useState(false);
  const [mood, setMood] = useState<"idle" | "smirk" | "alert">("idle");

  useEffect(() => {
    setMounted(true);

    const moods: Array<"idle" | "smirk" | "alert"> = ["idle", "smirk", "alert"];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % moods.length;
      setMood(moods[i]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0b0b0f]">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(239,68,68,0.12),transparent_65%)]" />

      {/* Floating ambient particles */}
      {mounted &&
        Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -25, 0],
              opacity: [0.2, 0.7, 0.2],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        {/* HELMET SYSTEM */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-[18rem] h-[18rem] sm:w-[26rem] sm:h-[26rem]"
        >
          {/* Energy ring */}
          <motion.div
            className="absolute inset-[-12%] rounded-full border border-red-500/30"
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          {/* MASKED CONTENT */}
          <div
            className="absolute inset-0"
            style={{
              maskImage: "url('/images/hero-hero.png')",
              WebkitMaskImage: "url('/images/hero-hero.png')",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
          >
            {/* Galaxy */}
            <motion.div
              className="absolute inset-[-40%]"
              animate={{ rotate: 360 }}
              transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            >
              <Image
                src="/galaxi.jpg"
                alt="Galaxy"
                fill
                className="object-cover"
                priority
              />
            </motion.div>

            {/* === CYBERPUNK SVG FACE === */}
            <motion.svg
              viewBox="0 0 200 200"
              className="absolute inset-0 w-full h-full"
            >
              {/* Eyes */}
              <motion.circle
                cx="75"
                cy="85"
                r={mood === "alert" ? 10 : 7}
                fill="#ffffff"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.circle
                cx="125"
                cy="85"
                r={mood === "alert" ? 10 : 7}
                fill="#ffffff"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.2 }}
              />

              {/* Pupils */}
              <motion.circle
                cx="77"
                cy="87"
                r="3"
                fill="#ef4444"
                animate={{
                  cx: [75, 80, 75],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.circle
                cx="127"
                cy="87"
                r="3"
                fill="#ef4444"
                animate={{
                  cx: [125, 130, 125],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              {/* Mouth */}
              <motion.path
                d={
                  mood === "idle"
                    ? "M70 125 Q100 130 130 125"
                    : mood === "smirk"
                      ? "M70 130 Q100 115 130 130"
                      : "M85 120 Q100 145 115 120"
                }
                stroke="#ffffff"
                strokeWidth="4"
                fill="none"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.svg>

            {/* Space streaks */}
            {mounted &&
              Array.from({ length: 10 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-[1px] w-[120px] bg-white/40"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `-${Math.random() * 50}%`,
                  }}
                  animate={{
                    x: ["0%", "160%"],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{
                    duration: 1.2 + Math.random(),
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeOut",
                  }}
                />
              ))}
          </div>

          {/* Helmet frame */}
          <Image
            src="/images/hero-hero.png"
            alt="Astronaut Helmet"
            fill
            className="relative z-10 object-contain"
            priority
          />

          {/* Rim glow */}
          <div className="absolute inset-0 rounded-full ring-1 ring-red-500/40 shadow-[0_0_80px_rgba(239,68,68,0.45)]" />
        </motion.div>

        {/* TEXT */}
        <div className="mt-10 text-center space-y-4">
          <motion.h1
            className="text-4xl sm:text-6xl font-bold font-ogg text-white"
            animate={{ rotateX: [0, 360], y: [0, -20, 0] }}
            transition={{
              rotateX: { duration: 2, repeat: Infinity, repeatType: "reverse" },
              y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            SERVICII <span className="font-light text-red-500">DIGITALE</span>
          </motion.h1>

          <p className="text-white/70 text-sm sm:text-base">
            Inovație digitală pentru branduri care vor să fie în față.
          </p>
        </div>
      </div>
    </section>
  );
}
