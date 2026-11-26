import { ParticleStudio } from "@/components/particle-studio/particle-studio";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Particle studio",
  description: "Turn words, shapes and images into particles and ASCII art that rebuild from frame to frame.",
  robots: { index: false, follow: false },
};

export default function ParticleStudioPage() {
  return (
    <main>
      <h1 className="sr-only">Particle studio</h1>
      <ParticleStudio />
    </main>
  );
}
