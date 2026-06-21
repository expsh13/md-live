const visibleHeadingLevels = new Set(["H1", "H2", "H3"]);

let resizer = null;
let isResizingToc = false;
let lastOpenTocWidth = 280;
let currentHeadingId = null;
let isProgrammaticScroll = false;
let programmaticScrollTimer = null;
let allHeadings = [];
let activeHeadings = [];

export function initToc({ tocResizer }) {
  resizer = tocResizer;

  let savedTocWidth = null;
  try {
    savedTocWidth = localStorage.getItem("toc-width");
  } catch {
    savedTocWidth = null;
  }

  if (savedTocWidth) {
    applyTocWidth(Number(savedTocWidth));
  }

  resizer?.addEventListener("pointerdown", startTocResize);
  resizer?.addEventListener("mousedown", startTocResize);
  window.addEventListener("pointermove", moveTocResize);
  window.addEventListener("mousemove", moveTocResize);
  window.addEventListener("pointerup", stopTocResize);
  window.addEventListener("mouseup", stopTocResize);
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", updateActiveHeading);
}

export function toggleToc() {
  if (currentTocWidth() <= 16) {
    applyTocWidth(lastOpenTocWidth);
    return;
  }

  applyTocWidth(0);
}

export function setActive(id) {
  document.querySelectorAll(".toc .active, .toc .active-parent").forEach((node) => {
    node.classList.remove("active", "active-parent");
  });

  const visibleHeadingId = visibleHeadingIdFor(id);
  if (!visibleHeadingId) return;

  const link = document.querySelector(
    '.toc a[data-heading-id="' + CSS.escape(visibleHeadingId) + '"]',
  );
  if (!link) return;

  currentHeadingId = visibleHeadingId;
  link.classList.add("active");
  scrollActiveTocLinkIntoView(link);
}

export function updateActiveHeading() {
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

export function refreshHeadingReferences() {
  allHeadings = Array.from(
    document.querySelectorAll(
      "article h1[id], article h2[id], article h3[id], article h4[id], article h5[id], article h6[id]",
    ),
  );
  activeHeadings = allHeadings.filter((heading) => visibleHeadingLevels.has(heading.tagName));
}

export function activeTocHeadingId() {
  return document.querySelector(".toc a.active")?.dataset.headingId ?? null;
}

export function headingIdFromViewport() {
  let current = activeHeadings[0];
  const activeLine = Math.round(window.innerHeight * 0.38);

  for (const heading of activeHeadings) {
    if (heading.getBoundingClientRect().top <= activeLine) {
      current = heading;
    } else {
      break;
    }
  }

  return current?.id ?? null;
}

export function scrollToHeading(id, behavior = "auto") {
  if (!id) return;

  const heading = document.getElementById(id);
  if (!heading) return;

  suspendScrollActiveUpdate();
  heading.scrollIntoView({ behavior, block: "start" });
  setActive(id);
}

export function getCurrentHeadingId() {
  return currentHeadingId;
}

function applyTocWidth(clientX) {
  const width = Math.min(Math.max(clientX, 0), 520);
  document.documentElement.style.setProperty("--toc-width", width + "px");
  document.body.classList.toggle("toc-closed", width <= 16);
  if (width > 16) {
    lastOpenTocWidth = width;
  }
  try {
    localStorage.setItem("toc-width", String(width));
  } catch {
    // Ignore storage failures; resizing still works for the current page.
  }
}

function currentTocWidth() {
  const width = getComputedStyle(document.documentElement).getPropertyValue("--toc-width");
  return Number.parseFloat(width) || 0;
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

function handleScroll() {
  if (document.body.classList.contains("editing")) return;
  if (isProgrammaticScroll) return;
  updateActiveHeading();
}

function suspendScrollActiveUpdate() {
  isProgrammaticScroll = true;
  clearTimeout(programmaticScrollTimer);
  programmaticScrollTimer = setTimeout(() => {
    isProgrammaticScroll = false;
  }, 200);
}

function visibleHeadingIdFor(id) {
  if (document.querySelector('.toc a[data-heading-id="' + CSS.escape(id) + '"]')) {
    return id;
  }

  let current = null;

  for (const heading of allHeadings) {
    if (visibleHeadingLevels.has(heading.tagName)) {
      current = heading.id;
    }
    if (heading.id === id) {
      return current;
    }
  }

  return current;
}
