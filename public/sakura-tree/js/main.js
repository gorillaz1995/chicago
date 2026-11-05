// Wiring: feature detection, CSS palette -> renderer, static fallback, diagnostics.
import { loadModel } from './model.js';
import { SceneRenderer } from './renderer.js';
import { FlightLoop } from './flight.js';
import { SceneDriver } from './driver.js';

const $ = (s) => document.querySelector(s);
const root = document.documentElement;
const flags = () => new Set(location.hash.slice(1).split(/[,&]/).filter(Boolean)); // #perf, #static
const t0 = performance.now();

const probe = document.createElement('canvas').getContext('2d');
/** Resolve a CSS colour token to linear 0..1 RGB (supports #rgb / #rrggbb / rgb()). */
function color(token, fallback = '#000000') {
  const raw = getComputedStyle(root).getPropertyValue(token).trim() || fallback;
  probe.fillStyle = '#000000';
  probe.fillStyle = raw;
  const v = probe.fillStyle;
  if (v.startsWith('#')) {
    const hex = v.length === 4
      ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
      : v;
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  }
  const m = v.match(/(\d+(\.\d+)?)/g);
  if (m && m.length >= 3) return m.slice(0, 3).map((n) => Number(n) / 255);
  return [0.063, 0.047, 0.071];
}
const readPalette = () => ({
  bg: color('--bg', '#100c12'),
  ink: color('--line', '#2e2428'),
  blush: color('--blossom', '#f4aabb'),
  deep: color('--blossom-deep', '#d9728f'),
  coral: color('--coral', '#ee6a52'),
  bark: color('--bark', '#382428'),
  barkDeep: color('--bark-deep', '#140d12'),
  key: color('--light-key', '#f2b88c'),
  fill: color('--light-fill', '#5966b3'),
  rim: color('--light-rim', '#ff8cb2'),
  alpha: parseFloat(getComputedStyle(root).getPropertyValue('--line-alpha')) || 1,
});

function enterStatic(reason, stage) {
  console.info('[sakura-phoenix] static fallback:', reason);
  stage?.classList.remove('is-live');
  window.__sp = { mode: 'static', reason };
}

/** Boot (or re-boot) against the current #stage / #scene nodes. Safe to call from Next remounts. */
async function boot() {
  const stage = $('#stage');
  const canvas = $('#scene');
  if (!stage || !canvas) return;

  const hashFlags = flags();

  // Honour #static even when a previous WebGL session is still attached
  if (hashFlags.has('static')) {
    if (window.__sp?.driver) {
      try { window.__sp.driver.pause(); } catch (_) { /* ignore */ }
    }
    return enterStatic('requested via #static', stage);
  }

  // Same live canvas already running — resume if it was paused by a React unmount
  if (window.__sp?.mode === 'webgl' && window.__sp.canvas === canvas && canvas.isConnected) {
    window.__sp.driver?.request?.();
    return;
  }

  // Tear down a previous driver before binding a replacement canvas
  if (window.__sp?.driver) {
    try { window.__sp.driver.pause(); } catch (_) { /* ignore */ }
  }
  const probeGl = document.createElement('canvas').getContext('webgl2');
  if (!probeGl) return enterStatic('WebGL2 not available', stage);
  probeGl.getExtension('WEBGL_lose_context')?.loseContext();

  let model, renderer;
  try { model = await loadModel(canvas.dataset.scene, { embedded: 'embedded' in canvas.dataset }); }
  catch (e) { return enterStatic(e.message, stage); }
  try { renderer = new SceneRenderer(canvas, model); } catch (e) { return enterStatic(e.message, stage); }
  renderer.setPalette(readPalette());
  const flight = new FlightLoop(model.path, model.timing, model.emberCentre);

  let firstFrame = 0;
  const driver = new SceneDriver({
    zone: $('#scene-zone'), stage, renderer, flight, model,
    onFrame: () => { if (!firstFrame) { firstFrame = performance.now() - t0; stage.classList.add('is-live'); } },
  });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); driver.pause(); enterStatic('WebGL context lost', stage); });
  new MutationObserver(() => { renderer.setPalette(readPalette()); driver.dirty = true; driver.request(); })
    .observe(root, { attributes: true, attributeFilter: ['style', 'class'] });

  const fmt = new Intl.NumberFormat('en');
  const facts = {
    tree: `${fmt.format(model.header.counts.treeEdges)} lines`, bird: `${fmt.format(model.header.counts.birdEdges)} lines`,
    blossoms: fmt.format(model.header.counts.blossoms), loop: `${model.timing.duration} s`,
  };
  document.querySelectorAll('[data-fact]').forEach((el) => { el.textContent = facts[el.dataset.fact] ?? el.textContent; });

  window.__sp = {
    mode: 'webgl', model, renderer, driver, flight, canvas,
    seek: (t) => { driver.t = ((t % flight.D) + flight.D) % flight.D; driver.draw(); },   // inspection helper
    stats: () => ({ ...driver.stats, firstFrameMs: Math.round(firstFrame), drawCalls: renderer.drawCalls,
      treeLines: model.header.counts.treeEdges, birdLines: model.header.counts.birdEdges,
      blossoms: model.blossoms.count, dataBytes: model.bytes, loopTime: +driver.t.toFixed(2) }),
  };

  if (hashFlags.has('perf')) {
    const hud = $('#hud');
    if (hud) {
      hud.hidden = false;
      setInterval(() => {
        const s = window.__sp.stats();
        hud.textContent = `fps ${s.fps || '–'}  rAF ${s.frameMs || '–'} ms  tier ${s.tier}\n` +
          `dpr ${s.dpr}  ${s.size}  draws ${s.drawCalls}\nloop ${s.loopTime}s  first frame ${s.firstFrameMs} ms`;
      }, 500);
    }
  }
  driver.request();
}

// Expose for Next.js remounts; auto-run for the standalone public/index.html page
window.__sakuraBoot = boot;
if ($('#stage') && $('#scene')) boot();
