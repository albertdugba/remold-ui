"use client";
/**
 * The guided studio: say what you're launching, pick a style, take the results away. Each step is
 * a few choices, and every result is usable as it stands.
 */
import { ArrowRight01Icon, CheckIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tabs } from "@base-ui/react/tabs";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useMemo, useRef, type ReactNode } from "react";
import { ICON_SHAPES, readImage } from "./assets";
import { asciiBanner } from "./banner";
import { STYLES } from "./brand";
import { CANVAS_SIZES, type Brand, type Film } from "./document";
import { iconMarkup, svgToPath } from "./shapes";

const BANNER_COLUMNS = 64;

export interface GuideActions {
  copyReact: () => void;
  record: () => void;
  recording: boolean;
  savePNG: () => void;
  copyBanner: (banner: string) => void;
  copySplash: (banner: string) => void;
}

export function GuidePanel({
  film,
  brand,
  step,
  onStep,
  onBrand,
  onStyle,
  onFormat,
  onError,
  actions,
}: {
  film: Film;
  brand: Brand;
  step: string;
  onStep: (step: string) => void;
  onBrand: (brand: Brand, foldKey?: string) => void;
  onStyle: (name: string) => void;
  onFormat: (size: { width: number; height: number }) => void;
  onError: (message: string) => void;
  actions: GuideActions;
}) {
  const logoPicker = useRef<HTMLInputElement>(null);
  const total = film.frames.reduce((sum, frame) => sum + frame.ms, 0);
  const characters = film.look.dot === "ascii" ? film.look.characters : ".:-=+*#%@";
  const banner = useMemo(
    () => (step === "export" ? asciiBanner(brand.name, { columns: BANNER_COLUMNS, characters }) : ""),
    [step, brand.name, characters],
  );
  const format = CANVAS_SIZES.find((size) => size.width === film.canvas.width && size.height === film.canvas.height)?.name ?? "";

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
        const { path, outline } = svgToPath(await file.text());
        onBrand({ ...brand, logo: { kind: "path", path, outline, label: file.name } });
      } else {
        onBrand({ ...brand, logo: { kind: "image", src: await readImage(file) } });
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Couldn't open that logo");
    }
  };

  return (
    <aside className="ps-panel ps-guide" aria-label="Make your intro">
      <Tabs.Root value={step} onValueChange={(value) => onStep(String(value))}>
        <Tabs.List className="ps-steps">
          {[
            ["brand", "Brand"],
            ["style", "Style"],
            ["export", "Export"],
          ].map(([value, label], index) => (
            <Tabs.Tab key={value} value={value} className="ps-step">
              <span className="ps-step-number">{index + 1}</span>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="brand" className="ps-guide-body">
          <GuideIntro title="What are you launching?" detail="Your name leads. Add a logo and a line about it if you like." />
          <label className="ps-guide-field">
            <span className="ps-label">Name</span>
            <input className="ps-input ps-input-large" value={brand.name} maxLength={20} placeholder="acme" onChange={(e) => onBrand({ ...brand, name: e.target.value }, "name")} />
          </label>
          <label className="ps-guide-field">
            <span className="ps-label">Tagline</span>
            <input className="ps-input" value={brand.tagline} maxLength={32} placeholder="Optional" onChange={(e) => onBrand({ ...brand, tagline: e.target.value }, "tagline")} />
          </label>
          <div className="ps-guide-field">
            <span className="ps-label">Logo</span>
            <div className="ps-icon-grid" role="group" aria-label="Use an icon as the logo">
              {ICON_SHAPES.map(({ name, icon }) => {
                const chosen = brand.logo?.kind === "path" && brand.logo.label === name;
                return (
                  <button
                    key={name}
                    type="button"
                    className="ps-icon-pick"
                    data-active={chosen || undefined}
                    aria-pressed={chosen}
                    aria-label={name}
                    title={name}
                    onClick={() => {
                      if (chosen) return onBrand({ ...brand, logo: null });
                      const { path, outline } = svgToPath(iconMarkup(icon));
                      onBrand({ ...brand, logo: { kind: "path", path, outline, label: name } });
                    }}
                  >
                    <HugeiconsIcon icon={icon} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <div className="ps-guide-row">
              <button type="button" className="ps-button ps-quiet ps-outlined" onClick={() => logoPicker.current?.click()}>
                Upload your logo
              </button>
              {brand.logo && (
                <button type="button" className="ps-button ps-quiet" onClick={() => onBrand({ ...brand, logo: null })}>
                  No logo
                </button>
              )}
            </div>
            {brand.logo && brand.logo.kind === "image" && <img className="ps-logo-preview" src={brand.logo.src} alt="" />}
            <input ref={logoPicker} type="file" accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp" hidden onChange={(e) => (onLogo(e.target.files?.[0]), (e.target.value = ""))} />
            <p className="ps-hint">SVGs work best: the dots follow their shapes exactly.</p>
          </div>
          <NextButton onClick={() => onStep("style")}>Pick a style</NextButton>
        </Tabs.Panel>

        <Tabs.Panel value="style" className="ps-guide-body">
          <GuideIntro title="Pick a look" detail="Each style is complete. Fine-tune it later under Customise." />
          <div className="ps-styles" role="radiogroup" aria-label="Style">
            {STYLES.map((style) => (
              <button
                key={style.name}
                type="button"
                role="radio"
                aria-checked={film.style === style.name}
                className="ps-style"
                data-active={film.style === style.name || undefined}
                onClick={() => onStyle(style.name)}
              >
                <span className="ps-style-swatch" style={{ background: style.background, color: style.look.colors.at(-1) }} aria-hidden="true">
                  {style.look.dot === "ascii" ? style.look.characters.slice(-4) : style.look.dot === "square" ? "■ ■ ■" : "● ● ●"}
                </span>
                <span className="ps-style-copy">
                  <b>{style.name}</b>
                  <span>{style.description}</span>
                </span>
                {film.style === style.name && <HugeiconsIcon icon={CheckIcon} className="ps-style-check" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div className="ps-guide-field">
            <span className="ps-label">Format</span>
            <ToggleGroup
              className="ps-segmented"
              value={[format]}
              onValueChange={(value) => {
                const size = CANVAS_SIZES.find((s) => s.name === value[0]);
                if (size) onFormat({ width: size.width, height: size.height });
              }}
            >
              {CANVAS_SIZES.map((size) => (
                <Toggle key={size.name} value={size.name} className="ps-segment">
                  {size.name}
                </Toggle>
              ))}
            </ToggleGroup>
          </div>
          <NextButton onClick={() => onStep("export")}>Take it away</NextButton>
        </Tabs.Panel>

        <Tabs.Panel value="export" className="ps-guide-body">
          <GuideIntro title="Take it away" detail="Everything comes from the same intro, so it all matches." />
          <ExportCard title="Website hero" detail="A React component that plays this intro, built on Remold.">
            <button type="button" className="ps-button ps-primary" onClick={actions.copyReact}>
              Copy React component
            </button>
          </ExportCard>
          <ExportCard title="Launch clip" detail={`One loop as a video, ${(total / 1000).toFixed(1)}s at ${film.canvas.width} × ${film.canvas.height}. Change the format under Style.`}>
            <button type="button" className="ps-button ps-quiet ps-outlined" disabled={actions.recording} onClick={actions.record}>
              {actions.recording ? "Recording…" : "Record video"}
            </button>
            <button type="button" className="ps-button ps-quiet" onClick={actions.savePNG}>
              Save this frame
            </button>
          </ExportCard>
          <ExportCard title="README banner" detail="Your name in ASCII, as text for a code block.">
            {banner ? <pre className="ps-banner">{banner}</pre> : <p className="ps-hint">Add a name to make a banner.</p>}
            <button type="button" className="ps-button ps-quiet ps-outlined" disabled={!banner} onClick={() => actions.copyBanner(banner)}>
              Copy banner
            </button>
          </ExportCard>
          <ExportCard title="CLI splash" detail="The banner as a line of JavaScript to print when your CLI starts.">
            <button type="button" className="ps-button ps-quiet ps-outlined" disabled={!banner} onClick={() => actions.copySplash(banner)}>
              Copy console.log
            </button>
          </ExportCard>
        </Tabs.Panel>
      </Tabs.Root>
    </aside>
  );
}

function GuideIntro({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="ps-guide-intro">
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  );
}

function NextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="ps-button ps-primary ps-next" onClick={onClick}>
      {children}
      <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
    </button>
  );
}

function ExportCard({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="ps-export">
      <h3>{title}</h3>
      <p>{detail}</p>
      <div className="ps-export-actions">{children}</div>
    </section>
  );
}
