// HCM — Theme Boot
// Restore the saved theme before the page renders.
(function () {
  try {
    const stored = localStorage.getItem("hcm_theme");
    let savedTheme = null;

    if (stored !== null) {
      try {
        // Normal format saved by Store.set(): "dark" or "light"
        savedTheme = JSON.parse(stored);
      } catch (error) {
        // Also accept a plain text value from an older version.
        savedTheme = stored;
      }
    }

    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const theme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : prefersDark
          ? "dark"
          : "light";

    document.documentElement.setAttribute("data-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
