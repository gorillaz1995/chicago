"use client";

import React, { useEffect, useState } from "react";
import HailMary from "../components/graces/HailMary";
import BentoGridThirdDemo from "../components/ui/elBento/bento-grid-demo-3";
import { FeaturesSectionDemo } from "../components/ui/Featurecards";

function ServiciiPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      // Cleanup any WebGL contexts
      const canvas = document.querySelector("canvas");
      if (canvas) {
        const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
        if (gl) {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
      }
    };
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <HailMary />
      <div className="bg-[#b1b1b1]">
        <FeaturesSectionDemo />
      </div>
      <div className="gradient1">
        <BentoGridThirdDemo />
      </div>
    </div>
  );
}

export default ServiciiPage;
