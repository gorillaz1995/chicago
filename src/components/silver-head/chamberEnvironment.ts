import * as THREE from "three";
import { LAMP_PLATE } from "./lampSection";

export type SceneDetail = "full" | "lean";

export const CHAMBER = {
  clear: "#080b0d",
  exposure: 0.94,
  // Lower values make the fine eye and nose relief sparkle.
  roughness: 0.33,
  envMapIntensity: 1,
} as const;

type Lobe = {
  dir: [number, number, number];
  color: [number, number, number];
  sharp: number;
};

// Broad, soft reflections with a restrained icy cyan edge.
// The darker underside grounds the jaw without changing MouthDark.
const BASE = new THREE.Vector3(0.004, 0.005, 0.006);

const LOBES: readonly Lobe[] = [
  {
    dir: [-0.34, 0.65, 0.68],
    color: [1.48, 1.52, 1.54],
    sharp: 1.55,
  },
  {
    dir: [0.3, 0.1, 0.94],
    color: [0.25, 0.29, 0.34],
    sharp: 0.68,
  },
  {
    dir: [0.96, 0.16, -0.85],
    // Cool cyan instead of the previous emerald temple rim.
    color: [0.08, 0.22, 0.26],
    sharp: 13,
  },
  {
    dir: [-0.78, 0.35, -0.62],
    color: [0.05, 0.1, 0.16],
    sharp: 10,
  },
  {
    dir: [0.02, -0.88, 0.22],
    color: [0.025, 0.028, 0.032],
    sharp: 2.1,
  },
];

const VERTEX = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position =
      projectionMatrix *
      modelViewMatrix *
      vec4(position, 1.0);
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

  float lobe(vec3 dir, vec3 axis, float sharpness) {
    float angle = acos(clamp(dot(dir, axis), -1.0, 1.0));
    return exp(-angle * angle * sharpness);
  }

  void main() {
    float phi =
      (vUv.x - 0.5) * 6.283185307179586;

    float theta =
      (vUv.y - 0.5) * 3.141592653589793;

    float ct = cos(theta);

    vec3 dir = normalize(
      vec3(
        ct * cos(phi),
        sin(theta),
        ct * sin(phi)
      )
    );

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
  const dirs = LOBES.map((lobe) => new THREE.Vector3(...lobe.dir).normalize());

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
 * Builds the chamber reflection once and returns its PMREM texture.
 * Keep the existing caller's texture lifecycle.
 */
export function createChamberEnvironment(
  gl: THREE.WebGLRenderer,
  detail: SceneDetail,
): THREE.Texture {
  const width = detail === "full" ? 2048 : 1024;

  const rt = new THREE.WebGLRenderTarget(width, width / 2, {
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

  const scene = new THREE.Scene();
  scene.add(mesh);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);

  const previousTarget = gl.getRenderTarget();
  const previousTone = gl.toneMapping;
  const previousColor = gl.getClearColor(new THREE.Color());
  const previousAlpha = gl.getClearAlpha();

  let filtered: THREE.WebGLRenderTarget | undefined;
  let pmrem: THREE.PMREMGenerator | undefined;

  try {
    gl.toneMapping = THREE.NoToneMapping;
    gl.setClearColor(0x000000, 1);
    gl.setRenderTarget(rt);
    gl.render(scene, camera);

    pmrem = new THREE.PMREMGenerator(gl);
    filtered = pmrem.fromEquirectangular(rt.texture);

    return filtered.texture;
  } catch (error) {
    filtered?.dispose();
    throw error;
  } finally {
    gl.setRenderTarget(previousTarget);
    gl.setClearColor(previousColor, previousAlpha);
    gl.toneMapping = previousTone;

    pmrem?.dispose();
    geometry.dispose();
    material.dispose();
    rt.dispose();
  }
}

/**
 * Apply the chamber only to Silver.
 * MouthDark keeps its existing flat lamp-plate behavior.
 */
export function tuneHeadMaterials(
  root: THREE.Object3D,
  env: THREE.Texture | null,
) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    for (const entry of materials) {
      const mat = entry as THREE.MeshStandardMaterial;
      if (!mat?.isMeshStandardMaterial) continue;

      mat.fog = false;

      if (mat.name === "MouthDark") {
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
      } else if (mat.name === "Silver") {
        mat.metalness = 1;
        mat.roughness = CHAMBER.roughness;
        mat.envMapIntensity = CHAMBER.envMapIntensity;
        mat.envMap = env;
        mat.needsUpdate = true;

        mesh.layers.set(0);
      }
    }
  });
}

/**
 * Clears any leftover MouthDark glyph shader patch from an earlier build so
 * a remount always paints the matte lamp plate.
 */
export function clearMouthGlyphPatch(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    for (const entry of materials) {
      const mat = entry as THREE.MeshStandardMaterial;
      if (!mat?.isMeshStandardMaterial || mat.name !== "MouthDark") continue;

      const uniforms = mat.userData.glyphUniforms as
        | { uGlyphMap?: { value?: THREE.Texture } }
        | undefined;

      if (!uniforms && mat.customProgramCacheKey?.() !== "mouth-glyph-v7") {
        continue;
      }

      uniforms?.uGlyphMap?.value?.dispose();
      mat.userData.glyphUniforms = undefined;
      // Empty compile hook keeps Three's call site safe while dropping the mix.
      mat.onBeforeCompile = () => {};
      mat.customProgramCacheKey = () => "mouth-plain-v1";
      mat.needsUpdate = true;
    }
  });
}
