const INTERACTIVE_TARGET_SELECTOR =
  'button, input, textarea, select, a, [role="button"], [data-no-section-activate="true"], [contenteditable="true"]';

export function shouldIgnoreSectionActivationClick(
  target: EventTarget | null,
  currentTarget: EventTarget | null
): boolean {
  if (!(target instanceof Element)) return false;
  if (!(currentTarget instanceof Element)) return false;
  const interactiveAncestor = target.closest(INTERACTIVE_TARGET_SELECTOR);
  return Boolean(interactiveAncestor && interactiveAncestor !== currentTarget);
}

export function pickDefaultSectionItemId<T extends { id: string }>(
  items: T[],
  isIncomplete: (item: T) => boolean
): string | null {
  if (items.length === 0) return null;
  const firstIncomplete = items.find((item) => isIncomplete(item));
  return (firstIncomplete ?? items[0]).id;
}
