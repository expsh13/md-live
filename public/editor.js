import { editorHeadingIdFromViewport, findMarkdownHeadingPosition } from "./markdown-headings.js";
import {
  activeTocHeadingId,
  getCurrentHeadingId,
  headingIdFromViewport,
  refreshHeadingReferences,
  scrollToHeading,
  setActive,
} from "./toc.js";

let article = null;
let editor = null;
let modeToggle = null;
let saveStatus = null;
let isEditing = false;
let saveTimer = null;
let latestSave = Promise.resolve();
let transitionHeadingId = null;

export function initEditor(elements) {
  article = elements.article;
  editor = elements.editor;
  modeToggle = elements.modeToggle;
  saveStatus = elements.saveStatus;

  modeToggle?.addEventListener("click", async () => {
    await toggleEditMode();
  });

  modeToggle?.addEventListener("pointerdown", () => {
    prepareEditTransition();
  });

  editor?.addEventListener("input", () => {
    syncEditorHeight();
    updateActiveEditorHeading();
    queueSave();
  });

  editor?.addEventListener("scroll", () => {
    updateActiveEditorHeading();
  });
}

export function isInEditMode() {
  return isEditing;
}

export function prepareEditTransition() {
  if (isEditing) return;
  transitionHeadingId = headingIdFromViewport() ?? activeTocHeadingId() ?? getCurrentHeadingId();
}

export async function toggleEditMode() {
  if (isEditing) {
    await leaveEditMode();
    return;
  }

  await enterEditMode();
}

export function scrollEditorToHeading(headingId) {
  if (!editor) return false;

  const headingPosition = findMarkdownHeadingPosition(editor.value, headingId);
  if (!headingPosition) return false;

  editor.focus({ preventScroll: true });
  scrollToEditorLine(headingPosition.line);
  setActive(headingId);
  return true;
}

async function enterEditMode() {
  if (!editor || !article || !modeToggle) return;

  setSaveStatus("読み込み中");
  const response = await fetch("/source");
  if (!response.ok) {
    setSaveStatus("読み込み失敗");
    return;
  }

  editor.value = await response.text();
  const headingId = headingIdFromViewport() ?? activeTocHeadingId() ?? getCurrentHeadingId();
  transitionHeadingId = headingId;
  const headingPosition = headingId ? findMarkdownHeadingPosition(editor.value, headingId) : null;
  const cursorPosition = headingPosition?.offset ?? 0;
  editor.selectionStart = cursorPosition;
  editor.selectionEnd = cursorPosition;
  isEditing = true;
  document.body.classList.add("editing");
  article.hidden = true;
  editor.hidden = false;
  syncEditorHeight();
  modeToggle.textContent = "プレビュー";
  modeToggle.setAttribute("aria-pressed", "true");
  setSaveStatus("編集可能");
  editor.focus({ preventScroll: true });
  scrollToEditorLine(headingPosition?.line ?? 0);
  updateActiveEditorHeading();
}

async function leaveEditMode() {
  if (!editor || !article || !modeToggle) return;

  const headingId =
    editorHeadingIdFromViewport(editor) ?? transitionHeadingId ?? getCurrentHeadingId();
  clearTimeout(saveTimer);
  await latestSave;
  await saveSource();
  const preview = await fetchContent();
  if (!preview) return;

  isEditing = false;
  document.body.classList.remove("editing");
  article.innerHTML = preview.content;
  const tocNav = document.querySelector(".toc nav");
  if (tocNav) {
    tocNav.innerHTML = preview.toc;
  }
  refreshHeadingReferences();
  article.hidden = false;
  editor.hidden = true;
  modeToggle.textContent = "編集";
  modeToggle.setAttribute("aria-pressed", "false");
  const transition = () => {
    scrollToHeading(headingId);
  };
  requestAnimationFrame(transition);
  setTimeout(transition, 100);
}

function queueSave() {
  clearTimeout(saveTimer);
  setSaveStatus("保存待ち");
  saveTimer = setTimeout(() => {
    latestSave = latestSave.then(saveSource, saveSource);
  }, 500);
}

async function saveSource() {
  if (!editor) return;

  setSaveStatus("保存中");
  const response = await fetch("/source", {
    method: "PUT",
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
    body: editor.value,
  });

  if (!response.ok) {
    setSaveStatus("保存失敗");
    return;
  }

  setSaveStatus("保存済み");
}

function setSaveStatus(message) {
  if (!saveStatus) return;
  saveStatus.textContent = message;
}

function updateActiveEditorHeading() {
  const headingId = editorHeadingIdFromViewport(editor);
  if (headingId) {
    setActive(headingId);
  }
}

async function fetchContent() {
  const response = await fetch("/content", { cache: "no-store" });
  if (!response.ok) {
    setSaveStatus("プレビュー更新失敗");
    return null;
  }
  return response.json();
}

function scrollToEditorLine(line) {
  if (!editor) return;

  const styles = getComputedStyle(editor);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 24;
  window.scrollTo({ top: 0, behavior: "auto" });
  editor.scrollTop = Math.max(line * lineHeight - editor.clientHeight * 0.28, 0);
}

function syncEditorHeight() {
  if (!editor) return;
  editor.style.height = "";
}
