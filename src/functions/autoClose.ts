import * as vscode from "vscode";
import { closePreview } from "../helpers";

let _autoCloseDisposable: vscode.Disposable | null = null;

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
  if (vscode.workspace.getConfiguration("markdown-auto-preview").get<boolean>("autoClosePreviewWindow")) {
    registerAutoClose();
  } else {
    _autoCloseDisposable?.dispose?.();
    _autoCloseDisposable = null;
  }
}

function registerAutoClose() {
  if (_autoCloseDisposable) {
    return;
  }

  _autoCloseDisposable = vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
    closePreview(document?.fileName);
  });
}
