import { MIXED_BANDS } from "./glyphs";
import { BINARY_EMPTY, FLICKER_RATE, MIXED_EMPTY, STYLES } from "./styles";

/** The camera sits this far in front of the origin, looking back at it. */
export const CAMERA = 7;

/** One triangle that covers the screen, from the vertex index alone. */
export const FULL_SCREEN = /* glsl */ `#version 300 es
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * Every sample pass writes two targets: the sample (how lit, which way an edge runs, how strong
 * the edge is, whether anything is there) and the source's own colour, for full-colour styles.
 */
const OUTPUTS = /* glsl */ `
layout(location = 0) out vec4 cell;
layout(location = 1) out vec4 tint;
const float PI = 3.14159265;

vec2 edgeOf(vec2 across) {
  return vec2(mod(atan(across.y, across.x) + PI * 0.5, PI) / PI, clamp(length(across), 0.0, 1.0));
}`;

/** Lighting shared by ray-marched shapes and meshes. */
const SURFACE = /* glsl */ `
uniform vec3 uLight;

vec4 surfaceSample(vec3 normal, vec3 viewPoint, vec3 toEye, float occlusion) {
  vec3 towardLight = uLight - viewPoint;
  vec3 light = normalize(towardLight);
  float falloff = 1.0 / (1.0 + 0.04 * dot(towardLight, towardLight));

  float diffuse = max(dot(normal, light), 0.0) * falloff * 1.25;
  float shine = pow(max(dot(reflect(-light, normal), toEye), 0.0), 24.0);
  float rim = pow(1.0 - max(dot(normal, toEye), 0.0), 3.0);
  float lit = 0.05 + 0.85 * diffuse * occlusion + 0.45 * shine + 0.2 * rim;

  return vec4(1.0 - exp(-1.6 * lit), edgeOf(normal.xy), 1.0);
}`;

/** Marches a ray into an extruded shape: a logo and a pair of words, mixed by the morph and the change between words. */
export const SHAPE = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uLogo;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uMorph;
uniform float uChange;
uniform vec2 uGrid;
uniform float uAspect;
uniform float uHalfHeight;
uniform mat3 uRotation;
uniform float uDepth;
uniform float uRound;
${OUTPUTS}
${SURFACE}

const vec2 WORLD = vec2(4.0, 2.0);

float field(sampler2D shape, vec2 point) {
  vec2 uv = vec2(point.x / WORLD.x + 0.5, 0.5 - point.y / WORLD.y);
  vec2 clamped = clamp(uv, 0.0, 1.0);
  return texture(shape, clamped).r + length((uv - clamped) * WORLD);
}

float outline(vec2 point) {
  float word = mix(field(uFrom, point), field(uTo, point), uChange);
  return mix(field(uLogo, point), word, uMorph);
}

float scene(vec3 point) {
  vec2 extent = vec2(outline(point.xy) + uRound, abs(point.z) - uDepth + uRound);
  return min(max(extent.x, extent.y), 0.0) + length(max(extent, 0.0)) - uRound;
}

vec3 normalAt(vec3 point) {
  const vec2 k = vec2(1.0, -1.0);
  const float offset = 0.004;
  return normalize(
    k.xyy * scene(point + k.xyy * offset) +
    k.yyx * scene(point + k.yyx * offset) +
    k.yxy * scene(point + k.yxy * offset) +
    k.xxx * scene(point + k.xxx * offset)
  );
}

float occlusion(vec3 point, vec3 normal) {
  float hidden = 0.0;
  float weight = 1.0;
  for (int probe = 1; probe <= 3; probe++) {
    float reach = 0.03 + 0.06 * float(probe);
    hidden += (reach - scene(point + normal * reach)) * weight;
    weight *= 0.5;
  }
  return clamp(1.0 - 2.5 * hidden, 0.0, 1.0);
}

bool throughBox(vec3 origin, vec3 direction, vec3 size, out float near, out float far) {
  vec3 reciprocal = 1.0 / direction;
  vec3 a = (-size - origin) * reciprocal;
  vec3 b = (size - origin) * reciprocal;
  vec3 low = min(a, b);
  vec3 high = max(a, b);
  near = max(max(low.x, low.y), low.z);
  far = min(min(high.x, high.y), high.z);
  return far > max(near, 0.0);
}

void main() {
  cell = vec4(0.0);
  tint = vec4(0.0);
  vec2 screen = gl_FragCoord.xy / uGrid * 2.0 - 1.0;
  vec3 eye = vec3(0.0, 0.0, ${CAMERA.toFixed(1)});
  vec3 viewRay = normalize(vec3(screen.x * uAspect * uHalfHeight, screen.y * uHalfHeight, 0.0) - eye);

  mat3 toObject = transpose(uRotation);
  vec3 origin = toObject * eye;
  vec3 ray = toObject * viewRay;

  float near, far;
  if (!throughBox(origin, ray, vec3(WORLD * 0.5, uDepth + 0.05), near, far)) return;

  float travelled = max(near, 0.0);
  bool hit = false;
  for (int iteration = 0; iteration < 96; iteration++) {
    float gap = scene(origin + ray * travelled);
    if (gap < 0.002) { hit = true; break; }
    travelled += gap * 0.85;
    if (travelled > far) break;
  }
  if (!hit) return;

  vec3 point = origin + ray * travelled;
  vec3 objectNormal = normalAt(point);
  cell = surfaceSample(uRotation * objectNormal, uRotation * point, -viewRay, occlusion(point, objectNormal));
  tint = vec4(1.0);
}`;

export const MESH_VERTEX = /* glsl */ `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat3 uRotation;
uniform mat4 uProjection;

out vec3 vNormal;
out vec3 vPoint;

void main() {
  vPoint = uRotation * aPosition;
  vNormal = uRotation * aNormal;
  gl_Position = uProjection * vec4(vPoint - vec3(0.0, 0.0, ${CAMERA.toFixed(1)}), 1.0);
}`;

export const MESH_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vPoint;
${OUTPUTS}
${SURFACE}

void main() {
  vec3 toEye = normalize(vec3(0.0, 0.0, ${CAMERA.toFixed(1)}) - vPoint);
  vec3 normal = normalize(vNormal);
  if (dot(normal, toEye) < 0.0) normal = -normal;
  cell = surfaceSample(normal, vPoint, toEye, 1.0);
  tint = vec4(1.0);
}`;

/**
 * An image, a video frame or a camera, sampled once per sample with a small box filter. The tone is
 * the luminance after contrast, brightness and gamma; the edge comes from a Sobel filter over
 * neighbouring samples, so edge characters follow outlines in a photo as they do on a model.
 */
export const MEDIA = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uMedia;
uniform vec2 uGrid;
uniform vec2 uFit;
uniform float uMirror;
uniform float uContrast;
uniform float uBrightness;
uniform float uGamma;
uniform float uEdgeGain;
${OUTPUTS}

vec2 mediaAt(vec2 screen) {
  if (uMirror > 0.5) screen.x = 1.0 - screen.x;
  vec2 uv = (screen - 0.5) * uFit + 0.5;
  return vec2(uv.x, 1.0 - uv.y);
}

vec3 colourAt(vec2 offset) {
  return texture(uMedia, mediaAt((gl_FragCoord.xy + offset) / uGrid)).rgb;
}

float toneOf(vec3 colour) {
  float luminance = dot(colour, vec3(0.2126, 0.7152, 0.0722));
  return pow(clamp((luminance - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0), uGamma);
}

void main() {
  cell = vec4(0.0);
  tint = vec4(0.0);
  vec2 uv = mediaAt(gl_FragCoord.xy / uGrid);
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return;

  vec3 colour = 0.25 * (colourAt(vec2(-0.25, -0.25)) + colourAt(vec2(0.25, -0.25)) + colourAt(vec2(-0.25, 0.25)) + colourAt(vec2(0.25, 0.25)));

  float topLeft = toneOf(colourAt(vec2(-1.0, 1.0)));
  float top = toneOf(colourAt(vec2(0.0, 1.0)));
  float topRight = toneOf(colourAt(vec2(1.0, 1.0)));
  float left = toneOf(colourAt(vec2(-1.0, 0.0)));
  float right = toneOf(colourAt(vec2(1.0, 0.0)));
  float bottomLeft = toneOf(colourAt(vec2(-1.0, -1.0)));
  float bottom = toneOf(colourAt(vec2(0.0, -1.0)));
  float bottomRight = toneOf(colourAt(vec2(1.0, -1.0)));
  vec2 gradient = vec2(
    (topRight + 2.0 * right + bottomRight) - (topLeft + 2.0 * left + bottomLeft),
    (topLeft + 2.0 * top + topRight) - (bottomLeft + 2.0 * bottom + bottomRight)
  );

  cell = vec4(toneOf(colour), edgeOf(gradient * uEdgeGain), 1.0);
  tint = vec4(colour, 1.0);
}`;

const mixedStart = (band: number) => MIXED_BANDS.slice(0, band).reduce((total, size) => total + size, 0);

/**
 * Every screen pixel: finds its cell and the sample under it, then draws the style. Character
 * styles copy a glyph out of the atlas; the others draw blocks, dots and pixels themselves.
 */
export const GLYPHS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uCells;
uniform sampler2D uTints;
uniform sampler2D uAtlas;
uniform vec2 uCell;
uniform vec2 uOrigin;
uniform ivec2 uGridSize;
uniform ivec2 uSplit;
uniform int uStyle;
uniform int uRamp;
uniform int uEdges;
uniform int uDigits;
uniform int uMixed;
uniform vec3 uInkDark;
uniform vec3 uInkLight;
uniform float uInvert;
uniform float uSourceColour;
uniform float uFloor;
uniform float uEdgeThreshold;
uniform float uPixel;
uniform float uSeconds;

out vec4 color;

uint hash(uvec3 p) {
  uint h = p.x * 1597334677u ^ p.y * 3812015801u ^ p.z * 2654435761u;
  h ^= h >> 16u;
  h *= 2246822519u;
  h ^= h >> 13u;
  h *= 3266489917u;
  h ^= h >> 16u;
  return h;
}

float bayer(ivec2 at) {
  int matrix[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(matrix[(at.y & 3) * 4 + (at.x & 3)]) + 0.5) / 16.0;
}

uint flickerSeed(ivec2 cell) {
  return uint(floor(uSeconds * ${FLICKER_RATE.toFixed(2)} + float(hash(uvec3(cell, 7u)) % 997u) / 997.0));
}

float glyph(int index, vec2 inCell) {
  ivec2 texel = ivec2(inCell);
  return texelFetch(uAtlas, ivec2(index * int(uCell.x) + texel.x, texel.y), 0).a;
}

float disc(vec2 point, vec2 centre, float radius) {
  return clamp(radius - length(point - centre) + 0.5, 0.0, 1.0);
}

float stipple(int level, ivec2 pixel) {
  bool odd = (pixel.x & 1) == 1 && (pixel.y & 1) == 1;
  if (level >= 4) return 1.0;
  if (level == 3) return odd ? 0.0 : 1.0;
  if (level == 2) return ((pixel.x + pixel.y) & 1) == 0 ? 1.0 : 0.0;
  return (pixel.x & 1) == 0 && (pixel.y & 1) == 0 ? 1.0 : 0.0;
}

void main() {
  color = vec4(0.0);
  vec2 local = gl_FragCoord.xy - uOrigin;
  ivec2 cell = ivec2(floor(local / uCell));
  if (any(lessThan(cell, ivec2(0))) || any(greaterThanEqual(cell, uGridSize))) return;

  vec2 inCell = local - vec2(cell) * uCell;
  vec2 partSize = uCell / vec2(uSplit);
  ivec2 part = min(ivec2(floor(inCell / partSize)), uSplit - 1);
  ivec2 at = cell * uSplit + part;
  vec2 inPart = inCell - vec2(part) * partSize;

  vec4 surface = texelFetch(uCells, at, 0);
  if (surface.a < 0.5) return;

  float tone = mix(surface.r, 1.0 - surface.r, uInvert);
  if (tone < uFloor) return;
  float ink = 0.0;

  if (uStyle == ${STYLES.ascii.id}) {
    int index;
    if (surface.b > uEdgeThreshold) {
      index = uEdges + int(floor(surface.g * 4.0 + 0.5)) % 4;
    } else {
      float dithered = clamp(tone + (bayer(cell) - 0.5) / float(uRamp), 0.0, 1.0);
      index = int(floor(dithered * float(uRamp - 1) + 0.5));
    }
    ink = glyph(index, inCell);
  } else if (uStyle == ${STYLES.binary.id}) {
    if (tone + (bayer(cell) - 0.5) * 0.5 < ${BINARY_EMPTY.toFixed(2)}) return;
    ink = glyph(uDigits + int(hash(uvec3(cell, flickerSeed(cell))) & 1u), inCell);
  } else if (uStyle == ${STYLES.mixed.id}) {
    float dithered = clamp(tone + (bayer(cell) - 0.5) * 0.25, 0.0, 1.0);
    if (dithered < ${MIXED_EMPTY.toFixed(2)}) return;
    int band = min(3, int(floor(dithered * 4.0)));
    uint pick = hash(uvec3(cell, flickerSeed(cell)));
    int index;
    if (band == 0) index = uMixed + ${mixedStart(0)} + int(pick % ${MIXED_BANDS[0]}u);
    else if (band == 1) index = uMixed + ${mixedStart(1)} + int(pick % ${MIXED_BANDS[1]}u);
    else if (band == 2) index = uMixed + ${mixedStart(2)} + int(pick % ${MIXED_BANDS[2]}u);
    else index = uDigits + int(pick % 10u);
    ink = glyph(index, inCell);
  } else if (uStyle == ${STYLES.blocks.id}) {
    int level = int(floor(clamp(tone + (bayer(at) - 0.5) / 5.0, 0.0, 1.0) * 4.0 + 0.5));
    ink = stipple(max(level, 1), ivec2(floor(local / uPixel)));
  } else if (uStyle == ${STYLES.braille.id}) {
    if (tone <= bayer(at) * 0.85 + 0.08) return;
    ink = disc(inPart, partSize * 0.5, min(partSize.x, partSize.y) * 0.3);
  } else if (uStyle == ${STYLES.halftone.id}) {
    ink = disc(inPart, partSize * 0.5, sqrt(tone) * 0.55 * min(partSize.x, partSize.y));
  } else {
    if (tone <= bayer(at)) return;
    ink = 1.0;
  }

  vec3 shade = mix(mix(uInkDark, uInkLight, surface.r), texelFetch(uTints, at, 0).rgb, uSourceColour);
  color = vec4(shade * ink, ink);
}`;
