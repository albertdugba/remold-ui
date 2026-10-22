"use client";
/**
 * A live, scaled-down copy of a component for its card on "Browse all". The real component is
 * rendered at the size it's designed for, then scaled to fit the card (the engine moves things
 * the right distance inside scaled containers). It's `inert`, so the whole card stays one link,
 * and it's only loaded once the card is near the screen. Each component already pauses itself
 * while it's off screen.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";

interface Preview {
  Component: ComponentType<Record<string, unknown>>;
  /** The width it's drawn at before scaling. Default 760. */
  width?: number;
  /** A fixed height, for pieces that fill whatever box they're in, or to show the top of a tall one. */
  height?: number;
  /** Shown on a dark stage. */
  dark?: boolean;
  /** Show the whole thing instead of filling the card, for pieces whose edges matter. */
  whole?: boolean;
  /** For demos that are stepped from outside (`index`), how often to step them, in ms. */
  every?: number;
  props?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const load = (loader: () => Promise<ComponentType<any>>) => dynamic(loader, { ssr: false }) as ComponentType<Record<string, unknown>>;

/** Every card's preview, by id: component pages by their slug, the rest by where they live. */
const PREVIEWS: Record<string, Preview> = {
  // Component pages
  "comment-thread": { Component: load(() => import("./demos/comment-thread").then((m) => m.CommentThreadDemo)) },
  "course-outline": { Component: load(() => import("./demos/course-outline").then((m) => m.CourseOutlineDemo)) },
  letters: { Component: load(() => import("./demos/letters").then((m) => m.LettersDemo)), whole: true },
  "logo-morph": {
    Component: load(() => import("./demos/logo-morph").then((m) => m.LogoMorphDemo)),
    width: 640,
    props: { controls: false },
  },
  "morph-icons": { Component: load(() => import("./demos/morph-icons").then((m) => m.MorphIconsDemo)) },
  "onboarding-checklist": { Component: load(() => import("./demos/onboarding-checklist").then((m) => m.OnboardingChecklistDemo)) },
  "podcast-player": {
    Component: load(() => import("./demos/podcast-player").then((m) => m.PodcastPlayerDemo)),
    width: 420,
    props: { source: "/api/podcasts" },
  },
  accounts: { Component: load(() => import("./demos/accounts").then((m) => m.AccountsDemo)), width: 900 },
  "voice-orb": {
    Component: load(() => import("./demos/voice-orb").then((m) => m.VoiceOrbDemo)),
    width: 420,
    dark: true,
  },
  "build-anything": { Component: load(() => import("./demos/build-anything").then((m) => m.BuildAnythingDemo)) },
  "canvas-gallery": { Component: load(() => import("./demos/gallery").then((m) => m.GalleryDemo)) },
  "edge-delivery": { Component: load(() => import("./demos/edge-delivery").then((m) => m.EdgeDeliveryDemo)) },
  "integrations-hub": { Component: load(() => import("./demos/integrations-hub").then((m) => m.IntegrationsHubDemo)) },
  "layer-stack": { Component: load(() => import("./demos/layer-stack").then((m) => m.LayerStackDemo)) },
  "living-diagrams": { Component: load(() => import("./demos/scenes-gallery").then((m) => m.ScenesGalleryDemo)) },
  "product-anatomy": { Component: load(() => import("./demos/product-anatomy").then((m) => m.ProductAnatomyDemo)) },

  // The home page
  "home/text": { Component: load(() => import("./demos/text").then((m) => m.PriceDemo)), width: 520, every: 2000 },
  "home/icons": { Component: load(() => import("./demos/icons").then((m) => m.IconsDemo)), width: 520, every: 900 },
  "home/world": { Component: load(() => import("./demos/world").then((m) => m.WorldDemo)), width: 560, every: 2600, dark: true },
  "home/particles": { Component: load(() => import("./demos/particles").then((m) => m.ParticlesDemo)), width: 600, every: 2600 },
  "home/emblem": { Component: load(() => import("./demos/emblem").then((m) => m.EmblemDemo)), width: 520, every: 1800 },
  "home/scene": { Component: load(() => import("./demos/scene").then((m) => m.SceneDemo)), width: 640, every: 2800 },
  "home/layout": { Component: load(() => import("./demos/layout").then((m) => m.LayoutDemo)), width: 640 },
  "home/feedback": { Component: load(() => import("./demos/feedback-face").then((m) => m.FeedbackFaceDemo)), width: 520, every: 1400 },
};

/** Steps `index` every `every` ms while on screen, for demos that are driven from outside. */
function Stepped({ Component, every, props }: { Component: Preview["Component"]; every: number; props?: Record<string, unknown> }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => i + 1), every);
    return () => clearInterval(timer);
  }, [every]);
  return <Component {...props} index={index} />;
}

/**
 * `interactive` leaves the component usable (for the landing page) and shows it whole, so none of
 * its controls are cropped away. Otherwise it's a picture: inert, and filling its card.
 */
export function ComponentPreview({ id, interactive = false }: { id: string; interactive?: boolean }) {
  const preview = PREVIEWS[id];
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [scale, setScale] = useState(0);
  const width = preview?.width ?? 760;

  // Load the component once the card comes near the screen.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Fit the whole component inside the frame, keeping its proportions.
  useEffect(() => {
    const outer = frame.current;
    const content = inner.current;
    if (!near || !outer || !content) return;
    const fit = () => {
      const height = content.offsetHeight;
      if (!height) return;
      // Fill the card like a cover image, but never more than a little past fitting whole, so
      // small things don't blow up and tall ones keep their middle in view.
      const contain = Math.min(outer.clientWidth / width, outer.clientHeight / height);
      const cover = Math.max(outer.clientWidth / width, outer.clientHeight / height);
      setScale(preview?.whole || interactive ? contain : Math.min(cover, contain * 1.45));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    ro.observe(content);
    return () => ro.disconnect();
  }, [near, width, preview?.whole, interactive]);

  if (!preview) return <div className="rm-preview" aria-hidden="true" />;
  const { Component, height, dark, every, props } = preview;
  return (
    <div
      ref={frame}
      className={`rm-preview${dark ? " dark" : ""}${interactive ? " live" : ""}`}
      aria-hidden={interactive ? undefined : true}
    >
      {near && (
        <div
          ref={inner}
          inert={!interactive}
          className="rm-preview-inner"
          style={{
            width,
            height,
            overflow: height ? "hidden" : undefined,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity: scale ? 1 : 0,
          }}
        >
          {every ? <Stepped Component={Component} every={every} props={props} /> : <Component {...props} />}
        </div>
      )}
    </div>
  );
}
