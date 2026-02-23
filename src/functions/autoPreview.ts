import * as vscode from "vscode";

// --- Testable pure functions (Step 1) ---

const ALLOWED_SCHEMES = new Set(["file", "untitled"]);

export function isAllowedScheme(scheme: string): boolean {
  return ALLOWED_SCHEMES.has(scheme);
}

export function isMarkdownPreviewTab(viewType: string): boolean {
  return viewType.includes("markdown.preview");
}

export function shouldTriggerPreview(
  docUri: string,
  previewShownForUri: string | undefined,
  lastClosedPreviewForUri: string | undefined,
  previewClosedAt: number,
  now: number = Date.now()
): boolean {
  if (lastClosedPreviewForUri === docUri && now - previewClosedAt < 500) {
    return false;
  }
  if (docUri === previewShownForUri) {
    return false;
  }
  return true;
}

// --- Module state (Step 2) ---

let autoPreviewDebounce: ReturnType<typeof setTimeout> | undefined;
let previewShownForUri: string | undefined;
let lastClosedPreviewForUri: string | undefined;
let previewClosedAt = 0;

let _autoPreviewDisposable: vscode.Disposable | null = null;
let _tabChangeDisposable: vscode.Disposable | null = null;

// --- Activation (Step 4) ---

export function activate(context: vscode.ExtensionContext) {
  const d1 = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("markdown-auto-preview")) {
      configEffect();
    }
  });
  configEffect();

  context.subscriptions.push(d1);
  return {};
}

function configEffect() {
  if (vscode.workspace.getConfiguration("markdown-auto-preview").get<boolean>("autoShowPreviewToSide")) {
    registerAutoPreview();
    triggerAutoPreview(vscode.window.activeTextEditor);
  } else {
    _autoPreviewDisposable?.dispose?.();
    _autoPreviewDisposable = null;
    _tabChangeDisposable?.dispose?.();
    _tabChangeDisposable = null;
  }
}

// --- Registration (Step 4) ---

function registerAutoPreview() {
  if (_autoPreviewDisposable) {
    return;
  }

  _autoPreviewDisposable = vscode.window.onDidChangeActiveTextEditor(
    (editor) => triggerAutoPreview(editor)
  );

  _tabChangeDisposable = vscode.window.tabGroups.onDidChangeTabs(
    (event) => {
      for (const tab of event.closed) {
        if (
          tab.input instanceof vscode.TabInputWebview &&
          isMarkdownPreviewTab(tab.input.viewType)
        ) {
          lastClosedPreviewForUri = previewShownForUri;
          previewClosedAt = Date.now();
          previewShownForUri = undefined;
          break;
        }
      }
    }
  );
}

// --- Core logic (Step 3) ---

function triggerAutoPreview(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.viewColumn !== 1) {
    return;
  }

  if (!isAllowedScheme(editor.document.uri.scheme)) {
    return;
  }

  if (editor.document.languageId !== "markdown") {
    return;
  }

  if (autoPreviewDebounce) {
    clearTimeout(autoPreviewDebounce);
    autoPreviewDebounce = undefined;
  }

  const docUri = editor.document.uri.toString();

  if (!shouldTriggerPreview(docUri, previewShownForUri, lastClosedPreviewForUri, previewClosedAt)) {
    lastClosedPreviewForUri = undefined;
    return;
  }
  lastClosedPreviewForUri = undefined;

  previewShownForUri = docUri;
  autoPreviewDebounce = setTimeout(() => autoPreviewToSide(editor), 100);
}

/**
 * Shows preview for the editor.
 */
async function autoPreviewToSide(editor: vscode.TextEditor) {
  if (editor.document.isClosed) {
    return;
  }

  // Call `vscode.markdown-language-features`.
  await vscode.commands.executeCommand("markdown.showPreviewToSide");
  await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");

  // Wait, as VS Code won't respond when it just opened a preview.
  await new Promise((resolve) => setTimeout(() => resolve(undefined), 100));

  // VS Code 1.62 appears to make progress in https://github.com/microsoft/vscode/issues/9526
  // Thus, we must request the text editor directly with known view column (if available).
  await vscode.window.showTextDocument(editor.document, editor.viewColumn);
}
