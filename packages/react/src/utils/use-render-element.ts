import {
  cloneElement,
  createElement,
  isValidElement,
  useMemo,
  type HTMLAttributes,
  type JSX,
  type ReactElement,
  type Ref,
  type RefCallback,
} from "react";

export type HTMLProps<E extends Element = HTMLElement> = HTMLAttributes<E> & { ref?: Ref<E> };

type IntrinsicElementName = keyof JSX.IntrinsicElements;

type ElementFromTag<Tag extends IntrinsicElementName> = Tag extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[Tag]
  : Tag extends keyof SVGElementTagNameMap
    ? SVGElementTagNameMap[Tag]
    : Element;

export type RenderProp<State, E extends Element = HTMLElement> =
  | ReactElement<Record<string, unknown>>
  | ((props: HTMLProps<E>, state: State) => ReactElement);

export interface BaseProps<State, E extends Element = HTMLElement> {
  /** Replace the default element, keeping Remold's props and ref. */
  render?: RenderProp<State, E>;
  /** A class name, or a function that returns one from the part's state. */
  className?: string | ((state: State) => string | undefined);
}

export function mergeRefs<T>(refs: readonly (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

interface RenderElementOptions<State, E extends Element> {
  state: State;
  refs: readonly (Ref<E> | undefined)[];
  props: HTMLAttributes<E> & Record<string, unknown>;
  dataAttributes?: Record<string, string | undefined>;
}

export function useRenderElement<State, Tag extends IntrinsicElementName>(
  tag: Tag,
  { render, className }: BaseProps<State, ElementFromTag<Tag>>,
  { state, refs, props, dataAttributes = {} }: RenderElementOptions<State, ElementFromTag<Tag>>,
): ReactElement {
  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are supplied as a dynamic list.
  const mergedRef = useMemo(() => mergeRefs(refs), refs);
  const dataProps = Object.fromEntries(Object.entries(dataAttributes).filter(([, value]) => value !== undefined));
  const resolvedClassName = typeof className === "function" ? className(state) : className;

  const elementProps = {
    ...dataProps,
    ...props,
    ...(resolvedClassName === undefined ? {} : { className: resolvedClassName }),
    ref: mergedRef,
  } as HTMLProps<ElementFromTag<Tag>>;

  if (typeof render === "function") return render(elementProps, state);

  if (!isValidElement(render)) return createElement(tag, elementProps);

  const renderedProps = render.props;
  // React 19 keeps an element's ref in props; React 18 stores it on the element.
  const renderedRef = (renderedProps.ref ?? (render as unknown as { ref?: Ref<ElementFromTag<Tag>> }).ref) as
    | Ref<ElementFromTag<Tag>>
    | undefined;
  const combinedClassName = [elementProps.className, renderedProps.className].filter(Boolean).join(" ") || undefined;

  return cloneElement(render, {
    ...elementProps,
    ...renderedProps,
    className: combinedClassName,
    ref: mergeRefs([mergedRef, renderedRef]),
  });
}
