"use client";

import React, { useEffect, useState } from "react";
import HailMary from "../components/graces/HailMary";

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
    </div>
  );
}

export default ServiciiPage;
