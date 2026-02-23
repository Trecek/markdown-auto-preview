import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import MarkdownIt = require("markdown-it");

suite("Alert Callouts", () => {
  let md: MarkdownIt;
  let alertPlugin: any;

  suiteSetup(async () => {
    const mod = await import("markdown-it-github-alerts");
    alertPlugin = mod.default;
    md = new MarkdownIt();
    md.use(alertPlugin);
  });

  test("transforms blockquote with [!NOTE] syntax into alert div", () => {
    const result = md.render("> [!NOTE]\n> Some text");
    assert.ok(
      result.includes('class="markdown-alert markdown-alert-note"'),
      `Expected markdown-alert-note class, got: ${result}`
    );
    assert.ok(
      result.includes("markdown-alert-title"),
      `Expected markdown-alert-title, got: ${result}`
    );
  });

  test("all five alert types produce distinct class names", () => {
    const types = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
    for (const type of types) {
      const result = md.render(`> [!${type}]\n> Content`);
      const expectedClass = `markdown-alert markdown-alert-${type.toLowerCase()}`;
      assert.ok(
        result.includes(expectedClass),
        `Expected class="${expectedClass}" for ${type}, got: ${result}`
      );
    }
  });

  test("regular blockquotes are not transformed", () => {
    const result = md.render("> Just a normal blockquote");
    assert.ok(
      result.includes("<blockquote>"),
      `Expected <blockquote>, got: ${result}`
    );
    assert.ok(
      !result.includes("markdown-alert"),
      `Expected no markdown-alert class, got: ${result}`
    );
  });

  test("alert CSS file is registered in package.json", () => {
    const pkgPath = path.resolve(__dirname, "../../package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const previewStyles: string[] =
      pkg.contributes["markdown.previewStyles"] || [];
    assert.ok(
      previewStyles.includes("./styles/github-alerts.css"),
      `Expected ./styles/github-alerts.css in previewStyles, got: ${JSON.stringify(previewStyles)}`
    );
  });

  test("alert CSS defines color variables for both light and dark modes", () => {
    const cssPath = path.resolve(
      __dirname,
      "../../styles/github-alerts.css"
    );
    const css = fs.readFileSync(cssPath, "utf8");

    const requiredVars = [
      "--color-note",
      "--color-tip",
      "--color-important",
      "--color-warning",
      "--color-caution",
    ];
    for (const v of requiredVars) {
      assert.ok(css.includes(v), `Expected ${v} in CSS`);
    }

    assert.ok(
      css.includes('data-color-mode="light"'),
      "Expected light mode selector"
    );
    assert.ok(
      css.includes('data-color-mode="dark"'),
      "Expected dark mode selector"
    );
  });
});
