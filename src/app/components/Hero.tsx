"use client";

import dynamic from "next/dynamic";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Text, Environment, Center } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { MeshBVH, MeshBVHOptions } from "three-mesh-bvh";
import "./hero.css";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { useEffect, useState, useRef } from "react";
import { Vector2 } from "three";

// Dynamically import Popx with SSR disabled
const Popx = dynamic(() => import("./Popx"), { ssr: false });

// Add type definition for Navigator with deviceMemory
declare global {
  interface Navigator {
    deviceMemory?: number;
  }
}

// Define GLTF result type for proper typing
interface GLTFResult extends GLTF {
  nodes: {
    dragon: THREE.Mesh;
  };
  materials: Record<string, THREE.Material>;
}

interface ModelProps {
  scale: number;
}

// Main Hero component for heavenly-themed 3D scene
const Hero = () => {
  // State to handle responsive camera positioning with proper typing
  const [cameraPosition, setCameraPosition] = useState<
    [number, number, number]
  >([10, 20, 2]);
  const [groupPosition, setGroupPosition] = useState<[number, number, number]>([
    0, -1, -2,
  ]);
  const [textScale, setTextScale] = useState(2);
  const [titlePosition, setTitlePosition] = useState<[number, number, number]>([
    -5.5, 4, -10,
  ]);
  const [titleScale, setTitleScale] = useState(7);
  const [isScrolling, setIsScrolling] = useState(true);
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance detection
  useEffect(() => {
    // Check device performance
    const checkPerformance = () => {
      // Check for low-end devices based on memory
      const memory = navigator.deviceMemory;

      // Return true if device has 4GB or less RAM
      return memory !== undefined && memory <= 4;
    };
    const performanceResult = checkPerformance();
    setIsLowPerformance(!!performanceResult); // Convert to boolean explicitly
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scroll = () => {
      if (!isScrolling) return;
      container.scrollBy({
        top: 100,
        behavior: "smooth",
      });

      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight
      ) {
        container.scrollTop = 0;
      }
    };

    const scrollInterval = setInterval(scroll, 3000);
    return () => clearInterval(scrollInterval);
  }, [isScrolling]);

  // Handle responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setCameraPosition([18, 30, 8]);
        setGroupPosition([0, -1, -3]);
        setTextScale(1.5);
        setTitlePosition([-3, 3, -5]);
        setTitleScale(2);
      } else if (width <= 768) {
        setCameraPosition([11, 21, 3]);
        setGroupPosition([0, -1, -2.5]);
        setTextScale(1.8);
        setTitlePosition([-4, 3.5, -9]);
        setTitleScale(5.5);
      } else {
        setCameraPosition([10, 20, 2]);
        setGroupPosition([0, -1, -2]);
        setTextScale(2);
        setTitlePosition([-5.5, 4, -10]);
        setTitleScale(7);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle WebGL context error
  const handleContextCreationError = () => {
    setCanvasError(true);
    console.error("WebGL context creation failed");
  };

  if (canvasError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>
          Unable to load 3D content. Please check your browser settings or try a
          different browser.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
      onMouseEnter={() => setIsScrolling(false)}
      onMouseLeave={() => setIsScrolling(true)}
    >
      <Canvas
        shadows={
          isLowPerformance ? false : { enabled: true, type: THREE.PCFShadowMap }
        }
        camera={{ position: cameraPosition }}
        gl={{
          antialias: !isLowPerformance,
          powerPreference: "high-performance",
          precision: isLowPerformance ? "lowp" : "highp",
          alpha: true,
          stencil: false,
          depth: true,
          failIfMajorPerformanceCaveat: true,
        }}
        dpr={isLowPerformance ? 1 : [1, 2]}
        performance={{ min: 0.5 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0xffffff, 0);
        }}
        onError={handleContextCreationError}
      >
        <color attach="background" args={["#ffffff"]} />
        <fog attach="fog" args={["#ffffff", 8, 35]} />
        {/* Heavenly lighting setup */}
        {/* Adjusted fog settings for better visibility of distant objects while maintaining atmosphere */}
        <ambientLight intensity={1.2} color="#E8E8E8" />{" "}
        {/* Base silver-white ambient */}
        {!isLowPerformance && (
          <>
            <pointLight
              position={[0, 20, 10]}
              intensity={2.5}
              color="#FFFFFF"
            />{" "}
            {/* Pure white highlight */}
            <pointLight
              position={[-10, 10, -10]}
              intensity={1.8}
              color="#D3D3D3"
            />{" "}
            {/* Light gray accent */}
            <pointLight
              position={[10, 15, 5]}
              intensity={1.5}
              color="#C0C0C0"
            />{" "}
            {/* Silver accent */}
            <spotLight
              position={[0, 50, 0]}
              angle={0.3}
              penumbra={1}
              intensity={3}
              castShadow={!isLowPerformance}
              shadow-bias={-0.0001}
              color="#FFFFFF"
            />{" "}
            {/* Intense pure white spotlight for contrast */}
          </>
        )}
        {/* Main content group */}
        <group position={groupPosition}>
          <DynamicText
            scale={textScale}
            position={[0.4, 0.25, -1]}
            isLowPerformance={isLowPerformance}
          />
          <Center top rotation={[0, -Math.PI / 1.5, 0]} position={[0, -0.5, 3]}>
            <EnhancedDragonModel
              props={{ scale: 0.8 }}
              isLowPerformance={isLowPerformance}
              onInteraction={() => setShowPopup(true)}
            />
          </Center>
          <AnimatedTitle
            position={titlePosition}
            fontSize={titleScale}
            isLowPerformance={isLowPerformance}
          />
        </group>
        <Environment preset="dawn" />
        <Rig />
        {/* Post-processing effects only for high-performance devices */}
        {!isLowPerformance && (
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              height={200}
              intensity={0.5}
            />
            <ChromaticAberration
              offset={new Vector2(0.0005, 0.0005)}
              modulationOffset={0.1}
              radialModulation={false}
            />
          </EffectComposer>
        )}
      </Canvas>
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowPopup(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <button
              style={{
                position: "absolute",
                right: "20px",
                top: "20px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#000",
                zIndex: 1001,
              }}
              onClick={() => setShowPopup(false)}
            >
              ✕
            </button>
            <Popx />
          </div>
        </div>
      )}
    </div>
  );
};

export default dynamic(() => Promise.resolve(Hero), {
  ssr: false,
});

// Enhanced camera rig with dynamic movement and scene exploration
function Rig() {
  const vec = new THREE.Vector3();
  const targetLookAt = new THREE.Vector3();
  let focusOnText = false;

  useFrame((state) => {
    const sensitivity = window.innerWidth <= 480 ? 0.3 : 0.8;
    const time = state.clock.getElapsedTime();

    // Switch focus between bunny and background text every 5 seconds
    focusOnText = Math.floor(time / 5) % 2 === 1;

    if (focusOnText) {
      // When focusing on text, move camera to better view the background
      vec.set(
        2 + state.pointer.x * sensitivity + Math.sin(time * 0.4) * 1.2,
        1.5 + state.pointer.y * 0.4 + Math.cos(time * 0.3) * 0.5,
        5 + Math.sin(time * 0.2) * 0.8
      );
      targetLookAt.set(0, 1, -2); // Look towards the text
    } else {
      // When focusing on bunny and overall scene
      vec.set(
        1 + state.pointer.x * sensitivity + Math.sin(time * 0.5) * 0.8,
        0.5 + state.pointer.y * 0.3 + Math.cos(time * 0.3) * 0.4,
        3 + Math.sin(time * 0.2) * 0.5
      );
      targetLookAt.set(0, 0, 0); // Look at center
    }

    // Smooth camera movement
    state.camera.position.lerp(vec, 0.015);

    // Smooth look-at transition
    const currentLookAt = new THREE.Vector3();
    state.camera.getWorldDirection(currentLookAt);
    const targetDirection = targetLookAt
      .clone()
      .sub(state.camera.position)
      .normalize();
    const lerpedDirection = currentLookAt.lerp(targetDirection, 0.02);
    state.camera.lookAt(state.camera.position.clone().add(lerpedDirection));
  });
  return null;
}

// Enhanced dragon model with optimized effects and continuous rotation
function EnhancedDragonModel({
  props,
  isLowPerformance,
  onInteraction,
}: {
  props?: ModelProps;
  isLowPerformance: boolean;
  onInteraction: () => void;
}) {
  const { nodes } = useGLTF(
    "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/dragon/model.gltf",
    true // Enable draco compression
  ) as GLTFResult;

  const dragonRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (dragonRef.current) {
      const bvhOptions: MeshBVHOptions = {
        strategy: 0,
        maxLeafTris: 10,
      };
      const bvh = new MeshBVH(dragonRef.current.geometry, bvhOptions);
      dragonRef.current.geometry.boundsTree = bvh;
    }
  }, []);

  useFrame(({ clock }) => {
    if (dragonRef.current) {
      const time = clock.getElapsedTime();
      // Continuous 360-degree rotation
      dragonRef.current.rotation.y = time * 0.5; // Controls rotation speed
      dragonRef.current.position.y = -2.5 + Math.sin(time) * 0.1;

      if (textRef.current) {
        textRef.current.rotation.y = dragonRef.current.rotation.y;
      }
    }
  });

  return (
    <group>
      <mesh
        ref={dragonRef}
        castShadow
        receiveShadow={!isLowPerformance}
        geometry={nodes.dragon.geometry}
        position={[0, -2.8, 0]}
        onClick={onInteraction}
        onPointerDown={onInteraction}
        {...props}
      >
        {isLowPerformance ? (
          // Optimized crystalline material for low performance devices
          <meshPhongMaterial
            color="#FF3232" // Base red color
            shininess={100} // High shininess for crystal look
            specular="#FFE5E5" // Light red specular highlights
            emissive="#8B0000" // Dark red emissive
            opacity={0.85} // Slight transparency
            transparent={true}
          />
        ) : (
          // High quality crystalline material for better devices
          <meshPhysicalMaterial
            color="#FF0000" // Vibrant red base
            roughness={0.1} // Very smooth for crystal appearance
            metalness={0.2} // Low metalness for translucent look
            transmission={0.3} // Partial light transmission
            thickness={2} // Material thickness for refraction
            envMapIntensity={1.5} // Moderate environment reflections
            clearcoat={1} // Maximum clearcoat for glassy surface
            clearcoatRoughness={0.1} // Smooth clearcoat
            opacity={0.75} // Crystal transparency
            transparent={true}
            emissive="#8B0000" // Deep red glow
            emissiveIntensity={0.3} // Subtle inner glow
            ior={2.4} // High index of refraction for crystal
          />
        )}
      </mesh>

      {/* Back facing text with enhanced darkness and shadow */}
      <Text
        position={[0, -3, 0]}
        fontSize={0.2}
        color="#000000"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI, 0]} // Rotated 180 degrees around Y axis
      >
        Apasa pe dragon
        {isLowPerformance ? (
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={1}
            visible={true} // Added visible prop to material
          />
        ) : (
          <meshPhysicalMaterial
            color="#000000"
            emissive="#000000"
            emissiveIntensity={0.9}
            metalness={0.5}
            roughness={0.5}
            clearcoat={1}
            transmission={0}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
            visible={true} // Added visible prop to material
          />
        )}
      </Text>
    </group>
  );
}

// Dynamic text component with optimized effects
function DynamicText({
  scale,
  position,
  isLowPerformance,
}: {
  scale: number;
  position: [number, number, number];
  isLowPerformance: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const flagRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const glitchStart = setTimeout(() => {
      const glitchInterval = setInterval(() => {
        setIsVisible((prev) => !prev);
      }, Math.random() * 1750 + 2000); // Reduced both random range and base time by 50%

      return () => clearInterval(glitchInterval);
    }, 10000);

    return () => clearTimeout(glitchStart);
  }, []);

  useFrame(({ clock }) => {
    if (flagRef.current && !isLowPerformance) {
      const time = clock.getElapsedTime();
      const geometry = flagRef.current.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position;

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        positions.setZ(
          i,
          0.3 * Math.sin(x * 2 + time * 2) + 0.1 * Math.sin(y * 3 + time * 2)
        );
      }

      geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group scale={scale} position={position}>
      <Text
        position={[-0.952, 0.47, 0.001]}
        anchorX="center"
        fontSize={0.452}
        letterSpacing={0.01}
        visible={isVisible}
      >
        FullStack Marketing
        {isLowPerformance ? (
          <meshBasicMaterial color="#ffffff" />
        ) : (
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.2}
          />
        )}
      </Text>
      <Text
        position={[-0.952, 0.17, 0.001]}
        anchorX="center"
        fontSize={0.452}
        letterSpacing={0.01}
        visible={isVisible}
      >
        Engineer
        {isLowPerformance ? (
          <meshBasicMaterial color="#ffffff" />
        ) : (
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.2}
          />
        )}
      </Text>
      <mesh ref={flagRef} position={[-0.495, 0.27, 0]} scale={[7.2, 1.2, 1]}>
        <planeGeometry
          args={[1, 1, isLowPerformance ? 16 : 32, isLowPerformance ? 16 : 32]}
        />
        <primitive
          object={
            new THREE.MeshStandardMaterial({
              color: "#000000",
              transparent: true,
              opacity: 0.95,
              side: THREE.DoubleSide,
            })
          }
          attach="material"
        />
      </mesh>
    </group>
  );
}

// Animated title component with optimized effects
function AnimatedTitle({
  position,
  fontSize,
  isLowPerformance,
}: {
  position: [number, number, number];
  fontSize: number;
  isLowPerformance: boolean;
}) {
  // Changed text to include both ION and TEDY
  const [letters] = useState("ION TEDY".split(""));
  const letterRefs = useRef<THREE.Group[]>([]);

  useFrame(({ clock }) => {
    if (!isLowPerformance) {
      const time = clock.getElapsedTime();
      letterRefs.current.forEach((letterRef, index) => {
        if (letterRef) {
          const floatAmplitude = 0.15;
          const floatSpeed = 0.5;
          letterRef.position.y =
            Math.sin(time * floatSpeed + index * 0.2) * floatAmplitude;
          letterRef.position.z = Math.cos(time * 0.3 + index * 0.1) * 0.05;
          letterRef.rotation.x = Math.sin(time * 0.2 + index * 0.1) * 0.02;
          letterRef.rotation.y = Math.cos(time * 0.25 + index * 0.1) * 0.02;
          const scaleBase = 1;
          const scaleVariation = 0.03;
          const scale =
            scaleBase + Math.sin(time * 0.4 + index * 0.15) * scaleVariation;
          letterRef.scale.setScalar(scale);
        }
      });
    }
  });

  return (
    <group position={position}>
      {letters.map((letter, index) => (
        <group
          key={index}
          position={[
            index * fontSize * 0.6 - letters.length * fontSize * 0.3,
            0,
            0,
          ]}
          ref={(el) => {
            if (el) letterRefs.current[index] = el;
          }}
        >
          <Text
            fontSize={fontSize}
            color="#000000"
            anchorX="center"
            anchorY="middle"
            visible={true} // Added visible prop to ensure text is always shown
          >
            {letter}
            {isLowPerformance ? (
              <meshBasicMaterial
                color="#000000"
                transparent
                opacity={1}
                visible={true} // Added visible prop to material
              />
            ) : (
              <meshPhysicalMaterial
                color="#000000"
                emissive="#000000"
                emissiveIntensity={0.9}
                metalness={0.5}
                roughness={0.5}
                clearcoat={1}
                transmission={0}
                transparent
                opacity={1}
                side={THREE.DoubleSide}
                visible={true} // Added visible prop to material
              />
            )}
          </Text>
        </group>
      ))}
    </group>
  );
}
