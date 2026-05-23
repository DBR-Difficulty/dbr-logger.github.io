(function () {
  const KEY = "dbr-theme";
  try {
    const storedTheme = window.localStorage.getItem(KEY);
    if (storedTheme === "dark") {
      document.documentElement.dataset.theme = "dark";
    }
  } catch {
    // ignore
  }
})();
