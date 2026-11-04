"use client";
/**
 * A tag field where the words you type become the tags. Type a word and press comma or Enter, and
 * the chip forms around the text right where you typed it: the text doesn't jump, the chip's fill
 * and its remove button grow in around it. Existing tags are offered as you type, and Backspace in
 * an empty field takes the last tag back off.
 *
 * Built on Base UI's Combobox in multiple mode, with its Chips; Motion grows each new chip.
 */
import { Combobox } from "@base-ui/react/combobox";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { usePortalContainer } from "./portal-container";
import { typing, useScene } from "./use-scene";
import "./form-kit.css";
import "./tag-input.css";

const SUGGESTIONS = ["design", "research", "frontend", "backend", "marketing", "urgent", "onboarding", "q4"];

const FORM = { type: "spring" as const, duration: 0.4, bounce: 0.18 };

export interface TagInputProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  label?: string;
}

export function TagInput({ value, onValueChange, inputValue, onInputValueChange, label = "Tags" }: TagInputProps) {
  const id = useId();
  const portal = usePortalContainer();
  const typed = inputValue.trim().toLowerCase();
  // Offer what matches, and the typed word itself when it's new.
  const items = [...new Set([...(typed && !SUGGESTIONS.includes(typed) && !value.includes(typed) ? [typed] : []), ...SUGGESTIONS])];

  /** A comma ends a tag, however it arrived: typed, pasted or dictated. "a, b, c" adds three. */
  const type = (next: string) => {
    if (!next.includes(",")) return onInputValueChange(next);
    const parts = next.split(",");
    const rest = parts.pop() ?? "";
    const added = parts.map((p) => p.trim().toLowerCase()).filter((p) => p && !value.includes(p));
    if (added.length) onValueChange([...value, ...new Set(added)]);
    onInputValueChange(rest.trimStart());
  };

  return (
    <div className="fk tag">
      <label htmlFor={id} className="fk-label">
        {label}
      </label>
      <Combobox.Root
        items={items}
        multiple
        autoHighlight
        value={value}
        onValueChange={(next) => onValueChange(next as string[])}
        inputValue={inputValue}
        onInputValueChange={type}
      >
        <Combobox.InputGroup className="fk-box tag-box">
          <Combobox.Chips className="tag-chips" aria-label={value.length ? "Tags" : undefined}>
            <AnimatePresence initial={false} mode="popLayout">
              {value.map((tag) => (
                <Combobox.Chip
                  key={tag}
                  className="fk-chip tag-chip"
                  aria-label={tag}
                  aria-description="Press Backspace or Delete to remove"
                  render={
                    <motion.span
                      layout="position"
                      // The chip forms around the text where it was typed: no padding, no fill, then both grow in.
                      initial={{ paddingLeft: 0, ["--tag-fill" as string]: 0 }}
                      animate={{ paddingLeft: 10, ["--tag-fill" as string]: 1 }}
                      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                      transition={FORM}
                    />
                  }
                >
                  <span className="tag-hash">#</span>
                  {tag}
                  <Combobox.ChipRemove aria-label={`Remove ${tag}`}>
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.2} />
                  </Combobox.ChipRemove>
                </Combobox.Chip>
              ))}
            </AnimatePresence>
            <Combobox.Input
              id={id}
              className="fk-input tag-input"
              placeholder={value.length ? "" : "Add a tag…"}
            />
          </Combobox.Chips>
        </Combobox.InputGroup>

        <Combobox.Portal container={portal}>
          <Combobox.Positioner sideOffset={6} align="start">
            <Combobox.Popup className="fk-popup tag-popup">
              <Combobox.Empty className="fk-empty">No tags match</Combobox.Empty>
              <Combobox.List>
                {(item: string) => (
                  <Combobox.Item key={item} value={item} className="fk-option">
                    <span className="tag-hash">#</span>
                    {item}
                    {!SUGGESTIONS.includes(item) && <span className="fk-option-note">New tag</span>}
                    <Combobox.ItemIndicator className="tag-check">
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.4} />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <p className="fk-description">Comma or Enter adds a tag. Backspace removes the last one.</p>
    </div>
  );
}

interface State {
  tags: string[];
  draft: string;
}

const BEATS: readonly (State & { ms: number })[] = [
  { tags: ["design"], draft: "", ms: 1000 },
  ...typing("research", (draft) => ({ tags: ["design"], draft }), { every: 75 }),
  { tags: ["design", "research"], draft: "", ms: 900 },
  ...typing("launch", (draft) => ({ tags: ["design", "research"], draft }), { every: 75 }),
  { tags: ["design", "research", "launch"], draft: "", ms: 2400 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface TagInputDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function TagInputDemo({ playing }: TagInputDemoProps = {}) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className="fk-stage not-prose">
      <TagInput
        value={state.tags}
        onValueChange={(tags) => take((current) => ({ ...current, tags }))}
        inputValue={state.draft}
        onInputValueChange={(draft) => take((current) => ({ ...current, draft }))}
      />
    </div>
  );
}
