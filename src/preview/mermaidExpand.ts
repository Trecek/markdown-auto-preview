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

// ── Zoom state ────────────────────────────────────────────────────────────────

interface ZoomState { scale: number; tx: number; ty: number; }

const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
// Log-scale step: Math.exp(LOG_ZOOM_STEP) ≈ 1.051× per rAF frame.
const LOG_ZOOM_STEP = 0.05;

// Per-diagram zoom state. Keyed by the .mermaid container element, which is
// stable across morphdom re-renders (morphdom patches SVG children, not
// the container itself). Satisfies REQ-ZOOM-006 and REQ-ZOOM-008.
const zoomStateMap = new Map<Element, ZoomState>();

// rAF accumulation state — one entry per container with an in-flight rAF.
const pendingDeltaMap = new Map<Element, number>();
const pendingCursorMap = new Map<Element, { clientX: number; clientY: number }>();
const pendingRafMap = new Map<Element, number>();

// ── Scan + observe ────────────────────────────────────────────────────────────

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
  if (observedSet.has(el)) { return; } // Observer already attached to this element reference.
  observedSet.add(el);

  // Mermaid may have already rendered synchronously (e.g. cached).
  if (el.querySelector("svg")) {
    attachExpandButton(el);
    attachZoom(el);              // attach wheel-based zoom
    attachZoomResetButton(el);   // inject reset button
    reapplyZoom(el);             // re-apply any saved zoom to the initial SVG
  }

  // Watch for async SVG insertion. Do NOT disconnect after first fire:
  // morphdom may clear and reinsert the SVG on re-renders, and the observer
  // must fire again to re-attach the button if morphdom removed it.
  const observer = new MutationObserver(() => {
    if (el.querySelector("svg")) {
      attachExpandButton(el);
      attachZoomResetButton(el); // re-attach if morphdom removed it
      reapplyZoom(el);           // re-apply saved zoom to replaced SVG
      // attachZoom is NOT called here: the wheel listener is bound to the stable
      // container element and data-zoom-attached prevents re-registration.
    }
  });
  observer.observe(el, { childList: true, subtree: true });
}

// ── Expand button ─────────────────────────────────────────────────────────────

/**
 * Attach the expand button to a .mermaid container.
 *
 * Guards:
 *  1. Bierner conflict (REQ-WID-008): bierner.markdown-mermaid adds .mermaid-zoom-button;
 *     if found, skip to avoid duplicate controls on the same diagram.
 *  2. Own dedup: if our button is already present (morphdom preserved it), skip.
 */
function attachExpandButton(container: Element): void {
  if (container.querySelector(".mermaid-zoom-button") !== null) { return; }
  if (container.querySelector(".mermaid-expand-btn") !== null) { return; }

  const btn = document.createElement("button");
  btn.className = "mermaid-expand-btn";
  btn.setAttribute("aria-label", "Expand diagram");
  btn.setAttribute("title", "Expand diagram");
  btn.setAttribute("type", "button");
  btn.textContent = "⤢";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const svg = container.querySelector("svg");
    if (svg) { openOverlay(svg as SVGElement); }
  });

  container.appendChild(btn);
}

// ── Zoom helpers ──────────────────────────────────────────────────────────────

/** Apply the given zoom state to the SVG element inside container. */
function applyZoom(container: Element, state: ZoomState): void {
  const svg = container.querySelector<SVGElement>("svg");
  if (!svg) { return; }
  svg.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
  svg.style.transformOrigin = "0 0";
  // Clear mermaid's inline max-width constraint (mermaid-js#5038) which would
  // clip the SVG when scaled beyond its natural width.
  svg.style.maxWidth = "";
  const isZoomed = state.scale !== 1 || state.tx !== 0 || state.ty !== 0;
  (container as HTMLElement).style.overflow = isZoomed ? "hidden" : "";
}

/**
 * Re-apply saved zoom state after morphdom replaces the SVG element.
 * Called from the MutationObserver callback on every SVG re-insertion.
 */
function reapplyZoom(container: Element): void {
  const state = zoomStateMap.get(container);
  if (state) { applyZoom(container, state); }
}

/** Reset zoom to 1× and clear the saved state for the container. */
function resetZoom(container: Element): void {
  const cleared: ZoomState = { scale: 1, tx: 0, ty: 0 };
  zoomStateMap.set(container, cleared);
  applyZoom(container, cleared);
  updateZoomResetBtn(container, cleared);
}

/** Toggle .mermaid-is-zoomed on the container so CSS can show/hide the reset button. */
function updateZoomResetBtn(container: Element, state: ZoomState): void {
  const isZoomed = state.scale !== 1 || state.tx !== 0 || state.ty !== 0;
  container.classList.toggle("mermaid-is-zoomed", isZoomed);
}

/**
 * Flush accumulated wheel delta for a container on the next animation frame.
 *
 * Batches multiple rapid wheel-notch events into a single visual update,
 * eliminating stutter from per-event DOM writes. Uses log-scale stepping for
 * perceptually-linear, symmetric zoom (equal steps in/out at all zoom levels).
 */
function flushZoom(container: Element): void {
  pendingRafMap.delete(container);

  const delta = pendingDeltaMap.get(container) ?? 0;
  pendingDeltaMap.delete(container);
  const cursor = pendingCursorMap.get(container) ?? { clientX: 0, clientY: 0 };
  pendingCursorMap.delete(container);

  if (delta === 0) { return; }

  const state = zoomStateMap.get(container) ?? { scale: 1, tx: 0, ty: 0 };
  const direction = delta < 0 ? 1 : -1; // negative deltaY = scroll up = zoom in

  // Log-scale step: exp(log(scale) ± step) gives perceptually-equal zoom increments.
  const newScale = Math.max(
    MIN_SCALE,
    Math.min(MAX_SCALE, Math.exp(Math.log(state.scale) + direction * LOG_ZOOM_STEP))
  );

  // Cursor-centered translate: keep the diagram point under the cursor fixed.
  const rect = (container as HTMLElement).getBoundingClientRect();
  const cursorX = cursor.clientX - rect.left;
  const cursorY = cursor.clientY - rect.top;
  const ratio = newScale / state.scale;
  const tx = cursorX - (cursorX - state.tx) * ratio;
  const ty = cursorY - (cursorY - state.ty) * ratio;

  const newState: ZoomState = { scale: newScale, tx, ty };
  zoomStateMap.set(container, newState);
  applyZoom(container, newState);
  updateZoomResetBtn(container, newState);
}

/**
 * Attach the Ctrl+scroll wheel zoom handler to a .mermaid container.
 *
 * Guards:
 *  1. Bierner conflict: if .mermaid-zoom-button is present, skip (same as
 *     attachExpandButton) to avoid conflicting with bierner's zoom controls.
 *  2. Own dedup: data-zoom-attached prevents registering multiple listeners
 *     on the same container across updateContent cycles.
 */
function attachZoom(container: Element): void {
  if (container.querySelector(".mermaid-zoom-button") !== null) { return; }
  if ((container as HTMLElement).dataset.zoomAttached === "true") { return; }
  (container as HTMLElement).dataset.zoomAttached = "true";

  if (!zoomStateMap.has(container)) {
    zoomStateMap.set(container, { scale: 1, tx: 0, ty: 0 });
  }

  container.addEventListener("wheel", (e: Event) => {
    const we = e as WheelEvent;
    if (!we.ctrlKey) { return; } // REQ-ZOOM-003: pass plain scroll through
    we.preventDefault();         // Capture zoom gesture; suppress page scroll

    // Accumulate deltaY — multiple wheel notches before the next animation frame
    // will be batched into a single flushZoom call.
    pendingDeltaMap.set(container, (pendingDeltaMap.get(container) ?? 0) + we.deltaY);

    // Track the latest cursor position for cursor-centered zoom in flushZoom.
    pendingCursorMap.set(container, { clientX: we.clientX, clientY: we.clientY });

    // Schedule a single rAF flush; ignore if one is already in flight.
    if (!pendingRafMap.has(container)) {
      pendingRafMap.set(container, requestAnimationFrame(() => flushZoom(container)));
    }
  }, { passive: false });
}

/**
 * Attach the zoom reset button to a .mermaid container.
 *
 * Guards:
 *  1. Bierner conflict: skip if .mermaid-zoom-button is present.
 *  2. Own dedup: skip if our button is already present.
 */
function attachZoomResetButton(container: Element): void {
  if (container.querySelector(".mermaid-zoom-button") !== null) { return; }
  if (container.querySelector(".mermaid-zoom-reset-btn") !== null) { return; }

  const btn = document.createElement("button");
  btn.className = "mermaid-zoom-reset-btn";
  btn.setAttribute("aria-label", "Reset zoom");
  btn.setAttribute("title", "Reset zoom");
  btn.setAttribute("type", "button");
  btn.textContent = "1×";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetZoom(container);
  });

  container.appendChild(btn);
}

// ── Overlay ───────────────────────────────────────────────────────────────────

/**
 * Open the fullscreen overlay containing a clone of the given SVG.
 * The overlay is appended to document.body — morphdom re-renders only update
 * .mermaid container content, so the overlay survives re-renders (REQ-WID-007).
 */
function openOverlay(svg: SVGElement): void {
  closeOverlay(); // Dismiss any previously open overlay.

  const overlay = document.createElement("div");
  overlay.className = "mermaid-overlay";

  // Inner wrapper provides flex-centering for small diagrams while allowing
  // the overlay to scroll for diagrams larger than the viewport.
  const inner = document.createElement("div");
  inner.className = "mermaid-overlay-inner";

  // Clone the SVG so the original in the document is unaffected (REQ-WID-005).
  const clone = svg.cloneNode(true) as SVGElement;
  clone.removeAttribute("width");
  clone.removeAttribute("height");
  // No max-width/max-height: SVG renders at full intrinsic size; overlay scrolls.

  inner.appendChild(clone);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  // REQ-WID-006: dismiss on Escape key.
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") { closeOverlay(); }
  };
  activeCloseHandler = onKeyDown;
  document.addEventListener("keydown", onKeyDown);

  // REQ-WID-006: dismiss on click on the overlay backdrop or inner wrapper
  // (anywhere that is NOT the SVG itself).
  overlay.addEventListener("click", (e) => {
    if (!(e.target as Element).closest("svg")) { closeOverlay(); }
  });
}

/** Remove the active overlay and clean up its event listeners. */
function closeOverlay(): void {
  const existing = document.querySelector(".mermaid-overlay");
  if (existing) { existing.remove(); }
  if (activeCloseHandler) {
    document.removeEventListener("keydown", activeCloseHandler);
    activeCloseHandler = null;
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

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
