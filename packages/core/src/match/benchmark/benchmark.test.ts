import { describe, expect, it } from "vitest";
import { matchNodes } from "../nodes-match";
import { truth } from "./build";
import { scenarios } from "./scenarios";
import { matchByExactText, matchByTreePosition, relations, score, type Score } from "./score";

const run = (matcher: typeof matchNodes) =>
  scenarios.map((s) => ({ id: s.id, score: score(relations(matcher(s.from.nodes, s.to.nodes)), truth(s.from, s.to)) }));

/** F1 over every relation in every scenario together. */
function overall(results: { score: Score }[]): number {
  const correct = results.reduce((n, r) => n + r.score.correct, 0);
  const claimed = results.reduce((n, r) => n + r.score.claimed, 0);
  const expected = results.reduce((n, r) => n + r.score.expected, 0);
  const precision = correct / claimed;
  const recall = correct / expected;
  return (2 * precision * recall) / (precision + recall);
}

describe("benchmark", () => {
  const matcher = run(matchNodes);
  const tree = run(matchByTreePosition);
  const exact = run(matchByExactText);

  it("matches at least 95% of relations correctly overall (F1)", () => {
    expect(overall(matcher)).toBeGreaterThanOrEqual(0.95);
  });

  it("beats both baselines on every scenario", () => {
    matcher.forEach((m, i) => {
      expect(m.score.f1, m.id).toBeGreaterThan(tree[i]!.score.f1);
      expect(m.score.f1, m.id).toBeGreaterThan(exact[i]!.score.f1);
    });
  });

  it("is precise: almost everything it claims is right", () => {
    for (const m of matcher) expect(m.score.precision, m.id).toBeGreaterThanOrEqual(0.95);
  });

});
