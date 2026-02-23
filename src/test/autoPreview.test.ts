import * as assert from "assert";
import {
  isAllowedScheme,
  isMarkdownPreviewTab,
  shouldTriggerPreview,
} from "../functions/autoPreview";
import { escapeRegex } from "../helpers";

suite("autoPreview - pure functions", () => {
  // U1: file scheme is allowed
  test("isAllowedScheme returns true for 'file'", () => {
    assert.strictEqual(isAllowedScheme("file"), true);
  });

  // U2: untitled scheme is allowed
  test("isAllowedScheme returns true for 'untitled'", () => {
    assert.strictEqual(isAllowedScheme("untitled"), true);
  });

  // U3: git scheme is blocked
  test("isAllowedScheme returns false for 'git'", () => {
    assert.strictEqual(isAllowedScheme("git"), false);
  });

  // U4: git-index scheme is blocked
  test("isAllowedScheme returns false for 'git-index'", () => {
    assert.strictEqual(isAllowedScheme("git-index"), false);
  });

  // U5: output scheme is blocked
  test("isAllowedScheme returns false for 'output'", () => {
    assert.strictEqual(isAllowedScheme("output"), false);
  });

  // U6: markdown.preview viewType matches
  test("isMarkdownPreviewTab returns true for 'markdown.preview'", () => {
    assert.strictEqual(isMarkdownPreviewTab("markdown.preview"), true);
  });

  // U7: side preview variant matches
  test("isMarkdownPreviewTab returns true for side preview variant", () => {
    assert.strictEqual(
      isMarkdownPreviewTab("webview-panel/markdown.preview.side"),
      true
    );
  });

  // U8: non-preview webview rejected
  test("isMarkdownPreviewTab returns false for unrelated webview", () => {
    assert.strictEqual(isMarkdownPreviewTab("some.other.webview"), false);
  });

  // U9: manual-close suppression within 500ms cooldown
  test("shouldTriggerPreview returns false when same URI closed <500ms ago", () => {
    const now = 1000;
    const result = shouldTriggerPreview(
      "file:///a.md",
      undefined,
      "file:///a.md",
      now - 200, // closed 200ms ago
      now
    );
    assert.strictEqual(result, false);
  });

  // U10: reopens after cooldown expires
  test("shouldTriggerPreview returns true when same URI closed >=500ms ago", () => {
    const now = 1000;
    const result = shouldTriggerPreview(
      "file:///a.md",
      undefined,
      "file:///a.md",
      now - 600, // closed 600ms ago
      now
    );
    assert.strictEqual(result, true);
  });

  // U11: no double-open when preview already shown for URI
  test("shouldTriggerPreview returns false when preview already shown for URI", () => {
    const result = shouldTriggerPreview(
      "file:///a.md",
      "file:///a.md", // already shown
      undefined,
      0,
      1000
    );
    assert.strictEqual(result, false);
  });

  // U12: opens for a new URI
  test("shouldTriggerPreview returns true for a new URI", () => {
    const result = shouldTriggerPreview(
      "file:///b.md",
      "file:///a.md", // different URI shown
      undefined,
      0,
      1000
    );
    assert.strictEqual(result, true);
  });
});

suite("helpers - escapeRegex", () => {
  // U13: escapes all regex metacharacters
  test("escapes regex metacharacters", () => {
    const input = ".*+?^${}()|[]\\";
    const result = escapeRegex(input);
    assert.strictEqual(result, "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  // U14: leaves normal characters unchanged
  test("leaves alphanumeric, dash, and underscore unchanged", () => {
    const input = "my-file_name123";
    const result = escapeRegex(input);
    assert.strictEqual(result, "my-file_name123");
  });
});
