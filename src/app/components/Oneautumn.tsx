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

  constructor(subdivisions = 3) {
    super();
    this.subdivisions = subdivisions;
    this.outerSphere = new THREE.Mesh();
    this.innerSpheresGroup = new THREE.Group();
    this.facePlane = new THREE.Mesh();
    this.add(this.innerSpheresGroup);
    this.createOuterSphere();
    this.createFace();
  }

  createOuterSphere() {
    const geometry = new THREE.SphereGeometry(1.15, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: "#FF0000",
      opacity: 0.4,
    });

    this.outerSphere = new THREE.Mesh(geometry, material);
    this.add(this.outerSphere);
  }

  createFace() {
    // Generate dynamic random angles for an unpredictable face orientation
    const baseAngles = [-240, -190, 110, 390, 80];
    const angles = baseAngles.map((angle) => {
      // Add random variation to each angle
      const randomOffset = (Math.random() - 3) * 145; // Random offset ±22.5 degrees
      const wobble = Math.sin(Date.now() * 1) * 25; // Subtle wobble effect
      return angle + randomOffset + wobble;
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
      this.add(plane);
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
  return (
    <Html transform>
      <svg
        width="150"
        height="120"
        viewBox="-65 -80 140 150"
        style={{ pointerEvents: "none" }}
      >
        {/* Left eye */}
        <svg
          x="-45"
          y="-30"
          width="35"
          height="35"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            fill="white"
            d="M127.233 110.308c18.623 7.05 43.69 5.765 59.65-3.058L200 100l-13.117-7.25c-15.96-8.823-41.026-10.107-59.65-3.058l-13.966 5.286c-.087-.281-.192-.553-.295-.826l13.574-6.12c18.154-8.184 34.969-26.817 40.017-44.341l4.148-14.402-14.402 4.148c-17.524 5.047-36.157 21.863-44.342 40.017l-5.91 13.11a13.937 13.937 0 0 0-.828-.379l5.079-13.419c7.049-18.623 5.764-43.69-3.058-59.65L100 0l-7.25 13.117c-8.823 15.96-10.107 41.026-3.058 59.65l5.079 13.419c-.283.114-.556.246-.828.379l-5.91-13.111C79.847 55.3 61.214 38.484 43.69 33.437L29.289 29.29l4.148 14.402C38.484 61.215 55.3 79.848 73.454 88.033l13.573 6.12c-.102.273-.208.544-.294.826l-13.967-5.287c-18.623-7.05-43.69-5.764-59.65 3.058L0 100l13.117 7.25c15.96 8.823 41.026 10.108 59.65 3.058l14.62-5.533c.114.252.23.505.36.749l-14.293 6.444c-18.153 8.184-34.97 26.817-40.017 44.341l-4.148 14.402 14.402-4.148c17.524-5.047 36.157-21.863 44.342-40.016l6.633-14.713c.245.102.5.186.751.275l-5.725 15.125c-7.05 18.623-5.764 43.69 3.058 59.65l7.25 13.117 7.251-13.117c8.822-15.96 10.107-41.026 3.058-59.65l-5.726-15.126c.252-.088.507-.172.752-.275l6.633 14.713c8.184 18.154 26.817 34.969 44.341 40.017l14.402 4.148-4.148-14.402c-5.047-17.524-21.863-36.157-40.016-44.342l-14.294-6.443c.13-.244.246-.497.361-.75l14.619 5.534Z"
          />
        </svg>

        {/* Right eye */}
        <svg
          x="15"
          y="-30"
          width="35"
          height="35"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            fill="white"
            d="M127.233 110.308c18.623 7.05 43.69 5.765 59.65-3.058L200 100l-13.117-7.25c-15.96-8.823-41.026-10.107-59.65-3.058l-13.966 5.286c-.087-.281-.192-.553-.295-.826l13.574-6.12c18.154-8.184 34.969-26.817 40.017-44.341l4.148-14.402-14.402 4.148c-17.524 5.047-36.157 21.863-44.342 40.017l-5.91 13.11a13.937 13.937 0 0 0-.828-.379l5.079-13.419c7.049-18.623 5.764-43.69-3.058-59.65L100 0l-7.25 13.117c-8.823 15.96-10.107 41.026-3.058 59.65l5.079 13.419c-.283.114-.556.246-.828.379l-5.91-13.111C79.847 55.3 61.214 38.484 43.69 33.437L29.289 29.29l4.148 14.402C38.484 61.215 55.3 79.848 73.454 88.033l13.573 6.12c-.102.273-.208.544-.294.826l-13.967-5.287c-18.623-7.05-43.69-5.764-59.65 3.058L0 100l13.117 7.25c15.96 8.823 41.026 10.108 59.65 3.058l14.62-5.533c.114.252.23.505.36.749l-14.293 6.444c-18.153 8.184-34.97 26.817-40.017 44.341l-4.148 14.402 14.402-4.148c17.524-5.047 36.157-21.863 44.342-40.016l6.633-14.713c.245.102.5.186.751.275l-5.725 15.125c-7.05 18.623-5.764 43.69 3.058 59.65l7.25 13.117 7.251-13.117c8.822-15.96 10.107-41.026 3.058-59.65l-5.726-15.126c.252-.088.507-.172.752-.275l6.633 14.713c8.184 18.154 26.817 34.969 44.341 40.017l14.402 4.148-4.148-14.402c-5.047-17.524-21.863-36.157-40.016-44.342l-14.294-6.443c.13-.244.246-.497.361-.75l14.619 5.534Z"
          />
        </svg>

        {/* Smile */}
        <path
          d="M -35 20 Q 0 50 35 20"
          stroke="white"
          strokeWidth="1"
          fill="none"
        />
      </svg>
    </Html>
  );
};

// Dynamic camera rig that responds to scroll position
function DynamicCameraRig() {
  const { camera, gl } = useThree();
  const [scrollSection, setScrollSection] = useState(0);
  const vec = new THREE.Vector3();
  const targetLookAt = new THREE.Vector3();
  const frameIdRef = useRef<number>();

  // Enhanced camera positions with smoother transitions
  const cameraPositions = [
    { pos: [0, -0.45, 2.45], lookAt: [0, 0.2, 0], ease: 0.15 },
    { pos: [0.5, 0.5, 3], lookAt: [0, -0.25, 0], ease: 0.015 },
    { pos: [2, 1, 3.2], lookAt: [0, 0.4, 0], ease: 0.018 },
    { pos: [1, 1.5, 3.5], lookAt: [0, 0.6, 0], ease: 0.02 },
    { pos: [-1, 0.5, 3.8], lookAt: [0, 0.3, 0], ease: 0.025 },
    { pos: [-2, -0.5, 4], lookAt: [0, -0.2, 0], ease: 0.022 },
    { pos: [-1, 1, 3.8], lookAt: [0, 0.5, 0], ease: 0.018 },
    { pos: [0, 2, 3.5], lookAt: [0, 1, 0], ease: 0.015 },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      const windowHeight = window.innerHeight;
      const rawSection = scrollPos / windowHeight;
      const section = Math.min(
        Math.floor(rawSection),
        cameraPositions.length - 1
      );
      setScrollSection(section);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
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

    const animationSpeed = 0.5 + Math.sin(time * 0.1) * 0.1;

    vec.set(
      currentPos.pos[0] + Math.sin(time * animationSpeed) * 0.3,
      currentPos.pos[1] + Math.cos(time * (animationSpeed * 0.6)) * 0.2,
      currentPos.pos[2] + Math.sin(time * (animationSpeed * 0.4)) * 0.1
    );

    targetLookAt.set(
      currentPos.lookAt[0] + Math.sin(time * 0.2) * 0.05,
      currentPos.lookAt[1] + Math.cos(time * 0.15) * 0.05,
      currentPos.lookAt[2]
    );

    const distanceToTarget = camera.position.distanceTo(vec);
    const dynamicEase = Math.max(
      currentPos.ease,
      distanceToTarget > 2 ? 0.03 : currentPos.ease
    );

    camera.position.lerp(vec, dynamicEase);

    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    const targetDirection = targetLookAt
      .clone()
      .sub(camera.position)
      .normalize();

    const rotationEase = Math.min(dynamicEase * 1.2, 0.53);
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

  useFrame(() => {
    // Make the sphere face always look at camera
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
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

  useEffect(() => {
    setIsClient(true);
    return () => {
      if (glRef.current) {
        glRef.current.dispose();
      }
    };
  }, []);

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
        >
          <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={80} />
          <DynamicCameraRig />
          <ambientLight intensity={0.9} />
          <pointLight position={[10, 10, 10]} />
          <directionalLight position={[3, 3, 3]} intensity={5} castShadow />
          {/* Add white fog near bottom of view */}
          <fog attach="fog" args={["white", 2, 4]} />
          <Sphere scale={0.68} />
        </Canvas>
      </div>
    </div>
  );
};

export default Scene;
