const ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/** Speech recognition may write "sixty three" or "ten" where a keyword says "63" or "10". */
function numberWordsToDigits(s: string) {
  const words = s.split(" ");
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i] ?? "";
    if (Object.hasOwn(TENS, w)) {
      const next = words[i + 1] ?? "";
      const unit = Object.hasOwn(ONES, next) ? ONES[next] : undefined;
      if (unit !== undefined && unit > 0 && unit < 10) {
        out.push(String(TENS[w]! + unit));
        i++;
      } else out.push(String(TENS[w]));
    } else if (Object.hasOwn(ONES, w)) out.push(String(ONES[w]));
    else if (w === "hundred" && out.length && out[out.length - 1] === "1")
      out[out.length - 1] = "100";
    else if (w === "hundred" && (words[i - 1] ?? "") === "a") out[out.length - 1] = "100";
    else out.push(w);
  }
  return out.join(" ");
}

export function norm(s: string) {
  const base = s
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/(\p{L})[-‐–—](\p{L})/gu, "$1 $2")
    .replace(/[-‐–—]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return " " + numberWordsToDigits(base) + " ";
}
export function hasKeyword(answer: string, kw: string) {
  const k = norm(kw).trim();
  if (!k) return true;
  const a = norm(answer);
  return a.includes(" " + k + " ") || a.replace(/ /g, "").includes(k.replace(/ /g, ""));
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
