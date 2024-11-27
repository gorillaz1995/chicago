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
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<THREE.Mesh>(null);

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
        shadows={{ enabled: true, type: THREE.PCFSoftShadowMap }}
        camera={{ position: cameraPosition }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#000000"]} />

        {/* Enhanced lighting setup */}
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 20, 10]} intensity={1} color="#ff0066" />
        <pointLight position={[-10, 10, -10]} intensity={0.8} color="#00ffff" />
        <spotLight
          position={[0, 50, 0]}
          angle={0.15}
          penumbra={1}
          intensity={1}
          castShadow
          shadow-bias={-0.0001}
        />
        {/* Animated liquid/fire wave effect */}
        <mesh
          ref={gridRef}
          position={[0, -5, -50]}
          rotation={[-Math.PI / 4, 0, 0]}
          scale={[200, 200, 1]}
        >
          <planeGeometry args={[1, 1, 200, 200]} />{" "}
          {/* Further increased resolution */}
          <meshPhysicalMaterial
            color="#000000"
            emissive="#004d29" // Darker green color
            emissiveIntensity={0.8} // Reduced intensity
            wireframe={true}
            metalness={0.9}
            roughness={0.1}
            onBeforeCompile={(shader) => {
              shader.vertexShader = `
                varying vec2 vUv;
                uniform float uTime;
                
                // Enhanced noise functions
                float random(vec2 st) {
                  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }
                
                float noise(vec2 st) {
                  vec2 i = floor(st);
                  vec2 f = fract(st);
                  float a = random(i);
                  float b = random(i + vec2(1.0, 0.0));
                  float c = random(i + vec2(0.0, 1.0));
                  float d = random(i + vec2(1.0, 1.0));
                  vec2 u = f * f * (3.0 - 2.0 * f);
                  return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }
                
                ${shader.vertexShader}
              `.replace(
                "#include <begin_vertex>",
                `
                #include <begin_vertex>
                float speed = uTime * 2.5; // Increased speed
                
                // Enhanced wave components with more dramatic motion
                float wave1 = sin(position.x * 3.0 + speed) * 0.3;
                float wave2 = cos(position.y * 4.0 + speed * 1.2) * 0.25;
                float wave3 = sin((position.x + position.y) * 2.0 + speed * 1.5) * 0.2;
                float wave4 = cos((position.x - position.y) * 2.5 + speed * 0.8) * 0.15; // Added fourth wave
                
                // Enhanced turbulence
                vec2 noiseCoord = position.xy * 3.0 + vec2(speed * 0.7);
                float turbulence = noise(noiseCoord) * 0.4;
                
                // Combine all components with increased amplitude
                float finalWave = wave1 + wave2 + wave3 + wave4 + turbulence;
                
                // Apply enhanced wave effect
                transformed.z += finalWave;
                
                // More pronounced horizontal displacement
                transformed.x += sin(position.y + speed * 1.2) * 0.08;
                transformed.y += cos(position.x + speed * 0.9) * 0.08;
                
                // Add subtle spiral motion
                float angle = atan(position.y, position.x);
                transformed.x += sin(angle + speed) * 0.03;
                transformed.y += cos(angle + speed) * 0.03;
                
                vUv = uv;
                `
              );
              shader.uniforms.uTime = { value: 0 };
              if (
                gridRef.current &&
                gridRef.current.material instanceof THREE.Material
              ) {
                gridRef.current.material.userData =
                  gridRef.current.material.userData || {};
                gridRef.current.material.userData.shader = shader;
              }
            }}
          />
        </mesh>

        {/* Main content group */}
        <group position={groupPosition}>
          <DynamicText scale={textScale} position={[0.4, 0.25, -1]} />
          <Center top rotation={[0, -Math.PI / 1.5, 0]} position={[0, 0, 3]}>
            <EnhancedBunnyModel scale={0.8} />
          </Center>
          <AnimatedTitle position={titlePosition} fontSize={titleScale} />
        </group>

        <Environment preset="night" />
        <Rig />
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            height={300}
            intensity={1.5}
          />
          <ChromaticAberration
            offset={new Vector2(0.002, 0.002)}
            modulationOffset={0.15}
            radialModulation={true}
          />
        </EffectComposer>
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

// Enhanced bunny model with holographic effects and tattoo text
function EnhancedBunnyModel(props: ModelProps) {
  const { nodes } = useGLTF(
    "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/bunny/model.gltf"
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

      // Sync text rotation with bunny
      if (textRef.current) {
        textRef.current.rotation.y = bunnyRef.current.rotation.y;
      }
    }
  });

  // Handle click/touch event to redirect
  const handleInteraction = () => {
    window.location.href = "/services";
  };

  return (
    <group>
      <mesh
        ref={bunnyRef}
        castShadow
        receiveShadow
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
          clearcoatRoughness={0}
          iridescence={1}
          iridescenceIOR={2}
          sheen={1}
          sheenRoughness={0.5}
          sheenColor="#ff0066"
          transmission={0.2}
          transparent={true}
          opacity={0.9}
        />
      </mesh>

      {/* Tattoo text positioned on the bunny's right side */}
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
          rotation={[0, Math.PI, 0]} // Rotate text to face outward
        >
          APASA IEPURASUL
          <meshPhysicalMaterial
            color="#00ff00" // Bright neon green for better contrast
            emissive="#00ff00" // Matching emissive color for glow effect
            emissiveIntensity={1.2} // Increased intensity for better visibility
            metalness={0.8}
            roughness={0.8}
            transparent={true}
            opacity={0.9}
          />
        </Text>
      </group>
    </group>
  );
}

// Dynamic text component with wave effect
function DynamicText({
  scale,
  position,
}: {
  scale: number;
  position: [number, number, number];
}) {
  const [isVisible, setIsVisible] = useState(true);
  const flagRef = useRef<THREE.Mesh>(null);

  const flagMaterial = new THREE.MeshPhysicalMaterial({
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
    // Initial 10 second display before starting glitch animation
    const glitchStart = setTimeout(() => {
      const glitchInterval = setInterval(() => {
        setIsVisible((prev) => !prev);
      }, Math.random() * 3500 + 4000); // 3.5-7.5 seconds glitch interval

      return () => clearInterval(glitchInterval);
    }, 10000); // Wait 10 seconds before starting glitch

    return () => clearTimeout(glitchStart);
  }, []);

  useFrame(({ clock }) => {
    if (flagRef.current) {
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
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={2}
        />
      </Text>
      <mesh ref={flagRef} position={[-0.495, 0.27, 0]} scale={[5.4, 0.648, 1]}>
        <planeGeometry args={[1, 1, 32, 32]} />
        <primitive object={flagMaterial} attach="material" />
      </mesh>
    </group>
  );
}

// Animated title component with enhanced modern effect
function AnimatedTitle({
  position,
  fontSize,
}: {
  position: [number, number, number];
  fontSize: number;
}) {
  const [letters] = useState("ION TEDY".split(""));
  const letterRefs = useRef<THREE.Group[]>([]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    letterRefs.current.forEach((letterRef, index) => {
      if (letterRef) {
        // Slow, elegant floating animation
        const floatAmplitude = 0.15;
        const floatSpeed = 0.5;
        letterRef.position.y =
          Math.sin(time * floatSpeed + index * 0.2) * floatAmplitude;

        // Subtle z-axis movement for depth
        letterRef.position.z = Math.cos(time * 0.3 + index * 0.1) * 0.05;

        // Minimal rotation for sophistication
        letterRef.rotation.x = Math.sin(time * 0.2 + index * 0.1) * 0.02;
        letterRef.rotation.y = Math.cos(time * 0.25 + index * 0.1) * 0.02;

        // Subtle scale breathing effect
        const scaleBase = 1;
        const scaleVariation = 0.03;
        const scale =
          scaleBase + Math.sin(time * 0.4 + index * 0.15) * scaleVariation;
        letterRef.scale.setScalar(scale);
      }
    });
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
            <meshPhysicalMaterial
              color="#00ffff"
              emissive="#ff0066"
              emissiveIntensity={2}
              metalness={1}
              roughness={0}
              clearcoat={1}
              clearcoatRoughness={0}
              iridescence={1}
              iridescenceIOR={2}
              sheen={1}
              sheenRoughness={0.5}
              sheenColor="#ff0066"
              transmission={0.2}
              transparent={true}
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </Text>
        </group>
      ))}
    </group>
  );
}
