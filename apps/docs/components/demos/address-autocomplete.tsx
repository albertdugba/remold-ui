"use client";
/**
 * An address field that fills in the form for you. Start typing and matching addresses are offered.
 * Pick one and it rests in the box for a beat, then splits: the street stays where it is as the box
 * becomes the street field, the area and city glide down out of the line into a field of their own,
 * the new fields unfold from behind it one after the other, and the postcode fades in last. Search
 * again and they fold back up into one box.
 *
 * Built on Base UI's Autocomplete and Field. Motion does the movement: the box and each part of the
 * address keep a layout id from the line to their field.
 */
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Field } from "@base-ui/react/field";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePortalContainer } from "./portal-container";
import { useScene } from "./use-scene";
import "./form-kit.css";
import "./address-autocomplete.css";

export interface Address {
  street: string;
  area: string;
  postcode: string;
}

const ADDRESSES: Address[] = [
  { street: "12 Oxford Street", area: "Osu, Accra", postcode: "GA-123-4567" },
  { street: "4 Liberation Road", area: "Airport City, Accra", postcode: "GL-016-2210" },
  { street: "27 Cantonments Road", area: "Cantonments, Accra", postcode: "GA-084-1135" },
  { street: "18 Ring Road East", area: "Labone, Accra", postcode: "GA-079-0042" },
  { street: "9 Asafoatse Nettey Road", area: "Jamestown, Accra", postcode: "GA-001-6633" },
];

const line = (a: Address) => `${a.street}, ${a.area}`;

/** The box becoming the street field, and the words travelling to their fields. */
const MOVE = { type: "spring" as const, duration: 0.6, bounce: 0.1 };
/** The new fields unfolding, one after the other. */
const UNFOLD = { type: "spring" as const, duration: 0.55, bounce: 0.12 };
/** How long a picked line rests in the box before it splits. */
const REST_MS = 260;
/** How long the travelling words are drawn over the fields before the fields show their own text. */
const SETTLE_MS = 700;

/** A part of the address, drawn over a field while it travels into it. */
function Words({ id, children }: { id: string; children: ReactNode }) {
  return (
    <motion.span layoutId={`adr-${id}`} className="adr-words" transition={MOVE}>
      {children}
    </motion.span>
  );
}

export interface AddressAutocompleteProps {
  query: string;
  onQueryChange: (query: string) => void;
  address: Address | null;
  onAddressChange: (address: Address | null) => void;
}

export function AddressAutocomplete({ query, onQueryChange, address, onAddressChange }: AddressAutocompleteProps) {
  const portal = usePortalContainer();
  const edit = (part: keyof Address, value: string) => address && onAddressChange({ ...address, [part]: value });

  // A chosen line, drawn as its parts so each can travel to its field.
  const chosen = address ? null : ADDRESSES.find((a) => line(a) === query) ?? null;

  // A pick rests in the box for a beat before it splits.
  const rest = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(rest.current), []);

  // While the words are travelling, the fields' own text waits underneath.
  const [settling, setSettling] = useState(false);
  const [had, setHad] = useState(address !== null);
  if (had !== (address !== null)) {
    setHad(address !== null);
    if (address) setSettling(true);
  }
  useEffect(() => {
    if (!settling) return;
    const t = setTimeout(() => setSettling(false), SETTLE_MS);
    return () => clearTimeout(t);
  }, [settling]);

  return (
    <div className="fk adr">
      <LayoutGroup>
        <div className="adr-body">
          <AnimatePresence initial={false} mode="popLayout">
            {address ? (
              <motion.div key="form" className="adr-form" data-settling={settling || undefined}>
                <Field.Root className="adr-field">
                  <Field.Label className="fk-label">Street</Field.Label>
                  <motion.div layoutId="adr-box" className="fk-box" transition={MOVE}>
                    <span className="adr-slot">
                      <Field.Control className="fk-input" value={address.street} onChange={(e) => edit("street", e.target.value)} />
                      {settling && <Words id="street">{address.street}</Words>}
                    </span>
                  </motion.div>
                </Field.Root>

                <div className="adr-row">
                  {(
                    [
                      { part: "area", label: "Area and city", delay: 0.06 },
                      { part: "postcode", label: "Postcode", delay: 0.12 },
                    ] as const
                  ).map(({ part, label, delay }) => (
                    <Field.Root key={part} className="adr-field">
                      <motion.span
                        className="adr-label"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.25, delay: delay + 0.15 }}
                      >
                        <Field.Label className="fk-label">{label}</Field.Label>
                      </motion.span>
                      {/* Unfolds from behind the street field, a moment after the one before it. */}
                      <motion.div
                        className="fk-box"
                        initial={{ opacity: 0, y: -46, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -46, scale: 0.97, transition: { duration: 0.22 } }}
                        transition={{ ...UNFOLD, delay }}
                      >
                        <span className="adr-slot">
                          <Field.Control className="fk-input" value={address[part]} onChange={(e) => edit(part, e.target.value)} />
                          {settling &&
                            (part === "area" ? (
                              <Words id="area">{address.area}</Words>
                            ) : (
                              <motion.span
                                className="adr-words"
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.28 }}
                              >
                                {address.postcode}
                              </motion.span>
                            ))}
                        </span>
                      </motion.div>
                    </Field.Root>
                  ))}
                </div>

                <motion.button
                  type="button"
                  className="fk-btn adr-again"
                  data-variant="ghost"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.25, delay: 0.3 }}
                  onClick={() => {
                    onAddressChange(null);
                    onQueryChange("");
                  }}
                >
                  <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                  Search again
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="search" className="adr-search">
                <Autocomplete.Root
                  items={ADDRESSES}
                  value={query}
                  onValueChange={(next, details) => {
                    onQueryChange(next);
                    // Choosing a suggestion (by pointer or keyboard) fills in the form, after a beat.
                    const picked = ADDRESSES.find((a) => line(a) === next);
                    clearTimeout(rest.current);
                    if (picked && details.reason === "item-press") rest.current = setTimeout(() => onAddressChange(picked), REST_MS);
                  }}
                  itemToStringValue={(a) => line(a as Address)}
                >
                  <label className="fk-label" htmlFor="adr-search">
                    Delivery address
                  </label>
                  <Autocomplete.InputGroup
                    className="fk-box"
                    data-chosen={chosen ? "" : undefined}
                    render={<motion.div layoutId="adr-box" transition={MOVE} />}
                  >
                    <HugeiconsIcon icon={Location01Icon} strokeWidth={1.8} className="adr-icon" />
                    <span className="adr-slot">
                      <Autocomplete.Input id="adr-search" className="fk-input" placeholder="Start typing your street" autoComplete="off" />
                      {chosen && (
                        <span className="adr-words adr-line" aria-hidden="true">
                          <Words id="street">{chosen.street}</Words>
                          <span>,&nbsp;</span>
                          <Words id="area">{chosen.area}</Words>
                        </span>
                      )}
                    </span>
                  </Autocomplete.InputGroup>
                  <motion.p className="fk-description" exit={{ opacity: 0, transition: { duration: 0.1 } }}>
                    Pick yours from the list and we’ll fill in the rest.
                  </motion.p>
                  <Autocomplete.Portal container={portal}>
                    <Autocomplete.Positioner sideOffset={6} align="start">
                      <Autocomplete.Popup className="fk-popup adr-popup">
                        <Autocomplete.Empty className="fk-empty">No addresses match</Autocomplete.Empty>
                        <Autocomplete.List>
                          {(a: Address) => (
                            <Autocomplete.Item key={a.postcode} value={a} className="fk-option adr-option">
                              <HugeiconsIcon icon={Location01Icon} strokeWidth={1.8} />
                              <span className="adr-option-copy">
                                <b>{a.street}</b>
                                <span>{a.area}</span>
                              </span>
                            </Autocomplete.Item>
                          )}
                        </Autocomplete.List>
                      </Autocomplete.Popup>
                    </Autocomplete.Positioner>
                  </Autocomplete.Portal>
                </Autocomplete.Root>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </div>
  );
}

interface State {
  query: string;
  address: Address | null;
}

const BEATS: readonly (State & { ms: number })[] = [
  { query: "", address: null, ms: 900 },
  { query: "12 Ox", address: null, ms: 1000 },
  { query: line(ADDRESSES[0]!), address: null, ms: 650 },
  { query: line(ADDRESSES[0]!), address: ADDRESSES[0]!, ms: 3200 },
];

const fromBeat = (step: number): State => {
  const { ms: _, ...state } = BEATS[step]!;
  return state;
};

interface AddressAutocompleteDemoProps {
  /** Plays and pauses the scene from outside, as the home page's card does. Leave it out to play until touched. */
  playing?: boolean;
}

export function AddressAutocompleteDemo({ playing }: AddressAutocompleteDemoProps = {}) {
  const { ref, state, take } = useScene(BEATS, fromBeat, playing);
  return (
    <div ref={ref} className="fk-stage not-prose">
      <AddressAutocomplete
        query={state.query}
        onQueryChange={(query) => take((s) => ({ ...s, query }))}
        address={state.address}
        onAddressChange={(address) => take((s) => ({ ...s, address }))}
      />
    </div>
  );
}
