/** Shapes, icons and image reading shared by the guided and the custom studio. */
import {
  CloudIcon,
  Coffee01Icon,
  FavouriteIcon,
  Flower01Icon,
  GithubIcon,
  Globe02Icon,
  Leaf01Icon,
  Moon02Icon,
  MusicNote01Icon,
  Rocket01Icon,
  SmileIcon,
  StarIcon,
  Sun03Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

const IMAGE_MAX = 480;

export const PATHS = {
  Heart: "M50 88C50 88 8 62 8 34C8 18 20 8 33 8C42 8 47 13 50 19C53 13 58 8 67 8C80 8 92 18 92 34C92 62 50 88 50 88Z",
  Pin: "M50 4C31 4 17 18 17 37C17 62 50 96 50 96S83 62 83 37C83 18 69 4 50 4Z" + "M50 24A13 13 0 1 0 50 50A13 13 0 1 0 50 24Z",
  Star: "M50 4L62 36L96 38L69 59L79 92L50 73L21 92L31 59L4 38L38 36Z",
  Ring: "M50 4A46 46 0 1 1 49.9 4ZM50 26A24 24 0 1 0 50.1 26Z",
} as const;

export const ICON_SHAPES: { name: string; icon: IconSvgElement }[] = [
  { name: "Heart", icon: FavouriteIcon },
  { name: "Star", icon: StarIcon },
  { name: "Rocket", icon: Rocket01Icon },
  { name: "Zap", icon: ZapIcon },
  { name: "Cloud", icon: CloudIcon },
  { name: "Sun", icon: Sun03Icon },
  { name: "Moon", icon: Moon02Icon },
  { name: "Leaf", icon: Leaf01Icon },
  { name: "Flower", icon: Flower01Icon },
  { name: "Coffee", icon: Coffee01Icon },
  { name: "Music", icon: MusicNote01Icon },
  { name: "Smile", icon: SmileIcon },
  { name: "Globe", icon: Globe02Icon },
  { name: "GitHub", icon: GithubIcon },
];

/** An uploaded image, shrunk so the film stays small enough to save and export. */
export function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, IMAGE_MAX / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image the browser can open."));
    };
    image.src = url;
  });
}

