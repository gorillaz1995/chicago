"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

// Create an animated loading component with progress indicator
const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Calculate progress based on actual loading time
    const updateProgress = () => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      // Ensure progress increases smoothly regardless of load time
      const calculatedProgress = Math.min((elapsedTime / 5000) * 100, 99);
      setProgress(Math.floor(calculatedProgress));

      if (calculatedProgress < 99) {
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);
  }, [startTime]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <motion.div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          border: "3px solid rgba(0,0,0,0.1)",
          borderTop: "3px solid rgb(79 70 229)",
          position: "relative",
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear",
          times: [0, 1],
        }}
      />
      <div
        style={{
          fontSize: "1.1rem",
          color: "rgb(79 70 229)",
          minWidth: "120px",
          textAlign: "center",
        }}
      >
        {progress}% Merita asteptarea, doar putin...
      </div>
    </div>
  );
};

// Dynamically import Ograce component to reduce initial bundle size
const Ograce = dynamic(() => import("./Ograce").then((mod) => mod.default), {
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      <LoadingScreen />
    </div>
  ),
  ssr: false,
});

export default function GracesThree() {
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <Suspense fallback={<LoadingScreen />}>
        <Ograce />
      </Suspense>
    </div>
  );
}
