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
});
