// src/test/mermaidZoom.test.ts
import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

suite("Mermaid Scroll-Wheel Zoom", () => {
  const root = path.resolve(__dirname, "../..");

  // ── Wheel event handler ────────────────────────────────────────────────────

  test("mermaidExpand.ts attaches a wheel event listener for zoom (REQ-ZOOM-001/002)", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      src.includes("'wheel'") || src.includes('"wheel"'),
      "Expected wheel event listener in mermaidExpand.ts"
    );
  });

  test("mermaidExpand.ts checks ctrlKey to gate zoom vs normal scroll (REQ-ZOOM-003)", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(src.includes("ctrlKey"), "Expected ctrlKey check in mermaidExpand.ts");
  });

  test("mermaidExpand.ts calls preventDefault() to capture Ctrl+scroll gesture", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      src.includes("preventDefault()"),
      "Expected preventDefault() call in mermaidExpand.ts"
    );
  });

  test("mermaidExpand.ts registers wheel listener with passive: false", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      src.includes("passive: false") || src.includes("passive:false"),
      "Expected { passive: false } in wheel event registration in mermaidExpand.ts"
    );
  });

  // ── Zoom state ─────────────────────────────────────────────────────────────

  test("mermaidExpand.ts declares a module-level zoom state Map (REQ-ZOOM-006/008)", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      src.includes("zoomStateMap"),
      "Expected zoomStateMap in mermaidExpand.ts"
    );
  });

  test("mermaidExpand.ts defines MIN_SCALE for lower zoom bound (REQ-ZOOM-004)", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(src.includes("MIN_SCALE"), "Expected MIN_SCALE constant in mermaidExpand.ts");
  });

  test("mermaidExpand.ts defines MAX_SCALE for upper zoom bound (REQ-ZOOM-005)", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(src.includes("MAX_SCALE"), "Expected MAX_SCALE constant in mermaidExpand.ts");
  });

  // ── CSS transform ──────────────────────────────────────────────────────────

  test("mermaidExpand.ts applies a CSS transform to the SVG for zoom", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      src.includes("style.transform"),
      "Expected svg.style.transform assignment in mermaidExpand.ts"
    );
  });

  // ── Reset button ───────────────────────────────────────────────────────────

  test("mermaidExpand.ts creates a zoom reset button (REQ-ZOOM-007)", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      src.includes("mermaid-zoom-reset-btn"),
      "Expected mermaid-zoom-reset-btn class in mermaidExpand.ts"
    );
  });

  // ── State persistence across re-renders ────────────────────────────────────

  test("mermaidExpand.ts re-applies zoom state after morphdom re-render (REQ-ZOOM-008)", () => {
    const src = fs.readFileSync(
      path.join(root, "src", "preview", "mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      src.includes("reapplyZoom") || src.includes("applyZoom"),
      "Expected zoom re-application in the MutationObserver callback in mermaidExpand.ts"
    );
  });

  // ── CSS ────────────────────────────────────────────────────────────────────

  test("mermaid-expand.css contains styles for .mermaid-zoom-reset-btn", () => {
    const css = fs.readFileSync(
      path.join(root, "styles", "mermaid-expand.css"), "utf8"
    );
    assert.ok(
      css.includes(".mermaid-zoom-reset-btn"),
      "Expected .mermaid-zoom-reset-btn rules in mermaid-expand.css"
    );
  });

  test("mermaid-expand.css uses .mermaid-is-zoomed to keep reset button visible when zoomed", () => {
    const css = fs.readFileSync(
      path.join(root, "styles", "mermaid-expand.css"), "utf8"
    );
    assert.ok(
      css.includes("mermaid-is-zoomed"),
      "Expected .mermaid-is-zoomed selector in mermaid-expand.css"
    );
  });

  // ── Zoom smoothing (Issue 2) ───────────────────────────────────────────────

  test("mermaidExpand.ts defines LOG_ZOOM_STEP instead of multiplicative ZOOM_STEP", () => {
    const src = fs.readFileSync(path.join(root, "src/preview/mermaidExpand.ts"), "utf8");
    assert.ok(
      src.includes("LOG_ZOOM_STEP"),
      "Expected LOG_ZOOM_STEP constant for log-scale zoom"
    );
    assert.ok(
      !src.includes("ZOOM_STEP = 0.1"),
      "Expected old ZOOM_STEP = 0.1 to be removed"
    );
  });

  test("mermaidExpand.ts uses Math.exp and Math.log for perceptually-linear zoom", () => {
    const src = fs.readFileSync(path.join(root, "src/preview/mermaidExpand.ts"), "utf8");
    assert.ok(
      src.includes("Math.exp") && src.includes("Math.log"),
      "Expected Math.exp(Math.log(scale) + step) log-scale zoom formula"
    );
  });

  test("mermaidExpand.ts uses requestAnimationFrame for batched zoom flushes", () => {
    const src = fs.readFileSync(path.join(root, "src/preview/mermaidExpand.ts"), "utf8");
    assert.ok(
      src.includes("requestAnimationFrame"),
      "Expected requestAnimationFrame for rAF-batched zoom"
    );
  });

  test("mermaidExpand.ts declares a pendingDeltaMap for wheel delta accumulation", () => {
    const src = fs.readFileSync(path.join(root, "src/preview/mermaidExpand.ts"), "utf8");
    assert.ok(
      src.includes("pendingDeltaMap"),
      "Expected pendingDeltaMap Map for accumulating wheel deltaY"
    );
  });

  test("mermaidExpand.ts defines flushZoom for rAF-batched zoom application", () => {
    const src = fs.readFileSync(path.join(root, "src/preview/mermaidExpand.ts"), "utf8");
    assert.ok(
      src.includes("flushZoom"),
      "Expected flushZoom function for rAF flush of batched wheel events"
    );
  });

  // ── Zoom sensitivity fix ───────────────────────────────────────────────────

  test("PIXELS_PER_NOTCH constant declared for deltaY normalization", () => {
    const src = fs.readFileSync(
      path.join(root, "src/preview/mermaidExpand.ts"), "utf8"
    );
    assert.ok(src.includes("PIXELS_PER_NOTCH"), "PIXELS_PER_NOTCH constant must exist");
  });

  test("wheel handler reads deltaMode to normalize across device types", () => {
    const src = fs.readFileSync(
      path.join(root, "src/preview/mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      src.includes("deltaMode"),
      "wheel handler must inspect we.deltaMode for delta normalization"
    );
  });

  test("wheel handler normalizes delta at accumulation time — divides by PIXELS_PER_NOTCH before storing in pendingDeltaMap", () => {
    const src = fs.readFileSync(
      path.join(root, "src/preview/mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      src.includes("PIXELS_PER_NOTCH") &&
        (src.includes("/ PIXELS_PER_NOTCH") || src.includes("/PIXELS_PER_NOTCH")),
      "normalizeWheelDelta result must be divided by PIXELS_PER_NOTCH at accumulation time (pendingDeltaMap.set)"
    );
  });

  test("sign-only direction variable is removed from flushZoom", () => {
    const src = fs.readFileSync(
      path.join(root, "src/preview/mermaidExpand.ts"), "utf8"
    );
    assert.ok(
      !src.includes("direction = delta < 0"),
      "sign-only direction assignment must be removed — magnitude is now used"
    );
  });

  // ── Zoom sensitivity fix v2 ────────────────────────────────────────────────

  test("LOG_ZOOM_STEP is 0.03 for subtle per-notch zoom feel", () => {
    const src = fs.readFileSync(path.join(root, "src/preview/mermaidExpand.ts"), "utf8");
    assert.ok(
      src.includes("LOG_ZOOM_STEP = 0.03"),
      "LOG_ZOOM_STEP must be 0.03 (was 0.05)"
    );
  });

  test("flushZoom no longer divides by PIXELS_PER_NOTCH (normalization is at accumulation site)", () => {
    const src = fs.readFileSync(path.join(root, "src/preview/mermaidExpand.ts"), "utf8");
    assert.ok(
      !src.includes("delta / PIXELS_PER_NOTCH") && !src.includes("delta/PIXELS_PER_NOTCH"),
      "flushZoom must not divide by PIXELS_PER_NOTCH — normalization must happen at pendingDeltaMap.set()"
    );
  });

  test("wheel handler clamps accumulated notch-units to [-3, 3] as fast-swipe safety guard", () => {
    const src = fs.readFileSync(path.join(root, "src/preview/mermaidExpand.ts"), "utf8");
    assert.ok(
      src.includes("Math.max(-3") && src.includes("Math.min(3,"),
      "wheel handler must clamp accumulated notch-units to [-3, 3]"
    );
  });

  test("debug overlay (zoom-dbg) is removed from wheel handler", () => {
    const src = fs.readFileSync(path.join(root, "src/preview/mermaidExpand.ts"), "utf8");
    assert.ok(
      !src.includes("zoom-dbg"),
      "Temporary debug overlay (zoom-dbg) must be removed from the wheel handler"
    );
  });
});
