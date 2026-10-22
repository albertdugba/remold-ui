/**
 * The render contract every part shares (as in Base UI):
 *
 * - `render`: replace the default element. Pass an element to merge props into, or a function
 *   `(props, state) => element` for full control.
 * - `className`: a string, or a function of the part's state.
 * - State is also written as `data-rm-*` attributes, so plain CSS can style it.
 */
import {
  cloneElement,
  createElement,
  isValidElement,
  useMemo,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
  type RefCallback,
} from "react";

export type HTMLProps<E extends Element = HTMLElement> = HTMLAttributes<E> & { ref?: Ref<E> };

export type RenderProp<State, E extends Element = HTMLElement> =
  | ReactElement<Record<string, unknown>>
  | ((props: HTMLProps<E>, state: State) => ReactElement);

export interface BaseProps<State, E extends Element = HTMLElement> {
  /** Replace the default element, keeping Remold's props and ref. */
  render?: RenderProp<State, E>;
  /** A class name, or a function that returns one from the part's state. */
  className?: string | ((state: State) => string | undefined);
}

/** One ref callback that feeds several refs. */
export function mergeRefs<T>(refs: readonly (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

interface Options<State, E extends Element> {
  state: State;
  /** Refs to attach to the rendered element. */
  refs: readonly (Ref<E> | undefined)[];
  /** The part's own props for the element (already stripped of part-only props). */
  props: HTMLAttributes<E> & Record<string, unknown>;
  /** State written as data attributes: `{ "data-rm-animating": "" }` or undefined to omit. */
  dataAttributes?: Record<string, string | undefined>;
}

export function useRenderElement<State, E extends Element = HTMLElement>(
  tag: string,
  { render, className }: BaseProps<State, E>,
  { state, refs, props, dataAttributes = {} }: Options<State, E>,
): ReactElement {
  // Refs are stable in practice; merging once per change avoids re-attaching every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ref = useMemo(() => mergeRefs(refs), refs);
  const attributes = Object.fromEntries(Object.entries(dataAttributes).filter(([, v]) => v !== undefined));
  const resolvedClassName = typeof className === "function" ? className(state) : className;
  const merged = {
    ...attributes,
    ...props,
    ...(resolvedClassName === undefined ? {} : { className: resolvedClassName }),
    ref,
  } as HTMLProps<E>;

  if (typeof render === "function") return render(merged, state);
  if (isValidElement(render)) {
    const own = render.props;
    // React 19 keeps an element's ref in its props; React 18 kept it on the element.
    const theirs = (own.ref ?? (render as unknown as { ref?: Ref<E> }).ref) as Ref<E> | undefined;
    const classes = [merged.className, own.className].filter(Boolean).join(" ") || undefined;
    return cloneElement(render, { ...merged, ...own, className: classes, ref: mergeRefs([ref, theirs]) });
  }
  return createElement(tag, merged);
}
