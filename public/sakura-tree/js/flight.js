// Animation logic for the phoenix loop. Pure math, no GL/DOM: given loop time t (seconds)
// it returns the bird's frame, wing angle, tail motion and the ember clock.
// Every periodic quantity uses an integer number of cycles per loop, so t = duration
// is identical to t = 0 (seamless in motion and blossom state).

const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);
const wrap = (d) => d - Math.round(d);             // signed distance on a unit circle

export class FlightLoop {
  constructor(path, timing, emberCentre) {
    this.timing = timing;
    this.D = timing.duration;
    this._buildPath(path);
    // closest path point to the ember cluster = where the bird slows down
    let best = 0, bd = Infinity;
    for (let i = 0; i < this.M; i++) {
      const p = this.P[i];
      const dd = (p[0] - emberCentre[0]) ** 2 + (p[1] - emberCentre[1]) ** 2 + (p[2] - emberCentre[2]) ** 2;
      if (dd < bd) { bd = dd; best = i; }
    }
    this.u0 = best / this.M;
    this._buildSpeed();
  }

  _buildPath(ctrl) {
    const n = ctrl.length, dense = [];
    for (let i = 0; i < n; i++) {
      const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
      for (let j = 0; j < 48; j++) dense.push(catmull(p0, p1, p2, p3, j / 48));
    }
    const cum = [0];
    for (let i = 1; i <= dense.length; i++) cum.push(cum[i - 1] + dist(dense[i - 1], dense[i % dense.length]));
    const L = cum[cum.length - 1];
    this.M = 720; this.length = L;
    this.P = []; let j = 0;
    for (let k = 0; k < this.M; k++) {
      const s = (L * k) / this.M;
      while (cum[j + 1] < s) j++;
      const f = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
      const a = dense[j], b = dense[(j + 1) % dense.length];
      this.P.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
    }
    const M = this.M;
    this.T = this.P.map((_, k) => norm(sub(this.P[(k + 1) % M], this.P[(k - 1 + M) % M])));
    // bank into turns: yaw rate around world-up, smoothed around the loop
    const raw = this.T.map((_, k) => {
      const a = this.T[(k - 2 + M) % M], b = this.T[(k + 2) % M];
      return (a[2] * b[0] - a[0] * b[2]) / ((4 * L) / M);
    });
    this.bank = raw.map((_, k) => {
      let s = 0; for (let w = -24; w <= 24; w++) s += raw[(k + w + M) % M];
      return Math.max(-0.75, Math.min(0.75, (s / 49) * 0.55));
    });
  }

  _buildSpeed() {
    const { slowAt, slowAmount, slowWidth } = this.timing, N = 1440;
    const v = []; let total = 0;
    for (let i = 0; i < N; i++) {
      const d = wrap(i / N - slowAt);
      v.push(1 - slowAmount * Math.exp(-((d / slowWidth) ** 2)));
      total += v[i];
    }
    this.U = [0];
    for (let i = 0; i < N; i++) this.U.push(this.U[i] + v[i] / total);
    this.Un = N;
    this.Uoff = this._U(slowAt);
  }
  _U(tau) { const f = frac(tau) * this.Un, i = Math.floor(f); return this.U[i] + (this.U[i + 1] - this.U[i]) * (f - i); }

  _sample(u) {
    const f = frac(u) * this.M, i = Math.floor(f), k = f - i, j = (i + 1) % this.M;
    const lerp3 = (A) => [0, 1, 2].map((c) => A[i][c] + (A[j][c] - A[i][c]) * k);
    return { pos: lerp3(this.P), fwd: norm(lerp3(this.T)), bank: this.bank[i] + (this.bank[j] - this.bank[i]) * k };
  }

  /** Full state at loop time t (seconds). */
  state(t) {
    const tm = this.timing, tau = frac(t / this.D);
    const u = frac(this._U(tau) - this.Uoff + this.u0);
    const { pos, fwd, bank } = this._sample(u);
    const dSlow = wrap(tau - tm.slowAt);
    const glide = Math.exp(-((dSlow / (tm.slowWidth * 0.8)) ** 2));          // 0..1 near the cluster
    const gestureSec = dSlow * this.D;                                        // seconds from the gesture
    const gesture = Math.exp(-((gestureSec / 0.38) ** 2));
    const beat = TAU * tm.beats * tau;
    return {
      ...frame(pos, fwd, bank),
      wing: 0.58 * (1 - 0.72 * glide) * Math.sin(beat) + 0.5 * gesture + 0.12 * glide,
      bob: -0.025 * Math.sin(beat),
      tailPhase: TAU * tm.tailCycles * tau,
      tailAmp: 0.045 + 0.02 * (1 - glide),
      flick: gesture,
      emberT: frac(dSlow) * this.D,           // seconds since the gesture, 0..duration
      gust: gestureSec >= 0 && gestureSec < 2.6 ? Math.exp(-gestureSec * 2.0) * Math.sin(gestureSec * 8.5) : 0,
    };
  }

  /** Reduced motion: a composed still - suspended beside the cluster, wings half open. */
  still() {
    const s = this.state((this.timing.slowAt - 0.035) * this.D);
    return { ...s, wing: 0.32, bob: 0, tailAmp: 0, flick: 0, emberT: this.D, gust: 0 };
  }
}

function frame(pos, fwd, bank) {
  let right = norm(cross(fwd, [0, 1, 0]));
  if (!isFinite(right[0])) right = [1, 0, 0];
  const up0 = cross(right, fwd);
  const c = Math.cos(bank), s = Math.sin(bank);
  const r = [0, 1, 2].map((i) => right[i] * c + up0[i] * s);
  const up = [0, 1, 2].map((i) => up0[i] * c - right[i] * s);
  return { pos, fwd, right: r, up };
}

function catmull(p0, p1, p2, p3, u) {           // centripetal Catmull-Rom
  const tj = (ti, a, b) => ti + Math.max(dist(a, b), 1e-5) ** 0.5;
  const t0 = 0, t1 = tj(t0, p0, p1), t2 = tj(t1, p1, p2), t3 = tj(t2, p2, p3);
  const t = t1 + (t2 - t1) * u;
  const L = (a, b, ta, tb) => a.map((v, i) => (v * (tb - t) + b[i] * (t - ta)) / (tb - ta));
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  return L(L(A1, A2, t0, t2), L(A2, A3, t1, t3), t1, t2);
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
