/**
 * Scene params travel as attributes on <zen-foil>, so their names share a
 * namespace with the element itself:
 *
 * - A param can't reuse an attribute the element keeps for itself (`title`,
 *   `id`, `aria-*`…): the element would never pass it to the scene.
 * - A param can't reuse a member of the element either. React 19, Vue,
 *   Svelte and Preact set a prop as a property, not an attribute, whenever
 *   the element already has a member by that name, so `scroll="1"` would
 *   overwrite `element.scroll` and never reach the scene.
 */

/** Attributes that configure the element itself rather than the scene. */
export const ELEMENT_ATTRIBUTES: ReadonlySet<string> = new Set([
  "scene",
  "accent",
  "theme",
  "seed",
  "fixed",
  "class",
  "style",
  "id",
  "slot",
  "part",
  "role",
  "hidden",
  "tabindex",
  "title",
  "lang",
  "dir",
  "draggable",
  "inert",
  "is",
  "nonce",
  "popover",
  "contenteditable",
  "max-dpr",
]);

export const isElementAttribute = (name: string) =>
  ELEMENT_ATTRIBUTES.has(name) || name.startsWith("aria-") || name.startsWith("data-") || name.startsWith("on");

/* All-lowercase members of a <zen-foil> element: HTMLElement and its
   prototypes in current browsers, plus the element's own API. (Camel-case
   members can't clash: HTML lowercases attribute names.) */
const ELEMENT_MEMBERS: ReadonlySet<string> = new Set(
  (
    "after animate append attributes autocapitalize autocorrect autofocus before blur children click closest " +
    "constructor contains dataset dir draggable focus hidden id inert lang matches nonce normalize part popover " +
    "prefix prepend remove role scroll slot spellcheck style title translate when writingsuggestions " +
    "capture params renderer scene update"
  ).split(" "),
);

/** Why `name` can't be a scene param, or null when it can. */
export function paramNameProblem(name: string): string | null {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) return "param names are lowercase letters, digits and hyphens (they are HTML attributes)";
  if (isElementAttribute(name)) return `"${name}" is an attribute of the <zen-foil> element itself, so the scene would never see it`;
  if (ELEMENT_MEMBERS.has(name)) return `"${name}" is a property of the element, so React 19, Vue and Svelte would set the property instead of the attribute`;
  return null;
}
