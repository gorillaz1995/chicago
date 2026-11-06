import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { CHAMBER, createChamberEnvironment, tuneHeadMaterials } from "./chamberEnvironment";
import { applyGlassHead, setGlassHeadTime, updateGlassHead } from "./glassHead";

const params = new URLSearchParams(location.search);
const size = Number(params.get("size") || 1024);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(size, size);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = CHAMBER.exposure;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 10);
camera.position.set(0, 0, 0.8);
camera.lookAt(0, 0, 0);
camera.layers.enable(1);

const w = window as any;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load(params.get("glb") || "silver-head_v6.glb", (gltf) => {
  scene.add(gltf.scene);
  const chamber = createChamberEnvironment(renderer, "full");
  tuneHeadMaterials(gltf.scene, chamber);
  const glass = params.get("glass") !== "0";
  if (glass) applyGlassHead(gltf.scene, chamber);
  if (params.get("twice") === "1") { tuneHeadMaterials(gltf.scene, chamber); applyGlassHead(gltf.scene, chamber); }
  const spin = gltf.scene.getObjectByName("SpinRoot") ?? gltf.scene;
  const morphs: THREE.Mesh[] = [];
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.morphTargetDictionary && "MouthOpen" in m.morphTargetDictionary) morphs.push(m);
  });
  w.info = () => {
    const out: any[] = [];
    gltf.scene.traverse((o: any) => out.push([o.type, o.name, o.material?.name ?? null, o.geometry?.attributes?.position?.count ?? null, o.renderOrder]));
    return { objects: out, programs: renderer.info.programs?.length, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, lines: renderer.info.render.lines };
  };
  w.renderAt = (yaw: number, mouth: number, time: number, camZ = 0.8, camY = 0, lookY = 0) => {
    spin.rotation.y = yaw;
    for (const m of morphs) m.morphTargetInfluences![m.morphTargetDictionary!.MouthOpen] = mouth;
    setGlassHeadTime(gltf.scene, time);
    camera.position.set(0, camY, camZ);
    camera.lookAt(0, lookY, 0);
    renderer.render(scene, camera);
    return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, lines: renderer.info.render.lines };
  };
  w.bench = (frames: number) => {
    const t0 = performance.now();
    for (let i = 0; i < frames; i++) {
      spin.rotation.y += 0.01;
      updateGlassHead(gltf.scene, 1 / 60, false);
      renderer.render(scene, camera);
    }
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return (performance.now() - t0) / frames;
  };
  w.ready = true;
}, undefined, (e) => { w.loadError = String(e); });
