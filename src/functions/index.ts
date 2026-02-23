import * as vscode from "vscode";
import { activate as autoTriggerActivate } from "./autoPreview";
import { activate as previewStyleActivate } from "./previewStyle";
import { activate as alertCalloutsActivate } from "./alertCallouts";
import { activate as autoCloseActivate } from "./autoClose";
import { activate as commandsActivate } from "./commands";
import { activate as autoCloseAfterSwitchActivate } from "./autoCloseAfterSwitch";

const plugins = [
  autoTriggerActivate,
  previewStyleActivate,
  alertCalloutsActivate,
  autoCloseActivate,
  commandsActivate,
  autoCloseAfterSwitchActivate,
];

export const loadFunctions = (ctx: vscode.ExtensionContext) => {
  return plugins.reduce((prev: Record<string, any>, cur) => {
    const result: Record<string, any> = cur(ctx);
    if (prev.extendMarkdownIt && result.extendMarkdownIt) {
      const prevExtend = prev.extendMarkdownIt;
      const curExtend = result.extendMarkdownIt;
      return {
        ...prev,
        ...result,
        extendMarkdownIt(md: any) {
          return curExtend(prevExtend(md));
        },
      };
    }
    return { ...prev, ...result };
  }, {});
};
