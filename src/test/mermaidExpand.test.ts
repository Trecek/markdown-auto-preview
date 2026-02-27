// src/test/mermaidExpand.test.ts
import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

suite("Mermaid Expand Modal", () => {
  const root = path.resolve(__dirname, "../..");

  // ── package.json contributions ────────────────────────────────────────────

  test("package.json registers markdown.previewScripts with ./dist/preview.js", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const scripts: string[] = pkg.contributes["markdown.previewScripts"] ?? [];
    assert.ok(
      scripts.includes("./dist/preview.js"),
      `Expected ./dist/preview.js in markdown.previewScripts, got: ${JSON.stringify(scripts)}`
    );
  });

  test("package.json registers mermaid-expand.css in markdown.previewStyles", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const styles: string[] = pkg.contributes["markdown.previewStyles"] ?? [];
    assert.ok(
      styles.includes("./styles/mermaid-expand.css"),
      `Expected ./styles/mermaid-expand.css in previewStyles, got: ${JSON.stringify(styles)}`
    );
  });

  // ── CSS file ─────────────────────────────────────────────────────────────

  test("styles/mermaid-expand.css exists", () => {
    const cssPath = path.join(root, "styles", "mermaid-expand.css");
    assert.ok(fs.existsSync(cssPath), `Expected ${cssPath} to exist`);
  });

  test("mermaid-expand.css sets position: relative on .mermaid (button anchor)", () => {
    const css = fs.readFileSync(path.join(root, "styles", "mermaid-expand.css"), "utf8");
    assert.ok(
      css.includes("position: relative"),
      `Expected 'position: relative' in mermaid-expand.css`
    );
  });

  test("mermaid-expand.css sets opacity: 0 on .mermaid-expand-btn (hidden until hover)", () => {
    const css = fs.readFileSync(path.join(root, "styles", "mermaid-expand.css"), "utf8");
    assert.ok(
      css.includes("opacity: 0"),
      `Expected 'opacity: 0' in mermaid-expand.css`
    );
  });

  test("mermaid-expand.css sets opacity: 1 on hover/focus to reveal button", () => {
    const css = fs.readFileSync(path.join(root, "styles", "mermaid-expand.css"), "utf8");
    assert.ok(
      css.includes("opacity: 1"),
      `Expected 'opacity: 1' (hover reveal) in mermaid-expand.css`
    );
  });

  test("mermaid-expand.css sets position: fixed on .mermaid-overlay", () => {
    const css = fs.readFileSync(path.join(root, "styles", "mermaid-expand.css"), "utf8");
    assert.ok(
      css.includes("position: fixed"),
      `Expected 'position: fixed' in mermaid-expand.css`
    );
  });

  test("mermaid-expand.css uses VS Code CSS variable for overlay background", () => {
    const css = fs.readFileSync(path.join(root, "styles", "mermaid-expand.css"), "utf8");
    assert.ok(
      css.includes("--vscode-editor-background"),
      `Expected '--vscode-editor-background' CSS variable in mermaid-expand.css`
    );
  });

  // ── Source files ──────────────────────────────────────────────────────────

  test("src/preview/mermaidExpand.ts exists", () => {
    const scriptPath = path.join(root, "src", "preview", "mermaidExpand.ts");
    assert.ok(fs.existsSync(scriptPath), `Expected ${scriptPath} to exist`);
  });

  test("tsconfig.preview.json exists with DOM in lib", () => {
    const tscPath = path.join(root, "tsconfig.preview.json");
    assert.ok(fs.existsSync(tscPath), `Expected ${tscPath} to exist`);
    const tsconfig = JSON.parse(fs.readFileSync(tscPath, "utf8"));
    const lib: string[] = tsconfig.compilerOptions?.lib ?? [];
    assert.ok(
      lib.some((l) => l.toUpperCase() === "DOM"),
      `Expected "DOM" in tsconfig.preview.json lib, got: ${JSON.stringify(lib)}`
    );
  });

  // ── Webpack config ────────────────────────────────────────────────────────

  test("webpack.config.js exports a browser entry targeting preview.js", () => {
    const config = require(path.join(root, "webpack.config.js")) as unknown[];
    assert.ok(Array.isArray(config), "webpack.config.js should export an array");
    assert.ok(config.length >= 2, `Expected at least 2 entries, got ${config.length}`);
    const preview = (config as Array<Record<string, unknown>>).find(
      (c) => (c.output as Record<string, unknown>)?.filename === "preview.js"
    );
    assert.ok(preview, "Expected a webpack entry with output.filename === 'preview.js'");
    const target = preview.target as string;
    assert.ok(
      target === "web" || target === "browserslist",
      `Expected target 'web', got: ${target}`
    );
  });
});
