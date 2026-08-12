(function () {
  var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var applyTheme = function () {
    document.documentElement.setAttribute(
      'data-bs-theme',
      mediaQuery.matches ? 'dark' : 'light',
    );
  };
  applyTheme();
  mediaQuery.addEventListener('change', applyTheme);
})();
