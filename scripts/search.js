export function compileRegex(input, caseSensitive) {
  if (!input) return null;
  const flags = caseSensitive ? "g" : "gi";
  try {
    return new RegExp(input, flags);
  } catch {
    return null;
  }
}

export function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function highlight(text, re) {
  const safe = escapeHTML(text);
  if (!re) return safe;

  // Rebuild with no "g" side effects by creating a new regex with same source/flags.
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const r = new RegExp(re.source, flags);

  return safe.replace(r, (m) => `<mark>${escapeHTML(m)}</mark>`);
}