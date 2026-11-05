/**
 * Static chamber reflections for the silver head.
 *
 * The old studio HDR was a stack of hard rectangles, and those rectangles
 * are what showed up as window-shaped highlights on the metal. This builds
 * one equirectangular map from broad lobes, prefilters it once, and never
 * recaptures it. The scan light is a real spotlight, so it does not need to
 * be in this map.
 *
 * three r169 copies `scene.environmentIntensity` onto every standard material
 * that has no env map of its own. The chamber map is therefore assigned only
 * to Silver. MouthDark stays unlit by image-based lighting.
 */
import * as THREE from 'three';
import { LAMP_PLATE } from './lampSection';

export type SceneDetail = 'full' | 'lean';

/** Calibration for the live renderer. Roughness stays inside 0.25–0.35. */
export const CHAMBER = {
  clear: '#070B09',
  exposure: 0.94,
  roughness: 0.29,
  envMapIntensity: 1,
} as const;

type Lobe = {
  /** Direction before normalisation. +Z faces the hero camera. */
  dir: [number, number, number];
  color: [number, number, number];
  /** Larger values make a tighter falloff. */
  sharp: number;
};

// One hierarchy: a dark field, a broad neutral key, a dim cool fill, a small emerald rim.
const BASE = new THREE.Vector3(0.004, 0.006, 0.005);

const LOBES: readonly Lobe[] = [
  {
    // Broad key, above and slightly to the viewer's left. Soft, not a window.
    dir: [-0.26, 0.58, 0.72],
    color: [1.7, 1.64, 1.56],
    sharp: 1.25,
  },
  {
    // Dim cool fill so the sockets and the far cheek stay readable.
    dir: [0.22, 0.04, 0.96],
    color: [0.34, 0.38, 0.42],
    sharp: 0.48,
  },
  {
    // Emerald rim, behind the opposite side, tight enough to stay on the edge.
    dir: [0.96, 0.1, -0.88],
    color: [0.05, 0.38, 0.18],
    sharp: 18,
  },
  {
    dir: [0, 1, 0.08],
    color: [0.1, 0.11, 0.1],
    sharp: 1.2,
  },
  {
    dir: [0.02, -0.88, 0.22],
    color: [0.06, 0.065, 0.055],
    sharp: 2.4,
  },
];

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec2 vUv;

  uniform vec3 uBase;
  uniform vec3 uDir0;
  uniform vec3 uCol0;
  uniform float uSharp0;
  uniform vec3 uDir1;
  uniform vec3 uCol1;
  uniform float uSharp1;
  uniform vec3 uDir2;
  uniform vec3 uCol2;
  uniform float uSharp2;
  uniform vec3 uDir3;
  uniform vec3 uCol3;
  uniform float uSharp3;
  uniform vec3 uDir4;
  uniform vec3 uCol4;
  uniform float uSharp4;

  // Angular gaussian. The result is 1 on the lobe axis and falls off without a hard edge.
  float lobe(vec3 dir, vec3 axis, float sharp) {
    float ang = acos(clamp(dot(dir, axis), -1.0, 1.0));
    return exp(-ang * ang * sharp);
  }

  void main() {
    // three.js equirect: u = atan2(z, x) / tau + 0.5, v = asin(y) / pi + 0.5.
    float phi = (vUv.x - 0.5) * 6.283185307179586;
    float th = (vUv.y - 0.5) * 3.141592653589793;
    float cth = cos(th);
    vec3 dir = normalize(vec3(cth * cos(phi), sin(th), cth * sin(phi)));

    vec3 col = uBase;
    col += uCol0 * lobe(dir, uDir0, uSharp0);
    col += uCol1 * lobe(dir, uDir1, uSharp1);
    col += uCol2 * lobe(dir, uDir2, uSharp2);
    col += uCol3 * lobe(dir, uDir3, uSharp3);
    col += uCol4 * lobe(dir, uDir4, uSharp4);
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

function lobeUniforms() {
  const dirs = LOBES.map((lobe) =>
    new THREE.Vector3(...lobe.dir).normalize(),
  );
  const cols = LOBES.map((lobe) => new THREE.Vector3(...lobe.color));

  return {
    uBase: { value: BASE },
    uDir0: { value: dirs[0] },
    uCol0: { value: cols[0] },
    uSharp0: { value: LOBES[0].sharp },
    uDir1: { value: dirs[1] },
    uCol1: { value: cols[1] },
    uSharp1: { value: LOBES[1].sharp },
    uDir2: { value: dirs[2] },
    uCol2: { value: cols[2] },
    uSharp2: { value: LOBES[2].sharp },
    uDir3: { value: dirs[3] },
    uCol3: { value: cols[3] },
    uSharp3: { value: LOBES[3].sharp },
    uDir4: { value: dirs[4] },
    uCol4: { value: cols[4] },
    uSharp4: { value: LOBES[4].sharp },
  };
}

/**
 * Draw the chamber into a float target and prefilter it.
 * 2048×1024 becomes a 512 cube on the full tier. 1024×512 becomes a 256 cube
 * on the lean tier, because PMREM uses equirect width / 4.
 */
export function createChamberEnvironment(
  gl: THREE.WebGLRenderer,
  detail: SceneDetail,
): THREE.Texture {
  const width = detail === 'full' ? 2048 : 1024;
  const height = width / 2;

  const rt = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    colorSpace: THREE.LinearSRGBColorSpace,
    depthBuffer: false,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    generateMipmaps: false,
  });
  rt.texture.mapping = THREE.EquirectangularReflectionMapping;
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: lobeUniforms(),
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -1;

  const capture = new THREE.Scene();
  capture.add(mesh);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  const previousTarget = gl.getRenderTarget();
  const previousTone = gl.toneMapping;
  const previousColor = gl.getClearColor(new THREE.Color());
  const previousAlpha = gl.getClearAlpha();

  // The lobe colors are already linear and above 1. Tone mapping here would flatten them.
  gl.toneMapping = THREE.NoToneMapping;
  gl.setClearColor(0x000000, 1);
  gl.setRenderTarget(rt);
  gl.render(capture, camera);
  gl.setRenderTarget(previousTarget);
  gl.setClearColor(previousColor, previousAlpha);
  gl.toneMapping = previousTone;

  geometry.dispose();
  material.dispose();

  const pmrem = new THREE.PMREMGenerator(gl);
  const filtered = pmrem.fromEquirectangular(rt.texture);
  pmrem.dispose();
  rt.dispose();

  filtered.texture.mapping = THREE.CubeUVReflectionMapping;
  return filtered.texture;
}

/**
 * Silver receives the chamber. MouthDark is kept matte, unlit by the map,
 * and on its own camera layer so the scan spotlight cannot enter the cavity.
 */
export function tuneHeadMaterials(
  root: THREE.Object3D,
  env: THREE.Texture | null,
) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    const list = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    for (const entry of list) {
      const mat = entry as THREE.MeshStandardMaterial;
      if (!mat?.isMeshStandardMaterial) continue;

      mat.fog = false;

      if (mat.name === 'MouthDark') {
        // No light reaches this layer, so emissive is the flat lamp plate.
        mat.color.set(LAMP_PLATE);
        mat.emissive.set(LAMP_PLATE);
        mat.emissiveIntensity = 1;
        mat.toneMapped = false;
        mat.envMap = null;
        mat.envMapIntensity = 0;
        mat.metalness = 0;
        mat.roughness = 1;
        mat.needsUpdate = true;
        mesh.layers.set(1);
        continue;
      }

      if (mat.name !== 'Silver') continue;

      mat.metalness = 1;
      mat.roughness = CHAMBER.roughness;
      mat.envMapIntensity = CHAMBER.envMapIntensity;
      mat.envMap = env;
      mat.needsUpdate = true;
      mesh.layers.set(0);
    }
  });
}
