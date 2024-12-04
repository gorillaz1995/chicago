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

declare global {
  interface Navigator {
    deviceMemory?: number;
  }
}

interface GLTFResult extends GLTF {
  nodes: {
    dragon: THREE.Mesh;
  };
  materials: Record<string, THREE.Material>;
}

interface ModelProps {
  scale: number;
}

const Hero = () => {
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
  const [isClient, setIsClient] = useState(false); // Check if client-side
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const [canvasKey, setCanvasKey] = useState(0); // unique key for Canvas re-creation

  useEffect(() => {
    // Run only on client
    if (typeof window !== "undefined") {
      setIsClient(true);
    }
  }, []);

  useEffect(() => {
    const checkPerformance = () => {
      const memory = navigator.deviceMemory;
      return memory !== undefined && memory <= 4;
    };
    const performanceResult = checkPerformance();
    setIsLowPerformance(!!performanceResult);
  }, []);

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

    if (isClient) {
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isClient]);

  useEffect(() => {
    return () => {
      // Dispose of the WebGL renderer on unmount
      if (glRef.current) {
        glRef.current.dispose();
      }
    };
  }, []);

  const handleContextCreationError = () => {
    setCanvasError(true);
    console.error("WebGL context creation failed");
  };

  // If error, or not client, or WebGL not supported, show fallback
  if (!isClient) {
    return <div>Loading...</div>;
  }

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
      {isClient && (
        <Canvas
          key={canvasKey}
          shadows={
            isLowPerformance
              ? false
              : { enabled: true, type: THREE.PCFShadowMap }
          }
          camera={{ position: cameraPosition }}
          gl={{
            antialias: !isLowPerformance,
            powerPreference: "high-performance",
            precision: isLowPerformance ? "lowp" : "highp",
            alpha: true,
            stencil: false,
            depth: true,
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={isLowPerformance ? 1 : [1, 2]}
          performance={{ min: 0.5 }}
          onCreated={({ gl }) => {
            gl.setClearColor(0xffffff, 0);
            glRef.current = gl;
          }}
          onError={() => {
            handleContextCreationError();
            // Force remount if needed
            setCanvasKey((prevKey) => prevKey + 1);
          }}
        >
          <color attach="background" args={["#ffffff"]} />
          <fog attach="fog" args={["#ffffff", 8, 35]} />
          <ambientLight intensity={1.2} color="#E8E8E8" />
          {!isLowPerformance && (
            <>
              <pointLight
                position={[0, 20, 10]}
                intensity={2.5}
                color="#FFFFFF"
              />
              <pointLight
                position={[-10, 10, -10]}
                intensity={1.8}
                color="#D3D3D3"
              />
              <pointLight
                position={[10, 15, 5]}
                intensity={1.5}
                color="#C0C0C0"
              />
              <spotLight
                position={[0, 50, 0]}
                angle={0.3}
                penumbra={1}
                intensity={3}
                castShadow={!isLowPerformance}
                shadow-bias={-0.0001}
                color="#FFFFFF"
              />
            </>
          )}
          <group position={groupPosition}>
            <DynamicText
              scale={textScale}
              position={[0.4, 0.25, -1]}
              isLowPerformance={isLowPerformance}
            />
            <Center
              top
              rotation={[0, -Math.PI / 1.5, 0]}
              position={[0, -0.5, 3]}
            >
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
      )}
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

function Rig() {
  const vec = new THREE.Vector3();
  const targetLookAt = new THREE.Vector3();
  let focusOnText = false;

  useFrame((state) => {
    const sensitivity = window.innerWidth <= 480 ? 0.3 : 0.8;
    const time = state.clock.getElapsedTime();
    focusOnText = Math.floor(time / 5) % 2 === 1;

    if (focusOnText) {
      vec.set(
        2 + state.pointer.x * sensitivity + Math.sin(time * 0.4) * 1.2,
        1.5 + state.pointer.y * 0.4 + Math.cos(time * 0.3) * 0.5,
        5 + Math.sin(time * 0.2) * 0.8
      );
      targetLookAt.set(0, 1, -2);
    } else {
      vec.set(
        1 + state.pointer.x * sensitivity + Math.sin(time * 0.5) * 0.8,
        0.5 + state.pointer.y * 0.3 + Math.cos(time * 0.3) * 0.4,
        3 + Math.sin(time * 0.2) * 0.5
      );
      targetLookAt.set(0, 0, 0);
    }

    state.camera.position.lerp(vec, 0.015);
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
    true
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
      dragonRef.current.rotation.y = time * 0.5;
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
          <meshPhongMaterial
            color="#FF3232"
            shininess={100}
            specular="#FFE5E5"
            emissive="#8B0000"
            opacity={0.85}
            transparent={true}
          />
        ) : (
          <meshPhysicalMaterial
            color="#FF0000"
            roughness={0.1}
            metalness={0.2}
            transmission={0.3}
            thickness={2}
            envMapIntensity={1.5}
            clearcoat={1}
            clearcoatRoughness={0.1}
            opacity={0.75}
            transparent={true}
            emissive="#8B0000"
            emissiveIntensity={0.3}
            ior={2.4}
          />
        )}
      </mesh>

      <Text
        position={[0, -3, 0]}
        fontSize={0.2}
        color="#000000"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI, 0]}
      >
        Apasa pe dragon
        {isLowPerformance ? (
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={1}
            visible={true}
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
            visible={true}
          />
        )}
      </Text>
    </group>
  );
}

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
      }, Math.random() * 1750 + 2000);

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
        <meshStandardMaterial
          color="#000000"
          transparent={true}
          opacity={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

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
            color="#000000"
            anchorX="center"
            anchorY="middle"
            visible={true}
          >
            {letter}
            {isLowPerformance ? (
              <meshBasicMaterial
                color="#000000"
                transparent
                opacity={1}
                visible={true}
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
                visible={true}
              />
            )}
          </Text>
        </group>
      ))}
    </group>
  );
}
