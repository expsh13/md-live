import {
  initEditor,
  isInEditMode,
  prepareEditTransition,
  scrollEditorToHeading,
  toggleEditMode,
} from "./editor.js";
import { initReload, restoreHeadingPosition } from "./reload.js";
import {
  getCurrentHeadingId,
  initToc,
  refreshHeadingReferences,
  scrollToHeading,
  toggleToc,
  updateActiveHeading,
} from "./toc.js";

const article = document.querySelector("article");
const editor = document.querySelector(".markdown-editor");
const modeToggle = document.querySelector(".mode-toggle");
const saveStatus = document.querySelector(".save-status");
const tocNav = document.querySelector(".toc nav");
const resizer = document.querySelector(".toc-resizer");

initToc({ tocResizer: resizer });
initEditor({ article, editor, modeToggle, saveStatus });
initReload({
  isEditing: isInEditMode,
  getCurrentHeadingId,
});

refreshHeadingReferences();
restoreHeadingPosition(scrollToHeading);
updateActiveHeading();

window.addEventListener("keydown", async (event) => {
  if (!event.metaKey && !event.ctrlKey) return;

  const key = event.key.toLowerCase();

  if (key === "b") {
    event.preventDefault();
    toggleToc();
    return;
  }

  if (key !== "e") return;

  event.preventDefault();
  prepareEditTransition();
  await toggleEditMode();
});

tocNav?.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-heading-id]");
  if (!link) return;

  event.preventDefault();
  const headingId = link.dataset.headingId;

  if (isInEditMode()) {
    scrollEditorToHeading(headingId);
    return;
  }

  history.pushState(null, "", link.getAttribute("href"));
  scrollToHeading(headingId);
});

article?.addEventListener("click", (event) => {
  const link = event.target.closest(".heading-anchor");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href?.startsWith("#")) return;

  event.preventDefault();
  history.pushState(null, "", href);
  scrollToHeading(decodeURIComponent(href.slice(1)));
});
