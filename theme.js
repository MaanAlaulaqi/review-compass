/* Runs before the stylesheet so a saved light preference does not flash dark. */
(() => {
  const key = "review-compass-theme";
  const root = document.documentElement;
  const valid = (value) => value === "light" || value === "dark";
  let saved;
  try {
    saved = localStorage.getItem(key);
  } catch {
    /* Storage may be blocked. */
  }

  function apply(theme) {
    root.dataset.theme = theme;

    const button = document.getElementById("themeToggle");

    if (button) {
      const next = theme === "dark" ? "light" : "dark";

      button.textContent = next === "dark" ? "🤓" : "😎"; // press for  light : dark
      button.setAttribute("aria-label", `Switch to ${next} mode`);
      button.title = `Switch to ${next} mode`;
    }

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#080809" : "#f1f1f3");
  }
  apply(valid(saved) ? saved : "dark");
  document.addEventListener("DOMContentLoaded", () => {
    apply(root.dataset.theme);
    document.getElementById("themeToggle")?.addEventListener("click", () => {
      const theme = root.dataset.theme === "dark" ? "light" : "dark";
      apply(theme);
      try {
        localStorage.setItem(key, theme);
      } catch {
        /* Toggle still works. */
      }
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === key)
      apply(valid(event.newValue) ? event.newValue : "dark");
  });
})();
