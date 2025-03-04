"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Canvas,
  extend,
  useThree,
  Object3DNode,
  useFrame,
} from "@react-three/fiber";
import { PerspectiveCamera, Html } from "@react-three/drei";

import * as THREE from "three";

// Custom sphere class for creating the 3D sphere object with face
class CustomSphere extends THREE.Group {
  subdivisions: number;
  outerSphere: THREE.Mesh;
  innerSpheresGroup: THREE.Group;
  facePlane: THREE.Mesh;
  orbitGroup: THREE.Group;

  constructor(subdivisions = 3) {
    super();
    this.subdivisions = subdivisions;
    this.outerSphere = new THREE.Mesh();
    this.innerSpheresGroup = new THREE.Group();
    this.facePlane = new THREE.Mesh();
    this.orbitGroup = new THREE.Group();
    this.add(this.orbitGroup);
    this.orbitGroup.add(this.innerSpheresGroup);
    this.createOuterSphere();
    this.createFace();
  }

  createOuterSphere() {
    const geometry = new THREE.SphereGeometry(1.15, 24, 24);
    const material = new THREE.MeshPhongMaterial({
      color: "#FF0000",
      opacity: 0.7,
    });

    this.outerSphere = new THREE.Mesh(geometry, material);
    this.orbitGroup.add(this.outerSphere);
  }

  createFace() {
    // Generate dynamic random angles with increased rotation range for more fluid face movement
    // Define angles for front and profile views (90° intervals)
    const baseAngles = [-120, 0, 120]; // Front and profile angles
    const angles = baseAngles.map((angle) => {
      // Add subtle random variation to maintain face-like appearance

      const fluidMotion = Math.cos(Date.now() * 0.0005) * 10; // Subtle fluid motion
      // Combine effects while maintaining recognizable front/profile poses
      return angle + fluidMotion;
    });

    // Create multiple planes with dynamic positioning
    angles.forEach((angle) => {
      const planeGeometry = new THREE.PlaneGeometry(1.015, 1.015);
      const planeMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });

      const plane = new THREE.Mesh(planeGeometry, planeMaterial);

      // Dynamic positioning with more extreme variations
      const distanceFromCenter = 1.045 + Math.random() * 0.5;
      const heightVariation = (Math.random() - 0.5) * 0.5;

      // Complex rotation for more unpredictable face orientations
      plane.rotation.y = (angle * Math.PI) / 120;
      plane.rotation.x = ((Math.random() - 0.5) * Math.PI) / 14; // Slight tilt
      plane.rotation.z = ((Math.random() - 0.5) * Math.PI) / 16; // Additional rotation

      // Position with added randomness while maintaining front-facing tendency
      plane.position.x = Math.sin(plane.rotation.y) * distanceFromCenter;
      plane.position.y = heightVariation;
      plane.position.z = Math.cos(plane.rotation.y) * distanceFromCenter;

      this.facePlane = plane;
      this.orbitGroup.add(plane);
    });
  }

  dispose() {
    this.outerSphere.geometry.dispose();
    (this.outerSphere.material as THREE.Material).dispose();
    this.facePlane.geometry.dispose();
    (this.facePlane.material as THREE.Material).dispose();

    this.innerSpheresGroup.children.forEach((sphere) => {
      if (sphere instanceof THREE.Mesh) {
        sphere.geometry.dispose();
        (sphere.material as THREE.Material).dispose();
      }
    });
  }
}

extend({ CustomSphere });

declare module "@react-three/fiber" {
  interface ThreeElements {
    customSphere: Object3DNode<CustomSphere, typeof CustomSphere>;
  }
}

// Face SVG component that will always face the camera
const Face: React.FC = () => {
  const leftEyeRef = useRef<SVGSVGElement>(null);
  const rightEyeRef = useRef<SVGSVGElement>(null);

  return (
    <Html transform>
      <svg
        width="70"
        height="70"
        viewBox="-65 -80 140 150"
        style={{ pointerEvents: "none" }}
      >
        {/* Left eye */}
        <svg
          ref={leftEyeRef}
          x="-65"
          y="-40"
          width="35"
          height="35"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          xmlnsXlink="http://www.w3.org/1999/xlink"
        >
          <g clipPath="url(#clip0_133_2)">
            <path
              fill="rgba(255, 255, 255, 1)"
              d="M50.714 0h-50v50c0 25.462 19.033 46.479 43.647 49.6C19.401 102.402 0 123.578 0 149.286v50h50c25.462 0 46.479-19.033 49.6-43.647 2.802 24.96 23.978 44.361 49.686 44.361h50v-50c0-25.462-19.033-46.479-43.647-49.6C180.599 97.598 200 76.422 200 50.714v-50h-50c-25.462 0-46.479 19.033-49.6 43.647C97.598 19.401 76.422 0 50.714 0Z"
            />
          </g>
        </svg>

        {/* Right eye */}
        <svg
          ref={rightEyeRef}
          x="35"
          y="-40"
          width="35"
          height="35"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          xmlnsXlink="http://www.w3.org/1999/xlink"
        >
          <g clipPath="url(#clip0_133_2)">
            <path
              fill="rgba(255, 255, 255, 1)"
              d="M50.714 0h-50v50c0 25.462 19.033 46.479 43.647 49.6C19.401 102.402 0 123.578 0 149.286v50h50c25.462 0 46.479-19.033 49.6-43.647 2.802 24.96 23.978 44.361 49.686 44.361h50v-50c0-25.462-19.033-46.479-43.647-49.6C180.599 97.598 200 76.422 200 50.714v-50h-50c-25.462 0-46.479 19.033-49.6 43.647C97.598 19.401 76.422 0 50.714 0Z"
            />
          </g>
        </svg>
        {/* Smile (upside down) */}
        <svg
          x="-35"
          y="20"
          width="70"
          height="65"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          xmlnsXlink="http://www.w3.org/1999/xlink"
        >
          <path
            fill="rgba(255, 255, 255, 1)"
            d="M0 50c0 55.228 44.772 100 100 100s100-44.772 100-100H0Z"
          />
        </svg>
      </svg>
    </Html>
  );
};

// Dynamic camera rig that responds to scroll position and pointer/touch input
function DynamicCameraRig() {
  const { camera, gl } = useThree();
  const [scrollSection, setScrollSection] = useState(0);
  const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });
  const vec = new THREE.Vector3();
  const targetLookAt = new THREE.Vector3();
  const frameIdRef = useRef<number>();
  const sphereRef = useRef<CustomSphere>();

  // Add visual feedback for interaction and face tracking with device-specific handling
  useEffect(() => {
    const canvas = gl.domElement;
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Set appropriate cursor style for non-touch devices
    if (!isTouchDevice) {
      canvas.style.cursor = "grab";
    }

    // Handle mouse movement for desktop devices
    const handleMouseMove = (event: MouseEvent) => {
      const x = event.clientX;
      const y = event.clientY;

      // Convert screen coordinates to normalized device coordinates (-1 to +1)
      const normalizedX = (x / window.innerWidth) * 2 - 1;
      const normalizedY = -(y / window.innerHeight) * 2 + 1;

      setPointerPosition({ x: normalizedX, y: normalizedY });

      if (sphereRef.current) {
        const targetPos = new THREE.Vector3(
          normalizedX * 4,
          normalizedY * 4,
          0
        );
        sphereRef.current.lookAt(targetPos);
      }
    };

    // Handle touch movement for mobile devices
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];

      // iOS-specific touch coordinate adjustment
      const x = isIOS ? touch.screenX : touch.clientX;
      const y = isIOS ? touch.screenY : touch.clientY;

      // Apply iOS-specific scaling factor
      const scaleFactor = isIOS ? 0.8 : 1;

      const normalizedX = ((x / window.innerWidth) * 2 - 1) * scaleFactor;
      const normalizedY = (-(y / window.innerHeight) * 2 + 1) * scaleFactor;

      setPointerPosition({ x: normalizedX, y: normalizedY });

      if (sphereRef.current) {
        const targetPos = new THREE.Vector3(
          normalizedX * 4,
          normalizedY * 4,
          0
        );
        sphereRef.current.lookAt(targetPos);
      }
    };

    // Add appropriate event listeners based on device type
    if (isTouchDevice) {
      // For touch devices, add touchmove with passive true
      canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
    } else {
      // For non-touch devices
      canvas.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    return () => {
      if (isTouchDevice) {
        canvas.removeEventListener("touchmove", handleTouchMove);
      } else {
        canvas.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, [gl]);

  // Enhanced camera positions with smoother transitions - doubled for more granular movement
  const cameraPositions = [
    { pos: [0, -0.45, 2.45], lookAt: [0, 0.2, 0], ease: 0.008 },
    { pos: [0.25, -0.2, 2.6], lookAt: [0, 0.1, 0], ease: 0.009 },
    { pos: [0.5, 0.1, 2.8], lookAt: [0, 0, 0], ease: 0.01 },
    { pos: [0.5, 0.5, 3], lookAt: [0, -0.25, 0], ease: 0.011 },
    { pos: [1.25, 0.75, 3.1], lookAt: [0, 0.1, 0], ease: 0.012 },
    { pos: [2, 1, 3.2], lookAt: [0, 0.4, 0], ease: 0.013 },
    { pos: [1.5, 1.25, 3.35], lookAt: [0, 0.5, 0], ease: 0.014 },
    { pos: [1, 1.5, 3.5], lookAt: [0, 0.6, 0], ease: 0.015 },
    { pos: [0, 1.25, 3.65], lookAt: [0, 0.45, 0], ease: 0.016 },
    { pos: [-1, 0.5, 3.8], lookAt: [0, 0.3, 0], ease: 0.017 },
    { pos: [-1.5, 0, 3.9], lookAt: [0, 0, 0], ease: 0.018 },
    { pos: [-2, -0.5, 4], lookAt: [0, -0.2, 0], ease: 0.019 },
    { pos: [-1.5, 0.25, 3.9], lookAt: [0, 0.15, 0], ease: 0.018 },
    { pos: [-1, 1, 3.8], lookAt: [0, 0.5, 0], ease: 0.017 },
    { pos: [-0.5, 1.5, 3.65], lookAt: [0, 0.75, 0], ease: 0.016 },
    { pos: [0, 2, 3.5], lookAt: [0, 1, 0], ease: 0.015 },
  ];

  useEffect(() => {
    // Check if device has touch capability
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const handleScroll = () => {
      const scrollPos = window.scrollY;
      const windowHeight = window.innerHeight;
      const rawSection = (scrollPos / windowHeight) * 2; // Multiply by 2 for smoother transitions
      const section = Math.min(
        Math.floor(rawSection),
        cameraPositions.length - 1
      );
      setScrollSection(section);
    };

    const handlePointerMove = (event: PointerEvent) => {
      // Only handle mouse interactions on non-touch devices
      if (!isTouchDevice) {
        const x = event.clientX;
        const y = event.clientY;

        setPointerPosition({
          x: (x / window.innerWidth) * 2 - 1,
          y: -(y / window.innerHeight) * 2 + 1,
        });
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Only add pointer interaction listeners for non-touch devices
    if (!isTouchDevice) {
      window.addEventListener("pointermove", handlePointerMove);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (!isTouchDevice) {
        window.removeEventListener("pointermove", handlePointerMove);
      }
      if (frameIdRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        cancelAnimationFrame(frameIdRef.current);
      }
      gl.dispose();
    };
  }, [cameraPositions.length, gl]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const currentPos = cameraPositions[scrollSection];

    // Check if device has touch capability
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Smoother animation with pointer influence only on non-touch devices
    const animationSpeed = 0.3 + Math.sin(time * 0.1) * 0.05;
    const pointerInfluence = isTouchDevice ? 0 : 0.3; // No pointer influence on touch devices

    vec.set(
      currentPos.pos[0] +
        Math.sin(time * animationSpeed) * 0.2 +
        (isTouchDevice ? 0 : pointerPosition.x * pointerInfluence),
      currentPos.pos[1] +
        Math.cos(time * (animationSpeed * 0.6)) * 0.15 +
        (isTouchDevice ? 0 : pointerPosition.y * pointerInfluence),
      currentPos.pos[2] + Math.sin(time * (animationSpeed * 0.4)) * 0.1
    );

    targetLookAt.set(
      currentPos.lookAt[0] + (isTouchDevice ? 0 : pointerPosition.x * 0.2),
      currentPos.lookAt[1] + (isTouchDevice ? 0 : pointerPosition.y * 0.2),
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

// Sphere component with cleanup on unmount and face tracking
const Sphere: React.FC<{ scale: number }> = ({ scale }) => {
  const groupRef = useRef<CustomSphere>(null!);
  const frameIdRef = useRef<number>();
  const { camera } = useThree();

  useEffect(() => {
    const currentGroupRef = groupRef.current;
    return () => {
      if (frameIdRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        cancelAnimationFrame(frameIdRef.current);
      }
      if (currentGroupRef) {
        currentGroupRef.dispose();
      }
    };
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      // Make the face always look at camera
      groupRef.current.quaternion.copy(camera.quaternion);

      // Add orbital rotation to the sphere itself
      const time = state.clock.getElapsedTime();
      groupRef.current.orbitGroup.rotation.y += 0.005; // Adjust speed as needed
      groupRef.current.orbitGroup.rotation.x = Math.sin(time * 0.2) * 0.1; // Add slight wobble
    }
  });

  return (
    <customSphere ref={groupRef} scale={scale * 1.224}>
      <Face />
    </customSphere>
  );
};

// Main scene component that renders 3D element with transparent background
const Scene: React.FC = () => {
  const [canvasError, setCanvasError] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const headlineRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setIsClient(true);

    // Wait for DOM elements to be available
    const headline = headlineRef.current;
    const dot = dotRef.current;

    if (headline && dot) {
      // Cleanup function
      return () => {
        if (glRef.current) {
          glRef.current.dispose();
        }
      };
    }
  }, [isClient]); // Keep isClient dependency for DOM readiness

  const handleContextCreationError = () => {
    setCanvasError(true);
    console.error("WebGL context creation failed");
  };

  if (!isClient) {
    return <div>Loading...</div>;
  }

  if (canvasError) {
    return (
      <div>
        Failed to create WebGL context. Please check your browser settings.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {/* NEW ERA Headline */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: 0,
          width: "100%",
          zIndex: -1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 1rem", // Add padding for mobile
        }}
      >
        <h1
          className="font-ogg"
          style={{
            fontSize: "clamp(4.99rem, 9vw, 9rem)", // Reduced font size
            color: "#000000",
            textTransform: "uppercase",
            textShadow: "3px 3px 6px rgba(0,0,0,0.4)",
            letterSpacing: "0.2em",
            textAlign: "left",
            wordBreak: "break-word",
            maxWidth: "120%",
            overflowWrap: "break-word",
            hyphens: "auto",
          }}
        >
          <span ref={headlineRef}>DISTINCT</span>
          <span ref={dotRef} style={{ color: "#FF0000" }}>
            .
          </span>
        </h1>
      </div>

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      >
        <Canvas
          style={{ background: "none" }}
          gl={{ alpha: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            glRef.current = gl;
          }}
          onError={handleContextCreationError}
          eventSource={document.getElementById("root") || undefined}
          eventPrefix="client"
        >
          <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={80} />
          <DynamicCameraRig />
          <ambientLight intensity={0.9} />
          <pointLight position={[10, 10, 10]} />
          <directionalLight position={[3, 3, 3]} intensity={5} castShadow />
          {/* Add white fog near bottom of view */}
          <fog attach="fog" args={["white", 1, 4]} />
          <Sphere scale={0.4} />
        </Canvas>
      </div>

      <div
        style={{
          position: "absolute",
          top: "10%",
          left: 0,
          width: "150%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "120%",
            height: "clamp(2.232rem, 4.65vw, 5.58rem)",
            background: "#000000",
            transform: "rotate(-15deg) translateY(-100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1,
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          <h3
            style={{
              color: "#FFFFFF",
              fontSize: "clamp(1rem, 2vw, 1.5rem)",
              fontWeight: "bold",
              textTransform: "uppercase",
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
              padding: "0.5rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              display: "flex",
              width: "100%",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ overflow: "hidden", width: "100%" }}>
              <div style={{ display: "flex", width: "200%" }}>
                <span
                  className="font-dexa"
                  style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    animation: "scrollTextReverse 70s linear infinite",
                  }}
                >
                  DIGITAL FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA
                  LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL
                  FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE •
                  DIGITAL FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA
                  LIMITE • DIGITAL FARA LIMITE •DIGITAL FARA LIMITE • DIGITAL
                  FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE •
                  DIGITAL FARA LIMITE • DIGITAL FARA LIMITE •DIGITAL FARA LIMITE
                  • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA
                  LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE •&nbsp;
                </span>
                <span
                  className="font-dexa"
                  style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    animation: "scrollTextReverse 70s linear infinite",
                  }}
                >
                  DIGITAL FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA
                  LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL
                  FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE •
                  DIGITAL FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA
                  LIMITE • DIGITAL FARA LIMITE •DIGITAL FARA LIMITE • DIGITAL
                  FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE •
                  DIGITAL FARA LIMITE • DIGITAL FARA LIMITE •DIGITAL FARA LIMITE
                  • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA
                  LIMITE • DIGITAL FARA LIMITE • DIGITAL FARA LIMITE •&nbsp;
                </span>
              </div>
            </div>
          </h3>
        </div>
        <div
          style={{
            position: "absolute",
            width: "120%",
            height: "clamp(2.232rem, 4.65vw, 5.58rem)",
            background: "#FFFFFF",
            transform: "rotate(-15deg)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1,
            boxShadow: "0 0 10px rgba(0,0,0,1)", // Increased opacity to 1 for solid black shadow
            overflow: "hidden",
          }}
        >
          <h3
            style={{
              color: "#000000",
              fontSize: "clamp(1rem, 2vw, 1.5rem)",
              fontWeight: "bold",
              textTransform: "uppercase",
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
              padding: "0.5rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              display: "flex",
              width: "100%",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ overflow: "hidden", width: "100%" }}>
              <div style={{ display: "flex", width: "200%" }}>
                <span
                  className="font-dexa"
                  style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    animation: "scrollText 70s linear infinite",
                  }}
                >
                  WEB DESIGN • GRAPHIC DESIGN • WEB DEV • SOCIAL MEDIA
                  MANAGEMENT • DIGITAL MARKETING • GOOGLE ADs • FACEBOOK ADs •
                  TikTok ADs • WEB DESIGN • GRAPHIC DESIGN • WEB DEV • SOCIAL
                  MEDIA MANAGEMENT • DIGITAL MARKETING • GOOGLE ADs • FACEBOOK
                  ADs • TikTok ADs •WEB DESIGN • GRAPHIC DESIGN • WEB DEV •
                  SOCIAL MEDIA MANAGEMENT • DIGITAL MARKETING • GOOGLE ADs •
                  FACEBOOK ADs • TikTok ADs •WEB DESIGN • GRAPHIC DESIGN • WEB
                  DEV • SOCIAL MEDIA MANAGEMENT • DIGITAL MARKETING • GOOGLE ADs
                  • FACEBOOK ADs • TikTok ADs •&nbsp;&nbsp;
                </span>
                <span
                  className="font-dexa"
                  style={{
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    animation: "scrollText 70s linear infinite",
                  }}
                >
                  WEB DESIGN • GRAPHIC DESIGN • WEB DEV • SOCIAL MEDIA
                  MANAGEMENT • DIGITAL MARKETING • GOOGLE ADs • FACEBOOK ADs •
                  TikTok ADs • WEB DESIGN • GRAPHIC DESIGN • WEB DEV • SOCIAL
                  MEDIA MANAGEMENT • DIGITAL MARKETING • GOOGLE ADs • FACEBOOK
                  ADs • TikTok ADs •WEB DESIGN • GRAPHIC DESIGN • WEB DEV •
                  SOCIAL MEDIA MANAGEMENT • DIGITAL MARKETING • GOOGLE ADs •
                  FACEBOOK ADs • TikTok ADs •WEB DESIGN • GRAPHIC DESIGN • WEB
                  DEV • SOCIAL MEDIA MANAGEMENT • DIGITAL MARKETING • GOOGLE ADs
                  • FACEBOOK ADs • TikTok ADs •&nbsp;
                </span>
              </div>
            </div>
          </h3>
        </div>
      </div>

      <style jsx>{`
        @keyframes scrollText {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes scrollTextReverse {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
        .banner-top::after,
        .banner-bottom::after {
          content: "";
          position: absolute;
          top: 15%;
          left: -100%;
          width: 100%;
          height: 70%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(252, 171, 252, 0.4),
            transparent
          );
          animation: shimmer 1.5s infinite;
        }
        .banner-top::after {
          animation-direction: reverse;
        }
      `}</style>
    </div>
  );
};

export default Scene;
