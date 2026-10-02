/**
 * Volume stand-in for a pet, drawn with raw WebGL.
 *
 * No three.js and no model file. Coat, ears and proportions come from
 * `appearanceFromPet`. The dev page still drives species and mood directly.
 */

import type { AvatarLook, AvatarSpecies, Rgb } from "@/lib/petAvatarAppearance";

export type PrototypeSpecies = AvatarSpecies;
export type PrototypeMood = "neutral" | "happy" | "excited" | "curious" | "concerned";

const prototypeLook = (species: PrototypeSpecies): AvatarLook => ({
  species,
  coat: species === "cat" ? [0.62, 0.5, 0.42] : [0.86, 0.64, 0.4],
  markings: species === "cat" ? [0.62, 0.5, 0.42] : [0.86, 0.64, 0.4],
  ears: species === "cat" ? "pointed" : "pointed",
  bodyLength: 1,
  headScale: 1,
  legScale: 1,
});

const shade = (color: Rgb, factor: number): Rgb => [
  color[0] * factor,
  color[1] * factor,
  color[2] * factor,
];

const earsOf = (look: AvatarLook): { x: number; y: number; z: number; scale: Rgb; roll: number } => {
  if (look.ears === "floppy") return { x: 0.28, y: 0.34, z: 0.16, scale: [0.08, 0.22, 0.045], roll: 1.15 };
  if (look.ears === "folded") return { x: 0.2, y: 0.58, z: 0.26, scale: [0.14, 0.08, 0.08], roll: 0.2 };
  if (look.species === "cat") return { x: 0.2, y: 0.72, z: 0.28, scale: [0.1, 0.22, 0.06], roll: 0.15 };
  return { x: 0.2, y: 0.58, z: 0.28, scale: [0.12, 0.16, 0.07], roll: 0.15 };
};

const coatsDiffer = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 0.15;

type Vec3 = [number, number, number];

type Part = {
  color: Vec3;
  position: Vec3;
  scale: Vec3;
  rotationY: number;
  rotationZ: number;
  alpha: number;
};

const VERT = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform vec3 uScale;
varying vec3 vNormal;
void main() {
  vec3 position = aPosition * uScale;
  vec4 world = uModel * vec4(position, 1.0);
  vec3 scaledNormal = vec3(aNormal.x / uScale.x, aNormal.y / uScale.y, aNormal.z / uScale.z);
  vNormal = vec3(
    uModel[0].x * scaledNormal.x + uModel[1].x * scaledNormal.y + uModel[2].x * scaledNormal.z,
    uModel[0].y * scaledNormal.x + uModel[1].y * scaledNormal.y + uModel[2].y * scaledNormal.z,
    uModel[0].z * scaledNormal.x + uModel[1].z * scaledNormal.y + uModel[2].z * scaledNormal.z
  );
  gl_Position = uViewProj * world;
}
`;

const FRAG = `
precision mediump float;
varying vec3 vNormal;
uniform vec3 uColor;
uniform float uAlpha;
void main() {
  vec3 normal = normalize(vNormal);
  vec3 light = normalize(vec3(0.35, 0.85, 0.55));
  float diffuse = max(dot(normal, light), 0.0);
  float fill = max(dot(normal, normalize(vec3(-0.4, 0.2, 0.4))), 0.0);
  vec3 viewDir = normalize(vec3(0.2, 0.45, 1.0));
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.2);
  vec3 color = uColor * (0.28 + 0.62 * diffuse + 0.16 * fill) + vec3(1.0) * rim * 0.18;
  gl_FragColor = vec4(color, uAlpha);
}
`;

const identity = (): Float32Array => {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
};

const multiply = (a: Float32Array, b: Float32Array): Float32Array => {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3];
    }
  }
  return out;
};

const perspective = (fovY: number, aspect: number, near: number, far: number): Float32Array => {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
};

const lookAt = (eye: Vec3, target: Vec3, up: Vec3): Float32Array => {
  const zAxis: Vec3 = normalize3(subtract(eye, target));
  const xAxis = normalize3(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);
  const out = identity();
  out[0] = xAxis[0];
  out[1] = yAxis[0];
  out[2] = zAxis[0];
  out[4] = xAxis[1];
  out[5] = yAxis[1];
  out[6] = zAxis[1];
  out[8] = xAxis[2];
  out[9] = yAxis[2];
  out[10] = zAxis[2];
  out[12] = -dot(xAxis, eye);
  out[13] = -dot(yAxis, eye);
  out[14] = -dot(zAxis, eye);
  return out;
};

const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize3 = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

const rotationY = (angle: number): Float32Array => {
  const out = identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  out[0] = c;
  out[2] = -s;
  out[8] = s;
  out[10] = c;
  return out;
};

const rotationZ = (angle: number): Float32Array => {
  const out = identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  out[0] = c;
  out[1] = s;
  out[4] = -s;
  out[5] = c;
  return out;
};

/** Local rotation first, then move. The sphere stays centred on `position`. */
const rotationTranslation = (yaw: number, roll: number, position: Vec3): Float32Array => {
  const placed = multiply(rotationZ(roll), rotationY(yaw));
  placed[12] = position[0];
  placed[13] = position[1];
  placed[14] = position[2];
  return placed;
};

const createSphere = (latBands: number, longBands: number) => {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let lat = 0; lat <= latBands; lat += 1) {
    const theta = (lat * Math.PI) / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    for (let lon = 0; lon <= longBands; lon += 1) {
      const phi = (lon * 2 * Math.PI) / longBands;
      const x = Math.cos(phi) * sinTheta;
      const y = cosTheta;
      const z = Math.sin(phi) * sinTheta;
      positions.push(x, y, z);
      normals.push(x, y, z);
    }
  }
  for (let lat = 0; lat < latBands; lat += 1) {
    for (let lon = 0; lon < longBands; lon += 1) {
      const first = lat * (longBands + 1) + lon;
      const second = first + longBands + 1;
      indices.push(first, second, first + 1, second, second + 1, first + 1);
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
};

const part = (
  color: Vec3,
  position: Vec3,
  scale: Vec3,
  rotationY = 0,
  rotationZ = 0,
  alpha = 1,
): Part => ({ color, position, scale, rotationY, rotationZ, alpha });

const buildParts = (
  look: AvatarLook,
  mood: PrototypeMood,
  time: number,
  hop: number,
  blink: number,
): Part[] => {
  const species = look.species;
  const excited = mood === "excited" ? 1.35 : mood === "happy" ? 1.12 : mood === "concerned" ? 0.72 : 1;
  const breath = 1 + Math.sin(time * (mood === "concerned" ? 1.4 : 2.1)) * (mood === "excited" ? 0.045 : 0.028);
  const bob = Math.sin(time * 1.7) * (mood === "excited" ? 0.035 : 0.018) + hop;
  const wagSpeed = mood === "excited" ? 9 : mood === "happy" ? 6 : mood === "concerned" ? 2.2 : 3.4;
  const wag = Math.sin(time * wagSpeed) * (mood === "concerned" ? 0.18 : 0.48) * excited;
  const tilt = mood === "curious" ? 0.28 : mood === "concerned" ? -0.08 : 0;
  const eyeY = 0.12 + blink * 0.78;
  const coat = look.coat;
  const mark = look.markings;
  const nose: Vec3 = [0.22, 0.16, 0.14];
  const paws = shade(coat, 0.38);
  const ears = earsOf(look);
  const snoutZ = species === "cat" ? 0.58 : 0.66;
  const snoutScale: Vec3 = species === "cat" ? [0.12, 0.09, 0.1] : [0.16, 0.11, 0.16];
  const headBase: Vec3 = species === "cat" ? [0.4, 0.36, 0.36] : [0.34, 0.32, 0.32];
  const head: Vec3 = [
    headBase[0] * look.headScale,
    headBase[1] * look.headScale,
    headBase[2] * look.headScale,
  ];
  const bodyDepth = (species === "cat" ? 0.4 : 0.48) * look.bodyLength;
  const legHeight = 0.14 * look.legScale;

  const parts: Part[] = [
    part([0.15, 0.12, 0.16], [0, -0.34 + bob * 0.15, 0], [0.72, 0.035, 0.48], 0, 0, 0.28),
    part(coat, [0, 0.02 + bob, 0.02], [0.58, 0.4 * breath, bodyDepth]),
    part(coat, [0, 0.36 + bob, 0.34], head, 0, tilt),
    part(coat, [0, 0.26 + bob, snoutZ], snoutScale, 0, tilt * 0.4),
    part(nose, [0, 0.3 + bob, snoutZ + 0.12], [0.055, 0.045, 0.05]),
    part(mark, [-ears.x, ears.y + bob, ears.z], ears.scale, 0, ears.roll),
    part(mark, [ears.x, ears.y + bob, ears.z], ears.scale, 0, -ears.roll),
    part([0.96, 0.95, 0.93], [-0.12, 0.44 + bob, 0.58], [0.07, eyeY, 0.05]),
    part([0.96, 0.95, 0.93], [0.12, 0.44 + bob, 0.58], [0.07, eyeY, 0.05]),
    part(nose, [-0.12, 0.43 + bob, 0.62], [0.035, eyeY * 0.72, 0.03]),
    part(nose, [0.12, 0.43 + bob, 0.62], [0.035, eyeY * 0.72, 0.03]),
    part(mark, [0, 0.22 + bob, -0.42], species === "cat" ? [0.07, 0.07, 0.34] : [0.08, 0.08, 0.26], wag, 0.4),
    part(paws, [-0.18, -0.22 + bob, 0.16], [0.09, legHeight, 0.1]),
    part(paws, [0.18, -0.22 + bob, 0.16], [0.09, legHeight, 0.1]),
    part(paws, [-0.18, -0.22 + bob, -0.16], [0.09, legHeight, 0.1]),
    part(paws, [0.18, -0.22 + bob, -0.16], [0.09, legHeight, 0.1]),
  ];
  if (coatsDiffer(coat, mark)) {
    parts.splice(2, 0, part(mark, [0, 0.1 + bob, 0.2], [0.16, 0.1, 0.06]));
  }
  return parts;
};

export class PetAvatarScene {
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly indexBuffer: WebGLBuffer;
  private readonly indexCount: number;
  private frame = 0;
  private destroyed = false;
  private running = false;
  private look: AvatarLook = prototypeLook("cat");
  private mood: PrototypeMood = "neutral";
  private hop = 0;
  private hopUntil = 0;
  private startedAt = performance.now();
  private lastTime = 0;
  private reducedMotion = false;
  private userPaused = false;
  private frameListener: (() => void) | null = null;
  private onError: ((error: unknown) => void) | null = null;
  private readonly uniforms: Record<string, WebGLUniformLocation | null>;
  private readonly onResize: () => void;
  private readonly resizeObserver: ResizeObserver;

  private constructor(private readonly canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.gl = gl;
    const program = createProgram(gl, VERT, FRAG);
    this.program = program;
    const sphere = createSphere(12, 16);
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("buffer");
    this.buffer = buffer;
    const stride = 6;
    const interleaved = new Float32Array(sphere.positions.length + sphere.normals.length);
    for (let i = 0, v = 0; i < sphere.positions.length; i += 3, v += stride) {
      interleaved[v] = sphere.positions[i];
      interleaved[v + 1] = sphere.positions[i + 1];
      interleaved[v + 2] = sphere.positions[i + 2];
      interleaved[v + 3] = sphere.normals[i];
      interleaved[v + 4] = sphere.normals[i + 1];
      interleaved[v + 5] = sphere.normals[i + 2];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);
    const index = gl.createBuffer();
    if (!index) throw new Error("index");
    this.indexBuffer = index;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
    this.indexCount = sphere.indices.length;
    const position = gl.getAttribLocation(program, "aPosition");
    const normal = gl.getAttribLocation(program, "aNormal");
    gl.enableVertexAttribArray(position);
    gl.enableVertexAttribArray(normal);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride * 4, 0);
    gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, stride * 4, 12);
    this.uniforms = {
      uViewProj: gl.getUniformLocation(program, "uViewProj"),
      uModel: gl.getUniformLocation(program, "uModel"),
      uScale: gl.getUniformLocation(program, "uScale"),
      uColor: gl.getUniformLocation(program, "uColor"),
      uAlpha: gl.getUniformLocation(program, "uAlpha"),
    };
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    this.onResize = () => this.resize();
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  static mount(canvas: HTMLCanvasElement): PetAvatarScene | null {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: false,
    });
    if (!gl) {
      console.error("pet avatar: WebGL context unavailable");
      return null;
    }
    try {
      return new PetAvatarScene(canvas, gl);
    } catch (error) {
      console.error("pet avatar failed to start", error);
      return null;
    }
  }

  setSpecies(species: PrototypeSpecies) {
    this.setLook(prototypeLook(species));
  }

  setLook(look: AvatarLook) {
    if (this.destroyed) return;
    this.look = look;
    if (!this.running) this.paint(this.reducedMotion ? 0 : this.lastTime);
  }

  setMood(mood: PrototypeMood) {
    this.mood = mood;
    if (!this.running) this.paint(this.reducedMotion ? 0 : this.lastTime);
  }

  setFrameListener(listener: (() => void) | null) {
    this.frameListener = listener;
  }

  setErrorHandler(handler: ((error: unknown) => void) | null) {
    this.onError = handler;
  }

  setReducedMotion(reduced: boolean) {
    if (this.destroyed) return;
    this.reducedMotion = reduced;
    if (reduced) {
      this.stop();
      this.paint(0);
    } else if (!this.userPaused && !this.running) {
      this.start();
    }
  }

  /** Stops the frame loop while the canvas is off-screen or the tab is hidden. */
  setPaused(paused: boolean) {
    if (this.destroyed) return;
    this.userPaused = paused;
    if (paused) {
      this.stop();
      return;
    }
    if (!this.reducedMotion) this.start();
  }

  nudge() {
    this.hopUntil = performance.now() + 520;
    if (!this.running) this.paint(this.reducedMotion ? 0.2 : this.lastTime);
  }

  start() {
    if (this.destroyed || this.running || this.reducedMotion || this.userPaused) return;
    this.running = true;
    const loop = (now: number) => {
      if (!this.running) return;
      this.paint((now - this.startedAt) / 1000);
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    this.resizeObserver.disconnect();
    // Do not call WEBGL_lose_context. Dev Strict Mode runs this cleanup and
    // then mounts again on the same canvas; a lost context cannot be recreated
    // and the page would fall back to the still photo every time.
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteBuffer(this.indexBuffer);
    gl.deleteProgram(this.program);
  }

  private resize() {
    const cap = this.canvas.clientWidth < 400 ? 1.5 : 2;
    const ratio = Math.min(window.devicePixelRatio || 1, cap);
    const width = Math.max(1, Math.floor(this.canvas.clientWidth * ratio));
    const height = Math.max(1, Math.floor(this.canvas.clientHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (!this.running) this.paint(this.reducedMotion ? 0 : this.lastTime);
  }

  private paint(time: number) {
    if (this.destroyed) return;
    try {
      this.draw(time);
      this.frameListener?.();
    } catch (error) {
      this.stop();
      this.onError?.(error);
    }
  }

  private draw(time: number) {
    const gl = this.gl;
    const now = performance.now();
    const hopWindow = this.hopUntil - now;
    this.hop = hopWindow > 0 ? Math.sin((1 - hopWindow / 520) * Math.PI) * 0.28 : 0;
    const blinkPhase = time % 3.4;
    const blink = blinkPhase > 3.22 && blinkPhase < 3.38 ? 1 : 0;
    this.lastTime = time;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    const viewProj = multiply(
      perspective(Math.PI / 5.2, aspect, 0.1, 20),
      lookAt([0.15, 0.72, 2.55], [0, 0.12, 0], [0, 1, 0]),
    );
    gl.uniformMatrix4fv(this.uniforms.uViewProj, false, viewProj);
    for (const piece of buildParts(this.look, this.mood, time, this.hop, blink)) {
      gl.uniformMatrix4fv(
        this.uniforms.uModel,
        false,
        rotationTranslation(piece.rotationY, piece.rotationZ, piece.position),
      );
      gl.uniform3fv(this.uniforms.uScale, piece.scale);
      gl.uniform3fv(this.uniforms.uColor, piece.color);
      gl.uniform1f(this.uniforms.uAlpha, piece.alpha);
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }
  }
}

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || "shader compile");
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext, vertex: string, fragment: string) => {
  const program = gl.createProgram();
  if (!program) throw new Error("program");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "link");
  }
  return program;
};
