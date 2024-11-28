"use client";
import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Html, CameraControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
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

export default function Ograce() {
  const cameraRef = useRef<CameraControls>(null);
  const [isLowPerformance, setIsLowPerformance] = useState(false);

  // Check device performance on mount
  useEffect(() => {
    const checkPerformance = () => {
      const memory = navigator.deviceMemory;
      return memory !== undefined && memory <= 4;
    };
    setIsLowPerformance(checkPerformance());
  }, []);

  // Handlers for camera movement
  const handleInteractionStart = () => {
    // Handle interaction start
  };

  const handleInteractionEnd = () => {
    // Reset camera to center view
    if (cameraRef.current) {
      cameraRef.current.setLookAt(0, 2, 20, 0, 0, 0, true);
    }
  };

  return (
    <Canvas
      shadows={!isLowPerformance}
      camera={{ position: [0, 2, 20], fov: 50 }} // Reduced FOV for better focus
      dpr={isLowPerformance ? 1 : [1, 2]}
      performance={{ min: 0.5 }}
      gl={{
        antialias: !isLowPerformance,
        powerPreference: "high-performance",
        precision: isLowPerformance ? "lowp" : "highp",
      }}
    >
      <Environment preset="sunset" />
      <ambientLight intensity={isLowPerformance ? 1 : 0.5} />
      {!isLowPerformance && <fog attach="fog" args={["black", 0, 25]} />}

      {!isLowPerformance && (
        <>
          <directionalLight
            position={[5, 5, 5]}
            intensity={2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <spotLight
            position={[0, 15, 3]}
            intensity={2.5}
            angle={1.2}
            penumbra={0.8}
            decay={1.2}
            distance={30}
            castShadow
            color="#ffd6a5"
          />
        </>
      )}

      <Model
        position={[0, -4.5, 3]}
        rotation={[0, -0.2, 0]}
        isLowPerformance={isLowPerformance}
      />

      <CameraControls
        ref={cameraRef}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
        // Reduced rotation range by 20%
        minAzimuthAngle={-Math.PI / 2.5}
        maxAzimuthAngle={Math.PI / 2.5}
        minDistance={35} // Closer min distance
        maxDistance={50} // Reduced max distance
        smoothTime={1.2} // Increased for smoother transitions
        boundaryFriction={0.9} // Increased friction
        verticalDragToForward={false}
        dollySpeed={0.15}
        enabled={true}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
        // Keep model centered
        restThreshold={0.01}
        dampingFactor={0.05}
        draggingDampingFactor={0.25}
      />
    </Canvas>
  );
}

function Model({ position, rotation, isLowPerformance = false }: ModelProps) {
  const group = useRef<THREE.Group>(null);
  const { nodes, scene } = useGLTF(
    "/graces-draco.glb"
  ) as unknown as GLTFResult;
  const [direction, setDirection] = useState(1);
  const rotationLimit = Math.PI / 2.5; // Reduced rotation limit by 20%
  const [isPaused, setIsPaused] = useState(false);

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
      // Slower rotation speed
      group.current.rotation.y +=
        direction * delta * (isLowPerformance ? 0.08 : 0.15);
    }
  });

  // Navigation handler functions with smooth transitions
  const handleNavigation = (path: string) => {
    setIsPaused(true); // Pause rotation
    setTimeout(() => {
      window.location.href = path;
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
      >
        {isLowPerformance ? (
          <meshBasicMaterial color="#404044" />
        ) : (
          <meshStandardMaterial
            color="#404044"
            roughness={0.7}
            metalness={0.3}
            envMapIntensity={1}
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
            background: "rgba(20, 20, 35, 0.6)",
            border: "1px solid rgba(180, 198, 255, 0.3)",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "8px 16px",
            color: "#b4c6ff",
            transition: "all 0.3s ease",
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontSize: "14px",
            fontWeight: "500",
            backdropFilter: "blur(4px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          PORTOFOLIU{" "}
          <span style={{ fontSize: "1.2em", marginLeft: "8px" }}>⚡</span>
        </button>
      </Annotation>
      <Annotation
        position={[-4.5, 3.6, -3]}
        phase={0.33}
        onClick={handleServiciiClick}
      >
        <button
          onClick={handleServiciiClick}
          style={{
            background: "rgba(20, 20, 35, 0.6)",
            border: "1px solid rgba(180, 198, 255, 0.3)",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "8px 16px",
            color: "#b4c6ff",
            transition: "all 0.3s ease",
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontSize: "14px",
            fontWeight: "500",
            backdropFilter: "blur(4px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          SERVICII{" "}
          <span style={{ fontSize: "1.2em", marginLeft: "8px" }}>⚔️</span>
        </button>
      </Annotation>
      <Annotation
        position={[1.5, 8, -3]}
        phase={0.66}
        onClick={handleContactClick}
      >
        <button
          onClick={handleContactClick}
          style={{
            background: "rgba(20, 20, 35, 0.6)",
            border: "1px solid rgba(180, 198, 255, 0.3)",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "8px 16px",
            color: "#b4c6ff",
            transition: "all 0.3s ease",
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontSize: "14px",
            fontWeight: "500",
            backdropFilter: "blur(4px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          <span style={{ fontSize: "1.2em", marginRight: "8px" }}>✉️</span>{" "}
          CONTACT
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
