const ALLOWED_TAGS = new Set(["P", "STRONG", "EM", "BR"]);

/**
 * Keeps only <p>, <strong>, <em>, <br> structure; unwraps everything else.
 */
export function sanitizeBioHtml(input: string): string {
  if (!input?.trim()) return "";

  const parser = new DOMParser();
  const parsed = parser.parseFromString(input, "text/html");

  function clean(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? "");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = node as HTMLElement;
    if (!ALLOWED_TAGS.has(element.tagName)) {
      const fragment = document.createDocumentFragment();
      for (const child of Array.from(element.childNodes)) {
        const cleanedChild = clean(child);
        if (cleanedChild) fragment.appendChild(cleanedChild);
      }
      return fragment;
    }

    const cleanElement = document.createElement(element.tagName.toLowerCase());
    for (const child of Array.from(element.childNodes)) {
      const cleanedChild = clean(child);
      if (cleanedChild) cleanElement.appendChild(cleanedChild);
    }
    return cleanElement;
  }

  const output = document.createElement("div");
  for (const child of Array.from(parsed.body.childNodes)) {
    const cleanedChild = clean(child);
    if (cleanedChild) output.appendChild(cleanedChild);
  }
  return output.innerHTML;
}
