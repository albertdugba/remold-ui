"use client";
/**
 * A live, scaled-down copy of a component for its card on "Browse all". The real component is
 * rendered at the size it's designed for, then scaled to fit the card without cropping. It's `inert`, so the whole card stays one link,
 * and it's only loaded once the card is near the screen. Each component already pauses itself
 * while it's off screen.
 */
import dynamic from "next/dynamic";
import { PreviewScope } from "./demos/portal-container";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";

/** The most a fitted preview is enlarged. */
const MAX_ZOOM = 1.5;

interface Preview {
  Component: ComponentType<Record<string, unknown>>;
  /** The width it's drawn at before scaling. Default 760. */
  width?: number;
  /** A fixed height, for pieces that fill whatever box they're in, or to show the top of a tall one. */
  height?: number;
  /** Taller product surfaces need more room than a compact control. */
  aspectRatio?: string;
  /** A product surface: shown on a clean card of its own in the catalogue. */
  surface?: boolean;
  /** Drawn at the card's own shape and filling it edge to edge, its own background kept. */
  cover?: boolean;
  /** Fitted to the card's width and pinned to its top, the rest clipped: for tall surfaces that would read too small whole. */
  crop?: boolean;
  /** Shown on a dark stage. */
  dark?: boolean;
  /** For demos that are stepped from outside (`index`), how often to step them, in ms. */
  every?: number;
  props?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const load = (loader: () => Promise<ComponentType<any>>) =>
  dynamic(loader, { ssr: false }) as ComponentType<Record<string, unknown>>;

/** Every card's preview, by id: component pages by their slug, the rest by where they live. */
const PREVIEWS: Record<string, Preview> = {
  // Component pages
  "comment-thread": {
    Component: load(() =>
      import("./demos/comment-thread").then((m) => m.CommentThreadDemo),
    ),
    surface: true,
    crop: true,
    width: 500,
    props: { variant: "preview" },
  },
  "hold-to-record": {
    Component: load(() =>
      import("./demos/hold-to-record").then((m) => m.HoldToRecordDemo),
    ),
    width: 420,
  },
  "table-booking": {
    Component: load(() =>
      import("./demos/table-booking").then((m) => m.TableBookingDemo),
    ),
    width: 400,
  },
  "otp-input": {
    Component: load(() =>
      import("./demos/otp-input").then((m) => m.OtpInputDemo),
    ),
    width: 420,
    surface: true,
  },
  "live-room": { Component: load(() => import("./demos/live-room").then((m) => m.LiveRoomDemo)), width: 420, surface: true },
  "course-outline": {
    Component: load(() =>
      import("./demos/course-outline").then((m) => m.CourseOutlineDemo),
    ),
    surface: true,
    crop: true,
    width: 480,
  },
  "logo-morph": {
    Component: load(() =>
      import("./demos/logo-morph").then((m) => m.LogoMorphDemo),
    ),
    width: 640,
    props: { controls: false },
  },
  "morph-icons": {
    Component: load(() =>
      import("./demos/morph-icons").then((m) => m.MorphIconsDemo),
    ),
  },
  "step-progress": {
    Component: load(() =>
      import("./demos/step-progress").then((m) => m.StepProgressDemo),
    ),
    width: 460,
    surface: true,
  },
  "share-link": {
    Component: load(() =>
      import("./demos/share-link").then((m) => m.ShareLinkDemo),
    ),
    width: 520,
    surface: true,
  },
  "save-button": {
    Component: load(() =>
      import("./demos/save-button").then((m) => m.SaveButtonDemo),
    ),
    width: 420,
    surface: true,
  },
  "product-tour": {
    Component: load(() =>
      import("./demos/product-tour").then((m) => m.ProductTourDemo),
    ),
    width: 720,
  },
  "command-palette": {
    Component: load(() =>
      import("./demos/command-palette").then((m) => m.CommandPaletteDemo),
    ),
    width: 480,
  },
  "two-factor": {
    Component: load(() =>
      import("./demos/two-factor").then((m) => m.TwoFactorDemo),
    ),
    width: 520,
    surface: true,
  },
  "invite-team": {
    Component: load(() =>
      import("./demos/invite-team").then((m) => m.InviteTeamDemo),
    ),
    width: 520,
  },
  signature: {
    Component: load(() =>
      import("./demos/signature").then((m) => m.SignatureDemo),
    ),
    width: 460,
    surface: true,
  },
  "project-setup": {
    Component: load(() =>
      import("./demos/project-setup").then((m) => m.ProjectSetupDemo),
    ),
    width: 680,
    surface: true,
  },
  "task-list": {
    Component: load(() =>
      import("./demos/task-list").then((m) => m.TaskListDemo),
    ),
    width: 500,
    crop: true,
  },
  "podcast-player": {
    Component: load(() =>
      import("./demos/podcast-player").then((m) => m.PodcastPlayerDemo),
    ),
    width: 640,
    cover: true,
    props: { source: "/api/music", height: 480 },
  },
  "voice-orb": {
    Component: load(() =>
      import("./demos/voice-orb").then((m) => m.VoiceOrbDemo),
    ),
    width: 420,
  },
  "unit-chart": {
    Component: load(() => import("./demos/unit-chart").then((m) => m.UnitChartDemo)),
    width: 440,
    surface: true,
  },
  "inbox-triage": {
    Component: load(() => import("./demos/inbox-triage").then((m) => m.InboxTriageDemo)),
    width: 460,
    surface: true,
  },

  "amount-input": {
    Component: load(() => import("./demos/amount-input").then((m) => m.AmountInputDemo)),
    width: 400,
  },

  "phone-input": {
    Component: load(() => import("./demos/phone-input").then((m) => m.PhoneInputDemo)),
    width: 380,
    surface: true,
  },

  "tag-input": {
    Component: load(() => import("./demos/tag-input").then((m) => m.TagInputDemo)),
    width: 400,
    surface: true,
  },



  "address-autocomplete": {
    Component: load(() => import("./demos/address-autocomplete").then((m) => m.AddressAutocompleteDemo)),
    width: 420,
    surface: true,
  },

  "quantity-stepper": {
    Component: load(() => import("./demos/quantity-stepper").then((m) => m.QuantityStepperDemo)),
    width: 400,
    surface: true,
  },

  "promo-code": {
    Component: load(() => import("./demos/promo-code").then((m) => m.PromoCodeDemo)),
    width: 380,
    surface: true,
  },



  "range-slider": {
    Component: load(() => import("./demos/range-slider").then((m) => m.RangeSliderDemo)),
    width: 400,
    surface: true,
  },



  "upload-row": {
    Component: load(() => import("./demos/upload-row").then((m) => m.UploadRowDemo)),
    width: 400,
    surface: true,
  },


  "split-amount": {
    Component: load(() => import("./demos/split-amount").then((m) => m.SplitAmountDemo)),
    width: 380,
    surface: true,
  },








  // The home page
  "home/text": {
    Component: load(() => import("./demos/text").then((m) => m.PriceDemo)),
    width: 520,
    every: 2000,
  },
  "home/world": {
    Component: load(() => import("./demos/world").then((m) => m.WorldDemo)),
    width: 560,
    every: 2600,
    dark: true,
  },
  "home/particles": {
    Component: load(() =>
      import("./demos/particles").then((m) => m.ParticlesDemo),
    ),
    width: 600,
    every: 2600,
  },
  "home/emblem": {
    Component: load(() => import("./demos/emblem").then((m) => m.EmblemDemo)),
    width: 520,
    every: 1800,
  },
  "home/scene": {
    Component: load(() => import("./demos/scene").then((m) => m.SceneDemo)),
    width: 640,
    every: 2800,
  },
  "home/layout": {
    Component: load(() => import("./demos/layout").then((m) => m.LayoutDemo)),
    width: 640,
  },
  "home/feedback": {
    Component: load(() =>
      import("./demos/feedback-face").then((m) => m.FeedbackFaceDemo),
    ),
    width: 520,
    every: 1400,
  },
};

/** A landing card shown as it is on the home page: its own render, stepped through its states. */
export interface CustomPreview {
  render: (step: number, playing: boolean) => ReactNode;
  /** How many states it steps through, and how often. */
  states: number;
  every: number;
  /** The width it's drawn at before scaling. */
  width: number;
  /** Drawn straight on the stage, without the clean card product surfaces get. */
  bare?: boolean;
  /** This render already owns its backdrop, so it should fill the catalogue card. */
  cover?: boolean;
}

function CustomBody({ custom, playing }: { custom: CustomPreview; playing: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!playing || custom.states < 2) {
      setStep(0);
      return;
    }
    const timer = setInterval(() => setStep((s) => (s + 1) % custom.states), custom.every);
    return () => clearInterval(timer);
  }, [custom.states, custom.every, playing]);
  return <>{custom.render(step, playing)}</>;
}

/** Steps `index` every `every` ms while on screen, for demos that are driven from outside. */
function Stepped({
  Component,
  every,
  props,
  playing,
}: {
  Component: Preview["Component"];
  every: number;
  props?: Record<string, unknown>;
  playing: boolean;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!playing) {
      setIndex(0);
      return;
    }
    const timer = setInterval(() => setIndex((i) => i + 1), every);
    return () => clearInterval(timer);
  }, [every, playing]);
  return <Component {...props} index={index} playing={playing} />;
}

/**
 * `interactive` leaves the component usable (for the landing page) and shows it whole, so none of
 * its controls are cropped away. Otherwise it's a picture: inert, and filling its card.
 */
export function ComponentPreview({
  id,
  interactive = false,
  custom,
  playing = false,
}: {
  id: string;
  interactive?: boolean;
  /** Render this instead of the preview registered under `id`. */
  custom?: CustomPreview;
  /** Catalogue previews are still pictures of their first state: nothing plays until you open the component. */
  playing?: boolean;
}) {
  // A landing card is shown as it is on the landing page: its own frame, no extra card around it.
  const preview: Preview | undefined = custom
    ? { Component: () => null, width: custom.width, cover: custom.cover }
    : PREVIEWS[id];
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [scale, setScale] = useState(0);
  /** How far the drawn component's centre sits from the frame's centre, before scaling. */
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const width = preview?.width ?? 760;
  const crop = !interactive && !!preview?.crop;
  // A catalogue picture is fitted to what's actually drawn, not the width it's drawn at, so a 360px
  // field in a 440px stage fills its card. Live landing demos, cropped and full-bleed ones keep the
  // whole frame.
  const tight = !interactive && !crop && !preview?.cover && !preview?.dark;

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

  // Fit the component inside the frame, keeping its proportions.
  useEffect(() => {
    const outer = frame.current;
    const content = inner.current;
    if (!near || !outer || !content) return;
    // The largest the component has been. Demos change state as they play (a thread folds into a
    // summary, a list reorders), and refitting to each state would zoom the whole thing in and
    // out, and distort its own layout animations mid-flight. Fitting the largest keeps it still.
    let tallest = 0;
    let box: { left: number; top: number; right: number; bottom: number } | null = null;

    /** The union of everything drawn inside, in the component's own unscaled pixels. */
    const drawn = () => {
      const previous = content.style.transform;
      content.style.transform = "none";
      const frameBox = content.getBoundingClientRect();
      let found: typeof box = null;
      for (const el of content.querySelectorAll<HTMLElement>("*")) {
        if (el.closest(".rm-preview-layer")) continue;
        const r = el.getBoundingClientRect();
        // Skip empty boxes, wrappers as wide as the stage (layout, not what's drawn) and visually
        // hidden helpers such as the 1px inputs form libraries keep for screen readers and forms.
        if (r.width <= 2 || r.height <= 2 || r.width >= frameBox.width - 1) continue;
        const style = getComputedStyle(el);
        if (style.position === "fixed" || style.visibility === "hidden" || (style.clip !== "auto" && style.clip !== "")) continue;
        // Only what sits inside the component's own box counts, clamped to it: a popup or an
        // element passing through mid-animation mustn't shrink the picture for good.
        const b = {
          left: Math.max(0, r.left - frameBox.left),
          top: Math.max(0, r.top - frameBox.top),
          right: Math.min(frameBox.width, r.right - frameBox.left),
          bottom: Math.min(frameBox.height, r.bottom - frameBox.top),
        };
        if (b.right - b.left <= 2 || b.bottom - b.top <= 2) continue;
        found = found
          ? { left: Math.min(found.left, b.left), top: Math.min(found.top, b.top), right: Math.max(found.right, b.right), bottom: Math.max(found.bottom, b.bottom) }
          : b;
      }
      content.style.transform = previous;
      return found ? { ...found, frameWidth: frameBox.width, frameHeight: frameBox.height } : null;
    };

    const fit = () => {
      // A frame can ask for breathing room around the component with `--rm-preview-inset`.
      const inset =
        parseFloat(
          getComputedStyle(outer).getPropertyValue("--rm-preview-inset"),
        ) || 0;
      const roomX = outer.clientWidth - inset * 2;
      const roomY = outer.clientHeight - inset * 2;

      if (tight) {
        const now = drawn();
        if (!now) return;
        box = box
          ? { left: Math.min(box.left, now.left), top: Math.min(box.top, now.top), right: Math.max(box.right, now.right), bottom: Math.max(box.bottom, now.bottom) }
          : now;
        const w = box.right - box.left;
        const h = box.bottom - box.top;
        if (!w || !h) return;
        // A small control is enlarged only so far, so a lone button doesn't fill its card.
        setScale(Math.min(roomX / w, roomY / h, MAX_ZOOM));
        setShift({ x: (box.left + box.right) / 2 - now.frameWidth / 2, y: (box.top + box.bottom) / 2 - now.frameHeight / 2 });
        return;
      }

      // scrollHeight catches late-loading copy and images, so the lower part of a
      // component never gets cropped after the first measurement.
      tallest = Math.max(tallest, content.offsetHeight, content.scrollHeight);
      if (!tallest) return;
      const across = roomX / width;
      setScale(crop ? across : Math.min(across, roomY / tallest));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    ro.observe(content);
    return () => ro.disconnect();
  }, [near, width, crop, tight]);

  if (!preview) return <div className="rm-preview" aria-hidden="true" />;
  const { Component, height, dark, every, props, aspectRatio, surface, cover } =
    preview;
  return (
    <div
      ref={frame}
      className={`rm-preview${dark ? " dark" : ""}${
        interactive ? " live" : ""
      }`}
      data-preview={id}
      data-surface={surface || undefined}
      data-cover={cover || undefined}
      data-crop={crop || undefined}
      data-tight={tight || undefined}
      data-landing={custom ? "" : undefined}
      data-bare={custom?.bare || undefined}
      data-playing={playing || undefined}
      style={{ aspectRatio }}
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
            transform: `translate(-50%, ${crop ? "0" : "-50%"}) translate(${-shift.x * scale}px, ${-shift.y * scale}px) scale(${scale})`,
            opacity: scale ? 1 : 0,
          }}
        >
          {custom ? (
            // Its popups mount in a layer inside the preview, so they stay in the card and scale with it.
            <PreviewScope layer={layer}>
              <CustomBody custom={custom} playing={playing} />
              <div ref={setLayer} className="rm-preview-layer" />
            </PreviewScope>
          ) : every ? (
            <Stepped Component={Component} every={every} props={props} playing={playing} />
          ) : (
            <Component {...props} playing={playing} />
          )}
        </div>
      )}
    </div>
  );
}
