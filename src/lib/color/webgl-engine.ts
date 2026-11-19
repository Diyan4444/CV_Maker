import { BackgroundRecipe } from '@/config/backgrounds';
import { PALETTE_RAMPS } from './oklab';

// Vertex shader: Full-screen quad
const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  // Flip Y for standard screen coordinates (0 at top, 1 at bottom)
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Fragment shader: OKLab distance-field organic color blending with simplex noise
const FRAGMENT_SHADER_SOURCE = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_cursor;
uniform float u_reduced_motion;

// Motion parameters
uniform float u_drift_speed;
uniform float u_drift_amp;
uniform float u_orbit_radius;
uniform float u_pointer_sens;
uniform float u_pointer_bloom;

// Up to 4 anchors (Note: Anchor struct contains NO arrays for strict GLSL ES 1.0 portability)
struct Anchor {
  vec2 pos;
  float radius;
  float weight;
  float stopCount;
  vec3 undertone; // OKLab [L, a, b]
  float hasUndertone;
};

uniform int u_anchor_count;
uniform Anchor u_anchors[4];
uniform vec3 u_stops[24]; // Flattened OKLab stops: 4 anchors * 6 stops

// Simplex 2D noise implementation (GLSL)
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Convert OKLab [L, a, b] to Linear sRGB [r, g, b]
vec3 oklab_to_linear(vec3 c) {
  float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;

  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;

  return vec3(
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

// Convert Linear sRGB to standard sRGB [0..1]
vec3 linear_to_srgb(vec3 c) {
  vec3 clamped = clamp(c, 0.0, 1.0);
  vec3 low = clamped * 12.92;
  vec3 high = 1.055 * pow(clamped, vec3(1.0 / 2.4)) - 0.055;
  vec3 cutoff = step(vec3(0.0031308), clamped);
  return mix(low, high, cutoff);
}

// Sample anchor ramp in OKLab space based on normalized distance t in [0..1]
vec3 sample_ramp(int anchorIdx, float stopCount, float t) {
  float clampedT = clamp(t, 0.0, 1.0);
  float numSegments = max(1.0, stopCount - 1.0);
  float scaled = clampedT * numSegments;
  float idxF = floor(scaled);
  float frac = fract(scaled);

  float nextIdxF = min(idxF + 1.0, stopCount - 1.0);

  int base = anchorIdx * 6;
  int i0 = base + int(idxF);
  int i1 = base + int(nextIdxF);

  vec3 c0 = u_stops[0];
  vec3 c1 = u_stops[0];

  for (int k = 0; k < 24; k++) {
    if (k == i0) c0 = u_stops[k];
    if (k == i1) c1 = u_stops[k];
  }

  // In OKLab, linear mix produces pure perceptual blends
  return mix(c0, c1, frac);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  // Domain warping via organic simplex noise
  vec2 warpedUv = uv;
  if (u_reduced_motion < 0.5) {
    // Noise layer 1
    float n1 = snoise(uv * 1.5 + vec2(u_time * u_drift_speed, -u_time * u_drift_speed * 0.8));
    float n2 = snoise(uv * 1.5 + vec2(-u_time * u_drift_speed * 0.9, u_time * u_drift_speed));
    
    // Noise layer 2 (fine harmonic)
    float n3 = snoise(uv * 3.2 + vec2(u_time * u_drift_speed * 1.3, u_time * u_drift_speed * 1.1));
    
    vec2 noiseOffset = vec2(n1, n2) * u_drift_amp + vec2(n3, -n3) * (u_drift_amp * 0.35);
    
    // Pointer attractor
    vec2 toCursor = u_cursor - uv;
    float distToCursor = length(toCursor);
    vec2 cursorPull = (toCursor / max(0.001, distToCursor)) * exp(-distToCursor * 3.2) * u_pointer_sens;
    
    warpedUv += noiseOffset + cursorPull;
  }

  vec3 blendedOklab = vec3(0.0);
  float totalWeight = 0.0001;

  for (int i = 0; i < 4; i++) {
    if (i >= u_anchor_count) break;

    vec2 pos = u_anchors[i].pos;
    float radius = u_anchors[i].radius;
    float weight = u_anchors[i].weight;
    float stopCount = u_anchors[i].stopCount;
    vec3 undertone = u_anchors[i].undertone;
    float hasUndertone = u_anchors[i].hasUndertone;

    // Small harmonic orbit if motion is enabled
    if (u_reduced_motion < 0.5) {
      float fi = float(i);
      vec2 orbit = vec2(
        cos(u_time * 0.22 + fi * 1.9),
        sin(u_time * 0.18 + fi * 2.3)
      ) * u_orbit_radius;
      pos += orbit;
    }

    // Distance in aspect-corrected coordinates
    vec2 delta = (warpedUv - pos);
    delta.x *= aspect;
    float d = length(delta);

    // Map distance: at anchor position (d -> 0), strongest/darkest shade (stop 0).
    // Toward center / away from anchor, t moves to 1.0 (lightest, softest shade).
    float rampT = clamp(d / radius, 0.0, 1.0);
    vec3 colLab = sample_ramp(i, stopCount, rampT);

    // If anchor has cool undertone (#243A66 for P1), subtly blend into noise contours
    if (hasUndertone > 0.5 && u_reduced_motion < 0.5) {
      float contour = snoise(uv * 3.5 + vec2(u_time * 0.04, -u_time * 0.03));
      float undertoneWeight = smoothstep(0.3, 0.9, contour) * 0.22;
      colLab = mix(colLab, undertone, undertoneWeight);
    }

    // Anchor weight based on smooth distance falloff
    float w = pow(max(0.001, 1.4 - d), 2.2) * weight;
    blendedOklab += colLab * w;
    totalWeight += w;
  }

  blendedOklab /= totalWeight;

  // Cursor Lightness Bloom (soft subtle highlight near pointer)
  if (u_reduced_motion < 0.5) {
    float cursorDist = length(uv - u_cursor);
    float bloom = exp(-cursorDist * 4.5) * u_pointer_bloom;
    blendedOklab.x = min(1.0, blendedOklab.x + bloom);
  }

  // Convert final blended OKLab to Linear RGB, then standard sRGB
  vec3 linRgb = oklab_to_linear(blendedOklab);
  vec3 finalSrgb = linear_to_srgb(linRgb);

  gl_FragColor = vec4(finalSrgb, 1.0);
}
`;

export interface WebGLRendererDebugInfo {
  renderer: string;
  vendor: string;
  isHardware: boolean;
  webglVersion: string;
}

export interface WebGLRenderer {
  render: (
    time: number,
    cursor: [number, number],
    recipe: BackgroundRecipe,
    reducedMotion: boolean,
    aspectRatio: number
  ) => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
  getDebugInfo: () => WebGLRendererDebugInfo;
}

/**
 * Initializes the WebGL engine for ColorField
 */
export function createWebGLRenderer(canvas: HTMLCanvasElement): WebGLRenderer | null {
  const gl =
    (canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    }) as WebGLRenderingContext | null) ||
    canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    }) ||
    (canvas.getContext('experimental-webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    }) as WebGLRenderingContext | null);

  if (!gl) {
    console.warn('WebGL not supported for ColorField; falling back to CSS.');
    return null;
  }

  // Compile helper
  function compileShader(source: string, type: number): WebGLShader | null {
    const shader = gl!.createShader(type);
    if (!shader) return null;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl!.getShaderInfoLog(shader));
      gl!.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compileShader(VERTEX_SHADER_SOURCE, gl.VERTEX_SHADER);
  const fs = compileShader(FRAGMENT_SHADER_SOURCE, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return null;
  }

  gl.useProgram(program);

  // Full screen quad buffer
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // Look up uniforms
  const uResolution = gl.getUniformLocation(program, 'u_resolution');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uCursor = gl.getUniformLocation(program, 'u_cursor');
  const uReducedMotion = gl.getUniformLocation(program, 'u_reduced_motion');
  const uDriftSpeed = gl.getUniformLocation(program, 'u_drift_speed');
  const uDriftAmp = gl.getUniformLocation(program, 'u_drift_amp');
  const uOrbitRadius = gl.getUniformLocation(program, 'u_orbit_radius');
  const uPointerSens = gl.getUniformLocation(program, 'u_pointer_sens');
  const uPointerBloom = gl.getUniformLocation(program, 'u_pointer_bloom');
  const uAnchorCount = gl.getUniformLocation(program, 'u_anchor_count');

  // Pre-fetch anchor struct uniform locations
  const anchorLocations = [0, 1, 2, 3].map((i) => ({
    pos: gl.getUniformLocation(program, `u_anchors[${i}].pos`),
    radius: gl.getUniformLocation(program, `u_anchors[${i}].radius`),
    weight: gl.getUniformLocation(program, `u_anchors[${i}].weight`),
    stopCount: gl.getUniformLocation(program, `u_anchors[${i}].stopCount`),
    undertone: gl.getUniformLocation(program, `u_anchors[${i}].undertone`),
    hasUndertone: gl.getUniformLocation(program, `u_anchors[${i}].hasUndertone`),
  }));

  const stopLocations = Array.from({ length: 24 }, (_, idx) =>
    gl.getUniformLocation(program, `u_stops[${idx}]`)
  );

  return {
    resize: (w: number, h: number) => {
      canvas.width = Math.max(1, Math.floor(w));
      canvas.height = Math.max(1, Math.floor(h));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    render: (time, cursor, recipe, reducedMotion) => {
      gl.useProgram(program);

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uCursor, cursor[0], cursor[1]);
      gl.uniform1f(uReducedMotion, reducedMotion ? 1.0 : 0.0);

      gl.uniform1f(uDriftSpeed, recipe.motion.driftSpeed);
      gl.uniform1f(uDriftAmp, recipe.motion.driftAmplitude);
      gl.uniform1f(uOrbitRadius, recipe.motion.orbitRadius);
      gl.uniform1f(uPointerSens, recipe.motion.pointerSensitivity);
      gl.uniform1f(uPointerBloom, recipe.motion.pointerBloom);

      const count = Math.min(4, recipe.anchors.length);
      gl.uniform1i(uAnchorCount, count);

      for (let i = 0; i < count; i++) {
        const anchor = recipe.anchors[i];
        const loc = anchorLocations[i];
        const ramp = PALETTE_RAMPS[anchor.palette];

        gl.uniform2f(loc.pos, anchor.position[0], anchor.position[1]);
        gl.uniform1f(loc.radius, anchor.radius);
        gl.uniform1f(loc.weight, anchor.weight);

        const stopCount = Math.min(6, ramp.stops.length);
        gl.uniform1f(loc.stopCount, stopCount);

        for (let s = 0; s < 6; s++) {
          const flatIdx = i * 6 + s;
          const stopLoc = stopLocations[flatIdx];
          if (stopLoc) {
            if (s < stopCount) {
              const ok = ramp.stops[s].oklab;
              gl.uniform3f(stopLoc, ok.L, ok.a, ok.b);
            } else {
              const lastOk = ramp.stops[stopCount - 1].oklab;
              gl.uniform3f(stopLoc, lastOk.L, lastOk.a, lastOk.b);
            }
          }
        }

        if (ramp.undertoneOklab) {
          gl.uniform3f(
            loc.undertone,
            ramp.undertoneOklab.L,
            ramp.undertoneOklab.a,
            ramp.undertoneOklab.b
          );
          gl.uniform1f(loc.hasUndertone, 1.0);
        } else {
          gl.uniform3f(loc.undertone, 0.0, 0.0, 0.0);
          gl.uniform1f(loc.hasUndertone, 0.0);
        }
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    destroy: () => {
      gl.deleteBuffer(posBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
    getDebugInfo: () => {
      const isWebGL2 =
        typeof WebGL2RenderingContext !== 'undefined' &&
        gl instanceof WebGL2RenderingContext;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const unmaskedRenderer = ext
        ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string)
        : (gl.getParameter(gl.RENDERER) as string);
      const unmaskedVendor = ext
        ? (gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string)
        : (gl.getParameter(gl.VENDOR) as string);
      const isHardware = !/swiftshader|llvmpipe|software/i.test(unmaskedRenderer);

      return {
        renderer: unmaskedRenderer || 'Unknown WebGL Renderer',
        vendor: unmaskedVendor || 'Unknown Vendor',
        isHardware,
        webglVersion: isWebGL2 ? 'WebGL 2.0' : 'WebGL 1.0',
      };
    },
  };
}
