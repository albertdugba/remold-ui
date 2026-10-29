/**
 * Edits to a scene document, as pure functions: each takes a document and returns a new one, so
 * undo is just keeping the old one.
 */
import { freshId, resolvePoses, type Motion, type Pose, type SceneDocument, type StudioObject, type StudioStep } from "./document";

/** "until": the change holds until a later step changes it. "step": only this step; the next goes back. */
export type Scope = "until" | "step";

const withStep = (doc: SceneDocument, index: number, change: (step: StudioStep) => StudioStep): SceneDocument => ({
  ...doc,
  steps: doc.steps.map((s, i) => (i === index ? change(s) : s)),
});

export const updateDocument = (doc: SceneDocument, change: Partial<Omit<SceneDocument, "version" | "objects" | "steps">>): SceneDocument => ({ ...doc, ...change });

export const updateStep = (doc: SceneDocument, index: number, change: Partial<Pick<StudioStep, "name" | "ms" | "overlay">>): SceneDocument =>
  withStep(doc, index, (s) => ({ ...s, ...change }));

export const updateObject = (doc: SceneDocument, id: string, change: Partial<Omit<StudioObject, "id">>): SceneDocument => ({
  ...doc,
  objects: doc.objects.map((o) => (o.id === id ? { ...o, ...change, look: { ...o.look, ...change.look } } : o)),
});

/** Change how an object sits at a step. */
export function setPose(doc: SceneDocument, index: number, id: string, change: Pose, scope: Scope): SceneDocument {
  let next = withStep(doc, index, (s) => ({ ...s, pose: { ...s.pose, [id]: { ...s.pose[id], ...change } } }));
  const following = doc.steps[index + 1];
  if (scope === "step" && following) {
    // The next step puts back whatever it doesn't already set itself.
    const before = resolvePoses(doc, index)[id] ?? {};
    const restore: Pose = {};
    for (const key of Object.keys(change) as (keyof Pose)[])
      if (following.pose[id]?.[key] === undefined) Object.assign(restore, { [key]: before[key] });
    next = withStep(next, index + 1, (s) => ({ ...s, pose: { ...s.pose, [id]: { ...restore, ...s.pose[id] } } }));
  }
  return next;
}

/** Change how an object moves into a step. Zero clears a setting. */
export function setMotion(doc: SceneDocument, index: number, id: string, change: Motion): SceneDocument {
  return withStep(doc, index, (s) => {
    const motion = { ...s.motion?.[id], ...change };
    for (const key of Object.keys(motion) as (keyof Motion)[]) if (!motion[key]) delete motion[key];
    return { ...s, motion: { ...s.motion, [id]: motion } };
  });
}

/** A new step after `index`, holding the same pose and card, ready to change. */
export function addStep(doc: SceneDocument, index: number): { doc: SceneDocument; index: number } {
  const source = doc.steps[index]!;
  const step: StudioStep = {
    id: freshId("step-", doc.steps.map((s) => s.id)),
    name: `Step ${doc.steps.length + 1}`,
    ms: source.ms,
    pose: {},
    overlay: source.overlay && { ...source.overlay },
  };
  const steps = [...doc.steps];
  steps.splice(index + 1, 0, step);
  return { doc: { ...doc, steps }, index: index + 1 };
}

/** Remove a step without moving any other: its changes pass on to the step after it. */
export function removeStep(doc: SceneDocument, index: number): SceneDocument {
  if (doc.steps.length <= 1) return doc;
  const steps = [...doc.steps];
  const [gone] = steps.splice(index, 1);
  const after = steps[index];
  if (gone && after) {
    const pose = { ...after.pose };
    if (index === 0) {
      // The new first step has to place everything.
      for (const [id, full] of Object.entries(resolvePoses(doc, 1))) pose[id] = full;
    } else {
      for (const [id, change] of Object.entries(gone.pose)) pose[id] = { ...change, ...after.pose[id] };
    }
    steps[index] = { ...after, pose };
  }
  return {
    ...doc,
    steps,
    links: doc.links.map((l) => (l.steps ? { ...l, steps: l.steps.filter((s) => s !== gone?.id) } : l)),
  };
}
