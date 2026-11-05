// WebGL2 renderer: solid lit branches, denser blossoms, feather ribbons, ground disc, depth fog.
// Colours come from CSS tokens (see main.js). Pointer gust + parallax shift are uniforms.

const COMMON = `
uniform vec4 uGust;                         // xyz: gust centre, w: displacement
uniform float uParallax;                    // scroll depth slide in world X
vec3 gust(vec3 p, float flex) {
  vec3 d = p - uGust.xyz;
  return p + vec3(0.45, 1.15, 0.35) * uGust.w * exp(-dot(d, d) / 0.14) * (0.25 + 0.75 * flex);
}
float fadeOf(float w, vec2 depth, float amount) {
  return 1.0 - amount * clamp((w - depth.x) / (depth.y - depth.x), 0.0, 1.0);
}
mat3 euler(vec3 r) {                         // XYZ order: Rz * Ry * Rx
  float cx = cos(r.x), sx = sin(r.x), cy = cos(r.y), sy = sin(r.y), cz = cos(r.z), sz = sin(r.z);
  return mat3(cz,sz,0., -sz,cz,0., 0.,0.,1.) * mat3(cy,0.,-sy, 0.,1.,0., sy,0.,cy) * mat3(1.,0.,0., 0.,cx,sx, 0.,-sx,cx);
}
vec3 parallaxShift(vec3 p) {
  // Nearer canopy slides farther than trunk roots for a clear depth read on scroll
  float near = clamp((p.y - 0.2) / 2.8, 0.0, 1.0);
  return vec3(uParallax * (0.35 + 0.9 * near), 0.0, uParallax * 0.15 * near);
}
`;

const LIGHT_FS = `
precision mediump float;
uniform vec3 uBark, uBarkDeep, uKey, uFill, uRim, uBg;
uniform float uQuiet, uFog;
in vec3 vN; in vec3 vW; in float vFade;
out vec4 o;
void main() {
  vec3 n = normalize(vN);
  float wrap = 0.55 + 0.45 * max(0.0, dot(n, normalize(uKey)));
  float fill = 0.35 + 0.65 * max(0.0, dot(n, normalize(uFill)));
  float rim = pow(1.0 - abs(dot(n, normalize(vec3(0.1, 0.2, 1.0)))), 2.4);
  vec3 bark = mix(uBarkDeep, uBark, wrap);
  vec3 c = bark * (0.55 * wrap + 0.35 * fill) + uRim * rim * 0.55;
  float fog = mix(1.0, fadeOfFog(length(vW - vec3(0.0, 1.4, 0.0))), uFog);
  c = mix(uBg, c, fog * vFade * (1.0 - 0.55 * uQuiet));
  o = vec4(c, 1.0);
}
float fadeOfFog(float d) {
  return 1.0 - smoothstep(4.5, 14.0, d);
}
`;

// Tree solid: pos(3)+nrm(3)+flex(1)
const TREE_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in float aFlex;
uniform mat4 uVP; uniform vec2 uDepth;
${COMMON}
out vec3 vN; out vec3 vW; out float vFade;
void main() {
  vec3 p = gust(aPos, aFlex) + parallaxShift(aPos);
  vW = p; vN = aNrm;
  gl_Position = uVP * vec4(p, 1.0);
  vFade = fadeOf(gl_Position.w, uDepth, 0.4);
}`;
const TREE_FS = `#version 300 es
precision mediump float;
uniform vec3 uBark, uBarkDeep, uKey, uFill, uRim, uBg;
uniform float uQuiet, uFog;
in vec3 vN; in vec3 vW; in float vFade;
out vec4 o;
float fadeOfFog(float d) { return 1.0 - smoothstep(5.5, 16.0, d); }
void main() {
  vec3 n = normalize(vN);
  // Soft wrap so the cylinder volume reads as bark, not as a pink rim silhouette
  float ndl = dot(n, normalize(uKey));
  float wrap = 0.42 + 0.58 * max(0.0, ndl);
  float fill = 0.55 + 0.45 * max(0.0, abs(dot(n, normalize(uFill))));
  float rim = pow(clamp(1.0 - abs(dot(n, normalize(vec3(0.05, 0.2, 1.0)))), 0.0, 1.0), 3.0);
  vec3 bark = mix(uBarkDeep, uBark, clamp(wrap * 1.1, 0.0, 1.0));
  // Ambient lift keeps solid branches visible on the night background
  vec3 c = bark * (0.55 + 0.7 * wrap + 0.35 * fill) + uRim * rim * 0.22;
  float fog = mix(1.0, fadeOfFog(length(vW - vec3(0.0, 1.4, 0.0))), uFog * 0.65);
  c = mix(uBg, c, fog * vFade * (1.0 - 0.45 * uQuiet));
  o = vec4(c, 1.0);
}`;

// Bird ribbons: pos(3)+attr(3)+sign(1)
const BIRD_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aAttr;            // side, tail, accent
layout(location=2) in float aSign;
uniform mat4 uVP, uModel; uniform vec2 uDepth;
uniform float uWing, uBob; uniform vec3 uTail;
${COMMON}
out float vFade; out float vAccent; out vec3 vN; out vec3 vW;
void main() {
  vec3 p = aPos;
  if (aAttr.x != 0.0) {
    float a = uWing * (0.75 + 0.5 * smoothstep(0.08, 0.42, abs(p.x)));
    float lx = p.x;
    p.x = lx * cos(a);
    p.z += abs(lx) * sin(a);
  }
  float w = aAttr.y;
  if (w > 0.0) {
    p.x += sin(uTail.x - w * 5.0) * uTail.y * w + uTail.z * 0.07 * w * w;
    p.z += cos(uTail.x * 0.5 - w * 4.0) * uTail.y * 0.6 * w + uTail.z * 0.09 * w * w;
  }
  p.z += uBob;
  vec4 world = uModel * vec4(p, 1.0);
  vW = world.xyz;
  // Approximate outward normal from model right/up for rim lighting
  vN = normalize(mat3(uModel) * vec3(aSign * 0.2, 0.3, 1.0));
  gl_Position = uVP * world;
  vFade = fadeOf(gl_Position.w, uDepth, 0.45);
  vAccent = aAttr.z;
}`;
const BIRD_FS = `#version 300 es
precision mediump float;
uniform vec3 uInk, uAccent, uKey, uRim, uBg;
uniform float uQuiet;
in float vFade; in float vAccent; in vec3 vN; in vec3 vW;
out vec4 o;
void main() {
  vec3 n = normalize(vN);
  float wrap = 0.55 + 0.45 * max(0.0, dot(n, normalize(uKey)));
  float rim = pow(1.0 - abs(dot(n, normalize(vec3(0.1, 0.3, 1.0)))), 1.8);
  vec3 base = mix(uInk, uAccent, vAccent * 0.85 + 0.15);
  vec3 c = base * (0.55 + 0.55 * wrap) + uRim * rim * 0.9 + uAccent * 0.2;
  c = mix(uBg, c, vFade * (1.0 - 0.35 * uQuiet));
  o = vec4(c, 1.0);
}`;

const BLOOM_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in float aTint;
layout(location=3) in vec4 iPosScale;
layout(location=4) in vec4 iRotEmber;
uniform mat4 uVP; uniform vec2 uDepth; uniform float uSize, uEmberT;
${COMMON}
out vec3 vN; out float vTint; out float vFade; out float vCoral; out vec3 vW;
void main() {
  float s = iPosScale.w, coral = 0.0;
  if (iRotEmber.w > 0.0) {
    float t = uEmberT - (iRotEmber.w - 1.0) * 0.18;
    coral = 0.75 * smoothstep(0.0, 0.5, t) * (1.0 - smoothstep(2.7, 3.6, t));
    float g = clamp((t - 2.9) / 1.0, 0.0, 1.0);
    float h = g - 1.0, back = 1.0 + 2.2 * h * h * h + 1.2 * h * h;
    s *= t < 2.9 ? 1.0 - smoothstep(0.55, 1.25, t) : back;
  }
  vec3 anchor = gust(iPosScale.xyz, 1.0) + parallaxShift(iPosScale.xyz);
  mat3 R = euler(iRotEmber.xyz);
  vec3 world = anchor + R * (aPos * s * uSize);
  vW = world;
  gl_Position = uVP * vec4(world, 1.0);
  vN = R * aNrm; vTint = aTint; vCoral = coral;
  vFade = fadeOf(gl_Position.w, uDepth, 0.25);
}`;
const BLOOM_FS = `#version 300 es
precision mediump float;
uniform vec3 uBlush, uDeep, uCoral, uBg, uKey, uFill, uRim;
uniform float uQuiet;
in vec3 vN; in float vTint; in float vFade; in float vCoral; in vec3 vW;
out vec4 o;
void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(uKey);
  float wrap = 0.45 + 0.55 * max(0.0, dot(n, L));
  float back = 0.35 * max(0.0, -dot(n, L));           // pink backlight / translucency
  float spec = pow(max(0.0, dot(reflect(-L, n), normalize(vec3(0.1, 0.4, 1.0)))), 28.0);
  float fill = 0.4 + 0.6 * max(0.0, dot(n, normalize(uFill)));
  vec3 petal = mix(mix(uDeep, uBlush, vTint), uCoral, vCoral * (0.55 + 0.45 * (1.0 - vTint)));
  vec3 c = petal * (0.55 * wrap + 0.35 * fill + back) + vec3(1.0, 0.92, 0.95) * spec * 0.55 + uRim * 0.12;
  c = mix(uBg, c, vFade * (1.0 - 0.4 * uQuiet));
  o = vec4(c, 1.0);
}`;

const FRAG_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in float aTint;
layout(location=3) in vec3 iOrigin;
layout(location=4) in vec3 iDir;
layout(location=5) in vec3 iSpin;
layout(location=6) in float iOrder;
uniform mat4 uVP; uniform float uEmberT;
${COMMON}
out float vAlpha; out float vCool; out vec3 vN;
void main() {
  float t = uEmberT - (iOrder - 1.0) * 0.18;
  float env = smoothstep(0.6, 0.95, t) * (1.0 - smoothstep(2.75, 3.2, t));
  float o1 = 1.0 - clamp((t - 0.6) / 1.3, 0.0, 1.0), out_ = 1.0 - o1 * o1 * o1;
  float back = smoothstep(2.2, 3.15, t);
  float k = out_ * (1.0 - back);
  vec3 drift = iDir * 0.23 + vec3(0.025 * sin(t * 2.6 + iDir.x * 6.0), 0.03 * sin(t * 1.7), 0.0);
  vec3 p = iOrigin + drift * k + parallaxShift(iOrigin);
  mat3 R = euler(iSpin * t);
  gl_Position = uVP * vec4(p + R * (aPos * 0.07 * (0.4 + 0.6 * env)), 1.0);
  vAlpha = env; vCool = smoothstep(1.8, 3.0, t); vN = R * aNrm;
}`;
const FRAG_FS = `#version 300 es
precision mediump float;
uniform vec3 uBlush, uCoral;
in float vAlpha; in float vCool; in vec3 vN;
out vec4 o;
void main() {
  float l = 0.75 + 0.35 * abs(normalize(vN).z);
  o = vec4(mix(uCoral, uBlush, vCool) * l * 1.15, vAlpha * 0.95);
}`;

const GROUND_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in float aTint;
uniform mat4 uVP;
${COMMON}
out float vTint; out vec3 vW;
void main() {
  vec3 p = aPos + parallaxShift(aPos) * 0.25;
  vW = p; vTint = aTint;
  gl_Position = uVP * vec4(p, 1.0);
}`;
const GROUND_FS = `#version 300 es
precision mediump float;
uniform vec3 uBg, uBarkDeep;
in float vTint; in vec3 vW;
out vec4 o;
void main() {
  float r = length(vW.xz);
  float fall = 1.0 - smoothstep(0.15, 1.7, r);
  // Soft contact shadow under the trunk — stays darker than the blossoms
  vec3 shade = mix(uBarkDeep, uBg, 0.35);
  vec3 c = mix(uBg, shade, fall * 0.9);
  o = vec4(c, 1.0);
}`;

export class SceneRenderer {
  constructor(canvas, model) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, stencil: false, powerPreference: 'default' });
    if (!gl) throw new Error('WebGL2 unavailable');
    Object.assign(this, { gl, canvas, model, width: 1, height: 1, cssW: 1, cssH: 1, drawCalls: 0 });
    this.palette = {
      bg: [0.063, 0.047, 0.071], ink: [0.18, 0.14, 0.16], alpha: 1,
      blush: [0.95, 0.66, 0.73], deep: [0.86, 0.45, 0.56], coral: [0.94, 0.42, 0.33],
      bark: [0.36, 0.27, 0.22], barkDeep: [0.14, 0.09, 0.07],
      key: [0.94, 0.77, 0.6], fill: [0.35, 0.41, 0.66], rim: [0.77, 0.47, 0.53],
    };
    this.vp = new Float32Array(16); this.model4 = new Float32Array(16); this.depth = [1, 2];
    this.eye = [0, 0, 0]; this.target = [0, 0, 0];
    this._build();
  }

  _program(vs, fs) {
    const gl = this.gl, p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }

  _build() {
    const gl = this.gl, m = this.model;
    this.progs = {
      tree: this._program(TREE_VS, TREE_FS),
      bird: this._program(BIRD_VS, BIRD_FS),
      bloom: this._program(BLOOM_VS, BLOOM_FS),
      frag: this._program(FRAG_VS, FRAG_FS),
      ground: this._program(GROUND_VS, GROUND_FS),
    };
    const vao = (fn) => { const v = gl.createVertexArray(); gl.bindVertexArray(v); fn(); gl.bindVertexArray(null); return v; };

    // Solid tree: pos3 + nrm3 + flex1
    const st = m.solidTree;
    this.treeVao = vao(() => {
      buffer(gl, gl.ARRAY_BUFFER, st.vertices);
      attrib(gl, 0, 3, 28, 0); attrib(gl, 1, 3, 28, 12); attrib(gl, 2, 1, 28, 24);
      buffer(gl, gl.ELEMENT_ARRAY_BUFFER, st.indices);
    });
    this.treeIndexCount = st.count;

    // Bird ribbons: pos3 + attr3 + sign1
    const sb = m.solidBird;
    this.birdVao = vao(() => {
      buffer(gl, gl.ARRAY_BUFFER, sb.vertices);
      attrib(gl, 0, 3, 28, 0); attrib(gl, 1, 3, 28, 12); attrib(gl, 2, 1, 28, 24);
      buffer(gl, gl.ELEMENT_ARRAY_BUFFER, sb.indices);
    });
    this.birdIndexCount = sb.count;

    const meshAttribs = (mesh) => {
      buffer(gl, gl.ARRAY_BUFFER, mesh.vertices);
      attrib(gl, 0, 3, 28, 0); attrib(gl, 1, 3, 28, 12); attrib(gl, 2, 1, 28, 24);
    };
    this.bloomVao = vao(() => {
      meshAttribs(m.meshes.flower);
      buffer(gl, gl.ARRAY_BUFFER, m.blossoms.data);
      attrib(gl, 3, 4, 32, 0, 1); attrib(gl, 4, 4, 32, 16, 1);
      buffer(gl, gl.ELEMENT_ARRAY_BUFFER, m.meshes.flower.indices);
    });
    this.fragVao = vao(() => {
      meshAttribs(m.meshes.petal);
      buffer(gl, gl.ARRAY_BUFFER, m.fragments.data);
      attrib(gl, 3, 3, 40, 0, 1); attrib(gl, 4, 3, 40, 12, 1); attrib(gl, 5, 3, 40, 24, 1); attrib(gl, 6, 1, 40, 36, 1);
      buffer(gl, gl.ELEMENT_ARRAY_BUFFER, m.meshes.petal.indices);
    });
    this.groundVao = vao(() => {
      meshAttribs(m.meshes.ground);
      buffer(gl, gl.ELEMENT_ARRAY_BUFFER, m.meshes.ground.indices);
    });
  }

  setPalette(p) { Object.assign(this.palette, p); }

  resize(cssW, cssH, dpr) {
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
    if (w !== this.canvas.width || h !== this.canvas.height) { this.canvas.width = w; this.canvas.height = h; }
    Object.assign(this, { cssW, cssH, width: w, height: h, dpr });
  }
  get aspect() { return this.width / this.height; }

  /** eye/target in world units, shift = horizontal lens shift in NDC (composition offset). */
  setView(eye, target, shift = 0, fovDeg = 30) {
    this.eye = eye; this.target = target;
    const aspect = this.aspect, d = Math.hypot(eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]);
    const proj = perspective((fovDeg * Math.PI) / 180, aspect, Math.max(0.1, d * 0.35), d * 2.2);
    proj[8] = -shift;
    mul(this.vp, proj, lookAt(eye, target, [0, 1, 0]));
    this.depth = [d - 1.2, d + 1.4];
  }

  /**
   * Unproject a CSS pixel onto the vertical plane through the tree origin facing the camera.
   * Used for pointer wind so lean tracks the finger clearly on mobile.
   */
  hitPlane(cssX, cssY) {
    const ndcX = (cssX / this.cssW) * 2 - 1;
    const ndcY = 1 - (cssY / this.cssH) * 2;
    // Approximate: map NDC through inverse of current view distance onto Y-up plane at target
    const t = this.target;
    const eye = this.eye;
    const dist = Math.hypot(eye[0] - t[0], eye[1] - t[1], eye[2] - t[2]) || 1;
    const fov = (30 * Math.PI) / 180;
    const halfH = Math.tan(fov / 2) * dist;
    const halfW = halfH * this.aspect;
    // Camera right / up from lookAt
    const z = norm([eye[0] - t[0], eye[1] - t[1], eye[2] - t[2]]);
    const x = norm(cross([0, 1, 0], z));
    const y = cross(z, x);
    return [
      t[0] + x[0] * ndcX * halfW + y[0] * ndcY * halfH,
      t[1] + x[1] * ndcX * halfW + y[1] * ndcY * halfH,
      t[2] + x[2] * ndcX * halfW + y[2] * ndcY * halfH,
    ];
  }

  render(f) {
    const gl = this.gl, P = this.palette, q = f.quiet || 0;
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(P.bg[0], P.bg[1], P.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);

    // Gust: phoenix rebirth + optional pointer wind (centre + strength).
    // Rebirth gust oscillates through negative sin values — compare on magnitude.
    const wind = f.wind || null;
    const rebirth = f.bird.gust * 0.035;
    const windStr = wind ? wind.strength : 0;
    const useWind = !!(wind && Math.abs(windStr) >= Math.abs(rebirth));
    const gustCentre = useWind ? wind.centre : this.model.emberCentre;
    const gustStr = useWind ? windStr : rebirth;
    const gust = [gustCentre[0], gustCentre[1], gustCentre[2], gustStr];
    const parallax = f.parallax || 0;
    this.drawCalls = 0;

    const setCommon = (u) => {
      if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, this.vp);
      if (u.uDepth) gl.uniform2fv(u.uDepth, this.depth);
      if (u.uGust) gl.uniform4fv(u.uGust, gust);
      if (u.uParallax) gl.uniform1f(u.uParallax, parallax);
      if (u.uBg) gl.uniform3fv(u.uBg, P.bg);
      if (u.uQuiet) gl.uniform1f(u.uQuiet, q);
      if (u.uKey) gl.uniform3fv(u.uKey, P.key);
      if (u.uFill) gl.uniform3fv(u.uFill, P.fill);
      if (u.uRim) gl.uniform3fv(u.uRim, P.rim);
      if (u.uFog) gl.uniform1f(u.uFog, 1);
    };

    // 0. Ground disc
    let { p, u } = this.progs.ground;
    gl.useProgram(p); gl.disable(gl.CULL_FACE);
    setCommon(u);
    gl.uniform3fv(u.uBarkDeep, P.barkDeep);
    gl.bindVertexArray(this.groundVao);
    gl.drawElements(gl.TRIANGLES, this.model.meshes.ground.count, gl.UNSIGNED_SHORT, 0); this.drawCalls++;

    // 1. Solid tree bark (no cull — prism winding varies along the polyline)
    ({ p, u } = this.progs.tree);
    gl.useProgram(p); gl.disable(gl.CULL_FACE);
    setCommon(u);
    gl.uniform3fv(u.uBark, P.bark); gl.uniform3fv(u.uBarkDeep, P.barkDeep);
    gl.bindVertexArray(this.treeVao);
    gl.drawElements(gl.TRIANGLES, this.treeIndexCount, gl.UNSIGNED_INT, 0); this.drawCalls++;

    // 2. Blossoms: opaque, depth-written
    ({ p, u } = this.progs.bloom);
    gl.useProgram(p);
    setCommon(u);
    gl.uniform1f(u.uSize, 0.078); gl.uniform1f(u.uEmberT, f.bird.emberT);
    gl.uniform3fv(u.uBlush, P.blush); gl.uniform3fv(u.uDeep, P.deep); gl.uniform3fv(u.uCoral, P.coral);
    gl.bindVertexArray(this.bloomVao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.model.meshes.flower.count, gl.UNSIGNED_SHORT, 0, this.model.blossoms.count); this.drawCalls++;

    // 3. Phoenix feather ribbons
    ({ p, u } = this.progs.bird);
    gl.useProgram(p); gl.disable(gl.CULL_FACE); gl.depthMask(true);
    birdMatrix(this.model4, f.bird, f.birdScale);
    setCommon(u);
    gl.uniformMatrix4fv(u.uModel, false, this.model4);
    gl.uniform1f(u.uWing, f.bird.wing); gl.uniform1f(u.uBob, f.bird.bob);
    gl.uniform3f(u.uTail, f.bird.tailPhase, f.bird.tailAmp, f.bird.flick);
    gl.uniform3fv(u.uInk, P.ink); gl.uniform3fv(u.uAccent, P.coral);
    gl.bindVertexArray(this.birdVao);
    gl.drawElements(gl.TRIANGLES, this.birdIndexCount, gl.UNSIGNED_INT, 0); this.drawCalls++;

    // 4. Ember fragments while rebirth runs
    if (f.bird.emberT < 3.8 && this.model.fragments.count) {
      ({ p, u } = this.progs.frag);
      gl.useProgram(p);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      setCommon(u);
      gl.uniform1f(u.uEmberT, f.bird.emberT);
      gl.uniform3fv(u.uBlush, P.blush); gl.uniform3fv(u.uCoral, P.coral);
      gl.bindVertexArray(this.fragVao);
      gl.drawElementsInstanced(gl.TRIANGLES, this.model.meshes.petal.count, gl.UNSIGNED_SHORT, 0, this.model.fragments.count); this.drawCalls++;
      gl.disable(gl.BLEND); gl.depthMask(true);
    }
    gl.bindVertexArray(null);
  }

  /** world -> CSS px */
  project(w) {
    const m = this.vp;
    const x = m[0] * w[0] + m[4] * w[1] + m[8] * w[2] + m[12], y = m[1] * w[0] + m[5] * w[1] + m[9] * w[2] + m[13];
    const h = m[3] * w[0] + m[7] * w[1] + m[11] * w[2] + m[15];
    return [((x / h) * 0.5 + 0.5) * this.cssW, (1 - ((y / h) * 0.5 + 0.5)) * this.cssH];
  }
}

function birdMatrix(out, b, s) {
  out.set([b.right[0] * s, b.right[1] * s, b.right[2] * s, 0, b.fwd[0] * s, b.fwd[1] * s, b.fwd[2] * s, 0,
    b.up[0] * s, b.up[1] * s, b.up[2] * s, 0, b.pos[0], b.pos[1], b.pos[2], 1]);
}
function buffer(gl, target, data) {
  const b = gl.createBuffer();
  gl.bindBuffer(target, b);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return b;
}
function attrib(gl, loc, size, stride, offset, divisor = 0) {
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
  if (divisor) gl.vertexAttribDivisor(loc, divisor);
}
function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function lookAt(e, c, up) {
  const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cross(up, z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
}
function mul(out, a, b) {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; out[i * 4 + j] = s; }
  return out;
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Silence unused LIGHT_FS (kept as reference for lighting formula)
void LIGHT_FS;
