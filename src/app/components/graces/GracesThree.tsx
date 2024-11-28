"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Create a simple loading component
const LoadingScreen = () => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    Loading...
  </div>
);

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
      Se incarca...
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
