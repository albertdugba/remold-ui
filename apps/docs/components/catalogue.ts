/**
 * Pieces that live on the home page rather than on a component page of their own. "Browse
 * all" shows them next to the components, each linking to where it lives. Their previews are in
 * `component-preview.tsx`, under the same ids.
 */
/** The categories cards are filed under, in the order the filter lists them. */
export const CATEGORIES = ["Interface", "Canvas", "Text", "Icons", "Shapes", "Particles", "Motion", "Backgrounds"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface CatalogueItem {
  id: string;
  title: string;
  description: string;
  href: string;
  category: Category;
}

export const CATALOGUE: Record<"home", { title: string; items: CatalogueItem[] }> = {
  home: {
    title: "From the home page",
    items: [
      {
        id: "home/particles",
        category: "Particles",
        title: "Dot morph",
        description: "A word becomes a headset, a shoe, a logo: each dot finds its nearest new place.",
        href: "/docs/primitives/particles",
      },
      {
        id: "home/emblem",
        category: "Shapes",
        title: "SVG morph",
        description: "Filled artwork that reshapes into the next symbol, pieces and holes included.",
        href: "/docs/primitives/icon",
      },
      {
        id: "home/feedback",
        category: "Shapes",
        title: "Feedback face",
        description: "A rating face in five parts: brows lift, a frown opens into a laugh, eyes turn into hearts.",
        href: "/docs/primitives/path-group",
      },
    ],
  },
};
