export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function normalizeLayoutBox(box: LayoutBox, container: LayoutBox): LayoutBox {
  const unit = container.width || 1;

  return {
    x: (box.x - container.x) / unit,
    y: (box.y - container.y) / unit,
    width: box.width / unit,
    height: box.height / unit,
  };
}

export function measureLayoutBox(element: Element, container: Element): LayoutBox {
  return normalizeLayoutBox(readLayoutBox(element), readLayoutBox(container));
}

function readLayoutBox(element: Element): LayoutBox {
  const { left, top, width, height } = element.getBoundingClientRect();

  return { x: left, y: top, width, height };
}
