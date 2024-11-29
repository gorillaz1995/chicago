"use client";

import { Suspense, useEffect, useState, memo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

// Memoized loading component to prevent unnecessary re-renders
const LoadingScreen = memo(() => {
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    let rafId: number;
    // Use RAF ID for cleanup
    const updateProgress = () => {
      const elapsedTime = Date.now() - startTime;
      const calculatedProgress = Math.min((elapsedTime / 3000) * 100, 99); // Reduced loading time to 3s
      setProgress(Math.floor(calculatedProgress));

      if (calculatedProgress < 99) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    rafId = requestAnimationFrame(updateProgress);

    // Cleanup RAF on unmount
    return () => cancelAnimationFrame(rafId);
  }, [startTime]);

  // Inline styles for better performance
  return (
    <div className="loading-container">
      <motion.div
        className="loading-spinner"
        animate={{ rotate: 360 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="loading-text">
        {progress}% <br />
        Imi pare rau pentru asteptarea ta, doar putin...
      </div>
      <style jsx>{`
        .loading-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          background-color: white;
        }
        .loading-spinner {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top: 3px solid black;
          position: relative;
        }
        .loading-text {
          font-size: 1.1rem;
          color: black;
          min-width: 120px;
          text-align: center;
        }
      `}</style>
    </div>
  );
});

LoadingScreen.displayName = "LoadingScreen";

// Preload Ograce component
const Ograce = dynamic(() => import("./Ograce").then((mod) => mod.default), {
  loading: () => (
    <div className="ograce-loader">
      <LoadingScreen />
      <style jsx>{`
        .ograce-loader {
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          position: fixed;
          top: 0;
          left: 0;
        }
      `}</style>
    </div>
  ),
  ssr: false,
});

// Memoized main component
const GracesThree = memo(() => {
  return (
    <div className="graces-container">
      <Suspense fallback={<LoadingScreen />}>
        <Ograce />
      </Suspense>
      <style jsx>{`
        .graces-container {
          width: 100%;
          height: 100vh;
          position: relative;
        }
      `}</style>
    </div>
  );
});

GracesThree.displayName = "GracesThree";

export default GracesThree;
