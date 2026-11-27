import type { Metadata } from "next";
import { Stage } from "./stage";

export const metadata: Metadata = {
  title: "Particle shapes · recording stage",
  robots: { index: false, follow: false },
};

export default function ParticleShapesStage() {
  return <Stage />;
}
