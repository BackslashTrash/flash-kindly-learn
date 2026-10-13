export function norm(s: string) {
  return (
    " " +
    s
      .toLowerCase()
      .replace(/[-‐–—]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim() +
    " "
  );
}
export function hasKeyword(answer: string, kw: string) {
  const k = norm(kw).trim();
  if (!k) return true;
  return norm(answer).includes(" " + k + " ") || norm(answer).replace(/ /g, "").includes(k.replace(/ /g, ""));
}
export function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** For sequence cards: map each correct step to the user's line index. */
export function compareSequence(lines: string[], steps: string[]) {
  let last = -1;
  return steps.map((step) => {
    const idx = lines.findIndex((l) => hasKeyword(l, step));
    const status = idx < 0 ? "missing" : idx < last ? "order" : "ok";
    if (idx >= 0) last = Math.max(last, idx);
    return { step, line: idx >= 0 ? lines[idx] : "", status } as const;
  });
}
