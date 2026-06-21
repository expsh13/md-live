import { expect, test } from "vite-plus/test";

import { renderPage, renderToc } from "../src/page.ts";

test("renders flat toc labels without heading anchors", () => {
  const result = renderToc([
    { id: "title", level: 1, text: "Title" },
    { id: "section", level: 2, text: "Section" },
    { id: "detail", level: 3, text: "Detail" },
  ]);

  expect(result).toContain('<span class="toc-level">h1</span>Title');
  expect(result).toContain('<span class="toc-level">h2</span>Section');
  expect(result).toContain('<span class="toc-level">h3</span>Detail');
  expect(result).not.toContain("heading-anchor");
});

test("omits h4 and deeper headings from toc", () => {
  const result = renderToc([
    { id: "detail", level: 3, text: "Detail" },
    { id: "too-deep", level: 4, text: "Too deep" },
  ]);

  expect(result).toContain("Detail");
  expect(result).not.toContain("Too deep");
});

test("escapes toc text and page title", () => {
  const toc = renderToc([{ id: "x", level: 2, text: "<script>alert(1)</script>" }]);
  const page = renderPage({
    title: `sample "x".md`,
    content: "<h1>Safe rendered markdown</h1>",
    headings: [],
  });

  expect(toc).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(page).toContain("<title>sample &quot;x&quot;.md</title>");
  expect(page).toContain('<div class="toc-title">sample &quot;x&quot;.md</div>');
});

test("renders edit mode controls", () => {
  const page = renderPage({
    title: "sample.md",
    content: "<h1>Sample</h1>",
    headings: [{ id: "sample", level: 1, text: "Sample" }],
  });

  expect(page).toContain(
    '<button class="mode-toggle" type="button" aria-pressed="false">編集</button>',
  );
  expect(page).toContain('<span class="save-status" aria-live="polite"></span>');
  expect(page).toContain('<textarea class="markdown-editor" spellcheck="false" hidden></textarea>');
  expect(page).toContain('<script type="module" src="/public/app.js"></script>');
});

test("renders empty toc state", () => {
  expect(renderToc([])).toBe('<p class="toc-empty">No headings</p>');
});
