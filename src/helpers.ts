import * as vscode from "vscode";
import * as path from "path";
import { isMarkdownPreviewTab } from "./functions/autoPreview";

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function closePreview(filePath?: string) {
  if (!filePath || !filePath.endsWith(".md")) {
    return;
  }
  const filename = filePath.split(path.sep).pop() || '';
  const escaped = escapeRegex(filename.slice(0, filename.length - 3));
  const searchReg = new RegExp(`\\[?Preview\\]?\\s${escaped}\\.md`);

  vscode.window.tabGroups.all.forEach((item) => {
    const target = item.tabs.find((tab) => {
      if (!(tab.input instanceof vscode.TabInputWebview)) {
        return false;
      }
      if (!isMarkdownPreviewTab(tab.input.viewType)) {
        return false;
      }
      return searchReg.test(tab.label);
    });
    if (target) {
      vscode.window.tabGroups.close(target);
    }
  });
}
