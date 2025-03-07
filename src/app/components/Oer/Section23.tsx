"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamically import the Cloxing component with SSR disabled to prevent hydration errors
// This fixes the style prop mismatch between server and client rendering
const Cloxing = dynamic(() => import("./Cloxing"), { ssr: false });

/**
 * Section23 component that renders the Cloxing component
 * Uses client-side only rendering to prevent hydration mismatches with animated elements
 * The "use client" directive ensures this component runs only on the client
 */
function Section23() {
  return (
    <div className=" gradient">
      <Cloxing />
    </div>
  );
}

export default Section23;
