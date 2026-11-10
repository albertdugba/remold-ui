import { Studio } from "@/components/studio/studio";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio",
  description: "Open an illustrated story, change its words, colours and steps, and export it as a React component that plays the same way.",
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  return (
    <main className="hm">
      <div className="hm-frame pg-page">
        <header className="hm-head pg-head">
          <p className="hm-kicker">Studio</p>
          <h1>Make the story yours.</h1>
          <p>
            Start from a story, change what it says and where things go, step by step. Remold animates everything in between, and Export
            gives you a component that plays exactly the same.
          </p>
        </header>
        <Studio />
      </div>
    </main>
  );
}
