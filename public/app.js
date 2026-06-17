const resizer = document.querySelector(".toc-resizer");
const visibleHeadingLevels = new Set(["H1", "H2", "H3"]);
const scrollStorageKey = "md-to-html-scroll-y";

try {
  history.scrollRestoration = "manual";
} catch {
  // Ignore unsupported browsers.
}

const reloadEvents = new EventSource("/events");
reloadEvents.addEventListener("reload", () => {
  if (document.body.classList.contains("editing")) return;
  reloadWithScrollRestoration();
});

let isResizingToc = false;
let savedTocWidth = null;
let isEditing = false;
let saveTimer = null;
let latestSave = Promise.resolve();
let previewScrollY = window.scrollY;
let previewScrollRatio = getScrollRatio(window.scrollY);
let links = [];
let headings = [];
let activeHeadings = [];

const article = document.querySelector("article");
const editor = document.querySelector(".markdown-editor");
const modeToggle = document.querySelector(".mode-toggle");
const saveStatus = document.querySelector(".save-status");
const tocNav = document.querySelector(".toc nav");

try {
  savedTocWidth = localStorage.getItem("toc-width");
} catch {
  savedTocWidth = null;
}

if (savedTocWidth) {
  applyTocWidth(Number(savedTocWidth));
}

function applyTocWidth(clientX) {
  const width = Math.min(Math.max(clientX, 0), 520);
  document.documentElement.style.setProperty("--toc-width", width + "px");
  document.body.classList.toggle("toc-closed", width <= 16);
  try {
    localStorage.setItem("toc-width", String(width));
  } catch {
    // Ignore storage failures; resizing still works for the current page.
  }
}

function startTocResize(event) {
  event.preventDefault();
  isResizingToc = true;
  document.body.classList.add("resizing-toc");
  if (event.pointerId !== undefined) {
    resizer.setPointerCapture(event.pointerId);
  }
}

function moveTocResize(event) {
  if (!isResizingToc) return;
  applyTocWidth(event.clientX);
}

function stopTocResize(event) {
  if (!isResizingToc) return;
  isResizingToc = false;
  document.body.classList.remove("resizing-toc");
  if (event.pointerId !== undefined && resizer.hasPointerCapture(event.pointerId)) {
    resizer.releasePointerCapture(event.pointerId);
  }
}

resizer?.addEventListener("pointerdown", startTocResize);
resizer?.addEventListener("mousedown", startTocResize);
window.addEventListener("pointermove", moveTocResize);
window.addEventListener("mousemove", moveTocResize);
window.addEventListener("pointerup", stopTocResize);
window.addEventListener("mouseup", stopTocResize);

function setActive(id) {
  document.querySelectorAll(".toc .active, .toc .active-parent").forEach((node) => {
    node.classList.remove("active", "active-parent");
  });

  const link = document.querySelector('.toc a[data-heading-id="' + CSS.escape(id) + '"]');
  if (!link) return;

  link.classList.add("active");
  scrollActiveTocLinkIntoView(link);
}

function scrollActiveTocLinkIntoView(link) {
  const toc = link.closest(".toc");
  if (!toc) return;

  const linkRect = link.getBoundingClientRect();
  const tocRect = toc.getBoundingClientRect();
  const targetOffset = linkRect.top - tocRect.top - toc.clientHeight / 2 + link.clientHeight / 2;
  toc.scrollTo({
    top: toc.scrollTop + targetOffset,
    behavior: "smooth",
  });
}

function updateActiveHeading() {
  let current = activeHeadings[0];
  const activeLine = Math.round(window.innerHeight * 0.38);

  for (const heading of activeHeadings) {
    if (heading.getBoundingClientRect().top <= activeLine) {
      current = heading;
    } else {
      break;
    }
  }

  if (current) setActive(current.id);
}

window.addEventListener("scroll", handleScroll, { passive: true });
window.addEventListener("resize", updateActiveHeading);
refreshHeadingReferences();
restoreScrollPosition();
updateActiveHeading();

modeToggle?.addEventListener("click", async () => {
  if (isEditing) {
    await leaveEditMode();
    return;
  }

  await enterEditMode();
});

editor?.addEventListener("input", () => {
  syncEditorHeight();
  queueSave();
});

async function enterEditMode() {
  if (!editor || !article || !modeToggle) return;

  setSaveStatus("読み込み中");
  const response = await fetch("/source");
  if (!response.ok) {
    setSaveStatus("読み込み失敗");
    return;
  }

  editor.value = await response.text();
  const scrollRatio = getScrollRatio(previewScrollY);
  previewScrollRatio = scrollRatio;
  editor.selectionStart = 0;
  editor.selectionEnd = 0;
  isEditing = true;
  document.body.classList.add("editing");
  article.hidden = true;
  editor.hidden = false;
  syncEditorHeight();
  modeToggle.textContent = "プレビュー";
  modeToggle.setAttribute("aria-pressed", "true");
  setSaveStatus("編集可能");
  editor.focus({ preventScroll: true });
  restoreScrollRatio(scrollRatio);
}

async function leaveEditMode() {
  if (!editor || !article || !modeToggle) return;

  const scrollRatio = previewScrollRatio;
  clearTimeout(saveTimer);
  await latestSave;
  await saveSource();
  const preview = await fetchContent();
  if (!preview) return;

  isEditing = false;
  document.body.classList.remove("editing");
  article.innerHTML = preview.content;
  if (tocNav) {
    tocNav.innerHTML = preview.toc;
  }
  refreshHeadingReferences();
  article.hidden = false;
  editor.hidden = true;
  modeToggle.textContent = "編集";
  modeToggle.setAttribute("aria-pressed", "false");
  const restore = () => {
    restoreScrollRatio(scrollRatio);
    updateActiveHeading();
  };
  requestAnimationFrame(restore);
  setTimeout(restore, 100);
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

function handleScroll() {
  if (!isEditing) {
    previewScrollY = window.scrollY;
    previewScrollRatio = getScrollRatio(window.scrollY);
  }
  updateActiveHeading();
}

function getScrollRatio(scrollY) {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  return scrollY / maxScroll;
}

function restoreScrollRatio(ratio) {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  window.scrollTo({ top: maxScroll * ratio, behavior: "auto" });
}

async function fetchContent() {
  const response = await fetch("/content", { cache: "no-store" });
  if (!response.ok) {
    setSaveStatus("プレビュー更新失敗");
    return null;
  }
  return response.json();
}

function refreshHeadingReferences() {
  links = Array.from(document.querySelectorAll(".toc a[data-heading-id]"));
  headings = links.map((link) => document.getElementById(link.dataset.headingId)).filter(Boolean);
  activeHeadings = headings.filter((heading) => visibleHeadingLevels.has(heading.tagName));
}

function syncEditorHeight() {
  if (!editor) return;
  editor.style.height = "auto";
  editor.style.height = editor.scrollHeight + "px";
}

function reloadWithScrollRestoration(scrollY = window.scrollY) {
  try {
    localStorage.setItem(scrollStorageKey, String(scrollY));
  } catch {
    // Ignore storage failures; reload still works.
  }
  window.location.reload();
}

function restoreScrollPosition() {
  let storedScrollY = null;

  try {
    storedScrollY = localStorage.getItem(scrollStorageKey);
    localStorage.removeItem(scrollStorageKey);
  } catch {
    storedScrollY = null;
  }

  if (storedScrollY === null) return;

  const scrollY = Number(storedScrollY);
  const restore = () => {
    window.scrollTo({ top: scrollY, behavior: "auto" });
    previewScrollY = window.scrollY;
    updateActiveHeading();
  };

  requestAnimationFrame(restore);
  window.addEventListener(
    "load",
    () => {
      requestAnimationFrame(restore);
    },
    { once: true },
  );
  setTimeout(() => {
    restore();
  }, 100);
}
