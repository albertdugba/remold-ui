/** Live numbers from the last transition, for the stats line under each demo. */
import type { Transition } from "@remold-ui/react";
import { useCallback, useState, type ReactNode } from "react";

export function useTransitionStats(idle: string) {
  const [stats, setStats] = useState<ReactNode>(idle);
  const onTransition = useCallback((transition: Transition) => {
    transition.ready.then(
      ({ matches, summary }) => {
        setStats(
          <>
            <span>
              Matched <b>{matches.pairs.length + matches.splits.length + matches.merges.length}</b>
            </span>
            <span>
              Arrived <b>{summary.added}</b>
            </span>
            <span>
              Left <b>{summary.removed}</b>
            </span>
            {summary.changed > 0 && (
              <span>
                Text changed <b>{summary.changed}</b>
              </span>
            )}
          </>,
        );
      },
      () => {},
    );
  }, []);
  return [stats, onTransition] as const;
}
