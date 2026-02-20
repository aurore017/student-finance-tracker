export function compileRegex(input) {
  try {
    return input ? new RegExp(input, "i") : null;
  } catch {
    return null;
  }
}

export function highlight(text, re) {
  if (!re) return text;
  return text.replace(re, m => `<mark>${m}</mark>`);
}
