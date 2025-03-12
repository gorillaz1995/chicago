"use client";

import type { CSSProperties } from "react";
import React, { useEffect, useId, useRef, useState } from "react";

interface AuroraTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  speed?: number; // 1 is default speed, 2 is twice as fast, 0.5 is half speed
}

export function AuroraText({
  children,
  className = "",
  colors = [
    "#ff0000", // Bright red
    "#e60000", // Slightly darker red
    "#cc0000", // Medium red
    "#b30000", // Deeper red
    "#990000", // Rich red
    "#800000", // Dark red
    "#660000", // Very dark red
    "#4d0000", // Deep burgundy red
    "#330000", // Almost black red
    "#ff3333", // Light red
    "#ff6666", // Pale red
    "#ff1a1a", // Vibrant red
  ],
  speed = 1,
}: AuroraTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const [textStyle, setTextStyle] = useState<Partial<CSSStyleDeclaration>>({});
  // Generate a unique ID with a prefix to ensure it's a valid ID across browsers
  const uniqueId = useId().replace(/:/g, "-");
  const maskId = `aurora-mask-${uniqueId}`;
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Updated effect to compute all text styles from parent
  useEffect(() => {
    if (containerRef.current) {
      const computedStyle = window.getComputedStyle(containerRef.current);

      // Extract text-related styles
      const relevantStyles = {
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily,
        fontWeight: computedStyle.fontWeight,
        fontStyle: computedStyle.fontStyle,
        letterSpacing: computedStyle.letterSpacing,
        lineHeight: computedStyle.lineHeight,
        textTransform: computedStyle.textTransform,
        fontVariant: computedStyle.fontVariant,
        fontStretch: computedStyle.fontStretch,
        fontFeatureSettings: computedStyle.fontFeatureSettings,
      };

      requestAnimationFrame(() => {
        setTextStyle(relevantStyles);
      });
    }
  }, [className, isMounted]);

  // Updated effect to compute font size from both inline and class styles
  useEffect(() => {
    if (!isMounted) return;

    const updateFontSize = () => {
      if (containerRef.current) {
        const computedStyle = window.getComputedStyle(containerRef.current);
        const computedFontSize = parseFloat(computedStyle.fontSize);

        requestAnimationFrame(() => {
          setFontSize(computedFontSize);
        });
      }
    };

    updateFontSize();
    window.addEventListener("resize", updateFontSize);

    return () => window.removeEventListener("resize", updateFontSize);
  }, [className, isMounted]);

  // Update effect to set ready state after dimensions are computed
  useEffect(() => {
    if (!isMounted || !textRef.current) return;

    const updateDimensions = () => {
      if (textRef.current) {
        try {
          const bbox = textRef.current.getBBox();
          setDimensions({
            width: Math.max(bbox.width, 1), // Ensure minimum width of 1px
            height: Math.max(bbox.height, 1), // Ensure minimum height of 1px
          });
          setIsReady(true);
        } catch (error) {
          console.error("Error getting text dimensions:", error);
          // Fallback dimensions based on container
          if (containerRef.current) {
            setDimensions({
              width: containerRef.current.offsetWidth || 100,
              height: containerRef.current.offsetHeight || 30,
            });
            setIsReady(true);
          }
        }
      }
    };

    // Small delay to ensure text is rendered before measuring
    const timeoutId = setTimeout(updateDimensions, 50);
    window.addEventListener("resize", updateDimensions);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateDimensions);
    };
  }, [children, fontSize, isMounted]);

  useEffect(() => {
    if (!isReady || !isMounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Set canvas size
    canvas.width = Math.max(dimensions.width, 1);
    canvas.height = Math.max(dimensions.height, 1);

    let time = 0;
    const baseSpeed = 0.008; // Original speed as base unit
    let animationFrameId: number;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      time += baseSpeed * speed;

      colors.forEach((color, i) => {
        const x =
          canvas.width *
          (0.5 +
            Math.cos(time * 0.8 + i * 1.3) * 0.4 +
            Math.sin(time * 0.5 + i * 0.7) * 0.2);
        const y =
          canvas.height *
          (0.5 +
            Math.sin(time * 0.7 + i * 1.5) * 0.4 +
            Math.cos(time * 0.6 + i * 0.8) * 0.2);

        // Create a radial gradient
        try {
          const gradient = ctx.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            canvas.width * 0.4
          );

          // Add color stops with proper alpha values for cross-browser compatibility
          const colorWithoutHash = color.replace("#", "");
          gradient.addColorStop(
            0,
            `rgba(${parseInt(colorWithoutHash.substring(0, 2), 16)}, ${parseInt(
              colorWithoutHash.substring(2, 4),
              16
            )}, ${parseInt(colorWithoutHash.substring(4, 6), 16)}, 0.6)`
          );
          gradient.addColorStop(
            0.5,
            `rgba(${parseInt(colorWithoutHash.substring(0, 2), 16)}, ${parseInt(
              colorWithoutHash.substring(2, 4),
              16
            )}, ${parseInt(colorWithoutHash.substring(4, 6), 16)}, 0.2)`
          );
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } catch (error) {
          console.error("Error creating gradient:", error);
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dimensions, colors, speed, isReady, isMounted]);

  // If not mounted yet (SSR), render a simple placeholder
  if (!isMounted) {
    return <span className={`inline-block ${className}`}>{children}</span>;
  }

  return (
    <span
      ref={containerRef}
      className={`relative inline-block align-middle ${className}`}
      style={{
        width: dimensions.width || "auto",
        height: dimensions.height || "auto",
      }}
    >
      {/* Hidden text for SEO */}
      <span className="sr-only">{children}</span>

      {/* Visual placeholder while canvas loads */}
      <span
        style={{
          opacity: isReady ? 0 : 1,
          transition: "opacity 0.2s ease-in",
          position: isReady ? "absolute" : "relative",
          display: "inline-block",
          whiteSpace: "nowrap",
        }}
        aria-hidden="true"
      >
        {children}
      </span>

      <div
        className="absolute inset-0"
        style={{
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.2s ease-in",
        }}
        aria-hidden="true"
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id={maskId}>
              <text
                ref={textRef}
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                style={textStyle as CSSProperties}
              >
                {children}
              </text>
            </clipPath>
          </defs>
        </svg>

        <canvas
          ref={canvasRef}
          style={{
            clipPath: `url(#${maskId})`,
            WebkitClipPath: `url(#${maskId})`,
          }}
          className="h-full w-full"
        />
      </div>
    </span>
  );
}
