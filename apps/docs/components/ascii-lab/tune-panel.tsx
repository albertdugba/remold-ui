"use client";
/** The lab's fine controls: cell size and characters for every subject, tone for images and cameras. */
import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import { DEFAULT_RAMP } from "@remold-ui/ascii";

export interface Tuning {
  cellSize: number;
  ramp: string;
  contrast: number;
  brightness: number;
  mirror: boolean;
}

export const DEFAULT_TUNING: Tuning = { cellSize: 11, ramp: DEFAULT_RAMP, contrast: 1.2, brightness: 0, mirror: true };

const RAMPS = [
  { label: "Classic", ramp: DEFAULT_RAMP },
  { label: "Dense", ramp: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$" },
  { label: "Shades", ramp: "░▒▓█" },
  { label: "Stars", ramp: "·∙•*✦✶✷✸" },
] as const;

function Range({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (value: number) => string; onChange: (value: number) => void }) {
  return (
    <Slider.Root className="al-range" value={value} min={min} max={max} step={step} onValueChange={(next) => onChange(Array.isArray(next) ? (next[0] ?? value) : next)}>
      <div className="al-range-head">
        <Slider.Label className="al-range-label">{label}</Slider.Label>
        <span className="al-range-value">{format(value)}</span>
      </div>
      <Slider.Control className="al-range-control">
        <Slider.Track className="al-range-track">
          <Slider.Indicator className="al-range-fill" />
          <Slider.Thumb className="al-range-thumb" aria-label={label} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

/** `style` carries the stage's colours, since the popup renders outside it. */
export function TunePanel({ tuning, onChange, media, style }: { tuning: Tuning; onChange: (tuning: Tuning) => void; media: boolean; style: React.CSSProperties }) {
  const set = (patch: Partial<Tuning>) => onChange({ ...tuning, ...patch });

  return (
    <Popover.Root>
      <Popover.Trigger className="al-button al-quiet">Tune</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={10} className="al-positioner">
          <Popover.Popup className="al-tune" style={style}>
            <Range label="Cell size" value={tuning.cellSize} min={6} max={24} step={1} format={(value) => `${value}px`} onChange={(cellSize) => set({ cellSize })} />

            {media && (
              <>
                <Range label="Contrast" value={tuning.contrast} min={0.5} max={3} step={0.05} format={(value) => value.toFixed(2)} onChange={(contrast) => set({ contrast })} />
                <Range label="Brightness" value={tuning.brightness} min={-0.5} max={0.5} step={0.01} format={(value) => (value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2))} onChange={(brightness) => set({ brightness })} />
                <label className="al-check">
                  <input type="checkbox" checked={tuning.mirror} onChange={(event) => set({ mirror: event.target.checked })} />
                  Mirror
                </label>
              </>
            )}

            <div className="al-field">
              <span className="al-range-label">Characters, faint to dense</span>
              <input className="al-text" value={tuning.ramp} spellCheck={false} onChange={(event) => event.target.value && set({ ramp: event.target.value })} aria-label="Characters, faint to dense" />
              <div className="al-chips">
                {RAMPS.map((option) => (
                  <button key={option.label} type="button" className="al-chip" data-active={tuning.ramp === option.ramp || undefined} onClick={() => set({ ramp: option.ramp })}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
