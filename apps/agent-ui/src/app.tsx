import { MotionConfig } from "motion/react";
import { AgentCursor } from "./components/cursor";
import { Island } from "./components/island";
import { Settings } from "./components/settings";

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.15 };

export function App() {
  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      <main className="grid min-h-dvh content-start justify-items-center px-3 pt-10 pb-8 font-sans min-[1000px]:pt-16 antialiased">
        <div className="grid w-[460px] max-w-full grid-cols-[minmax(0,1fr)] items-start gap-3 min-[1000px]:w-auto min-[1000px]:grid-cols-[460px_420px]">
          <Settings />
          <div className="contents min-[1000px]:sticky min-[1000px]:top-10 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,1fr)] min-[1000px]:gap-3">
            <Island />
            <p className="m-0 px-6 text-center text-[12.5px] leading-[1.5] text-(--muted)">
              A scripted planner stands in for the model. Every change goes through the UI SDK agent bridge.
            </p>
          </div>
        </div>
      </main>
      <AgentCursor />
    </MotionConfig>
  );
}
