import type { Metadata } from "next";
import { Stage } from "./stage";

export const metadata: Metadata = {
  title: "Context menu · recording stage",
  robots: { index: false, follow: false },
};

export default function ContextMenuStage() {
  return <Stage />;
}
