import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * Pause execution for the specified duration.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll a condition function until it returns true or retries are exhausted.
 * Returns true if the condition was met, false otherwise.
 */
export async function pollUntil(
  condition: () => boolean | Promise<boolean>,
  retries = 20,
  intervalMs = 250
): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    if (await condition()) {
      return true;
    }
    await sleep(intervalMs);
  }
  return false;
}

/**
 * Create a temporary markdown file with optional content and filename.
 * Returns the URI of the created file.
 */
export async function createTempMarkdownFile(
  content = "# Test\n\nHello world\n",
  filename?: string
): Promise<vscode.Uri> {
  const name = filename ?? `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.md`;
  const filePath = path.join(os.tmpdir(), name);
  fs.writeFileSync(filePath, content, "utf-8");
  return vscode.Uri.file(filePath);
}

/**
 * Create a temporary file with the given extension and content.
 */
export async function createTempFile(
  content: string,
  extension: string
): Promise<vscode.Uri> {
  const name = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const filePath = path.join(os.tmpdir(), name);
  fs.writeFileSync(filePath, content, "utf-8");
  return vscode.Uri.file(filePath);
}

/**
 * Delete a temporary file by URI. Silently ignores missing files.
 */
export function deleteTempFile(uri: vscode.Uri): void {
  try {
    fs.unlinkSync(uri.fsPath);
  } catch {
    // File already removed or never created
  }
}

/**
 * Open a markdown file in the first editor column and wait for VS Code to settle.
 */
export async function openMarkdownFile(
  uri: vscode.Uri
): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
  await sleep(150);
  return editor;
}

/**
 * Close all open editors and wait for VS Code to settle.
 */
export async function closeAllEditors(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await sleep(200);
}

/**
 * Find a markdown preview tab, optionally matching a specific filename.
 */
export function findMarkdownPreviewTab(
  forFileName?: string
): vscode.Tab | undefined {
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (!(tab.input instanceof vscode.TabInputWebview)) {
        continue;
      }
      if (!tab.input.viewType.includes("markdown.preview")) {
        continue;
      }
      if (forFileName) {
        if (!tab.label.includes(forFileName)) {
          continue;
        }
      }
      return tab;
    }
  }
  return undefined;
}

/**
 * Wait for a markdown preview tab to appear.
 * Throws if the preview does not appear within the timeout.
 */
export async function waitForMarkdownPreview(
  forFileName?: string,
  timeoutMs = 5000
): Promise<vscode.Tab> {
  const retries = Math.ceil(timeoutMs / 250);
  let found: vscode.Tab | undefined;
  const ok = await pollUntil(() => {
    found = findMarkdownPreviewTab(forFileName);
    return found !== undefined;
  }, retries, 250);
  if (!ok || !found) {
    throw new Error(
      `Markdown preview${forFileName ? ` for "${forFileName}"` : ""} did not appear within ${timeoutMs}ms`
    );
  }
  return found;
}

/**
 * Wait for a markdown preview tab to close.
 * Throws if the preview does not close within the timeout.
 */
export async function waitForPreviewToClose(
  forFileName?: string,
  timeoutMs = 5000
): Promise<void> {
  const retries = Math.ceil(timeoutMs / 250);
  const ok = await pollUntil(() => {
    return findMarkdownPreviewTab(forFileName) === undefined;
  }, retries, 250);
  if (!ok) {
    throw new Error(
      `Markdown preview${forFileName ? ` for "${forFileName}"` : ""} did not close within ${timeoutMs}ms`
    );
  }
}
