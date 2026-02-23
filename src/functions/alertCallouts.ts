import * as vscode from "vscode";
import MarkdownItGitHubAlerts from "markdown-it-github-alerts";

export const activate = (_ctx: vscode.ExtensionContext) => {
  return {
    extendMarkdownIt(md: any) {
      return md.use(MarkdownItGitHubAlerts);
    },
  };
};
