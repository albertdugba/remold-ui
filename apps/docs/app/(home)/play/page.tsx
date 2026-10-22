import { Playground } from "@/components/playground/playground";

export const metadata = {
  title: "Morph playground · Remold",
  description: "Paste two shapes or type two phrases and watch one become the other. Share the link or export a video.",
};

export default function PlayPage() {
  return (
    <main className="hm">
      <div className="hm-frame pg-page">
        <header className="hm-head pg-head">
          <p className="hm-kicker">Playground</p>
          <h1>Morph anything into anything.</h1>
          <p>
            Paste two SVGs, or type two phrases. Remold pairs up the pieces and springs one into the other. The link in your address
            bar saves everything, so you can share it.
          </p>
        </header>
        <Playground />
      </div>
    </main>
  );
}
