import * as assert from "assert";
import * as vscode from "vscode";
import {
  sleep,
  pollUntil,
  createTempMarkdownFile,
  createTempFile,
  deleteTempFile,
  openMarkdownFile,
  closeAllEditors,
  findMarkdownPreviewTab,
  waitForMarkdownPreview,
  waitForPreviewToClose,
} from "./helpers";
import { closePreview } from "../helpers";

suite("Integration - Preview Behavior", function () {
  this.timeout(30000);

  const tempFiles: vscode.Uri[] = [];

  setup(async function () {
    await closeAllEditors();
  });

  teardown(async function () {
    await closeAllEditors();
    for (const uri of tempFiles) {
      deleteTempFile(uri);
    }
    tempFiles.length = 0;
  });

  // I1: Preview opens when a markdown file is activated
  test("REQ-TEST-002: preview opens for a markdown file", async function () {
    const uri = await createTempMarkdownFile("# Hello\n\nWorld\n");
    tempFiles.push(uri);

    await openMarkdownFile(uri);
    const tab = await waitForMarkdownPreview();
    assert.ok(tab, "Preview tab should exist");
    assert.ok(
      tab.input instanceof vscode.TabInputWebview,
      "Preview tab should be a webview"
    );
  });

  // I2: No preview for non-allowed URI scheme (unit-level verification +
  //     integration confirmation that file:// scheme DOES trigger preview)
  test("REQ-TEST-003: file scheme triggers preview, git scheme blocked at gate", async function () {
    // Integration part: verify a normal file:// markdown opens preview
    const uri = await createTempMarkdownFile("# Scheme test\n");
    tempFiles.push(uri);

    await openMarkdownFile(uri);
    const tab = await waitForMarkdownPreview();
    assert.ok(tab, "file:// markdown should trigger preview");

    // Unit-level verification that isAllowedScheme blocks git/git-index
    // (already covered in autoPreview.test.ts U3-U5, confirmed here for completeness)
    const { isAllowedScheme } = await import("../functions/autoPreview");
    assert.strictEqual(isAllowedScheme("git"), false, "git scheme should be blocked");
    assert.strictEqual(isAllowedScheme("git-index"), false, "git-index scheme should be blocked");
  });

  // I3: Preview updates when switching between markdown files
  test("REQ-TEST-004: preview updates on file switch", async function () {
    const uriA = await createTempMarkdownFile("# File A\n", "test-switch-a.md");
    const uriB = await createTempMarkdownFile("# File B\n", "test-switch-b.md");
    tempFiles.push(uriA, uriB);

    // Open file A and wait for its preview
    await openMarkdownFile(uriA);
    await waitForMarkdownPreview("test-switch-a");

    // Switch to file B — the extension should trigger autoPreviewToSide.
    // VS Code's locked preview may either open a new tab labeled with
    // file B's name or reuse the existing tab (label may not update).
    await openMarkdownFile(uriB);

    // Wait for the extension to process: debounce (100ms) + command execution.
    const foundB = await pollUntil(() => {
      return findMarkdownPreviewTab("test-switch-b") !== undefined;
    }, 32, 250);

    if (foundB) {
      const previewTab = findMarkdownPreviewTab("test-switch-b");
      assert.ok(previewTab, "Preview should now reference file B");
    } else {
      // Locked preview reused without label update — verify a preview
      // still exists (extension did not break preview state).
      const anyPreview = findMarkdownPreviewTab();
      assert.ok(anyPreview, "A markdown preview tab should exist after file switch");
    }

    // Verify the extension processed the switch: active editor should
    // be file B (autoPreviewToSide restores focus to the source editor).
    const activeEditor = vscode.window.activeTextEditor;
    assert.ok(activeEditor, "Active text editor should exist after switch");
    assert.strictEqual(
      activeEditor!.document.uri.toString(),
      uriB.toString(),
      "Active editor should be file B after switch"
    );
  });

  // I4: Preview reopens after being manually closed
  test("REQ-TEST-005: preview reopens after manual close", async function () {
    const uri = await createTempMarkdownFile("# Reopen test\n", "test-reopen.md");
    tempFiles.push(uri);

    // Open and wait for preview
    await openMarkdownFile(uri);
    const tab = await waitForMarkdownPreview("test-reopen");

    // Manually close the preview tab
    await vscode.window.tabGroups.close(tab);
    await waitForPreviewToClose("test-reopen");

    // Wait beyond the 500ms cooldown
    await sleep(600);

    // Switch away then back to trigger re-evaluation
    const txtUri = await createTempFile("plain text", "txt");
    tempFiles.push(txtUri);
    const txtDoc = await vscode.workspace.openTextDocument(txtUri);
    await vscode.window.showTextDocument(txtDoc, vscode.ViewColumn.One);
    await sleep(300);

    // Switch back to the markdown file
    await openMarkdownFile(uri);
    await waitForMarkdownPreview("test-reopen");

    const reopenedTab = findMarkdownPreviewTab("test-reopen");
    assert.ok(reopenedTab, "Preview should have reopened after cooldown");
  });

  // I5: closePreview handles filenames with regex metacharacters
  test("REQ-TEST-006: closePreview works for regex metacharacter filenames", async function () {
    const uri = await createTempMarkdownFile("# Regex test\n", "test[1]+2.md");
    tempFiles.push(uri);

    await openMarkdownFile(uri);
    await waitForMarkdownPreview("test[1]+2");

    // Call closePreview with the filesystem path containing metacharacters
    closePreview(uri.fsPath);
    await waitForPreviewToClose("test[1]+2");

    const closedTab = findMarkdownPreviewTab("test[1]+2");
    assert.strictEqual(closedTab, undefined, "Preview should be closed without regex error");
  });

  // I6: No visual artifacts when last markdown file is closed and non-markdown opened
  test("REQ-TEST-008: no artifacts after closing markdown and opening non-markdown", async function () {
    const mdUri = await createTempMarkdownFile("# Artifact test\n");
    tempFiles.push(mdUri);

    // Open markdown and wait for preview
    await openMarkdownFile(mdUri);
    await waitForMarkdownPreview();

    // Close all editors (markdown source + preview)
    await closeAllEditors();
    await sleep(200);

    // Open a plain text file
    const txtUri = await createTempFile("just text", "txt");
    tempFiles.push(txtUri);
    const txtDoc = await vscode.workspace.openTextDocument(txtUri);
    await vscode.window.showTextDocument(txtDoc, vscode.ViewColumn.One);
    await sleep(500);

    // Assert no preview tabs remain
    const previewTab = findMarkdownPreviewTab();
    assert.strictEqual(previewTab, undefined, "No preview tabs should exist after opening non-markdown file");

    // Assert no webview tabs of any kind exist
    let webviewCount = 0;
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputWebview) {
          webviewCount++;
        }
      }
    }
    assert.strictEqual(webviewCount, 0, "No webview tabs should exist");
  });
});
