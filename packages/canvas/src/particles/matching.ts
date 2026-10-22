import { MATCH_WORKER } from "../workers/match.generated";
import type { CloudPoint, PointCloudOptions, PointMatches } from "@remold-ui/core";

export const OFF_THREAD_MATCH_CELLS = 250_000;

let sharedWorker: Worker | null | undefined;
let nextRequestId = 0;
const pendingRequests = new Map<number, { resolve: (matches: PointMatches) => void; reject: (error: Error) => void }>();

/** Matches a cloud in the background when workers are supported. */
export function matchOffThread({
  from,
  to,
  match,
}: {
  from: { x: number; y: number }[];
  to: readonly CloudPoint[];
  match: PointCloudOptions["match"];
}): Promise<PointMatches> | null {
  const worker = getSharedWorker();
  if (!worker) return null;
  const id = ++nextRequestId;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ id, from, to: to.map(({ x, y }) => ({ x, y })), match });
  });
}

/** Pairs each point with the point at the same index. */
export function matchByIndex(count: number): PointMatches {
  return { pairs: Array.from({ length: count }, (_, index): [number, number] => [index, index]), leaving: [], arriving: [] };
}

function getSharedWorker(): Worker | null {
  if (sharedWorker !== undefined) return sharedWorker;
  sharedWorker = null;
  try {
    if (typeof Worker !== "function" || typeof Blob !== "function" || typeof URL?.createObjectURL !== "function") return null;
    const worker = new Worker(URL.createObjectURL(new Blob([MATCH_WORKER], { type: "text/javascript" })));
    worker.onmessage = ({ data }: MessageEvent<{ id: number; matches?: PointMatches; error?: string }>) => resolveRequest(data);
    worker.onerror = rejectRequests;
    sharedWorker = worker;
  } catch {
    sharedWorker = null;
  }
  return sharedWorker;
}

function resolveRequest({ id, matches, error }: { id: number; matches?: PointMatches; error?: string }): void {
  const request = pendingRequests.get(id);
  if (!request) return;
  pendingRequests.delete(id);
  if (matches) request.resolve(matches);
  else request.reject(new Error(error ?? "particles: matching failed"));
}

function rejectRequests(): void {
  sharedWorker = null;
  for (const request of pendingRequests.values()) request.reject(new Error("particles: the matching worker stopped"));
  pendingRequests.clear();
}
