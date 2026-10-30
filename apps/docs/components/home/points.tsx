import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Copy01Icon, Layers01Icon, ServerStack01Icon, Tag01Icon, TouchInteraction01Icon, UniversalAccessIcon } from "@hugeicons/core-free-icons";

const POINTS: { icon: IconSvgElement; title: string; body: string }[] = [
  {
    icon: Tag01Icon,
    title: "Nothing to label",
    body: "Wrap the part that changes. Remold works out what stayed from what's on screen: text, images, shape and position.",
  },
  {
    icon: ServerStack01Icon,
    title: "Any markup, any source",
    body: "The next view can be another component, a server response or content from a CMS, and it still animates.",
  },
  {
    icon: TouchInteraction01Icon,
    title: "Built to be interrupted",
    body: "Every change springs from wherever things are, at the speed they were going. Nothing restarts or jumps.",
  },
  {
    icon: UniversalAccessIcon,
    title: "Accessible by default",
    body: "It follows reduced motion, keeps focus where it was, and can tell screen readers what changed.",
  },
  {
    icon: Copy01Icon,
    title: "Yours to keep",
    body: "Every component installs into your project with one command, as plain code you can restyle and change.",
  },
  {
    icon: Layers01Icon,
    title: "React or plain JavaScript",
    body: "Use the React components, or call it on any element from plain JavaScript, with any framework or none.",
  },
];

export function Points() {
  return (
    <ul className="hm-points">
      {POINTS.map(({ icon, title, body }) => (
        <li key={title} className="hm-point">
          <span className="hm-point-icon" aria-hidden="true">
            <HugeiconsIcon icon={icon} />
          </span>
          <strong>{title}</strong>
          <p>{body}</p>
        </li>
      ))}
    </ul>
  );
}
