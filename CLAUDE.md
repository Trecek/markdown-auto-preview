# **Project Development Guidelines**

This document provides mandatory instructions for AI-assisted development in this repository. All contributions must be consistent, high-quality, and aligned with these standards.

## **1. Core Project Goal**

A VS Code / Cursor extension that automatically opens a side-by-side Markdown preview when a `.md` file is opened. Forked from [vv13/markdown-auto-preview](https://github.com/vv13/markdown-auto-preview) (MIT licensed) with the goal of fixing known issues and actively maintaining the extension.

## **2. General Principles**

  * **Follow the Task Description**: Your primary source of truth is the issue, ticket, or work package description provided for your assignment. It contains the complete scope and requirements for your work.
  * **Adhere to Task Scope**: Strictly adhere to the scope of the assigned task. Do not work on unassigned features, unrelated refactoring, or bug fixes outside the current assignment.
  * **Implement Faithfully**: Produce a functionally correct implementation based on the task requirements. Do not add new features or architectural changes unless explicitly requested.
  * **Adhere to Project Standards**: Write clean, maintainable code following the established conventions and architectural patterns of this project.

## **3. Critical Rules - DO NOT VIOLATE**

These rules are essential for maintaining project structure, preventing bugs, and ensuring a clean codebase.

### **3.1. Code and Implementation**

  * **Do Not Oversimplify**: Implement logic with its required complexity. Do not take shortcuts that compromise correctness or violate requirements.
  * **Respect the Existing Architecture**: Build upon the established project structure, modules, and design patterns. Do not introduce new architectural patterns or file structures without explicit instruction. Always understand existing architecture before implementing a new feature.
  * **Address the Root Cause**: When your code fails a test or causes a bug, debug the implementation to find and fix the root cause. Avoid hardcoded workarounds that only solve for specific inputs.
  * **No Backward Compatibility Hacks**: Do NOT leave comments about dead or deprecated code. No backward compatibility or deprecated code should be kept. Dead code should always be removed.
  * **Avoid Redundancy**: Do not duplicate logic, utilities, or test code.
  * **Use Current Package Versions**: When adding new dependencies, use web search to find and use the current stable version.

### **3.2. File System**

  * **Temporary Files:** All temporary files for debugging, analysis, or testing hypotheses **must** be created in the project's `temp/` directory.
  * **Do Not Add Root Files**: Never create new files or scripts in the repository root unless the task explicitly requires it.
  * **Never commit unless told to do so**

## **4. Testing Guidelines**

### **4.1. Running Tests**

  * **Build**: `pnpm run compile` — compiles TypeScript via webpack
  * **Lint**: `pnpm run lint` — runs ESLint on `src/`
  * **Test**: `pnpm run test` — compiles tests and runs via `@vscode/test-electron`
  * **Package**: `pnpm run package` — production build with source maps

### **4.2. VS Code Extension Testing**

  * Use `F5` in VS Code/Cursor to launch the Extension Development Host for manual testing
  * Test with various markdown files containing Mermaid diagrams, code blocks, and standard formatting
  * Verify preview opens automatically, follows file switches, and closes appropriately

## **5. Technology Stack**

  * **Language**: TypeScript (strict mode)
  * **Build**: webpack + ts-loader
  * **Package Manager**: pnpm
  * **VS Code API**: ^1.77.0
  * **Testing**: Mocha + @vscode/test-electron

## **6. Architecture**

```
src/
  extension.ts              # Entry point — delegates to loadFunctions()
  helpers.ts                # Shared utilities (closePreview tab matching)
  functions/
    index.ts                # Plugin loader — sequential activation of all modules
    autoPreview.ts          # Core: auto-opens side-by-side preview on markdown open
    autoClose.ts            # Closes preview when source markdown file closes
    autoCloseAfterSwitch.ts # Closes preview when switching to non-markdown file
    commands.ts             # Registers extension commands (closePreview)
    previewStyle.ts         # Theme system (9 GitHub themes, auto/system/light/dark)
styles/                     # GitHub-flavored CSS themes
  base.css                  # Base preview styles
  github-markdown-*.css     # Theme variants (light, dark, accessibility)
  highlight-js.css          # Syntax highlighting
  generate-github-css.mjs   # CSS generation script
.claude/skills/             # Claude Code skill definitions
temp/                       # Temporary/working files (gitignored)
```

## **7. Known Issues to Address**

These are the known bugs from the upstream project and competing extensions:

1. **Source control diff duplicate tabs** — Opening a modified `.md` in git diff view creates duplicate tabs
2. **Non-markdown file bleed** — After closing all markdown tabs, clicking non-markdown files briefly shows diff viewer
3. **Preview doesn't follow file switches** — Switching between multiple `.md` files doesn't always update the preview
4. **Preview doesn't reopen after manual close** — Once manually closed, preview won't reopen until restart
5. **Missing GitHub alert/callout support** — `[!TIP]`, `[!WARNING]`, `[!NOTE]` syntax not handled
