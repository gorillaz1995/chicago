"use client";
import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  Html,
  CameraControls,
  Environment,
  Preload,
} from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import "./graces.css";
import { useRouter } from "next/navigation"; // Added router import

// Define types for GLTF model
interface GLTFResult extends GLTF {
  nodes: {
    Node_3: THREE.Mesh;
  };
}

// Types for component props
interface ModelProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isLowPerformance?: boolean;
}

interface AnnotationProps {
  children: React.ReactNode;
  position: [number, number, number];
  phase?: number;
  onClick?: () => void;
}

// Preload the 3D model
useGLTF.preload("/graces-draco.glb");

export default function Ograce() {
  const cameraRef = useRef<CameraControls>(null);
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Check device performance and screen width on mount
  useEffect(() => {
    const checkPerformance = () => {
      // Use proper type for navigator.deviceMemory
      const memory = (navigator as Navigator & { deviceMemory?: number })
        .deviceMemory;
      return memory !== undefined && memory <= 4;
    };

    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1000);
    };

    setIsLowPerformance(checkPerformance());
    handleResize(); // Initial check

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handlers for camera movement
  const handleInteractionStart = () => {
    // Handle interaction start
  };

  return (
    <>
      <Canvas
        shadows={!isLowPerformance}
        camera={{ position: [0, 4, 17.5], fov: isMobileView ? 60 : 45 }}
        dpr={isLowPerformance ? 1 : [1, 2]}
        performance={{ min: 0.5 }}
        gl={{
          antialias: !isLowPerformance,
          powerPreference: "high-performance",
          precision: isLowPerformance ? "lowp" : "highp",
        }}
      >
        <Environment preset="sunset" />
        <ambientLight intensity={isLowPerformance ? 1.2 : 0.8} />
        <fog attach="fog" args={["#fff5eb", 0, 35]} />

        <directionalLight
          position={[5, 5, 5]}
          intensity={3}
          castShadow
          color="#ffeedd"
        />

        <spotLight
          position={[0, 15, 3]}
          intensity={4}
          angle={1.2}
          decay={1.2}
          distance={35}
          castShadow
          color="#ffd6a5"
        />

        <spotLight
          position={[-5, 5, -5]}
          intensity={2}
          angle={0.8}
          penumbra={1}
          color="#fff1e6"
        />

        <Model position={[0, -4.5, 0]} rotation={[0, -0.2, 0]} />

        <CameraControls
          ref={cameraRef}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.2}
          minAzimuthAngle={-Math.PI / 2.5}
          maxAzimuthAngle={Math.PI / 2.5}
          minDistance={isMobileView ? 40 : 35}
          maxDistance={isMobileView ? 55 : 45}
          boundaryFriction={0.9}
          smoothTime={1.2}
          enabled={false}
          onStart={handleInteractionStart}
          restThreshold={0.01}
          dampingFactor={0.05}
          draggingDampingFactor={0.25}
        />
        <Preload all />
      </Canvas>
      {/* Enhanced volumetric fog effect with inverted pyramid and fluid flame-like animation */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          height: "35vh",
          background: `
            conic-gradient(
              from 90deg at 50% 0%,
              rgba(255, 245, 235, 0) 0deg,
              rgba(255, 245, 235, 1) 90deg,
              rgba(255, 245, 235, 1) 270deg,
              rgba(255, 245, 235, 0) 360deg
            )
          `,
          filter: "blur(25px)",
          pointerEvents: "none",
          zIndex: 2,
          mixBlendMode: "overlay",
          animation:
            "fluidFog 1.65s ease-out forwards, flameDance 1.65s ease-in-out infinite",
          transformOrigin: "top center",
        }}
      />

      <style jsx>{`
        @keyframes fluidFog {
          0% {
            clip-path: polygon(50% 0%, 50% 0%, 50% 0%);
            opacity: 0;
          }
          100% {
            clip-path: polygon(0% 0%, 50% 100%, 100% 0%);
            opacity: 1;
          }
        }

        @keyframes flameDance {
          0% {
            transform: translateX(-50%) scaleX(1);
          }
          50% {
            transform: translateX(-50%) scaleX(1.1);
          }
          100% {
            transform: translateX(-50%) scaleX(1);
          }
        }
      `}</style>
    </>
  );
}

function Model({ position, rotation, isLowPerformance = false }: ModelProps) {
  const router = useRouter(); // Added router hook
  const group = useRef<THREE.Group>(null);
  const { nodes, scene } = useGLTF(
    "/graces-draco.glb"
  ) as unknown as GLTFResult;
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const rotationLimit = Math.PI / 8; // Reduced rotation limit to ~105 degrees

  useFrame(() => {
    if (!isLowPerformance) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = new THREE.MeshStandardMaterial({
            color: "#404044",
            roughness: 0.7,
            metalness: 0.3,
          });
        }
      });
    }
  });

  useFrame((state, delta) => {
    if (group.current && !isPaused) {
      const currentRotation = group.current.rotation.y;
      if (currentRotation >= rotationLimit) {
        setDirection(-1);
      } else if (currentRotation <= -rotationLimit) {
        setDirection(1);
      }
      group.current.rotation.y +=
        direction * delta * (isLowPerformance ? 0.04 : 0.075);
    }
  });

  const handleNavigation = (path: string) => {
    setIsPaused(true);
    setTimeout(() => {
      router.push(path);
    }, 300);
  };

  const handlePortofoliuClick = () => handleNavigation("/portofoliu");
  const handleServiciiClick = () => handleNavigation("/servicii");
  const handleContactClick = () => handleNavigation("/contact");

  return (
    <group ref={group} position={position} rotation={rotation}>
      <mesh
        castShadow={!isLowPerformance}
        receiveShadow={!isLowPerformance}
        geometry={nodes.Node_3.geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={0.2}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {isLowPerformance ? (
          <meshPhongMaterial
            color="#f5f5f0"
            shininess={30}
            specular="#e0e0d0"
            emissive="#1a1a1a"
            emissiveIntensity={0.05}
            flatShading={false}
          />
        ) : (
          <meshStandardMaterial
            color="#505058"
            roughness={0.5}
            metalness={0.7}
            envMapIntensity={2.5}
            emissive="#202024"
            emissiveIntensity={0.3}
          />
        )}
      </mesh>
      <Annotation
        position={[1.75, 3, 2.5]}
        phase={0}
        onClick={handlePortofoliuClick}
      >
        <button
          onClick={handlePortofoliuClick}
          style={{
            background: "rgba(0, 0, 0, 1)", // Changed to solid black
            border: "1px solid rgba(0, 0, 0, 1)",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "8px 16px",
            color: "#e6e6e6", // Changed to ivory/silver color
            transition: "all 0.3s ease",
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontSize: "14px",
            fontWeight: "500",
            backdropFilter: "blur(2px)",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 1)",
          }}
        >
          PORTOFOLIU{" "}
        </button>
      </Annotation>
      <Annotation
        position={[-4.5, 3.6, -3]}
        phase={0.33}
        onClick={handleContactClick}
      >
        <button
          onClick={handleContactClick}
          style={{
            background: "rgba(0, 0, 0, 1)", // Changed to solid black
            border: "1px solid rgba(0, 0, 0, 1)",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "8px 16px",
            color: "#e6e6e6", // Changed to ivory/silver color
            transition: "all 0.3s ease",
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontSize: "14px",
            fontWeight: "500",
            backdropFilter: "blur(2px)",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 1)",
          }}
        >
          CONTACT{" "}
        </button>
      </Annotation>
      <Annotation
        position={[2.7, 8, -3]} // Moved 15% to the right by increasing x position from 1.5 to 3.5
        phase={0.66}
        onClick={handleServiciiClick}
      >
        <button
          onClick={handleServiciiClick}
          style={{
            background: "rgba(0, 0, 0, 1)", // Changed to solid black
            border: "1px solid rgba(0, 0, 0, 1)",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "8px 16px",
            color: "#e6e6e6", // Changed to ivory/silver color
            transition: "all 0.3s ease",
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontSize: "14px",
            fontWeight: "500",
            backdropFilter: "blur(2px)",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 1)",
          }}
        >
          SERVICII{" "}
        </button>
      </Annotation>
    </group>
  );
}

function Annotation({
  children,
  position,
  phase = 0,
  onClick,
}: AnnotationProps) {
  const [yOffset, setYOffset] = useState(0);

  useEffect(() => {
    const floatAnimation = () => {
      const time = performance.now() * 0.001;
      const offset = Math.sin(time * 0.8 + phase * Math.PI * 2) * 0.2;
      setYOffset(offset);
    };

    const animationFrame = requestAnimationFrame(function animate() {
      floatAnimation();
      requestAnimationFrame(animate);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [phase]);

  const adjustedPosition: [number, number, number] = [
    position[0],
    position[1] + yOffset,
    position[2],
  ];

  return (
    <Html
      transform
      occlude="blending"
      position={adjustedPosition}
      style={{
        transition: "all 0.5s",
        opacity: 1,
        transform: "scale(1)",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <div className="annotation">{children}</div>
    </Html>
  );
}
