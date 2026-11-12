export { lerp, lerpPoint, type Point } from "./interpolate";

export { parsePath, type PathCommand } from "./path/parse";
export { pointAt, toCubics, type Cubic, type Subpath } from "./path/normalize";
export { splitCubic, subdivide } from "./path/subdivide";
export { bounds, centroid, signedArea, type Bounds } from "./path/measure";
export { shapeToPath, shapesToPath, type ShapeAttributes, type ShapeNode } from "./path/shapes";

export { matchShapes, reverseSubpath, type MatchOptions, type MatchedShapes } from "./morph/match";
export { createMorph, lerpBuffers, type Morph, type MorphOptions, type SubpathLayout } from "./morph/morph";

export { matchNodes, type MatchNodesOptions, type NodeMatches } from "./match/nodes-match";
export type { MatchNode, NodeKind, Rgba } from "./match/nodes";
export type { Merge, Split } from "./match/split-merge";
export { assign, hungarian, type Assignment } from "./match/hungarian";
export { textSimilarity } from "./match/text";
export { matchPoints, type MatchPointsOptions, type Point3, type PointMatches } from "./match/points";

export {
  clusterPoints,
  fitPoints,
  sampleMask,
  samplePath,
  type ClusterOptions,
  type FitOptions,
  type Mask,
  type MaskSampleOptions,
  type PathSampleOptions,
  type SampleOptions,
} from "./points/sampling";
export * as shapes from "./points/shapes";
export type { PixelShape, Shape, ShapePoint, ShapeSample, ToneRule, Vec3 } from "./points/shapes";
export type { PixelSubject, Pixels } from "./points/pixels";
export {
  pointCloud,
  STRIDE as CLOUD_STRIDE,
  type CloudPoint,
  type PointCloud,
  type PointCloudOptions,
  type PointCloudScatter,
} from "./points/point-cloud";

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

export { toPathData } from "./render/svg";
export { drawPath, type PathSink } from "./render/canvas";
