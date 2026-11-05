'use client';

/**
 * Silver-head hero. The poster is server-rendered markup, so the page is usable before any 3D loads.
 * The WebGL canvas is a client-only chunk (next/dynamic, ssr:false) that fades in over the poster.
 *
 * Put  data-head-reveal  on the first content section after the hero; it fades/slides in during the reveal.
 */
import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { HeadControl } from './SilverHeadCanvas';

const SilverHeadCanvas = dynamic(() => import('./SilverHeadCanvas'), { ssr: false, loading: () => null });

export const SILVER_HEAD_ASSETS = {
  glb: '/silver-head/silver-head.glb',
  env: '/silver-head/studio-env.hdr',
  poster: '/silver-head/silver-head-poster.webp',
};

const CSS = `
.sh-hero{position:relative;min-height:100svh;display:grid;place-items:center;overflow:hidden}
.sh-stage{position:relative;width:min(78vmin,640px);aspect-ratio:1/1}
.sh-poster,.sh-canvas{position:absolute;inset:0;width:100%;height:100%}
.sh-poster{object-fit:contain;transition:opacity .45s cubic-bezier(.65,0,.35,1)}
.sh-canvas{opacity:0;transition:opacity .45s cubic-bezier(.65,0,.35,1)}
.sh-stage[data-ready="true"] .sh-canvas{opacity:1}
.sh-stage[data-ready="true"] .sh-poster{opacity:0}
.sh-stage[data-mode="poster"] .sh-poster{transition:opacity .3s cubic-bezier(.65,0,.35,1) .45s}
html[data-head-away] .sh-stage[data-mode="poster"] .sh-poster{opacity:0}
.sh-pause{position:absolute;right:16px;bottom:16px;font:500 13px/1 system-ui,sans-serif;padding:10px 14px;border-radius:999px;
  border:1px solid rgba(255,255,255,.25);background:rgba(20,22,26,.55);color:#fff;cursor:pointer;backdrop-filter:blur(6px)}
.sh-pause:focus-visible{outline:2px solid #fff;outline-offset:2px}
[data-head-reveal]{transition:opacity .3s cubic-bezier(.65,0,.35,1) .45s,transform .3s cubic-bezier(.65,0,.35,1) .45s}
html[data-head-armed]:not([data-head-revealed]) [data-head-reveal]{opacity:0;transform:translateY(28px)}
@media (prefers-reduced-motion: reduce){
  [data-head-reveal]{transition:opacity .3s linear}
  html[data-head-armed]:not([data-head-revealed]) [data-head-reveal]{transform:none}
  .sh-poster,.sh-canvas{transition:none}
}`;

class CanvasBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function SilverHeadHero({ children, assets = SILVER_HEAD_ASSETS }: { children?: ReactNode; assets?: typeof SILVER_HEAD_ASSETS }) {
  const control = useRef<HeadControl>({ revealStart: null, hidden: false, paused: false, reducedMotion: false, opacity: 1, kick: () => {} });
  const [mode, setMode] = useState<'poster' | '3d'>('poster');
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const canvasWrap = useRef<HTMLDivElement>(null);

  // capabilities + reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => { setReduced(mq.matches); control.current.reducedMotion = mq.matches; control.current.kick(); };
    apply();
    mq.addEventListener('change', apply);
    if (webglAvailable()) setMode('3d');
    return () => mq.removeEventListener('change', apply);
  }, []);

  // pause rendering + time accumulation when off-screen or the tab is hidden
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let visible = true;
    const update = () => {
      const on = visible && document.visibilityState === 'visible';
      setActive(on);
      if (on) requestAnimationFrame(() => control.current.kick());
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; update(); }, { threshold: 0 });
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);

  // one timed reveal on the first meaningful downward scroll (no scroll hijacking, no pinning)
  useEffect(() => {
    const html = document.documentElement;
    const c = control.current;
    let lastY = window.scrollY;
    let revealed = false;
    if (lastY > 48) {
      // landed mid-page: no forced reveal
      revealed = true;
      html.dataset.headRevealed = 'true';
      html.dataset.headAway = 'true';
      c.hidden = true;
    } else {
      html.dataset.headArmed = 'true';
    }
    const onScroll = () => {
      const y = window.scrollY;
      const atTop = y < 4;
      if (!revealed) {
        if (y > lastY && y > 12) {
          revealed = true;
          html.dataset.headRevealed = 'true';
          html.dataset.headAway = 'true';
          if (!c.reducedMotion) c.revealStart = performance.now();
          c.kick();
        }
      } else if (atTop && (c.hidden || c.revealStart !== null)) {
        // back at the top: settled, closed-mouth hero; no second forced reveal
        c.revealStart = null;
        c.hidden = false;
        delete html.dataset.headAway;
        c.kick();
      } else if (!atTop && c.revealStart === null && !c.hidden && !c.reducedMotion && y > lastY) {
        c.hidden = true; // later scroll-aways just fade the head
        html.dataset.headAway = 'true';
        c.kick();
      }
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      delete html.dataset.headArmed; delete html.dataset.headRevealed; delete html.dataset.headAway;
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const toPoster = useCallback(() => { setReady(false); setMode('poster'); }, []);
  const onOpacity = useCallback((o: number) => { if (canvasWrap.current) canvasWrap.current.style.opacity = String(o); }, []);
  const togglePause = () => {
    const p = !paused;
    setPaused(p);
    control.current.paused = p;
    control.current.kick();
  };

  return (
    <section className="sh-hero" aria-label="Intro">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={stage} className="sh-stage" data-ready={mode === '3d' && ready ? 'true' : 'false'} data-mode={mode}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-poster" src={assets.poster} alt="Silver sculpted head" width={1024} height={1024} fetchPriority="high" />
        {mode === '3d' && (
          <div ref={canvasWrap} className="sh-canvas-wrap" style={{ position: 'absolute', inset: 0 }}>
            <div className="sh-canvas">
              <CanvasBoundary onError={toPoster}>
                <SilverHeadCanvas
                  active={active}
                  control={control}
                  glbUrl={assets.glb}
                  envUrl={assets.env}
                  onReady={onReady}
                  onPoorPerformance={toPoster}
                  onOpacity={onOpacity}
                />
              </CanvasBoundary>
            </div>
          </div>
        )}
      </div>
      {mode === '3d' && ready && !reduced && (
        <button type="button" className="sh-pause" onClick={togglePause} aria-pressed={paused}>
          {paused ? 'Play motion' : 'Pause motion'}
        </button>
      )}
      {children}
    </section>
  );
}
