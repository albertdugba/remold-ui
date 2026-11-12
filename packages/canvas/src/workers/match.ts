import { matchPoints, type MatchPointsOptions } from "@remold-ui/core";

export interface MatchRequest {
  id: number;
  from: { x: number; y: number }[];
  to: { x: number; y: number }[];
  match?: MatchPointsOptions;
}

const scope = self as unknown as {
  onmessage: ((event: { data: MatchRequest }) => void) | null;
  postMessage(message: unknown): void;
};

scope.onmessage = ({ data: { id, from, to, match } }) => {
  try {
    scope.postMessage({ id, matches: matchPoints(from, to, match) });
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
