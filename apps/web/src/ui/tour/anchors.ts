export function tourAnchor(name: string) {
  return { "data-tour": name } as const;
}

function isRendered(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

export function findAnchor(
  name: string,
  root: ParentNode = document,
  rendered: (element: HTMLElement) => boolean = isRendered,
): HTMLElement | null {
  const matches = root.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const element of matches) {
    if (rendered(element)) {
      return element;
    }
  }
  return null;
}
