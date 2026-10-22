"use client";

import { Remold, type ParticleShape } from "@remold-ui/react";
import { useEffect, useRef, useState } from "react";
import styles from "./particles-story.module.css";

const MUSIC_NOTE =
  "M19 76a11 8 0 1 1 22 0a11 8 0 1 1-22 0Z" +
  "M61 68a11 8 0 1 1 22 0a11 8 0 1 1-22 0Z" +
  "M36 26H41V76H36Z" +
  "M78 18H83V68H78Z" +
  "M36 24L83 12V22L36 34Z";

const PARCEL = "M50 8L85 26L50 44L15 26Z M14 31L47 48V89L14 71Z M53 48L86 31V71L53 89Z";
const ARRIVAL =
  "M50 6A44 44 0 1 1 50 94A44 44 0 1 1 50 6Z" + "M50 18A32 32 0 1 0 50 82A32 32 0 1 0 50 18Z" + "M26 51L34 43L45 54L67 32L75 40L45 70Z";

const PALETTE = ["#414938", "#23251b", "#363a29", "#484d37", "#5b6046", "#707456", "#8a8060", "#aa946e"] as const;

const CHAPTERS: readonly {
  stage: string;
  title: string;
  shape: ParticleShape;
}[] = [
  {
    stage: "Jacket",
    title: "The Field Jacket",
    shape: { image: "/returns-field-jacket.jpg", by: "dark", threshold: 100, pattern: "grid", jitter: 0 },
  },
  {
    stage: "Sound",
    title: "Find your rhythm",
    shape: { path: MUSIC_NOTE },
  },
  {
    stage: "Parcel",
    title: "On its way",
    shape: { path: PARCEL },
  },
  {
    stage: "Arrived",
    title: "Delivered",
    shape: { path: ARRIVAL, fillRule: "evenodd" },
  },
];

function useStageWidth() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(640);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateWidth = () => setStageWidth(Math.round(stage.clientWidth / 32) * 32);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return { stageRef, stageWidth };
}

function particleRadius({ stageWidth, image }: { stageWidth: number; image: boolean }) {
  if (stageWidth < 480) return image ? 1.7 : 0.75;
  return image ? 2.1 : 0.9;
}

export function ParticlesStory({ playing = true }: { playing?: boolean }) {
  const [step, setStep] = useState(0);
  const { stageRef, stageWidth } = useStageWidth();
  const chapter = CHAPTERS[step]!;
  const count = Math.min(9000, Math.max(1800, Math.round((stageWidth * stageWidth) / 110)));
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep((currentStep) => (currentStep + 1) % CHAPTERS.length), 3000);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <div className={styles.story}>
      <div ref={stageRef} className={styles.visual}>
        <Remold.Particles
          className={styles.canvas}
          shape={chapter.shape}
          label={chapter.title}
          count={count}
          radius={particleRadius({ stageWidth, image: step === 0 })}
          palette={PALETTE}
          padding={18}
          pointer={{ radius: 90, strength: 12 }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
