/**
 * Browser-side preview script: attaches expand buttons to Mermaid diagrams.
 * Runs inside the VS Code markdown preview webview iframe.
 *
 * Constraints:
 *  - acquireVsCodeApi() is permanently blocked in preview scripts (VS Code #122961).
 *    All interactivity must be self-contained.
 *  - position:fixed resolves to the webview iframe viewport (not the OS screen).
 *  - The Fullscreen API (requestFullscreen) is blocked in VS Code webviews.
 */

// Module-level WeakSet survives all vscode.markdown.updateContent re-render events.
// Tracks which .mermaid elements already have a MutationObserver attached, preventing
// duplicate observers across updateContent cycles.
const observedSet = new WeakSet<Element>();

// Single active keydown handler reference for cleanup on overlay close.
let activeCloseHandler: ((e: KeyboardEvent) => void) | null = null;

/** Scan the document for .mermaid containers and set up observers on new ones. */
function scanAndObserve(): void {
  document.querySelectorAll<Element>(".mermaid").forEach(observeMermaidContainer);
}

/**
 * Attach a MutationObserver to a .mermaid container to watch for async SVG insertion.
 * The observer is kept alive after SVG is found so it can re-fire after morphdom re-renders
 * clear and re-insert the SVG on subsequent updateContent events.
 */
function observeMermaidContainer(el: Element): void {
  if (observedSet.has(el)) return; // Observer already attached to this element reference.
  observedSet.add(el);

  // Mermaid may have already rendered synchronously (e.g. cached).
  if (el.querySelector("svg")) {
    attachExpandButton(el);
  }

  // Watch for async SVG insertion. Do NOT disconnect after first fire:
  // morphdom may clear and reinsert the SVG on re-renders, and the observer
  // must fire again to re-attach the button if morphdom removed it.
  const observer = new MutationObserver(() => {
    if (el.querySelector("svg")) {
      attachExpandButton(el);
    }
  });
  observer.observe(el, { childList: true, subtree: true });
}

/**
 * Attach the expand button to a .mermaid container.
 *
 * Guards:
 *  1. Bierner conflict (REQ-WID-008): bierner.markdown-mermaid adds .mermaid-zoom-button;
 *     if found, skip to avoid duplicate controls on the same diagram.
 *  2. Own dedup: if our button is already present (morphdom preserved it), skip.
 */
function attachExpandButton(container: Element): void {
  if (container.querySelector(".mermaid-zoom-button") !== null) return;
  if (container.querySelector(".mermaid-expand-btn") !== null) return;

  const btn = document.createElement("button");
  btn.className = "mermaid-expand-btn";
  btn.setAttribute("aria-label", "Expand diagram");
  btn.setAttribute("title", "Expand diagram");
  btn.setAttribute("type", "button");
  btn.textContent = "⤢";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const svg = container.querySelector("svg");
    if (svg) openOverlay(svg as SVGElement);
  });

  container.appendChild(btn);
}

/**
 * Open the fullscreen overlay containing a clone of the given SVG.
 * The overlay is appended to document.body — morphdom re-renders only update
 * .mermaid container content, so the overlay survives re-renders (REQ-WID-007).
 */
function openOverlay(svg: SVGElement): void {
  closeOverlay(); // Dismiss any previously open overlay.

  const overlay = document.createElement("div");
  overlay.className = "mermaid-overlay";

  // Clone the SVG so the original in the document is unaffected (REQ-WID-005).
  const clone = svg.cloneNode(true) as SVGElement;
  clone.removeAttribute("width");
  clone.removeAttribute("height");
  clone.style.maxWidth = "100%";
  clone.style.maxHeight = "100%";

  overlay.appendChild(clone);
  document.body.appendChild(overlay);

  // REQ-WID-006: dismiss on Escape key.
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closeOverlay();
  };
  activeCloseHandler = onKeyDown;
  document.addEventListener("keydown", onKeyDown);

  // REQ-WID-006: dismiss on click outside the SVG (on the overlay backdrop).
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });
}

/** Remove the active overlay and clean up its event listeners. */
function closeOverlay(): void {
  const existing = document.querySelector(".mermaid-overlay");
  if (existing) existing.remove();
  if (activeCloseHandler) {
    document.removeEventListener("keydown", activeCloseHandler);
    activeCloseHandler = null;
  }
}

// Initial scan — handle both early and late script execution.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scanAndObserve);
} else {
  scanAndObserve();
}

// Re-scan after each morphdom re-render. This event fires after morphdom finishes
// but before async Mermaid rendering, so new/updated .mermaid elements are in the DOM
// but their SVGs have not yet been inserted. The MutationObserver handles the delay.
window.addEventListener("vscode.markdown.updateContent", scanAndObserve);
