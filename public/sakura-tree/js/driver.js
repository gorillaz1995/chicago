// Scheduling + camera. Two independent clocks:
//   loop time  -> FlightLoop (phoenix + rebirth), runs on its own, never tied to scroll
//   scroll     -> camera stations hero -> close -> back, plus strong parallax on swipe
// Pointer / touch on #scene-zone: horizontal drag orbits; wind bends the canopy.

const TIERS = [
  { name: "high", dprMax: 2.0, fps: 60 },
  { name: "medium", dprMax: 1.5, fps: 60 },
  { name: "low", dprMax: 1.25, fps: 30 },
  { name: "minimal", dprMax: 1.0, fps: 30 },
];
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const rad = (d) => (d * Math.PI) / 180;

export class SceneDriver {
  constructor({ zone, stage, renderer, flight, model, onFrame }) {
    Object.assign(this, { zone, stage, renderer, flight, model, onFrame });
    this.t = 0;
    this.raf = 0;
    this.lastTick = 0;
    this.lastDraw = 0;
    this.visible = true;
    this.cam = 0;
    this.camTarget = 0;
    this.dirty = true;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)");
    this.coarse = matchMedia("(pointer: coarse)");
    this.tierIndex = initialTier();
    this.samples = [];
    this.stats = {
      tier: TIERS[this.tierIndex].name,
      fps: 0,
      frameMs: 0,
      downgrades: 0,
      rendered: 0,
    };
    const xs = model.blossoms.data.filter((_, i) => i % 8 === 0);
    this.canopyWidth = Math.max(...xs) - Math.min(...xs);

    // Interactive camera offsets (degrees) and pointer wind
    this.orbitYaw = 0;
    this.orbitPitch = 0;
    this.orbitYawT = 0;
    this.orbitPitchT = 0;
    this.wind = { centre: [...model.emberCentre], strength: 0, target: 0 };
    this._drag = null;

    this._bind();
  }
  get tier() {
    return TIERS[this.tierIndex];
  }
  get animating() {
    return !this.reduced.matches;
  }

  _bind() {
    addEventListener(
      "scroll",
      () => {
        this._readScroll();
        this.request();
      },
      { passive: true },
    );
    this.reduced.addEventListener?.("change", () => {
      this._readScroll();
      this.cam = this.camTarget;
      this.orbitYaw = this.orbitYawT = 0;
      this.orbitPitch = this.orbitPitchT = 0;
      this.wind.strength = this.wind.target = 0;
      this.request();
    });
    document.addEventListener("visibilitychange", () =>
      document.hidden ? this.pause() : this.request(),
    );
    new ResizeObserver(() => this._resize()).observe(this.stage);
    new IntersectionObserver(
      (e) => {
        this.visible = e[0].isIntersecting && e[0].intersectionRect.height > 2;
        this.visible ? this.request() : this.pause();
      },
      { threshold: [0, 0.01] },
    ).observe(this.zone);

    // Pointer / touch interaction lives on the scroll zone so the fixed canvas stays behind copy
    if (this.zone) {
      this.zone.addEventListener("pointerdown", (e) => this._onPointerDown(e), {
        passive: true,
      });
      this.zone.addEventListener("pointermove", (e) => this._onPointerMove(e), {
        passive: false,
      });
      this.zone.addEventListener("pointerup", (e) => this._onPointerUp(e));
      this.zone.addEventListener("pointercancel", (e) => this._onPointerUp(e));
      this.zone.addEventListener("pointerleave", (e) => {
        if (!this._drag) this._fadeWind();
        else this._onPointerUp(e);
      });
    }

    this._readScroll();
    this.cam = this.camTarget;
    this._resize();
  }

  /** Ignore drags that start on interactive UI so cards and links stay usable. */
  _isUiTarget(el) {
    return !!el?.closest?.(
      "a, button, input, textarea, select, [role='button'], .rounded-2xl",
    );
  }

  _onPointerDown(e) {
    if (this.reduced.matches || this._isUiTarget(e.target)) return;
    this._drag = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      y: e.clientY,
      mode: null, // 'orbit' | 'scroll' decided on first meaningful move
      captured: false,
    };
    this._applyWindAt(e.clientX, e.clientY, 0.12);
    this.request();
  }

  _onPointerMove(e) {
    if (this.reduced.matches) return;

    // Hover / finger wind even without an active drag decision
    if (!this._drag || this._drag.id !== e.pointerId) {
      if (e.pointerType === "mouse" && !this._isUiTarget(e.target)) {
        this._applyWindAt(e.clientX, e.clientY, 0.1);
        this.request();
      }
      return;
    }

    const d = this._drag;
    d.x = e.clientX;
    d.y = e.clientY;
    const dx = d.x - d.x0;
    const dy = d.y - d.y0;
    const dist = Math.hypot(dx, dy);

    if (!d.mode && dist > 10) {
      // First decisive move: mostly horizontal = orbit; mostly vertical = let the page scroll
      d.mode = Math.abs(dx) > Math.abs(dy) * 1.15 ? "orbit" : "scroll";
      if (d.mode === "orbit" && this.zone?.setPointerCapture) {
        try {
          this.zone.setPointerCapture(e.pointerId);
          d.captured = true;
        } catch (_) {
          /* ignore */
        }
      }
    }

    if (d.mode === "orbit") {
      e.preventDefault();
      // ±35° yaw, ±12° pitch from drag distance (noticeable on a phone thumb swipe)
      const span = Math.min(innerWidth, 480);
      this.orbitYawT = Math.max(-35, Math.min(35, (dx / span) * 70));
      this.orbitPitchT = Math.max(-12, Math.min(12, (-dy / span) * 28));
      this._applyWindAt(e.clientX, e.clientY, 0.22);
      this.dirty = true;
      this.request();
    } else if (d.mode === "scroll") {
      this._applyWindAt(e.clientX, e.clientY, 0.14);
      this.request();
    } else {
      this._applyWindAt(e.clientX, e.clientY, 0.12);
      this.request();
    }
  }

  _onPointerUp(e) {
    if (!this._drag || this._drag.id !== e.pointerId) return;
    if (this._drag.captured && this.zone?.releasePointerCapture) {
      try {
        this.zone.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    }
    this._drag = null;
    // Ease orbit back to the scroll camera over ~1s (handled in _tick)
    this.orbitYawT = 0;
    this.orbitPitchT = 0;
    this._fadeWind();
    this.request();
  }

  _applyWindAt(clientX, clientY) {
    const strength = arguments[2] ?? 0.12;
    const rect = this.stage.getBoundingClientRect();
    const hit = this.renderer.hitPlane(clientX - rect.left, clientY - rect.top);
    this.wind.centre = hit;
    // Peak several× the rebirth puff so lean is obvious on mobile
    this.wind.target = Math.min(0.28, Math.max(this.wind.target, strength));
  }

  _fadeWind() {
    this.wind.target = 0;
  }

  /** Scroll progress across #scene-zone: hero (0) -> close-up (1) -> quiet background (2) */
  _readScroll() {
    const zone = this.zone;
    const scrollable = Math.max(1, (zone?.scrollHeight || 0) - innerHeight);
    const scrolled = zone
      ? Math.min(scrollable, Math.max(0, -zone.getBoundingClientRect().top))
      : Math.min(scrollable, Math.max(0, scrollY));
    const p = Math.min(1, Math.max(0, scrolled / scrollable));
    this.progress = p;
    const prev = this.camTarget;
    this.camTarget = this.reduced.matches
      ? p < 0.5
        ? 0
        : 2
      : p < 0.42
        ? smooth(0, 0.42, p)
        : 1 + smooth(0.42, 1, p);
    if (this.camTarget !== prev) this.dirty = true;
  }

  _resize() {
    const r = this.stage.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, this.tier.dprMax);
    this.renderer.resize(r.width, r.height, dpr);
    this.stats.dpr = dpr;
    this.stats.size = `${this.renderer.width}×${this.renderer.height}`;
    this.dirty = true;
    this.request();
  }

  request() {
    if (this.raf || !this.visible || document.hidden) return;
    this.raf = requestAnimationFrame((ts) => this._tick(ts));
  }
  pause() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastTick = 0;
  }

  _tick(ts) {
    this.raf = 0;
    const dt = this.lastTick
      ? Math.min(0.1, (ts - this.lastTick) / 1000)
      : 1 / 60;
    if (this.lastTick) this._measure(ts - this.lastTick);
    this.lastTick = ts;
    const camMoving = Math.abs(this.camTarget - this.cam) > 0.0005;
    this.cam = this.reduced.matches
      ? this.camTarget
      : camMoving
        ? this.cam + (this.camTarget - this.cam) * (1 - Math.exp(-dt * 6))
        : this.camTarget;

    // Orbit eases back in ~1s when released; follows target while dragging
    if (this.animating) {
      const kOrbit = 1 - Math.exp(-dt * (this._drag?.mode === "orbit" ? 14 : 3.2));
      this.orbitYaw += (this.orbitYawT - this.orbitYaw) * kOrbit;
      this.orbitPitch += (this.orbitPitchT - this.orbitPitch) * kOrbit;
      const kWind = 1 - Math.exp(-dt * 8);
      this.wind.strength += (this.wind.target - this.wind.strength) * kWind;
    } else {
      this.orbitYaw = this.orbitYawT = 0;
      this.orbitPitch = this.orbitPitchT = 0;
      this.wind.strength = this.wind.target = 0;
    }

    const orbitMoving =
      Math.abs(this.orbitYaw - this.orbitYawT) > 0.01 ||
      Math.abs(this.orbitPitch - this.orbitPitchT) > 0.01 ||
      Math.abs(this.wind.strength - this.wind.target) > 0.001 ||
      Math.abs(this.orbitYaw) > 0.01 ||
      Math.abs(this.wind.strength) > 0.001;

    if (this.animating) {
      this.t = (this.t + dt) % this.flight.D;
      if (ts - this.lastDraw >= 1000 / this.tier.fps - 2) {
        this.lastDraw = ts;
        this.draw();
      }
      this.request();
    } else {
      if (this.dirty || camMoving || orbitMoving) this.draw();
    }
  }

  draw() {
    this.dirty = false;
    const view = this._camera(this.cam);
    this.renderer.setView(view.eye, view.target, view.shift);
    const bird = this.animating
      ? this.flight.state(this.t)
      : this.flight.still();
    const scale = this.canopyWidth * (this.renderer.aspect < 0.8 ? 0.17 : 0.14);
    const wind =
      this.animating && this.wind.strength > 0.002
        ? { centre: this.wind.centre, strength: this.wind.strength }
        : null;
    this.renderer.render({
      bird,
      birdScale: scale,
      quiet: view.quiet,
      parallax: view.parallax,
      wind,
    });
    this.stats.rendered++;
    this.onFrame?.(this);
  }

  _camera(k) {
    const S = this.model.stations,
      keys = ["hero", "close", "back"];
    const i = Math.min(1, Math.floor(k)),
      f = k - i,
      a = S[keys[i]],
      b = S[keys[i + 1]];
    const aspect = this.renderer.aspect,
      t = Math.tan(rad(15));
    const fit = (st) => Math.max(st.dist, st.fitHalfWidth / (t * aspect));
    const L = (x, y) => x + (y - x) * f;
    const target = [0, 1, 2].map((c) => L(a.target[c], b.target[c]));

    // Strong scroll parallax: wide yaw swing + lateral target shift (larger on touch)
    const yawAmp = this.coarse.matches ? 26 : 16;
    const lateral = this.coarse.matches ? 0.55 : 0.4;
    // progress 0..1 sweeps from -amp to +amp so a full swipe clearly travels the canopy
    const scrollYaw = this.reduced.matches
      ? 0
      : (this.progress - 0.5) * 2 * yawAmp;
    const scrollShiftX = this.reduced.matches
      ? 0
      : (this.progress - 0.5) * 2 * lateral;

    target[0] += scrollShiftX;

    const dist = Math.exp(L(Math.log(fit(a)), Math.log(fit(b))));
    const yaw = rad(L(a.yaw, b.yaw) + scrollYaw + this.orbitYaw),
      pitch = rad(L(a.pitch, b.pitch) + this.orbitPitch);
    const eye = [
      target[0] + dist * Math.sin(yaw) * Math.cos(pitch),
      target[1] + dist * Math.sin(pitch),
      target[2] + dist * Math.cos(yaw) * Math.cos(pitch),
    ];

    // Shader parallax: nearer branches slide opposite the scroll for depth against the page
    const parallax = this.reduced.matches
      ? 0
      : (this.progress - 0.5) * 2 * (this.coarse.matches ? 0.55 : 0.35);

    return {
      eye,
      target,
      shift: L(a.shift, b.shift) * smooth(0.95, 1.45, aspect),
      quiet: L(a.quiet, b.quiet),
      parallax,
    };
  }

  /** Adaptive quality: rAF interval median over 60 callbacks; > 24 ms steps the tier down. */
  _measure(ms) {
    if (!this.animating) return;
    this.samples.push(ms);
    if (this.samples.length < 60) return;
    const s = this.samples.sort((a, b) => a - b),
      med = s[30];
    this.samples = [];
    this.stats.frameMs = +med.toFixed(1);
    this.stats.fps = Math.round(1000 / med);
    if (med > 24 && this.tierIndex < TIERS.length - 1) {
      this.tierIndex++;
      this.stats.downgrades++;
      this.stats.tier = this.tier.name;
      this._resize();
    }
  }
}

function initialTier() {
  const cores = navigator.hardwareConcurrency || 4,
    mem = navigator.deviceMemory || 4;
  if (mem <= 2 || cores <= 2) return 2;
  if (matchMedia("(pointer: coarse)").matches && (mem <= 4 || cores <= 4))
    return 1;
  return 0;
}
