import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

suite("Mermaid Width CSS", () => {
  const stylesRoot = path.resolve(__dirname, "../../styles");
  const cssPath = path.resolve(stylesRoot, "mermaid.css");
  const pkgPath = path.resolve(__dirname, "../../package.json");

  test("mermaid.css is registered in package.json previewStyles", () => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const previewStyles: string[] =
      pkg.contributes["markdown.previewStyles"] || [];
    assert.ok(
      previewStyles.includes("./styles/mermaid.css"),
      `Expected ./styles/mermaid.css in previewStyles, got: ${JSON.stringify(previewStyles)}`
    );
  });

  test("mermaid.css exists in styles directory", () => {
    assert.ok(
      fs.existsSync(cssPath),
      `Expected ${cssPath} to exist`
    );
  });

  test("mermaid.css sets overflow-x: auto on .mermaid", () => {
    const css = fs.readFileSync(cssPath, "utf8");
    assert.ok(
      css.includes("overflow-x: auto"),
      `Expected overflow-x: auto in mermaid.css, got: ${css}`
    );
  });

  test("mermaid.css sets max-width: none !important on .mermaid svg", () => {
    const css = fs.readFileSync(cssPath, "utf8");
    assert.ok(
      css.includes("max-width: none !important"),
      `Expected max-width: none !important in mermaid.css, got: ${css}`
    );
  });
});
