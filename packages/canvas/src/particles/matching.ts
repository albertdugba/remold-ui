import type { CloudPoint, PointCloudOptions, PointMatches } from "@remold-ui/core";

export const OFF_THREAD_MATCH_CELLS = 250_000;

let sharedWorker: Promise<Worker | null> | undefined;
let nextRequestId = 0;
const pendingRequests = new Map<number, { resolve: (matches: PointMatches) => void; reject: (error: Error) => void }>();

export function matchOffThread({
  from,
  to,
  match,
}: {
  from: { x: number; y: number; z?: number }[];
  to: readonly CloudPoint[];
  match: PointCloudOptions["match"];
}): Promise<PointMatches> | null {
  if (!canUseWorkers()) return null;

  return getSharedWorker().then(
    (worker) =>
      new Promise((resolve, reject) => {
        if (!worker) {
          reject(new Error("particles: the matching worker couldn't start"));
          return;
        }
        const id = ++nextRequestId;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ id, from, to: to.map(({ x, y, z }) => ({ x, y, z })), match });
      }),
  );
}

export function matchByIndex(count: number): PointMatches {
  return { pairs: Array.from({ length: count }, (_, index): [number, number] => [index, index]), leaving: [], arriving: [] };
}

function canUseWorkers(): boolean {
  return typeof Worker === "function" && typeof Blob === "function" && typeof URL?.createObjectURL === "function";
}

function getSharedWorker(): Promise<Worker | null> {
  sharedWorker ??= import("../workers/match.generated").then(
    ({ MATCH_WORKER }) => {
      try {
        const worker = new Worker(URL.createObjectURL(new Blob([MATCH_WORKER], { type: "text/javascript" })));

        worker.onmessage = ({ data }: MessageEvent<{ id: number; matches?: PointMatches; error?: string }>) => resolveRequest(data);
        worker.onerror = rejectRequests;
        return worker;
      } catch {
        return null;
      }
    },
    () => null,
  );
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
  sharedWorker = Promise.resolve(null);
  for (const request of pendingRequests.values()) request.reject(new Error("particles: the matching worker stopped"));
  pendingRequests.clear();
}
