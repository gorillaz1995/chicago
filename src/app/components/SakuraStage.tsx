"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./sakura-stage.module.css";

/** Night palette tokens the WebGL renderer reads from documentElement */
const SAKURA_TOKENS: Record<string, string> = {
  "--bg": "#100c12",
  "--line": "#2e2428",
  "--line-alpha": "1",
  "--blossom": "#f4aabb",
  "--blossom-deep": "#d9728f",
  "--coral": "#ee6a52",
  "--bark": "#5c4538",
  "--bark-deep": "#241812",
  "--light-key": "#f0c49a",
  "--light-fill": "#5a68a8",
  "--light-rim": "#c47888",
};

declare global {
  interface Window {
    __sp?: {
      mode: string;
      driver?: { pause: () => void; request: () => void };
      canvas?: HTMLCanvasElement;
    };
    __sakuraBoot?: () => Promise<void> | void;
  }
}

type SakuraStageProps = {
  children: ReactNode;
};

/**
 * Mounts the Sakura/Phoenix fixed WebGL stage and boots the public scene scripts once.
 * Children render inside #scene-zone so scroll can drive the camera stations.
 */
export default function SakuraStage({ children }: SakuraStageProps) {
  const scriptRequested = useRef(false);

  useEffect(() => {
    const root = document.documentElement;

    // Apply scene palette before the renderer samples CSS variables
    Object.entries(SAKURA_TOKENS).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    let cancelled = false;

    const bootWhenReady = async () => {
      if (cancelled) return;

      // Load the ES module once; subsequent mounts reuse window.__sakuraBoot
      if (!window.__sakuraBoot && !scriptRequested.current) {
        scriptRequested.current = true;
        const script = document.createElement("script");
        script.type = "module";
        script.src = "/sakura-tree/js/main.js";
        script.dataset.sakura = "1";
        document.body.appendChild(script);

        // Wait until the module registers its boot entry point
        await new Promise<void>((resolve, reject) => {
          script.addEventListener("load", () => resolve(), { once: true });
          script.addEventListener(
            "error",
            () => reject(new Error("Failed to load sakura main.js")),
            { once: true },
          );
        });
      }

      // Poll briefly if the module is still evaluating after the load event
      const started = performance.now();
      while (!window.__sakuraBoot && performance.now() - started < 2000) {
        await new Promise((r) => setTimeout(r, 16));
      }

      if (!cancelled) {
        await window.__sakuraBoot?.();
      }
    };

    bootWhenReady().catch((err) => {
      console.info("[sakura-phoenix] boot failed:", err);
    });

    // Re-run boot when #static / #perf toggles without a full remount
    const onHash = () => {
      window.__sakuraBoot?.();
    };
    window.addEventListener("hashchange", onHash);

    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHash);
      // Pause the loop while this page tree is gone; tokens are cleared for other routes
      window.__sp?.driver?.pause();
      Object.keys(SAKURA_TOKENS).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, []);

  return (
    <>
      {/* Fixed stage: poster first, canvas fades in when WebGL draws */}
      <div className={styles.stage} id="stage" aria-hidden="true">
        <picture>
          <source
            media="(max-aspect-ratio: 4/5)"
            srcSet="/sakura-tree/fallback/still-tall.webp"
          />
          <img
            className="poster"
            src="/sakura-tree/fallback/still-wide.webp"
            alt=""
            width={1600}
            height={1000}
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <canvas id="scene" data-scene="/sakura-tree/data/sakura_phoenix.json" />
      </div>

      {/* Scroll zone observed by the scene driver for camera + visibility */}
      <div className={styles.zone} id="scene-zone">
        {children}
      </div>
    </>
  );
}
