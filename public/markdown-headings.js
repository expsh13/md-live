export function editorHeadingIdFromViewport(editor) {
  if (!editor) return null;

  const styles = getComputedStyle(editor);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 24;
  const line = Math.max(
    Math.floor((editor.scrollTop + editor.clientHeight * 0.38) / lineHeight),
    0,
  );
  const offset = offsetAtMarkdownLine(editor.value, line);

  return findMarkdownHeadingIdBeforeOffset(editor.value, offset);
}

export function findMarkdownHeadingIdBeforeOffset(markdown, offset) {
  let current = null;

  for (const heading of markdownHeadingPositions(markdown)) {
    if (heading.offset > offset) break;
    if (heading.level <= 3) {
      current = heading.id;
    }
  }

  return current;
}

export function findMarkdownHeadingPosition(markdown, headingId) {
  return markdownHeadingPositions(markdown).find((heading) => heading.id === headingId) ?? null;
}

export function markdownHeadingPositions(markdown) {
  const positions = [];
  const usedIds = new Map();
  const lines = markdown.split("\n");
  let offset = 0;

  for (let line = 0; line < lines.length; line += 1) {
    const text = lines[line];
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(text);

    if (match) {
      const level = match[1].length;
      const headingText = markdownHeadingText(match[2]);
      positions.push({
        id: uniqueSlug(headingText, usedIds),
        level,
        line,
        offset,
      });
    }

    offset += text.length + 1;
  }

  return positions;
}

function offsetAtMarkdownLine(markdown, line) {
  const lines = markdown.split("\n");
  let offset = 0;

  for (let index = 0; index < Math.min(line, lines.length); index += 1) {
    offset += lines[index].length + 1;
  }

  return offset;
}

function markdownHeadingText(markdown) {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function uniqueSlug(text, usedIds) {
  const base =
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "heading";
  const count = usedIds.get(base) ?? 0;
  usedIds.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}
