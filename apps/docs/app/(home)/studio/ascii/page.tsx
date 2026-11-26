import { AsciiLab } from "@/components/ascii-lab/ascii-lab";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ASCII lab",
  description: "Live 3D ASCII art: lit, interactive, and morphing from one shape into the next.",
  robots: { index: false, follow: false },
};

export default function AsciiLabPage() {
  return (
    <main>
      <h1 className="sr-only">ASCII lab</h1>
      <AsciiLab />
    </main>
  );
}
