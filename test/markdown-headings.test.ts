import { expect, test } from "vite-plus/test";

import {
  findMarkdownHeadingIdBeforeOffset,
  findMarkdownHeadingPosition,
  markdownHeadingPositions,
} from "../public/markdown-headings.js";

test("extracts markdown heading positions through h6", () => {
  const headings = markdownHeadingPositions(`# Title

## Section

### Detail

#### Hidden Detail

##### Deep

###### Deeper`);

  expect(headings.map(({ id, level, line }) => ({ id, level, line }))).toEqual([
    { id: "title", level: 1, line: 0 },
    { id: "section", level: 2, line: 2 },
    { id: "detail", level: 3, line: 4 },
    { id: "hidden-detail", level: 4, line: 6 },
    { id: "deep", level: 5, line: 8 },
    { id: "deeper", level: 6, line: 10 },
  ]);
});

test("keeps markdown heading ids unique", () => {
  const headings = markdownHeadingPositions(`## Same

### Same

#### Same`);

  expect(headings.map((heading) => heading.id)).toEqual(["same", "same-2", "same-3"]);
});

test("normalizes inline markdown in heading ids", () => {
  const headings = markdownHeadingPositions(
    "## **Bold** `Code` [Link](https://example.com) ![Alt](./image.png)",
  );

  expect(headings[0]?.id).toBe("bold-code-link-alt");
});

test("finds a heading by generated id", () => {
  const markdown = `# Title

## Section`;

  expect(findMarkdownHeadingPosition(markdown, "section")).toMatchObject({
    id: "section",
    level: 2,
    line: 2,
  });
});

test("maps h4 and deeper offsets to the previous h1-h3 heading", () => {
  const markdown = `# Title

## Section

### Detail

#### Hidden Detail

##### Deep

## Next`;

  expect(findMarkdownHeadingIdBeforeOffset(markdown, markdown.indexOf("#### Hidden Detail"))).toBe(
    "detail",
  );
  expect(findMarkdownHeadingIdBeforeOffset(markdown, markdown.indexOf("##### Deep"))).toBe(
    "detail",
  );
  expect(findMarkdownHeadingIdBeforeOffset(markdown, markdown.indexOf("## Next"))).toBe("next");
});
