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
import { motion, AnimatePresence } from "framer-motion";
import "./graces.css";

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
  const [isVisible, setIsVisible] = useState(false);
  const [showSpecialWords, setShowSpecialWords] = useState(false);

  // Check device performance and screen width on mount
  useEffect(() => {
    const checkPerformance = () => {
      const memory = (navigator as Navigator & { deviceMemory?: number })
        .deviceMemory;
      return memory !== undefined && memory <= 4;
    };

    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1000);
    };

    setIsLowPerformance(checkPerformance());
    handleResize(); // Initial check

    // Trigger animation after a short delay
    setTimeout(() => setIsVisible(true), 500);
    // Show special words after main text animation completes
    setTimeout(() => setShowSpecialWords(true), 2000);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handlers for camera movement
  const handleInteractionStart = () => {
    // Handle interaction start
  };

  const handleInteractionEnd = () => {
    // Reset camera to center view
    if (cameraRef.current) {
      cameraRef.current.setLookAt(0, 2, 25, 0, 0, 0, true);
    }
  };

  // Text animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.3,
      },
    },
  };

  const wordVariants = {
    hidden: {
      y: 20,
      opacity: 0,
      scale: 0.8,
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
  };

  // Special variants for "realitate digitala"
  const specialWordVariants = {
    hidden: {
      y: 20,
      opacity: 0,
      scale: 0.8,
      color: "#000000",
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
        delay: 0.1875, // Reduced delay by 75% from 0.75
      },
    },
    colorChange: {
      color: "#DC143C",
      transition: {
        duration: 0.0625, // Reduced duration by 75% from 0.25
        delay: 0.25, // Reduced delay by 75% from 1
        ease: "easeInOut",
      },
    },
  };

  const glowVariants = {
    initial: { opacity: 0.5, scale: 1 },
    animate: {
      opacity: [0.5, 1, 0.5],
      scale: [1, 1.05, 1],
      transition: {
        duration: 1.55, // Reduced duration to fit within 1.75s limit
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
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
      {/* Animated text overlay with responsive layout */}
      <Html
        position={[-0.2, isMobileView ? 9 : 7, 0]}
        center
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          perspective: "1000px",
          zIndex: 1000,
          width: "100%",
          height: "30vh",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: isMobileView ? "2rem 1.5rem" : "2rem",
        }}
      >
        <AnimatePresence>
          {isVisible && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                width: "100%",
                maxWidth: isMobileView ? "calc(100% - 2rem)" : "90%",
              }}
            >
              <motion.div
                variants={glowVariants}
                initial="initial"
                animate="animate"
                style={{
                  position: "absolute",
                  width: "120%",
                  height: "150%",
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)",
                  filter: "blur(20px)",
                  zIndex: -1,
                }}
              />
              <motion.div
                style={{
                  display: "flex",
                  flexDirection: isMobileView ? "column" : "row",
                  gap: isMobileView ? "0.4rem" : "0.6rem",
                  flexWrap: isMobileView ? "nowrap" : "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                  maxWidth: "100%",
                  padding: isMobileView ? "0" : "0 1rem",
                }}
              >
                <div
                  style={{ display: "flex", gap: "0.4rem", flexWrap: "nowrap" }}
                >
                  {["Idei", "curajoase,", "transformate", "in"].map(
                    (word, i) => (
                      <motion.span
                        key={i}
                        variants={wordVariants}
                        style={{
                          fontSize: isMobileView ? "1.5rem" : "2.5rem",
                          fontWeight: "bold",
                          color: "#000000",
                          textShadow: "2px 2px 4px rgba(255,255,255,0.5)",
                          fontFamily: "var(--font-averta)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {word}
                      </motion.span>
                    )
                  )}
                </div>
                <AnimatePresence>
                  {showSpecialWords && (
                    <div
                      style={{
                        display: "flex",
                        gap: "0.4rem",
                        flexWrap: "nowrap",
                      }}
                    >
                      {["realitate", "digitala"].map((word) => (
                        <motion.span
                          key={word}
                          variants={specialWordVariants}
                          initial="hidden"
                          animate={["visible", "colorChange"]}
                          style={{
                            fontSize: isMobileView ? "1.5rem" : "2.5rem",
                            fontWeight: "bold",
                            textShadow: "2px 2px 4px rgba(255,255,255,0.5)",
                            fontFamily: "var(--font-averta)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {word}
                        </motion.span>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Html>
      {/* Creating depth with subtle variations of white */}
      <color attach="background" args={["#f5f5f7"]} />{" "}
      {/* Slightly cooler white base */}
      <fog attach="fog" args={["#faf9f6", 12, 26]} />{" "}
      {/* Warmer white fog for contrast */}
      <Environment preset="dawn" />{" "}
      {/* Changed to dawn for softer, more nuanced lighting */}
      <hemisphereLight
        intensity={0.5}
        groundColor="#e6e6ea" /* Cooler undertones */
        color="#fff5e6" /* Warmer overtones */
      />
      <ambientLight intensity={isLowPerformance ? 1.2 : 0.8} />
      {!isLowPerformance && (
        <>
          <directionalLight
            position={[5, 5, 5]}
            intensity={2}
            castShadow
            shadow-mapSize={[1024, 1024]}
            color="#333333"
          />
          <spotLight
            position={[0, 15, 3]}
            intensity={3}
            angle={1.2}
            penumbra={0.8}
            decay={1.2}
            distance={35}
            castShadow
            color="#444444"
          />
          <spotLight
            position={[-5, 5, -5]}
            intensity={1.5}
            angle={0.8}
            penumbra={1}
            color="#222222"
          />
        </>
      )}
      <Model
        position={[0, -4.5, 0]}
        rotation={[0, -0.2, 0]}
        isLowPerformance={isLowPerformance}
      />
      <CameraControls
        ref={cameraRef}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
        minAzimuthAngle={-Math.PI / 2.5}
        maxAzimuthAngle={Math.PI / 2.5}
        minDistance={isMobileView ? 40 : 35}
        maxDistance={isMobileView ? 55 : 45}
        smoothTime={0.5} // Adjusted value for smoother transitions
        draggingSmoothTime={0.25} // Adjusted value
        boundaryFriction={0.9}
        verticalDragToForward={false}
        dollySpeed={0.15}
        enabled={false}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
        restThreshold={0.01}
        // Removed deprecated properties dampingFactor and draggingDampingFactor
      />
      <Preload all />
    </Canvas>
  );
}

function Model({ position, rotation, isLowPerformance = false }: ModelProps) {
  const group = useRef<THREE.Group>(null);
  const { nodes, scene } = useGLTF(
    "/graces-draco.glb"
  ) as unknown as GLTFResult; // Fixed type assertion
  const [direction, setDirection] = useState(1);
  const rotationLimit = Math.PI / 4.5; // Reduced rotation limit by 20%
  const [isPaused, setIsPaused] = useState(false);

  useFrame(() => {
    if (!isLowPerformance) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = new THREE.MeshStandardMaterial({
            color: "#FFD700", // 24k gold color
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
      // Slower rotation speed
      group.current.rotation.y +=
        direction * delta * (isLowPerformance ? 0.08 : 0.095);
    }
  });

  // Navigation handler functions with smooth transitions
  const handleNavigation = (path: string) => {
    setIsPaused(true); // Pause rotation
    setTimeout(() => {
      window.location.href = path;
    }, 300);
  };

  const handlePortofoliuClick = () => handleNavigation("#");
  const handleServiciiClick = () => handleNavigation("#");
  const handleContactClick = () => handleNavigation("#");

  return (
    <group ref={group} position={position} rotation={rotation}>
      <mesh
        castShadow={!isLowPerformance}
        receiveShadow={!isLowPerformance}
        geometry={nodes.Node_3.geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={0.2}
        onClick={(e) => {
          // Prevent event propagation and any interaction
          e.stopPropagation();
        }}
      >
        {isLowPerformance ? (
          // Optimized material for low performance - deep bronze with golden undertones
          <meshPhongMaterial
            color="#CD7F32" // Rich bronze base color
            shininess={40} // Moderate shininess for metallic look
            specular="#FFD700" // Golden specular highlights
            emissive="#3D1C02" // Deep bronze emissive
            emissiveIntensity={0.08}
            flatShading={false}
          />
        ) : (
          // High quality bronze material with golden reflections
          <meshStandardMaterial
            color="#B87333" // Polished bronze color
            roughness={0.3} // Smoother surface for better reflections
            metalness={0.9} // High metalness for metallic look
            envMapIntensity={3.0} // Strong environment reflections
            emissive="#8B4513" // Saddle brown emissive
            emissiveIntensity={0.4} // Increased glow effect
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
          className="inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 font-muller"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: 0,
            padding: "0.5rem 1rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            minHeight: "48px", // Ensure minimum height for button content
          }}
        >
          WEB Design & Development
        </button>
      </Annotation>
      <Annotation
        position={[-4.5, 3.6, -3]}
        phase={0.33}
        onClick={handleContactClick}
      >
        <button
          onClick={handleContactClick}
          className="inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 font-muller"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "left",
            justifyContent: "center",
            margin: 0,
            padding: "0.5rem 1rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            minHeight: "48px", // Ensure minimum height for button content
          }}
        >
          Videoclipuri
        </button>
      </Annotation>
      <Annotation
        position={[1.75, 8, -3]}
        phase={0.66}
        onClick={handleServiciiClick}
      >
        <button
          className="inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 font-muller"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: 0,
            padding: "0.5rem 1rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            minHeight: "48px", // Ensure minimum height for button content
          }}
        >
          Digital & Social Media
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
    let animationFrameId: number;

    const floatAnimation = () => {
      const time = performance.now() * 0.001;
      const offset = Math.sin(time * 0.8 + phase * Math.PI * 2) * 0.2;
      setYOffset(offset);
      animationFrameId = requestAnimationFrame(floatAnimation);
    };

    animationFrameId = requestAnimationFrame(floatAnimation);

    return () => cancelAnimationFrame(animationFrameId);
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "auto",
        minWidth: "120px",
        height: "auto",
        minHeight: "48px", // Ensure minimum height for annotation container
      }}
      onClick={onClick}
    >
      <div
        className="annotation"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          margin: 0,
          minHeight: "48px", // Ensure minimum height for inner container
        }}
      >
        {children}
      </div>
    </Html>
  );
}
