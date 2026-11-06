import * as THREE from "three";

/**
 * v6 glass head look: a glass shell whose skull peels into wireframe in one
 * place while it reassembles in another, and two diamond eyes.
 *
 * Everything runs in the existing materials pass: no transmission pass, no
 * post-processing, one extra line draw. MouthOpen and the spin stay owned by
 * SilverHeadCanvas; only rigid skull triangles (no MouthOpen motion) peel.
 *
 * Press burst: the head breaks into glass cubes from the pressed point,
 * hangs, and reassembles 1.5 s after the press. The cubes are one instanced
 * draw animated on the GPU; idle, it draws zero instances.
 */
export const GLASS = {
  /** Clock of the build/deconstruct waves at first paint (the poster is rendered here). */
  startTime: 22,
  speed: 1,
  /** Glass body. Alpha rises from face-on to grazing angles. */
  tint: "#cfeeff",
  alphaFace: 0.03,
  alphaEdge: 0.5,
  fresnelPower: 3,
  specularGain: 1.3,
  /** Crisp studio highlights fixed to the camera (view space), so the glass reads as glass on the soft chamber. */
  highlight: 1.5,
  roughness: 0.07,
  envMapIntensity: 1.35,
  /** Wire lines. */
  wire: "#a9ecff",
  wireRest: 0.12,
  wireLive: 0.95,
  /** Shards glow while they fly out or back in. */
  shardGlow: "#8fe3ff",
  /** Distance a peeled shard drifts outward, metres. */
  drift: 0.009,
  /** Diamonds. */
  gemSparkle: 14,
  gemFire: 0.45,
  gemEnv: 3.2,
} as const;

export const BURST = {
  cubes: 2200,
  /** Cube edge length range, metres. */
  sizeMin: 0.0034,
  sizeMax: 0.0074,
  /** Flight distance range, metres. */
  distanceMin: 0.008,
  distanceMax: 0.052,
  /** Max tumble, radians. */
  spin: 7,
  outSeconds: 0.35,
  /** Reassembly starts this long after the burst starts (cubes stay out ~0.75 s). */
  revertAt: 0.75,
  backSeconds: 0.5,
  /** Whole head between bursts, seconds (automatic loop). */
  restSeconds: 1.5,
  fadeSeconds: 0.09,
  /** Seconds of delay per metre from the pressed point. */
  ripple: 0.7,
  edge: "#9ff0ff",
} as const;

const BURST_END = BURST.revertAt + BURST.backSeconds + 0.26;


const ORDER = { glass: 3, wire: 2, cavity: 5 } as const;

type GlassState = {
  version: 2;
  uniforms: { uBuildTime: { value: number }; uShow: { value: number } };
  time: number;
  burst: {
    t: number;
    active: boolean;
    uniforms: { uBurstT: { value: number }; uHit: { value: THREE.Vector3 } };
  };
  shell?: THREE.Mesh;
  cubes?: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.Material>;
  gems?: THREE.Object3D;
  gemsHome?: { position: THREE.Vector3; scale: THREE.Vector3 };
  cavity: THREE.Material[];
};

function createState(): GlassState {
  return {
    version: 2,
    uniforms: { uBuildTime: { value: GLASS.startTime }, uShow: { value: 1 } },
    time: GLASS.startTime,
    burst: {
      t: 0,
      active: false,
      uniforms: { uBurstT: { value: 0 }, uHit: { value: new THREE.Vector3(0, 0, 0.1) } },
    },
    cavity: [],
  };
}

const FIELD = /* glsl */ `
  uniform float uBuildTime;

  // Head-local metres. Three slow travelling waves; where their sum rises above
  // the threshold the glass peels into wire, where it falls the glass rebuilds.
  float shField(vec3 p) {
    float t = uBuildTime;
    return 0.50 * sin(p.y * 62.0 + p.z * 41.0 - t * 0.55)
         + 0.38 * sin(p.x * 58.0 - p.y * 37.0 + t * 0.43 + 1.7)
         + 0.30 * sin(p.z * 70.0 + p.x * 33.0 - t * 0.31 + 4.1);
  }

  // 0 = glass, 1 = peeled to wire. zone 0 never peels.
  float shState(vec3 p, float seed, float zone) {
    float f = shField(p) + (seed - 0.5) * 0.5;
    float thr = mix(2.4, 0.22, zone);
    return smoothstep(thr - 0.11, thr + 0.11, f);
  }
`;

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Where the skull may peel (crown, back, temples), in head-local metres. The face stays glass. */
function zoneAt(x: number, y: number, z: number) {
  const face = smooth(-0.01, 0.025, z) * (1 - smooth(0.05, 0.08, y));
  const upper = smooth(0.025, 0.055, y);
  const back = smooth(-0.01, -0.045, z) * smooth(-0.005, 0.03, y);
  return Math.max(upper, back) * (1 - face);
}

function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function materialsOf(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/** Per-triangle attributes for the shell, plus the wire lines over the peel zone. */
function prepareShell(mesh: THREE.Mesh) {
  const src = mesh.geometry;
  const pos = src.getAttribute("position") as THREE.BufferAttribute;
  const morph = src.morphAttributes.position?.[0] as
    | THREE.BufferAttribute
    | undefined;
  const index = src.getIndex();
  const triCount = index ? index.count / 3 : pos.count / 3;
  const vid = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);

  const rigid = new Uint8Array(pos.count).fill(1);
  if (morph) {
    for (let i = 0; i < morph.count; i++) {
      if (
        Math.abs(morph.getX(i)) + Math.abs(morph.getY(i)) + Math.abs(morph.getZ(i)) >
        1e-6
      ) {
        rigid[i] = 0;
      }
    }
  }

  const geometry = index ? src.toNonIndexed() : src.clone();
  const centroid = new Float32Array(triCount * 9);
  const seed = new Float32Array(triCount * 3);
  const zone = new Float32Array(triCount * 3);

  const edges = new Map<number, [number, number]>();
  const vertZone = new Float32Array(pos.count);

  for (let t = 0; t < triCount; t++) {
    const a = vid(t, 0);
    const b = vid(t, 1);
    const c = vid(t, 2);
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
    const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
    const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    const still = rigid[a] && rigid[b] && rigid[c];
    const z = still ? zoneAt(cx, cy, cz) : 0;
    const s = hash(cx, cy, cz);
    for (let k = 0; k < 3; k++) {
      centroid.set([cx, cy, cz], (t * 3 + k) * 3);
      seed[t * 3 + k] = s;
      zone[t * 3 + k] = z;
    }
    if (z > 0.02) {
      const sides: [number, number][] = [
        [a, b],
        [b, c],
        [c, a],
      ];
      for (const [p, q] of sides) {
        const lo = Math.min(p, q);
        const hi = Math.max(p, q);
        edges.set(lo * pos.count + hi, [lo, hi]);
      }
      for (const v of [a, b, c]) {
        vertZone[v] = Math.max(vertZone[v], zoneAt(pos.getX(v), pos.getY(v), pos.getZ(v)));
      }
    }
  }

  geometry.setAttribute("aCentroid", new THREE.BufferAttribute(centroid, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute("aZone", new THREE.BufferAttribute(zone, 1));

  const lineIndex: number[] = [];
  edges.forEach(([p, q]) => lineIndex.push(p, q));
  const wireGeometry = new THREE.BufferGeometry();
  wireGeometry.setAttribute("position", pos);
  wireGeometry.setAttribute("aZone", new THREE.BufferAttribute(vertZone, 1));
  wireGeometry.setIndex(lineIndex);

  return { geometry, wireGeometry };
}

function glassMaterial(env: THREE.Texture | null, state: GlassState) {
  const material = new THREE.MeshStandardMaterial({
    // Not "Silver": tuneHeadMaterials would turn it back into chrome on a remount.
    name: "SilverGlass",
    color: new THREE.Color(0.02, 0.035, 0.045),
    metalness: 0,
    roughness: GLASS.roughness,
    envMap: env,
    envMapIntensity: GLASS.envMapIntensity,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  material.fog = false;

  const tint = new THREE.Color(GLASS.tint);
  const glow = new THREE.Color(GLASS.shardGlow);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBuildTime = state.uniforms.uBuildTime;
    shader.uniforms.uShow = state.uniforms.uShow;
    shader.uniforms.uTint = { value: tint };
    shader.uniforms.uGlow = { value: glow };
    shader.uniforms.uAlpha = {
      value: new THREE.Vector3(GLASS.alphaFace, GLASS.alphaEdge, GLASS.fresnelPower),
    };
    shader.uniforms.uSpecGain = { value: GLASS.specularGain };
    shader.uniforms.uHighlight = { value: GLASS.highlight };
    shader.uniforms.uDrift = { value: GLASS.drift };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 aCentroid;
        attribute float aSeed;
        attribute float aZone;
        uniform float uDrift;
        varying float vPeel;
        ${FIELD}`,
      )
      .replace(
        "#include <morphtarget_vertex>",
        `#include <morphtarget_vertex>
        float peel = aZone > 0.0 ? shState(aCentroid, aSeed, aZone) : 0.0;
        transformed = mix(transformed, aCentroid, peel);
        transformed += normalize(aCentroid) * peel * uDrift * (0.4 + aSeed);
        vPeel = peel;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uTint;
        uniform vec3 uGlow;
        uniform vec3 uAlpha;
        uniform float uSpecGain;
        uniform float uHighlight;
        uniform float uShow;
        varying float vPeel;`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        if (vPeel > 0.985) discard;`,
      )
      .replace(
        "#include <opaque_fragment>",
        `float ndv = clamp(abs(dot(normal, geometryViewDir)), 0.0, 1.0);
        float fres = pow(1.0 - ndv, uAlpha.z);
        float flight = vPeel * (1.0 - vPeel) * 4.0;
        float alpha = mix(uAlpha.x, uAlpha.y, fres) * (1.0 - vPeel) + flight * 0.3;
        vec3 rv = reflect(-geometryViewDir, normal);
        float hi = pow(max(dot(rv, normalize(vec3(-0.42, 0.62, 0.66))), 0.0), 160.0)
                 + 0.55 * pow(max(dot(rv, normalize(vec3(0.74, 0.18, 0.64))), 0.0), 70.0)
                 + 0.35 * pow(max(dot(rv, normalize(vec3(0.05, -0.75, 0.66))), 0.0), 40.0);
        alpha = clamp(alpha + hi * 0.5 * (1.0 - vPeel), 0.0, 1.0);
        vec3 glass = totalSpecular * uSpecGain + totalDiffuse * 0.12 + uTint * (alpha * 0.12 + hi * uHighlight);
        gl_FragColor = vec4(glass + uGlow * flight * 0.55, clamp(alpha, 0.0, 1.0)) * uShow;`,
      );
  };
  material.customProgramCacheKey = () => "sh-glass-v6";
  return material;
}

function wireMaterial(state: GlassState) {
  return new THREE.ShaderMaterial({
    name: "SilverWire",
    uniforms: {
      uBuildTime: state.uniforms.uBuildTime,
      uShow: state.uniforms.uShow,
      uWire: { value: new THREE.Color(GLASS.wire) },
      uLevels: { value: new THREE.Vector2(GLASS.wireRest, GLASS.wireLive) },
    },
    vertexShader: /* glsl */ `
      attribute float aZone;
      uniform vec2 uLevels;
      uniform float uShow;
      varying float vA;
      ${FIELD}
      void main() {
        float seed = fract(sin(dot(position, vec3(127.1, 311.7, 74.7))) * 43758.5453);
        float peel = shState(position, seed, aZone);
        float flight = peel * (1.0 - peel) * 4.0;
        vec4 mv = modelViewMatrix * vec4(position * 1.002, 1.0);
        vec3 centre = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        // Lines on the far side of the head read through the glass; keep them quieter.
        float near = smoothstep(-0.35, 0.45, dot(normalize(mv.xyz - centre), normalize(-mv.xyz)));
        vA = aZone * (uLevels.x + uLevels.y * peel + flight * 0.5) * mix(0.3, 1.0, near) * uShow;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uWire;
      varying float vA;
      void main() {
        gl_FragColor = vec4(uWire, clamp(vA, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function gemMaterial(env: THREE.Texture | null, state: GlassState) {
  const material = new THREE.MeshPhysicalMaterial({
    name: "Gem",
    color: new THREE.Color(0.015, 0.02, 0.025),
    metalness: 0,
    roughness: 0,
    ior: 2.42,
    specularIntensity: 1,
    iridescence: 0.22,
    iridescenceIOR: 1.8,
    envMap: env,
    envMapIntensity: GLASS.gemEnv,
    emissive: new THREE.Color(0.11, 0.13, 0.15),
    flatShading: true,
  });
  material.fog = false;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBuildTime = state.uniforms.uBuildTime;
    shader.uniforms.uSparkle = { value: GLASS.gemSparkle };
    shader.uniforms.uFire = { value: GLASS.gemFire };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vFacet;`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        vFacet = objectNormal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uBuildTime;
        uniform float uSparkle;
        uniform float uFire;
        varying vec3 vFacet;
        vec3 shHue(float h) {
          return clamp(abs(fract(h + vec3(0.0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
        }`,
      )
      .replace(
        "#include <opaque_fragment>",
        `{
          vec3 r = reflect(-geometryViewDir, normal);
          float id = fract(sin(dot(vFacet, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          float twinkle = 0.65 + 0.35 * sin(uBuildTime * 2.3 + id * 40.0);
          float g = pow(max(dot(r, normalize(vec3(0.42, 0.62, 0.66))), 0.0), 700.0)
                  + pow(max(dot(r, normalize(vec3(-0.58, 0.36, 0.73))), 0.0), 700.0)
                  + pow(max(dot(r, normalize(vec3(0.08, -0.32, 0.94))), 0.0), 900.0);
          float ndv = clamp(dot(normal, geometryViewDir), 0.0, 1.0);
          vec3 fire = mix(vec3(1.0), shHue(id + ndv * 1.7 + uBuildTime * 0.03), 0.45) * pow(ndv, 2.0) * uFire;
          outgoingLight += vec3(g) * uSparkle * twinkle + fire;
        }
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => "sh-gem-v6";
  return material;
}


/** Small deterministic PRNG so the burst looks the same on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Unit cube stored tiny (1 mm) so whole-scene bounds and framing never see it;
// the shader scales each instance to its real size.
const CUBE_UNIT = 0.001;

function cubeMaterial(env: THREE.Texture | null, burst: GlassState["burst"]) {
  const material = new THREE.MeshStandardMaterial({
    name: "GlassCube",
    color: new THREE.Color(0.03, 0.05, 0.065),
    metalness: 0,
    roughness: 0.1,
    envMap: env,
    envMapIntensity: 1.9,
  });
  material.fog = false;
  const edge = new THREE.Color(BURST.edge);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBurstT = burst.uniforms.uBurstT;
    shader.uniforms.uHit = burst.uniforms.uHit;
    shader.uniforms.uTiming = {
      value: new THREE.Vector4(BURST.outSeconds, BURST.revertAt, BURST.backSeconds, BURST.ripple),
    };
    shader.uniforms.uEdge = { value: edge };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 aHome;
        attribute vec3 aOff;
        attribute vec4 aRot;
        attribute float aSize;
        uniform float uBurstT;
        uniform vec3 uHit;
        uniform vec4 uTiming;
        varying vec3 vLocal;
        varying float vK;
        vec3 shRotate(vec3 v, vec3 a, float ang) {
          float c = cos(ang);
          float s = sin(ang);
          return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c);
        }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        float shDelay = distance(aHome, uHit) * uTiming.w;
        float shOut = clamp((uBurstT - shDelay) / uTiming.x, 0.0, 1.0);
        shOut = 1.0 - pow(1.0 - shOut, 3.0);
        float shBack = clamp((uBurstT - uTiming.y - shDelay * 0.4) / uTiming.z, 0.0, 1.0);
        shBack = shBack < 0.5 ? 4.0 * shBack * shBack * shBack : 1.0 - pow(-2.0 * shBack + 2.0, 3.0) * 0.5;
        float shHang = smoothstep(uTiming.x, uTiming.y, uBurstT) * 0.12;
        float shK = (shOut + shHang) * (1.0 - shBack);
        float shAng = aRot.w * shK;
        objectNormal = shRotate(objectNormal, aRot.xyz, shAng);
        vK = shK;
        vLocal = position * ${(1 / CUBE_UNIT).toFixed(1)};`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 shAway = normalize(aHome - uHit + vec3(1e-5));
        vec3 transformed = shRotate(vLocal * aSize, aRot.xyz, shAng)
          + aHome + (aOff + shAway * length(aOff) * 0.35) * shK;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uEdge;
        varying vec3 vLocal;
        varying float vK;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        vec3 shA = abs(vLocal) * 2.0;
        float shMid = shA.x + shA.y + shA.z - max(shA.x, max(shA.y, shA.z)) - min(shA.x, min(shA.y, shA.z));
        totalEmissiveRadiance += uEdge * smoothstep(0.78, 0.96, shMid) * (0.3 + 0.7 * vK);`,
      );
  };
  material.customProgramCacheKey = () => "sh-cube-v6";
  return material;
}

/** Area-weighted cubes on the shell surface, each with a flight, tumble and size. */
function createCubes(shell: THREE.Mesh, env: THREE.Texture | null, state: GlassState) {
  const geo = shell.geometry;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const nrm = geo.getAttribute("normal") as THREE.BufferAttribute;
  const index = geo.getIndex();
  const tris = index ? index.count / 3 : pos.count / 3;
  const vid = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const area = new Float64Array(tris);
  let total = 0;
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(pos, vid(t, 0));
    b.fromBufferAttribute(pos, vid(t, 1));
    c.fromBufferAttribute(pos, vid(t, 2));
    total += b.sub(a).cross(c.sub(a)).length() * 0.5;
    area[t] = total;
  }

  const n = BURST.cubes;
  const rand = mulberry32(20261107);
  const home = new Float32Array(n * 3);
  const off = new Float32Array(n * 3);
  const rot = new Float32Array(n * 4);
  const size = new Float32Array(n);
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const axis = new THREE.Vector3();

  for (let i = 0; i < n; i++) {
    // Pick a triangle by area, then a point inside it.
    const target = rand() * total;
    let lo = 0;
    let hi = tris - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (area[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    let u = rand();
    let v = rand();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    p.set(0, 0, 0);
    q.set(0, 0, 0);
    const weights = [w, u, v];
    for (let k = 0; k < 3; k++) {
      const id = vid(lo, k);
      p.x += pos.getX(id) * weights[k];
      p.y += pos.getY(id) * weights[k];
      p.z += pos.getZ(id) * weights[k];
      q.x += nrm.getX(id) * weights[k];
      q.y += nrm.getY(id) * weights[k];
      q.z += nrm.getZ(id) * weights[k];
    }
    q.normalize();
    const edge = BURST.sizeMin + (BURST.sizeMax - BURST.sizeMin) * rand() * rand();
    p.addScaledVector(q, -edge * 0.4);
    home.set([p.x, p.y, p.z], i * 3);

    dir
      .copy(q)
      .multiplyScalar(0.75)
      .addScaledVector(p.clone().normalize(), 0.5)
      .add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.9))
      .normalize();
    const dist = BURST.distanceMin + (BURST.distanceMax - BURST.distanceMin) * Math.pow(rand(), 1.6);
    off.set([dir.x * dist, dir.y * dist, dir.z * dist], i * 3);

    axis.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    rot.set([axis.x, axis.y, axis.z, (rand() * 2 - 1) * BURST.spin], i * 4);
    size[i] = edge;
  }

  const box = new THREE.BoxGeometry(CUBE_UNIT, CUBE_UNIT, CUBE_UNIT);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex(box.getIndex());
  geometry.setAttribute("position", box.getAttribute("position"));
  geometry.setAttribute("normal", box.getAttribute("normal"));
  geometry.setAttribute("aHome", new THREE.InstancedBufferAttribute(home, 3));
  geometry.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 3));
  geometry.setAttribute("aRot", new THREE.InstancedBufferAttribute(rot, 4));
  geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 1));
  // Zero instances while idle: compiled with the scene, nothing drawn.
  geometry.instanceCount = 0;

  const cubes = new THREE.Mesh(geometry, cubeMaterial(env, state.burst));
  cubes.name = "GlassCubes";
  cubes.frustumCulled = false;
  return cubes;
}

/**
 * Swap the GLB's Silver and Gem materials for the glass look and add the wire.
 * Safe to call again after a remount: the converted meshes are reused.
 */
export function applyGlassHead(root: THREE.Object3D, env: THREE.Texture | null) {
  let state = root.userData.glassHead as GlassState | undefined;
  const fresh = !state || state.version !== 2;
  if (!state || fresh) {
    state = createState();
    root.userData.glassHead = state;
  }
  state.cavity = [];

  // Remounts (and React's dev double effects) reuse the materials and only
  // swap the environment map, so no program is disposed while it compiles.
  const reuse = (material: THREE.Material | undefined) => {
    const standard = material as THREE.MeshStandardMaterial | undefined;
    if (!standard || fresh) return false;
    standard.envMap = env;
    standard.needsUpdate = true;
    return true;
  };

  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) meshes.push(mesh);
  });

  for (const mesh of meshes) {
    const names = materialsOf(mesh).map((m) => m?.name);

    if (mesh.userData.glassShell || names.includes("Silver")) {
      if (!mesh.userData.glassShell) {
        const { geometry, wireGeometry } = prepareShell(mesh);
        mesh.geometry = geometry;
        const wire = new THREE.LineSegments(wireGeometry, wireMaterial(state));
        wire.name = "SilverWire";
        wire.renderOrder = ORDER.wire;
        wire.frustumCulled = false;
        mesh.add(wire);
        mesh.userData.glassShell = true;
      }

      if (!reuse(mesh.userData.glassMaterial)) {
        const previous = mesh.material as THREE.Material;
        const material = glassMaterial(env, state);
        mesh.material = material;
        mesh.userData.glassMaterial = material;
        previous.dispose();

        const wire = mesh.getObjectByName("SilverWire") as THREE.LineSegments | undefined;
        if (wire && fresh) {
          (wire.material as THREE.Material).dispose();
          wire.material = wireMaterial(state);
        }
      }
      mesh.renderOrder = ORDER.glass;

      let cubes = mesh.getObjectByName("GlassCubes") as GlassState["cubes"];
      if (cubes && (fresh || !reuse(cubes.material))) {
        mesh.remove(cubes);
        cubes.geometry.dispose();
        cubes.material.dispose();
        cubes = undefined;
      }
      if (!cubes) {
        cubes = createCubes(mesh, env, state);
        mesh.add(cubes);
      }
      state.cubes = cubes;
      state.shell = mesh;
    } else if (mesh.userData.glassGem || names.includes("Gem")) {
      if (!reuse(mesh.userData.gemMaterial)) {
        const previous = mesh.material as THREE.Material;
        const material = gemMaterial(env, state);
        mesh.material = material;
        mesh.userData.gemMaterial = material;
        mesh.userData.glassGem = true;
        previous.dispose();
      }
      state.gems = mesh;
      state.gemsHome ??= { position: mesh.position.clone(), scale: mesh.scale.clone() };
    } else if (names.includes("MouthDark")) {
      // Drawn after the glass so it only shows through the open lips, not through the face.
      for (const material of materialsOf(mesh)) {
        material.transparent = true;
        material.depthWrite = true;
        material.forceSinglePass = true;
        state.cavity.push(material);
      }
      mesh.renderOrder = ORDER.cavity;
    }
  }
  applyBurst(state);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function applyBurst(state: GlassState) {
  const burst = state.burst;
  const t = burst.t;
  const back = BURST.revertAt + BURST.backSeconds;
  const show = burst.active
    ? t < BURST.revertAt
      ? 1 - smooth(0, BURST.fadeSeconds, t)
      : smooth(back + 0.06, back + 0.22, t)
    : 1;
  state.uniforms.uShow.value = show;
  burst.uniforms.uBurstT.value = t;
  for (const material of state.cavity) material.opacity = show;
  if (state.cubes) state.cubes.geometry.instanceCount = burst.active ? BURST.cubes : 0;

  const gems = state.gems;
  const homeGems = state.gemsHome;
  if (gems && homeGems) {
    const k = burst.active
      ? easeOut(clamp01(t / 0.5)) * (1 - easeInOut(clamp01((t - BURST.revertAt) / BURST.backSeconds)))
      : 0;
    gems.position.copy(homeGems.position);
    gems.position.y += 0.006 * k;
    gems.position.z += 0.05 * k;
    gems.scale.copy(homeGems.scale).multiplyScalar(1 + 0.25 * k);
  }
}

/**
 * Advance the build/deconstruct waves (frozen by `still`: reduced motion, paused)
 * and any running press burst. `hurry` (the dive has started) skips straight to
 * the reassembly. Returns true while a burst runs, so the caller keeps rendering.
 */
export function updateGlassHead(
  root: THREE.Object3D,
  dt: number,
  still: boolean,
  hurry = false,
) {
  const state = root.userData.glassHead as GlassState | undefined;
  if (!state) return false;
  if (!still) {
    state.time += dt * GLASS.speed;
    state.uniforms.uBuildTime.value = state.time;
  }
  const burst = state.burst;
  if (!burst.active) return false;
  if (hurry && burst.t < BURST.revertAt) burst.t = BURST.revertAt;
  burst.t += dt;
  if (burst.t >= BURST_END) {
    burst.active = false;
    burst.t = 0;
  }
  applyBurst(state);
  return burst.active;
}

/** World-space point where a ray meets the head (shell or gems), or null. */
export function hitGlassHead(root: THREE.Object3D, raycaster: THREE.Raycaster) {
  const state = root.userData.glassHead as GlassState | undefined;
  if (!state?.shell) return null;
  const targets: THREE.Object3D[] = [state.shell];
  if (state.gems) targets.push(state.gems);
  const hit = raycaster.intersectObjects(targets, false)[0];
  return hit ? hit.point.clone() : null;
}

export function isHeadBursting(root: THREE.Object3D) {
  const state = root.userData.glassHead as GlassState | undefined;
  return Boolean(state?.burst.active);
}

/**
 * Break the head into cubes from `worldPoint` (the pressed spot). They hang,
 * then reassemble `BURST.revertAt` seconds after the press. Ignored while one runs.
 */
export function startHeadBurst(root: THREE.Object3D, worldPoint?: THREE.Vector3 | null) {
  const state = root.userData.glassHead as GlassState | undefined;
  if (!state?.shell || !state.cubes || state.burst.active) return false;
  const hit = state.burst.uniforms.uHit.value;
  if (worldPoint) {
    state.shell.updateWorldMatrix(true, false);
    hit.copy(state.shell.worldToLocal(worldPoint.clone()));
  } else {
    // Automatic loop: burst from a different spot on the front half each time.
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.06;
    hit.set(Math.cos(a) * r, Math.sin(a) * r * 1.3, 0.09);
  }
  state.burst.active = true;
  state.burst.t = 0;
  applyBurst(state);
  return true;
}

/** For stills (tests): pose a burst at time `t` seconds after the press. */
export function setHeadBurstTime(root: THREE.Object3D, t: number | null, worldPoint?: THREE.Vector3) {
  const state = root.userData.glassHead as GlassState | undefined;
  if (!state) return;
  if (t === null) {
    state.burst.active = false;
    state.burst.t = 0;
  } else {
    if (!state.burst.active) startHeadBurst(root, worldPoint);
    state.burst.t = t;
  }
  applyBurst(state);
}

/** For stills (poster, tests): set the wave clock directly. */
export function setGlassHeadTime(root: THREE.Object3D, time: number) {
  const state = root.userData.glassHead as GlassState | undefined;
  if (!state) return;
  state.time = time;
  state.uniforms.uBuildTime.value = time;
}
