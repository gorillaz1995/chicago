"use client";

import React, { useRef, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF, useTexture } from "@react-three/drei";
import { LoadingSec } from "./Oer/Loadingsec";
import { FlipWords } from "./Oer/FlipWords";
import { AuroraText } from "../../components/magicui/aurora-text";
import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Custom Suzanne model component with chrome matcap
const Suzanne = ({ scale }: { scale: number }) => {
  const { scene } = useGLTF(
    "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf"
  );
  const modelRef = useRef<THREE.Group>();
  const [matcap] = useTexture([
    "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/materials/chrome-1/matcap_chrome_1.jpg",
  ]);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshMatcapMaterial({
            matcap: matcap,
          });
        }
      });
    }
  }, [scene, matcap]);

  useFrame((state) => {
    if (modelRef.current) {
      // Add subtle breathing animation
      const time = state.clock.getElapsedTime();
      modelRef.current.scale.x = scale * (1 + Math.sin(time * 0.5) * 0.02);
      modelRef.current.scale.y = scale * (1 + Math.sin(time * 0.5) * 0.02);
      modelRef.current.scale.z = scale * (1 + Math.sin(time * 0.5) * 0.02);

      // Subtle rotation
      modelRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
      modelRef.current.rotation.x = Math.cos(time * 0.15) * 0.03;
    }
  });

  return <primitive ref={modelRef} object={scene} scale={scale} />;
};

// Dynamic camera rig that responds to scroll position and pointer/touch input
function DynamicCameraRig() {
  const { camera, gl } = useThree();
  const [scrollSection, setScrollSection] = useState(0);
  const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });
  const vec = new THREE.Vector3();
  const targetLookAt = new THREE.Vector3();
  const frameIdRef = useRef<number>();

  // Enhanced camera positions with smoother transitions - doubled for more granular movement
  const cameraPositions = [
    { pos: [0, -0.45, 2.45], lookAt: [0, 0.2, 0], ease: 0.008 },
    { pos: [0.25, -0.2, 2.6], lookAt: [0, 0.1, 0], ease: 0.009 },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      const windowHeight = window.innerHeight;
      // Only animate for first 20% of next section
      const maxScroll = windowHeight * 1.2; // 120% of first section
      const clampedScrollPos = Math.min(scrollPos, maxScroll);
      const rawSection = (clampedScrollPos / windowHeight) * 2;
      const section = Math.min(
        Math.floor(rawSection),
        cameraPositions.length - 1
      );
      setScrollSection(section);
    };

    const handlePointerMove = (event: PointerEvent | TouchEvent) => {
      const x =
        "touches" in event
          ? event.touches[0].clientX
          : (event as PointerEvent).clientX;
      const y =
        "touches" in event
          ? event.touches[0].clientY
          : (event as PointerEvent).clientY;

      setPointerPosition({
        x: (x / window.innerWidth) * 2 - 1,
        y: -(y / window.innerHeight) * 2 + 1,
      });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("touchmove", handlePointerMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      gl.dispose();
    };
  }, [cameraPositions.length, gl]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const currentPos = cameraPositions[scrollSection];

    // Smoother animation with pointer/touch influence
    const animationSpeed = 0.4 + Math.sin(time * 0.1) * 0.05;
    const pointerInfluence = 0.3;

    vec.set(
      currentPos.pos[0] +
        Math.sin(time * animationSpeed) * 0.2 +
        pointerPosition.x * pointerInfluence,
      currentPos.pos[1] +
        Math.cos(time * (animationSpeed * 0.6)) * 0.15 +
        pointerPosition.y * pointerInfluence,
      currentPos.pos[2] + Math.sin(time * (animationSpeed * 0.4)) * 0.1
    );

    targetLookAt.set(
      currentPos.lookAt[0] + pointerPosition.x * 0.2,
      currentPos.lookAt[1] + pointerPosition.y * 0.2,
      currentPos.lookAt[2]
    );

    const distanceToTarget = camera.position.distanceTo(vec);
    const dynamicEase = Math.max(
      currentPos.ease,
      distanceToTarget > 2 ? 0.02 : currentPos.ease
    );

    camera.position.lerp(vec, dynamicEase);

    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    const targetDirection = targetLookAt
      .clone()
      .sub(camera.position)
      .normalize();

    const rotationEase = Math.min(dynamicEase * 1.1, 0.03);
    const lerpedDirection = currentLookAt.lerp(targetDirection, rotationEase);
    camera.lookAt(camera.position.clone().add(lerpedDirection));
  });

  return null;
}

// Main scene component that renders 3D element with transparent background
const Scene: React.FC = () => {
  const [canvasError, setCanvasError] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const headlineContainerRef = useRef<HTMLDivElement>(null);
  const staticTextRef = useRef<HTMLDivElement>(null);
  const flipWordsRef = useRef<HTMLDivElement>(null);

  // Array of services to flip through
  const services = [
    "Web Development",
    "Web Design",
    "Social Media",
    "Automatizari A.I.",
  ];

  useEffect(() => {
    setIsClient(true);

    // Wait for DOM elements to be available
    const container = headlineContainerRef.current;
    const staticText = staticTextRef.current;
    const flipWords = flipWordsRef.current;

    if (container && staticText && flipWords) {
      // Create a timeline for synchronized animations
      const tl = gsap.timeline({
        defaults: {
          ease: "power2.out",
          duration: 1.5,
        },
      });

      // Initial animation sequence
      tl.from(staticText, {
        y: 100,
        opacity: 0,
      }).from(
        flipWords,
        {
          y: 100,
          opacity: 0,
        },
        "-=1.2"
      );

      // Scroll-triggered animation with graceful, ice-skating-like motion
      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: "bottom center",
        scrub: true,
        pin: container,
        pinSpacing: false,
        onUpdate: (self) => {
          const progress = self.progress;
          const velocity = Math.abs(self.getVelocity() / 1000);

          const dynamicDuration = Math.max(0.8, 2.5 - velocity);
          const easeStrength = Math.min(0.8, 0.3 + velocity * 0.2);
          const customEase = `power${Math.min(
            4,
            Math.max(2, velocity * 3)
          )}.out(${easeStrength})`;

          gsap.to([staticText, flipWords], {
            y: progress * window.innerHeight * 0.5,
            opacity: 1 - progress * 0.5,
            duration: dynamicDuration,
            ease: customEase,
            overwrite: true,
          });
        },
        onLeaveBack: () => {
          gsap.to([staticText, flipWords], {
            y: 0,
            opacity: 1,
            duration: 1.2,
            ease: "elastic.out(0.7, 0.5)",
          });
        },
      });

      return () => {
        if (glRef.current) {
          glRef.current.dispose();
        }
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      };
    }
  }, [isClient]);

  const handleContextCreationError = () => {
    setCanvasError(true);
    console.error("WebGL context creation failed");
  };

  if (!isClient) {
    // Use the LoadingSec component with controlled loading state
    return <LoadingSec isLoading={true} duration={3000} />;
  }

  if (canvasError) {
    return (
      <div>
        Failed to create WebGL context. Please check your browser settings.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Use the LoadingSec component with controlled loading state */}
      {isLoading && (
        <LoadingSec
          isLoading={isLoading}
          onLoadingComplete={() => setIsLoading(false)}
          duration={1250}
        />
      )}

      {/* Headline with static text and FlipWords */}
      <div
        ref={headlineContainerRef}
        style={{
          position: "absolute",
          top: "clamp(45%, 45vw, 30%)", // Responsive positioning: 35% on smaller screens, 30% on larger screens
          left: 0,
          width: "100%",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 1rem",
        }}
      >
        {/* Static text with AuroraText for "alt film" */}
        <div
          ref={staticTextRef}
          className="font-geist font-light"
          style={{
            fontSize: "clamp(2.3rem, 5vw, 4.5rem)",
            color: "#000000", // Changed to black
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
            letterSpacing: "0.15em",
            textAlign: "center",
            marginBottom: "0rem",
            transform: "translateY(40%)", // Added transform to move text 15% closer to the bottom
          }}
        >
          {/* Added text-stroke effect for letter borders */}
          <span
            style={{
              WebkitTextStroke: "1px black", // Border for webkit browsers

              WebkitTextFillColor: "black", // Fill color
            }}
          >
            Sunt pe{" "}
          </span>
          <AuroraText
            colors={[
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
            ]}
            speed={1.2}
            className="font-geist font-extrabold inline-block"
          >
            alt film
          </AuroraText>
        </div>
        {/* FlipWords component */}
        <div
          ref={flipWordsRef}
          className="w-full text-center"
          style={{ transform: "translateY(99%)" }}
        >
          <FlipWords
            words={services}
            duration={1050} // 1.75 seconds between flips
            className="font-geist text-center text-[#2a2a2a] text-shadow-3xl tracking-[0.1em] text-[clamp(2rem,8vw,6rem)] font-thin leading-relaxed md:leading-normal"
            // Responsive text sizing using clamp - minimum 2.5rem, scaling with viewport width, maximum 6rem
            // Added font-bold for better visibility at larger sizes
            // Adjusted line height for better mobile display
          />
        </div>
      </div>

      {/* Canvas container limited to first section */}
      <div
        className="gradient"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      >
        <Canvas
          style={{ background: "none" }}
          gl={{ alpha: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            glRef.current = gl;
            // Set loading to false after Canvas is created
            setTimeout(() => setIsLoading(false), 1000);
          }}
          onError={handleContextCreationError}
          eventSource={document.getElementById("root") || undefined}
          eventPrefix="client"
        >
          <PerspectiveCamera makeDefault position={[3, -10, 6]} fov={60} />
          <DynamicCameraRig />
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} />
          <directionalLight position={[3, 3, 3]} intensity={3} castShadow />

          <Suzanne scale={0.9} />
        </Canvas>
      </div>

      {/* Call to action button */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => {
            navigator.clipboard.writeText("0721 792 999");

            const popup = document.createElement("div");
            popup.style.position = "fixed";
            popup.style.top = "50%";
            popup.style.left = "50%";
            popup.style.transform = "translate(-50%, -50%)";
            popup.style.backgroundColor = "black";
            popup.style.color = "white";
            popup.style.padding = "1rem 2rem";
            popup.style.borderRadius = "0.5rem";
            popup.style.zIndex = "1000";
            popup.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
            popup.style.opacity = "0";
            popup.style.transition = "opacity 0.3s ease";
            popup.innerText = "Număr de telefon copiat";
            document.body.appendChild(popup);
          }}
          className="px-8 py-2 rounded-full text-2xl lg:text-3xl text-white focus:ring-2 focus:ring-blue-400 hover:shadow-xl transition duration-200"
          style={{
            marginLeft: "max(0px, calc((100vw - 1000px) * 1.5))",
            transform: "scale(1)",
            backgroundImage:
              "radial-gradient(circle, #353535, #2c2c2c, #232323, #1b1b1b, #121212, #121212, #121212, #121212, #1b1b1b, #232323, #2c2c2c, #353535)",
            boxShadow: "4px 4px 8px rgba(255, 255, 255, 0.2)", // Added white shadow for 3D effect
          }}
        >
          <div className="absolute inset-x-0 h-px w-1/2 mx-auto -top-px shadow-4xl bg-gradient-to-r from-transparent via-red-600 to-transparent" />
          <span className="relative z-20">Hai sa discutam</span>
        </button>
      </div>
    </div>
  );
};

export default Scene;
