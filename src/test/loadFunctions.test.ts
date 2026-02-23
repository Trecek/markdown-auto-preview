import * as assert from "assert";

suite("loadFunctions - extendMarkdownIt composition", () => {
  test("composes extendMarkdownIt from multiple modules", () => {
    const calls: string[] = [];

    const pluginA = () => ({
      extendMarkdownIt(md: any) {
        calls.push("A");
        md.pluginsApplied = md.pluginsApplied || [];
        md.pluginsApplied.push("A");
        return md;
      },
    });

    const pluginB = () => ({
      extendMarkdownIt(md: any) {
        calls.push("B");
        md.pluginsApplied = md.pluginsApplied || [];
        md.pluginsApplied.push("B");
        return md;
      },
    });

    const plugins = [pluginA, pluginB];
    const result: Record<string, any> = plugins.reduce(
      (prev: Record<string, any>, cur) => {
        const res: Record<string, any> = cur();
        if (prev.extendMarkdownIt && res.extendMarkdownIt) {
          const prevExtend = prev.extendMarkdownIt;
          const curExtend = res.extendMarkdownIt;
          return {
            ...prev,
            ...res,
            extendMarkdownIt(md: any) {
              return curExtend(prevExtend(md));
            },
          };
        }
        return { ...prev, ...res };
      },
      {}
    );

    const md = {};
    result.extendMarkdownIt(md);

    assert.deepStrictEqual(calls, ["A", "B"]);
    assert.deepStrictEqual((md as any).pluginsApplied, ["A", "B"]);
  });

  test("single extendMarkdownIt passes through without composition", () => {
    const calls: string[] = [];

    const pluginA = () => ({});

    const pluginB = () => ({
      extendMarkdownIt(md: any) {
        calls.push("B");
        return md;
      },
    });

    const plugins = [pluginA, pluginB];
    const result: Record<string, any> = plugins.reduce(
      (prev: Record<string, any>, cur) => {
        const res: Record<string, any> = cur();
        if (prev.extendMarkdownIt && res.extendMarkdownIt) {
          const prevExtend = prev.extendMarkdownIt;
          const curExtend = res.extendMarkdownIt;
          return {
            ...prev,
            ...res,
            extendMarkdownIt(md: any) {
              return curExtend(prevExtend(md));
            },
          };
        }
        return { ...prev, ...res };
      },
      {}
    );

    const md = {};
    result.extendMarkdownIt(md);

    assert.deepStrictEqual(calls, ["B"]);
  });
});
