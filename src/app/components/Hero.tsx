"use client";

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

// Add type definition for Navigator with deviceMemory
declare global {
  interface Navigator {
    deviceMemory?: number;
  }
}

// Define GLTF result type for proper typing
interface GLTFResult extends GLTF {
  nodes: {
    bunny: THREE.Mesh;
  };
  materials: Record<string, THREE.Material>;
}

interface ModelProps {
  scale: number;
}

// Main Hero component for cyberpunk-themed 3D scene
export default function Hero() {
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance detection
  useEffect(() => {
    // Check device performance
    const checkPerformance = () => {
      // Check for low-end devices based on memory and hardware concurrency
      const memory = navigator.deviceMemory;
      const cores = navigator.hardwareConcurrency;

      // Return true if device has 4GB or less RAM, or 4 or fewer CPU cores
      return (memory !== undefined && memory <= 4) || (cores && cores <= 4);
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
        }}
        dpr={isLowPerformance ? 1 : [1, 2]}
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={["#000000"]} />

        {/* Optimized lighting setup */}
        <ambientLight intensity={0.4} />
        {!isLowPerformance && (
          <>
            <pointLight position={[0, 20, 10]} intensity={1} color="#ff0066" />
            <pointLight
              position={[-10, 10, -10]}
              intensity={0.8}
              color="#00ffff"
            />
            <spotLight
              position={[0, 50, 0]}
              angle={0.15}
              penumbra={1}
              intensity={1}
              castShadow={!isLowPerformance}
              shadow-bias={-0.0001}
            />
          </>
        )}

        {/* Main content group */}
        <group position={groupPosition}>
          <DynamicText
            scale={textScale}
            position={[0.4, 0.25, -1]}
            isLowPerformance={isLowPerformance}
          />
          <Center top rotation={[0, -Math.PI / 1.5, 0]} position={[0, 0, 3]}>
            <EnhancedBunnyModel
              props={{ scale: 0.8 }}
              isLowPerformance={isLowPerformance}
            />
          </Center>
          <AnimatedTitle
            position={titlePosition}
            fontSize={titleScale}
            isLowPerformance={isLowPerformance}
          />
        </group>

        <Environment preset="night" />
        <Rig />

        {/* Post-processing effects only for high-performance devices */}
        {!isLowPerformance && (
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              height={200}
              intensity={1}
            />
            <ChromaticAberration
              offset={new Vector2(0.001, 0.001)}
              modulationOffset={0.1}
              radialModulation={false}
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

// Enhanced camera rig with dynamic movement
function Rig() {
  const vec = new THREE.Vector3();
  useFrame((state) => {
    const sensitivity = window.innerWidth <= 480 ? 0.3 : 0.8;
    const time = state.clock.getElapsedTime();

    state.camera.position.lerp(
      vec.set(
        1 + state.pointer.x * sensitivity + Math.sin(time * 0.5) * 0.5,
        0.5 + state.pointer.y * 0.3 + Math.cos(time * 0.3) * 0.2,
        3 + Math.sin(time * 0.2) * 0.3
      ),
      0.015
    );
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

// Enhanced bunny model with optimized effects
function EnhancedBunnyModel({
  props,
  isLowPerformance,
}: {
  props?: ModelProps;
  isLowPerformance: boolean;
}) {
  const { nodes } = useGLTF(
    "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/bunny/model.gltf",
    true // Enable draco compression
  ) as GLTFResult;

  const bunnyRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (bunnyRef.current) {
      const bvhOptions: MeshBVHOptions = {
        strategy: 0,
        maxLeafTris: 10,
      };
      const bvh = new MeshBVH(bunnyRef.current.geometry, bvhOptions);
      bunnyRef.current.geometry.boundsTree = bvh;
    }
  }, []);

  useFrame(({ clock }) => {
    if (bunnyRef.current) {
      const time = clock.getElapsedTime();
      bunnyRef.current.rotation.y = Math.sin(time * 0.5) * 0.2;
      bunnyRef.current.position.y = -1.95 + Math.sin(time) * 0.1;

      if (textRef.current) {
        textRef.current.rotation.y = bunnyRef.current.rotation.y;
      }
    }
  });

  const handleInteraction = () => {
    window.location.href = "/services";
  };

  return (
    <group>
      <mesh
        ref={bunnyRef}
        castShadow
        receiveShadow={!isLowPerformance}
        geometry={nodes.bunny.geometry}
        position={[0, -1.95, 0]}
        onClick={handleInteraction}
        onPointerDown={handleInteraction}
        {...props}
      >
        <meshPhysicalMaterial
          color="#00ffff"
          emissive="#ff0066"
          emissiveIntensity={2}
          metalness={1}
          roughness={0}
          clearcoat={1}
          transmission={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      <group
        ref={textRef}
        position={[0.92, -2.04, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <Text
          fontSize={0.17}
          color="#ff0066"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#00ffff"
          maxWidth={1}
          position={[0, 0, 0.6]}
          rotation={[0, Math.PI, 0]}
        >
          APASA IEPURASUL
          <meshPhysicalMaterial
            color="#00ff00"
            emissive="#00ff00"
            emissiveIntensity={1.2}
            metalness={0.8}
            roughness={0.8}
            transparent
            opacity={0.9}
          />
        </Text>
      </group>
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

  const flagMaterial = isLowPerformance
    ? new THREE.MeshBasicMaterial({
        color: "#000000",
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshPhysicalMaterial({
        color: "#000000",
        transparent: true,
        transmission: 0.95,
        thickness: 0.5,
        roughness: 0.1,
        metalness: 0.2,
        clearcoat: 1.0,
        side: THREE.DoubleSide,
      });

  useEffect(() => {
    const glitchStart = setTimeout(() => {
      const glitchInterval = setInterval(() => {
        setIsVisible((prev) => !prev);
      }, Math.random() * 3500 + 4000);

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
        position={[-0.952, 0.27, 0.001]}
        anchorX="center"
        fontSize={0.452}
        letterSpacing={0.01}
        visible={isVisible}
      >
        DIGITAL WIZARD
        {isLowPerformance ? (
          <meshBasicMaterial color="#ffffff" />
        ) : (
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={2}
          />
        )}
      </Text>
      <mesh ref={flagRef} position={[-0.495, 0.27, 0]} scale={[5.4, 0.648, 1]}>
        <planeGeometry
          args={[1, 1, isLowPerformance ? 16 : 32, isLowPerformance ? 16 : 32]}
        />
        <primitive object={flagMaterial} attach="material" />
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
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {letter}
            {isLowPerformance ? (
              <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
            ) : (
              <meshPhysicalMaterial
                color="#00ffff"
                emissive="#ff0066"
                emissiveIntensity={2}
                metalness={1}
                roughness={0}
                clearcoat={1}
                transmission={0.2}
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
              />
            )}
          </Text>
        </group>
      ))}
    </group>
  );
}
