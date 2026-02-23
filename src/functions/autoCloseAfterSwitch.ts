import * as vscode from "vscode";
import { closePreview } from "../helpers";
import { isAllowedScheme } from "./autoPreview";

let autoCloseDebounce: ReturnType<typeof setTimeout> | undefined;
let lastMarkdownFilePath: string | undefined;

let _switchDisposable: vscode.Disposable | null = null;
let _docCloseDisposable: vscode.Disposable | null = null;

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
  if (vscode.workspace.getConfiguration("markdown-auto-preview").get<boolean>("autoClosePreviewAfterSwitch")) {
    registerAutoCloseAfterSwitch();
  } else {
    _switchDisposable?.dispose();
    _switchDisposable = null;
    _docCloseDisposable?.dispose();
    _docCloseDisposable = null;
    lastMarkdownFilePath = undefined;
  }
}

function registerAutoCloseAfterSwitch() {
  if (_switchDisposable) {
    return;
  }

  _switchDisposable = vscode.window.onDidChangeActiveTextEditor(
    (editor) => triggerAutoClosePreview(editor)
  );

  _docCloseDisposable = vscode.workspace.onDidCloseTextDocument((doc) => {
    if (doc.languageId === "markdown" && doc.fileName === lastMarkdownFilePath) {
      lastMarkdownFilePath = undefined;
      if (autoCloseDebounce) {
        clearTimeout(autoCloseDebounce);
        autoCloseDebounce = undefined;
      }
    }
  });
}

// VS Code dispatches a series of DidChangeActiveTextEditor events when moving tabs between groups, we don't want most of them.
function triggerAutoClosePreview(editor: vscode.TextEditor | undefined): void {
  if (!editor || editor.viewColumn !== 1) {
    return;
  }

  if (!isAllowedScheme(editor.document.uri.scheme)) {
    return;
  }

  const doc = editor.document;
  const isMarkdown = doc.languageId === "markdown";

  if (!isMarkdown && lastMarkdownFilePath) {
    if (autoCloseDebounce) {
      clearTimeout(autoCloseDebounce);
      autoCloseDebounce = undefined;
    }

    const filePath = lastMarkdownFilePath;
    lastMarkdownFilePath = undefined;
    autoCloseDebounce = setTimeout(() => closePreview(filePath), 100);
  }

  if (isMarkdown) {
    lastMarkdownFilePath = doc.fileName;
  }
}
