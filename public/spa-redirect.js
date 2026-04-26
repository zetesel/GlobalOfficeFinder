// GitHub Pages SPA fallback: restore path encoded by 404.html
// The path after the base is stored as the search string starting with "/"
// (e.g. "?/company/123"), so we check for that marker to avoid
// interfering with normal query strings.
(function (l) {
  if (l.search[1] === "/") {
    var decoded = l.search
      .slice(1)
      .split("&")
      .map(function (s) {
        return s.replace(/~and~/g, "&");
      });
    window.history.replaceState(
      null,
      null,
      l.pathname.slice(0, -1) +
        decoded[0] +
        (decoded[1] ? "?" + decoded[1] : "") +
        l.hash
    );
  }
})(window.location);
