'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  generateTopoIcons,
  getTopoColors,
  hexToRgbNorm,
  stepCriticallyDampedSpring,
  type Spring2D,
} from '@/lib/background/topo';

const VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform vec2 u_cursor;
uniform float u_glow;
uniform float u_radius;
uniform vec3 u_base;
uniform vec3 u_teal;
uniform vec3 u_slate;
uniform vec3 u_plum;
uniform vec3 u_cLow;
uniform vec3 u_cHigh;
uniform vec3 u_glowCol;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.02 + vec2(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y) * 2.6 + vec2(3.4, 7.1);

  float h = fbm(p);
  float region = fbm(p * 0.45 + vec2(5.2, 1.9));

  vec2 dCursor = gl_FragCoord.xy - vec2(u_cursor.x, u_res.y - u_cursor.y);
  float dist2 = dot(dCursor, dCursor);
  float r2 = max(u_radius * u_radius, 1.0);
  float gauss = exp(-dist2 / (2.0 * r2));
  h += u_glow * 0.085 * gauss;

  vec3 bg = mix(u_base, u_teal, smoothstep(0.25, 0.75, region) * 0.65);
  bg = mix(bg, u_slate, smoothstep(0.35, 0.85, uv.x * 0.6 + uv.y * 0.4) * 0.55);
  bg = mix(bg, u_plum, smoothstep(0.55, 0.95, 1.0 - region) * 0.45);

  float levels = 24.0;
  float scaled = h * levels;
  float frac = fract(scaled);
  float fw = max(fwidth(scaled), 0.001);
  float line = 1.0 - smoothstep(0.0, fw * 1.15, min(frac, 1.0 - frac));

  float lvlNorm = clamp(floor(scaled) / levels, 0.0, 1.0);
  vec3 lineCol = mix(u_cLow, u_cHigh, lvlNorm);
  float lineAlpha = mix(0.08, 0.22, lvlNorm);

  vec3 col = mix(bg, lineCol, line * lineAlpha);
  col = mix(col, u_glowCol, gauss * u_glow * 0.08);
  outColor = vec4(col, 1.0);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function TopoBackground({
  forceStatic = false,
  onFrameRendered,
}: {
  forceStatic?: boolean;
  onFrameRendered?: (count: number) => void;
}) {
  const pathname = usePathname() || '';
  const isEditorRoute = pathname.startsWith('/editor');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [hasWebGL2, setHasWebGL2] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const colors = useMemo(() => getTopoColors(), []);
  const icons = useMemo(() => generateTopoIcons(isSmallScreen ? 7 : 16, 84729), [isSmallScreen]);

  useEffect(() => {
    const updateSizeFlag = () => setIsSmallScreen(window.innerWidth < 768);
    updateSizeFlag();
    window.addEventListener('resize', updateSizeFlag);
    return () => window.removeEventListener('resize', updateSizeFlag);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coarseOrNoHover = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionOff = document.documentElement.dataset.motion === 'off';
    const isStatic = forceStatic || isEditorRoute || coarseOrNoHover || reducedMotion || motionOff;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const spring: Spring2D = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      vx: 0,
      vy: 0,
      glow: 0,
      vg: 0,
    };
    let targetX = spring.x;
    let targetY = spring.y;
    let targetGlow = 0;
    let frameCount = 0;
    let rafId: number | null = null;
    let lastTs = performance.now();
    let idleTimeout: ReturnType<typeof setTimeout> | null = null;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    let program: WebGLProgram | null = null;
    let uRes: WebGLUniformLocation | null = null;
    let uCursor: WebGLUniformLocation | null = null;
    let uGlow: WebGLUniformLocation | null = null;
    let uRadius: WebGLUniformLocation | null = null;

    if (gl) {
      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      if (vs && fs) {
        program = gl.createProgram();
        if (program) {
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);
          if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
            const loc = gl.getAttribLocation(program, 'a_pos');
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

            uRes = gl.getUniformLocation(program, 'u_res');
            uCursor = gl.getUniformLocation(program, 'u_cursor');
            uGlow = gl.getUniformLocation(program, 'u_glow');
            uRadius = gl.getUniformLocation(program, 'u_radius');

            const setVec3 = (name: string, hex: string) => {
              const u = gl.getUniformLocation(program!, name);
              if (u) gl.uniform3fv(u, hexToRgbNorm(hex));
            };
            setVec3('u_base', colors.base);
            setVec3('u_teal', colors.teal);
            setVec3('u_slate', colors.slate);
            setVec3('u_plum', colors.plum);
            setVec3('u_cLow', colors.contourLow);
            setVec3('u_cHigh', colors.contourHigh);
            setVec3('u_glowCol', colors.glow);
          } else {
            program = null;
          }
        }
      }
      if (!program) setHasWebGL2(false);
    } else {
      setHasWebGL2(false);
    }

    const syncWindowState = () => {
      (window as unknown as Record<string, unknown>).__TOPO_BG_STATE__ = {
        frameCount,
        isWebGL2: Boolean(gl && program),
        isStatic,
        pointerListenerAttached: !isStatic,
        iconCount: icons.length,
        mode: gl && program ? 'webgl2' : 'fallback',
      };
    };

    const updateIcons = () => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const glowActive = !isStatic && spring.glow > 0.02;
      const nearIndices: Array<{ idx: number; dist: number }> = [];

      if (glowActive) {
        icons.forEach((ic, idx) => {
          const ix = ic.nx * w;
          const iy = ic.ny * h;
          const dist = Math.hypot(spring.x - ix, spring.y - iy);
          if (dist <= 160) nearIndices.push({ idx, dist });
        });
        nearIndices.sort((a, b) => a.dist - b.dist);
      }
      const glowingSet = new Set(nearIndices.slice(0, 2).map((n) => n.idx));

      icons.forEach((ic, idx) => {
        const el = iconRefs.current[idx];
        if (!el) return;
        if (!glowActive) {
          el.style.opacity = String(ic.idleOpacity);
          el.style.transform = 'translate3d(0px, 0px, 0)';
          el.style.filter = 'none';
          return;
        }
        const ix = ic.nx * w;
        const iy = ic.ny * h;
        const dx = spring.x - ix;
        const dy = spring.y - iy;
        const dist = Math.hypot(dx, dy);
        const prox = Math.max(0, 1 - dist / 160) * spring.glow;
        const opacity = ic.idleOpacity + (0.55 - ic.idleOpacity) * prox;
        const tx = Math.max(-6, Math.min(6, (dx / Math.max(w, 1)) * 28 * ic.depth * spring.glow));
        const ty = Math.max(-6, Math.min(6, (dy / Math.max(h, 1)) * 28 * ic.depth * spring.glow));
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
        el.style.filter = glowingSet.has(idx) ? 'drop-shadow(0 0 6px rgba(142, 182, 155, 0.35))' : 'none';
      });
    };

    const renderFrame = () => {
      if (gl && program) {
        const w = Math.max(1, Math.floor(window.innerWidth * dpr));
        const h = Math.max(1, Math.floor(window.innerHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        gl.useProgram(program);
        gl.uniform2f(uRes, w, h);
        gl.uniform2f(uCursor, spring.x * dpr, spring.y * dpr);
        gl.uniform1f(uGlow, isStatic ? 0 : spring.glow);
        gl.uniform1f(uRadius, 180 * dpr);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      updateIcons();
      frameCount++;
      syncWindowState();
      onFrameRendered?.(frameCount);
    };

    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      const active = stepCriticallyDampedSpring(spring, targetX, targetY, targetGlow, dt);
      renderFrame();
      if (active && document.visibilityState === 'visible') {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const scheduleLoop = () => {
      if (isStatic || document.visibilityState !== 'visible') return;
      if (rafId === null) {
        lastTs = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    // Initial single static render
    renderFrame();

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      targetX = e.clientX;
      targetY = e.clientY;
      targetGlow = 1;
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        targetGlow = 0;
        scheduleLoop();
      }, 250);
      scheduleLoop();
    };

    const onPointerLeave = () => {
      targetGlow = 0;
      scheduleLoop();
    };

    const onResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => renderFrame(), 150);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    if (!isStatic) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave);
    }
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (idleTimeout) clearTimeout(idleTimeout);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (!isStatic) {
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerleave', onPointerLeave);
      }
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [colors, forceStatic, icons, isEditorRoute, onFrameRendered]);

  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
      {/* Shared 9-icon 24x24 outline SVG sprite */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <symbol id="topo-icon-resume" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="13" y2="17" />
          </symbol>
          <symbol id="topo-icon-career" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            <path d="M2 12h20" />
          </symbol>
          <symbol id="topo-icon-education" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10L12 5 2 10l10 5 10-5z" />
            <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
          </symbol>
          <symbol id="topo-icon-profile" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
          </symbol>
          <symbol id="topo-icon-skills" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="2.5" />
            <circle cx="18" cy="6" r="2.5" />
            <circle cx="12" cy="18" r="2.5" />
            <line x1="8.2" y1="7.2" x2="10.8" y2="15.8" />
            <line x1="15.8" y1="7.2" x2="13.2" y2="15.8" />
            <line x1="8.5" y1="6" x2="15.5" y2="6" />
          </symbol>
          <symbol id="topo-icon-achievements" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="9" r="5" />
            <path d="M9 13.5V21l3-2 3 2v-7.5" />
          </symbol>
          <symbol id="topo-icon-email" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <polyline points="22,6 12,13 2,6" />
          </symbol>
          <symbol id="topo-icon-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
            <line x1="3" y1="12" x2="21" y2="12" />
          </symbol>
          <symbol id="topo-icon-growth" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 17 9 11 13 15 21 7" />
            <polyline points="15 7 21 7 21 13" />
          </symbol>
        </defs>
      </svg>

      {hasWebGL2 ? (
        <canvas ref={canvasRef} data-topo-canvas="true" className="w-full h-full block" />
      ) : (
        <div
          data-topo-fallback="true"
          className="w-full h-full"
          style={{
            background: `radial-gradient(120% 90% at 20% 20%, ${colors.teal} 0%, ${colors.base} 55%), linear-gradient(140deg, ${colors.slate} 0%, ${colors.base} 50%, ${colors.plum} 100%)`,
          }}
        />
      )}

      {/* Seeded Poisson-disc outline icons */}
      <div className="fixed inset-0 pointer-events-none" data-topo-icons="true">
        {icons.map((ic, idx) => (
          <div
            key={ic.id}
            ref={(el) => {
              iconRefs.current[idx] = el;
            }}
            data-topo-icon={ic.type}
            style={{
              position: 'fixed',
              left: `${(ic.nx * 100).toFixed(2)}%`,
              top: `${(ic.ny * 100).toFixed(2)}%`,
              width: `${ic.sizePx}px`,
              height: `${ic.sizePx}px`,
              color: ic.color,
              opacity: ic.idleOpacity,
              willChange: 'transform, opacity',
            }}
          >
            <svg width={ic.sizePx} height={ic.sizePx} aria-hidden="true">
              <use href={`#topo-icon-${ic.type}`} />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
