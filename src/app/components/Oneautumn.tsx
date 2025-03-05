"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Canvas,
  extend,
  useThree,
  Object3DNode,
  useFrame,
} from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";

import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Custom sphere class for creating the 3D sphere object
class CustomSphere extends THREE.Group {
  subdivisions: number;
  outerSphere: THREE.Mesh;
  innerSpheresGroup: THREE.Group;
  orbitGroup: THREE.Group;
  leftEye: THREE.Mesh | null;
  rightEye: THREE.Mesh | null;
  eyeContainer: THREE.Group;

  constructor(subdivisions = 3) {
    super();
    this.subdivisions = subdivisions;
    this.outerSphere = new THREE.Mesh();
    this.innerSpheresGroup = new THREE.Group();
    this.orbitGroup = new THREE.Group();
    this.leftEye = null;
    this.rightEye = null;
    this.eyeContainer = new THREE.Group();
    this.add(this.orbitGroup);
    this.orbitGroup.add(this.innerSpheresGroup);
    this.orbitGroup.add(this.eyeContainer);
    this.createOuterSphere();
    this.createFaceTexture();
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

  // Create a face using textures instead of HTML/SVG for better cross-browser compatibility
  createFaceTexture() {
    // Create a canvas to draw the face
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Clear canvas
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create texture from canvas for the face base
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;

      // Create a plane to display the face base
      const planeGeometry = new THREE.PlaneGeometry(1.5, 1.5);
      const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const facePlane = new THREE.Mesh(planeGeometry, planeMaterial);
      facePlane.position.z = 1.16; // Position slightly in front of the sphere
      this.orbitGroup.add(facePlane);

      // Create 3D eyes that can track movement
      // Eye whites
      const eyeWhiteGeometry = new THREE.CircleGeometry(0.15, 32);
      const eyeWhiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

      // Left eye white
      const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
      leftEyeWhite.position.set(-0.3, 0.1, 1.17);
      this.eyeContainer.add(leftEyeWhite);

      // Right eye white
      const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
      rightEyeWhite.position.set(0.3, 0.1, 1.17);
      this.eyeContainer.add(rightEyeWhite);

      // Eye pupils
      const eyePupilGeometry = new THREE.CircleGeometry(0.07, 32);
      const eyePupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

      // Left eye pupil
      this.leftEye = new THREE.Mesh(eyePupilGeometry, eyePupilMaterial);
      this.leftEye.position.set(-0.3, 0.1, 1.18);
      this.eyeContainer.add(this.leftEye);

      // Right eye pupil
      this.rightEye = new THREE.Mesh(eyePupilGeometry, eyePupilMaterial);
      this.rightEye.position.set(0.3, 0.1, 1.18);
      this.eyeContainer.add(this.rightEye);

      // Draw moustache (half circle)
      const moustacheGeometry = new THREE.CircleGeometry(0.25, 32, 0, Math.PI);
      const moustacheMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
      });
      const moustache = new THREE.Mesh(moustacheGeometry, moustacheMaterial);
      moustache.position.set(0, -0.45, 1.17);
      this.eyeContainer.add(moustache);
    }
  }

  // Method to update eye positions based on pointer coordinates
  updateEyePosition(normalizedX: number, normalizedY: number) {
    if (this.leftEye && this.rightEye) {
      // Limit the movement range of the pupils
      const maxEyeMove = 0.05;
      const eyeX = normalizedX * maxEyeMove;
      const eyeY = normalizedY * maxEyeMove;

      // Use GSAP for smooth animation
      gsap.to(this.leftEye.position, {
        x: -0.3 + eyeX,
        y: 0.1 + eyeY,
        duration: 0.3,
        ease: "power2.out",
      });

      gsap.to(this.rightEye.position, {
        x: 0.3 + eyeX,
        y: 0.1 + eyeY,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }

  dispose() {
    this.outerSphere.geometry.dispose();
    (this.outerSphere.material as THREE.Material).dispose();

    this.innerSpheresGroup.children.forEach((sphere) => {
      if (sphere instanceof THREE.Mesh) {
        sphere.geometry.dispose();
        (sphere.material as THREE.Material).dispose();
      }
    });

    // Dispose of eye geometries and materials
    if (this.leftEye instanceof THREE.Mesh) {
      this.leftEye.geometry.dispose();
      (this.leftEye.material as THREE.Material).dispose();
    }

    if (this.rightEye instanceof THREE.Mesh) {
      this.rightEye.geometry.dispose();
      (this.rightEye.material as THREE.Material).dispose();
    }

    this.eyeContainer.children.forEach((item) => {
      if (item instanceof THREE.Mesh) {
        item.geometry.dispose();
        (item.material as THREE.Material).dispose();
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

// Sphere component with cleanup on unmount
const Sphere: React.FC<{ scale: number }> = ({ scale }) => {
  const groupRef = useRef<CustomSphere>(null!);
  const frameIdRef = useRef<number>();
  const { gl } = useThree();

  useEffect(() => {
    const currentGroupRef = groupRef.current;

    // Handle mouse/touch movement for eye tracking
    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      if (!groupRef.current) return;

      const x =
        "touches" in event
          ? event.touches[0].clientX
          : (event as MouseEvent).clientX;
      const y =
        "touches" in event
          ? event.touches[0].clientY
          : (event as MouseEvent).clientY;

      // Convert to normalized coordinates (-1 to 1)
      const normalizedX = (x / window.innerWidth) * 2 - 1;
      const normalizedY = -((y / window.innerHeight) * 2 - 1);

      // Update eye positions
      groupRef.current.updateEyePosition(normalizedX, normalizedY);
    };

    // Add event listeners
    const canvas = gl.domElement;
    canvas.addEventListener("mousemove", handlePointerMove);
    canvas.addEventListener("touchmove", handlePointerMove);

    return () => {
      if (frameIdRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        cancelAnimationFrame(frameIdRef.current);
      }
      if (currentGroupRef) {
        currentGroupRef.dispose();
      }

      // Remove event listeners
      canvas.removeEventListener("mousemove", handlePointerMove);
      canvas.removeEventListener("touchmove", handlePointerMove);
    };
  }, [gl]);

  useFrame((state) => {
    if (groupRef.current) {
      // Add subtle breathing animation to the sphere
      const time = state.clock.getElapsedTime();
      groupRef.current.scale.x =
        scale * 1.224 * (1 + Math.sin(time * 0.5) * 0.02);
      groupRef.current.scale.y =
        scale * 1.224 * (1 + Math.sin(time * 0.5) * 0.02);
      groupRef.current.scale.z =
        scale * 1.224 * (1 + Math.sin(time * 0.5) * 0.02);

      // Subtle rotation for more natural appearance
      groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.05;
      groupRef.current.rotation.x = Math.cos(time * 0.15) * 0.03;
    }
  });

  return <customSphere ref={groupRef} scale={scale * 1.224} />;
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

  // Add visual feedback for interaction with device-specific handling
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
        cancelAnimationFrame(frameIdRef.current);
      }
      gl.dispose();
    };
  }, [cameraPositions.length, gl]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const currentPos = cameraPositions[scrollSection];

    // Smoother animation with pointer/touch influence
    const animationSpeed = 0.3 + Math.sin(time * 0.1) * 0.05;
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
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const headlineRef = useRef<HTMLSpanElement>(null);

  const headlineContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);

    // Wait for DOM elements to be available
    const headline = headlineRef.current;
    const container = headlineContainerRef.current;

    if (headline && container) {
      // Create a timeline for synchronized animations
      const tl = gsap.timeline({
        defaults: {
          ease: "power2.out",
          duration: 1.5,
        },
      });

      // Initial animation sequence
      tl.from(headline, {
        y: 100,
        opacity: 0,
      });
      // Scroll-triggered animation with graceful, ice-skating-like motion
      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: "bottom center",
        scrub: true, // Enable dynamic scrubbing
        pin: container,
        pinSpacing: false,
        onUpdate: (self) => {
          const progress = self.progress;
          const velocity = Math.abs(self.getVelocity() / 1000); // Get scroll velocity

          // Calculate dynamic duration based on scroll velocity
          // Faster scrolls = shorter duration for responsiveness
          // Slower scrolls = longer duration for graceful motion
          const dynamicDuration = Math.max(0.8, 2.5 - velocity);

          // Calculate dynamic ease strength
          // Faster scrolls = sharper ease
          // Slower scrolls = gentler ease
          const easeStrength = Math.min(0.8, 0.3 + velocity * 0.2);

          // Custom ease function combining power and elastic for graceful motion
          const customEase = `power${Math.min(
            4,
            Math.max(2, velocity * 3)
          )}.out(${easeStrength})`;

          // Animate headline with dynamic parameters
          gsap.to(headline, {
            y: progress * window.innerHeight * 0.5,
            opacity: 1 - progress * 0.5,
            duration: dynamicDuration,
            ease: customEase,
            overwrite: true, // Prevent animation queue buildup
          });
        },
        onLeaveBack: () => {
          // Smooth return animation
          gsap.to(headline, {
            y: 0,
            opacity: 1,
            duration: 1.2,
            ease: "elastic.out(0.7, 0.5)", // Bouncy, graceful return
          });
        },
      });

      // Cleanup function
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
        ref={headlineContainerRef}
        style={{
          position: "absolute",
          top: "20%",
          left: 0,
          width: "100%",
          zIndex: -1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 1rem",
        }}
      >
        <h1
          className="font-ogg"
          style={{
            fontSize: "clamp(4.99rem, 9vw, 9rem)",
            color: "#000000",
            textTransform: "uppercase",
            textShadow: "3px 3px 6px rgba(0,0,0,0.4)",
            letterSpacing: "0.2em",
            textAlign: "left",
            whiteSpace: "normal", // Allow text wrapping
            wordBreak: "break-word", // Break words when needed
            display: "flex", // Keep flex for dot alignment
            alignItems: "center",
            flexWrap: "wrap", // Allow flex items to wrap
            justifyContent: "center", // Center wrapped content
          }}
        >
          <span ref={headlineRef}>DISTINCT</span>
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
            // Copy phone number to clipboard
            navigator.clipboard.writeText("0721 792 999");
            // Animate button click with GSAP

            // Show a custom popup notification instead of alert
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
          className="px-12 py-2 rounded-full relative bg-black text-white text-xl lg:text-6xl hover:shadow-4xl hover:shadow-white/[0.1] transition duration-100 border border-red-300 font-ogg"
          style={{
            marginLeft: "max(0px, calc((100vw - 1000px) * 1.5))",
          }}
        >
          <div className="absolute inset-x-0 h-px w-1/2 mx-auto -top-px shadow-4xl bg-gradient-to-r from-transparent via-red-600 to-transparent" />
          <span className="relative z-20">Hai sa discutam</span>
        </button>
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
