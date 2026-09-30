"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { flameState } from "@/components/three/flame-state";

/**
 * Artistic flame (project.md §8). One additive billboard with an fBm-noise fragment shader plus rising embers.
 * uGravity 0 → near-spherical, blue, dim, slow flicker (microgravity).
 * uGravity 1 → teardrop stretched upward, yellow-orange core, sooty tip, faster flicker (Earth).
 * Trends follow the literature; this is not a combustion simulation.
 */

/** Additive in both colour and alpha, so glow composites correctly over the page on a transparent canvas. */
const ADDITIVE = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
} as const;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uGravity;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    float g = clamp(uGravity, 0.0, 1.0);
    float r0 = mix(0.56, 0.42, g); // spherical microgravity flames are larger and dimmer
    // Plane is 2 × 3 world units; flame centre sits a third of the way up.
    vec2 p = (vUv - vec2(0.5, 0.34)) * vec2(2.0, 3.0);
    vec2 orig = p;

    // Flicker: noise scrolls upward faster under gravity (buoyant flow), slow "breathing" in microgravity.
    float speed = mix(0.28, 2.4, g);
    float n = fbm(vec2(p.x * 3.1, p.y * 2.3 - uTime * speed));
    float n2 = fbm(vec2(p.x * 6.0 + 7.0, p.y * 4.0 - uTime * speed * 1.7));
    float amp = mix(0.03, 0.13, g) * smoothstep(-0.25, 0.9, p.y) + mix(0.012, 0.02, g);
    p.x += (n - 0.5) * amp * 2.0;
    p.y += (n2 - 0.5) * amp * 0.6;

    // Shape: stretch upward and narrow toward the tip as gravity grows; compress the base slightly.
    float stretch = 1.0 + 2.7 * g;
    if (p.y > 0.0) {
      float h = p.y / (r0 * stretch);
      p.y /= stretch;
      p.x /= max(mix(1.0, 1.0 - 0.72 * clamp(h, 0.0, 1.2), g), 0.14);
    } else {
      p.y *= mix(1.0, 1.4, g);
    }
    float breathe = 1.0 + (1.0 - g) * 0.035 * sin(uTime * 0.9);
    float d = length(p) / (r0 * breathe);

    // Intensity: solid core under gravity, luminous thin shell in microgravity (spherical diffusion flame).
    float core = smoothstep(1.04, 0.12, d);
    float shell = exp(-pow((d - 0.82) * 4.2, 2.0));
    float body = mix(core * 0.3 + shell * 0.75, core, smoothstep(0.0, 0.6, g));
    float glow = exp(-max(d - 0.25, 0.0) * mix(2.6, 2.0, g)) * mix(0.22, 0.34, g);

    // Colour ramps: micro (blue → violet) vs earth (white-yellow core → orange → sooty tip, blue base).
    vec3 microInner = vec3(0.298, 0.788, 0.941);
    vec3 microOuter = vec3(0.482, 0.380, 1.0);
    vec3 colMicro = mix(microInner, microOuter, smoothstep(0.55, 1.15, d));

    float heightT = clamp(orig.y / (r0 * stretch * 1.55), 0.0, 1.0);
    vec3 colEarth = mix(vec3(1.0, 0.96, 0.86), vec3(1.0, 0.82, 0.40), smoothstep(0.0, 0.5, d));
    colEarth = mix(colEarth, vec3(1.0, 0.478, 0.094), smoothstep(0.42, 0.95, d));
    colEarth = mix(colEarth, vec3(0.42, 0.09, 0.03), smoothstep(0.55, 1.0, heightT) * 0.85);
    colEarth = mix(colEarth, vec3(0.30, 0.62, 1.0), smoothstep(-0.05, -0.85, orig.y / r0) * 0.75);

    vec3 col = mix(colMicro, colEarth, smoothstep(0.0, 1.0, g));
    float lum = mix(0.8, 1.3, g);
    float soot = mix(1.0, 1.0 - 0.35 * smoothstep(0.6, 1.0, heightT) * (0.6 + 0.4 * n2), g);
    vec3 outCol = col * (body * lum * soot + glow);
    float a = clamp(max(outCol.r, max(outCol.g, outCol.b)), 0.0, 1.0);
    gl_FragColor = vec4(outCol, a);
  }
`;

function FlameMesh() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uGravity: { value: flameState.gravity } }), []);

  useFrame((_, delta) => {
    // Ease toward the requested gravity so slider moves and scroll scrubs morph smoothly.
    flameState.gravity = THREE.MathUtils.damp(flameState.gravity, flameState.target, 4, delta);
    if (material.current) {
      material.current.uniforms.uTime.value += delta;
      material.current.uniforms.uGravity.value = flameState.gravity;
    }
  });

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[2, 3, 1, 1]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        {...ADDITIVE}
      />
    </mesh>
  );
}

const EMBER_COUNT = 90;

/** Faint embers that rise only under gravity (buoyancy cue); they fade out in microgravity. */
function Embers() {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const { positions, seeds } = useMemo(() => {
    // Seeded PRNG (mulberry32): the scatter looks random but is identical on every render, so render stays pure.
    let t = 0x2f9bc8;
    const rand = () => {
      t = (t + 0x6d2b79f5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
    const positions = new Float32Array(EMBER_COUNT * 3);
    const seeds = new Float32Array(EMBER_COUNT);
    for (let i = 0; i < EMBER_COUNT; i++) {
      positions[i * 3] = (rand() - 0.5) * 0.5;
      positions[i * 3 + 1] = -0.4 + rand() * 2.4;
      positions[i * 3 + 2] = 0.05;
      seeds[i] = rand();
    }
    return { positions, seeds };
  }, []);

  useFrame((state, delta) => {
    const g = flameState.gravity;
    const geo = points.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < EMBER_COUNT; i++) {
      const s = seeds[i];
      let y = pos.getY(i) + delta * (0.35 + s * 0.55) * g;
      let x = pos.getX(i) + Math.sin(state.clock.elapsedTime * (0.8 + s) + s * 20) * delta * 0.08 * g;
      if (y > 2.1) {
        y = -0.35;
        x = (Math.random() - 0.5) * 0.45;
      }
      pos.setXY(i, x, y);
    }
    pos.needsUpdate = true;
    if (material.current) material.current.uniforms.uOpacity.value = Math.pow(g, 1.2) * 0.85;
  });

  const uniforms = useMemo(() => ({ uOpacity: { value: 0 } }), []);

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        {...ADDITIVE}
        vertexShader={
          /* glsl */ `
          attribute float aSeed;
          varying float vSeed;
          varying float vY;
          void main() {
            vSeed = aSeed;
            vY = position.y;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (2.0 + aSeed * 3.0) * (6.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `
        }
        fragmentShader={
          /* glsl */ `
          uniform float uOpacity;
          varying float vSeed;
          varying float vY;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * uOpacity * (1.0 - smoothstep(0.9, 2.1, vY));
            vec3 c = mix(vec3(1.0, 0.82, 0.4), vec3(1.0, 0.48, 0.09), vSeed);
            gl_FragColor = vec4(c * a, a);
          }
        `
        }
      />
    </points>
  );
}

export default function FlameScene({ active }: { active: boolean }) {
  return (
    <Canvas
      aria-hidden
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.35, 5.6], fov: 35 }}
      style={{ background: "transparent" }}
    >
      <FlameMesh />
      <Embers />
    </Canvas>
  );
}
