const headingStorageKey = "md-to-html-heading-id";

let getIsEditing = () => false;
let getCurrentHeadingId = () => null;

export function initReload(options) {
  getIsEditing = options.isEditing;
  getCurrentHeadingId = options.getCurrentHeadingId;

  try {
    history.scrollRestoration = "manual";
  } catch {
    // Ignore unsupported browsers.
  }

  const reloadEvents = new EventSource("/events");
  reloadEvents.addEventListener("reload", () => {
    if (getIsEditing()) return;
    reloadWithHeadingRestoration();
  });
}

export function restoreHeadingPosition(scrollToHeading) {
  let storedHeadingId = null;

  try {
    storedHeadingId = localStorage.getItem(headingStorageKey);
    localStorage.removeItem(headingStorageKey);
  } catch {
    storedHeadingId = null;
  }

  if (!storedHeadingId) return;

  const restore = () => {
    scrollToHeading(storedHeadingId, "auto");
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

function reloadWithHeadingRestoration(headingId = getCurrentHeadingId()) {
  try {
    if (headingId) {
      localStorage.setItem(headingStorageKey, headingId);
    }
  } catch {
    // Ignore storage failures; reload still works.
  }
  window.location.reload();
}
