// @remold-ui/core: everything here is plain math on plain data, so it runs anywhere:
// browsers, Web Workers, Node, Deno, Bun and edge runtimes. No DOM types are even available
// (see tsconfig.json), which keeps it honest.
export { lerp, lerpPoint, type Point } from "./interpolate";

// Shapes
export { parsePath, type PathCommand } from "./path/parse";
export { pointAt, toCubics, type Cubic, type Subpath } from "./path/normalize";
export { splitCubic, subdivide } from "./path/subdivide";
export { bounds, centroid, signedArea, type Bounds } from "./path/measure";
export { shapeToPath, shapesToPath, type ShapeAttributes, type ShapeNode } from "./path/shapes";

// Morphing
export { matchShapes, reverseSubpath, type MatchOptions, type MatchedShapes } from "./morph/match";
export { createMorph, lerpBuffers, type Morph, type MorphOptions, type SubpathLayout } from "./morph/morph";

// Matching: what became what
export { matchNodes, type MatchNodesOptions, type NodeMatches } from "./match/nodes-match";
export type { MatchNode, NodeKind, Rgba } from "./match/nodes";
export type { Merge, Split } from "./match/split-merge";
export { assign, hungarian, type Assignment } from "./match/hungarian";
export { textSimilarity } from "./match/text";
export { matchPoints, type MatchPointsOptions, type Point3, type PointMatches } from "./match/points";

// Points: shapes into dots, and clouds that rebuild themselves
export {
  fitPoints,
  sampleMask,
  samplePath,
  type FitOptions,
  type Mask,
  type MaskSampleOptions,
  type PathSampleOptions,
  type SampleOptions,
} from "./points/sampling";
export {
  pointCloud,
  STRIDE as CLOUD_STRIDE,
  type CloudPoint,
  type PointCloud,
  type PointCloudOptions,
  type PointCloudScatter,
} from "./points/point-cloud";

// Motion
export {
  isSettled,
  springCoefficients,
  springs,
  stepSpring,
  type SpringCoefficients,
  type SpringConfig,
  type SpringState,
} from "./motion/spring";
export { value, type AnimatedValue, type ToOptions, type ValueOptions } from "./motion/value";
export { values, type AnimatedValues, type ValuesOptions } from "./motion/values";
export { springToCss, type CssSpring } from "./motion/css";
export { deceleration, project, rubberband, velocityTracker, type VelocityTracker } from "./motion/gesture";

// Rendering
export { toPathData } from "./render/svg";
export { drawPath, type PathSink } from "./render/canvas";
