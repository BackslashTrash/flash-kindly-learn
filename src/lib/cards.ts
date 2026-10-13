import { DECKS } from "./decks";
import { getData, setCards, type Card } from "./store";

async function fetchDeck(base: string, file: string): Promise<Card[]> {
  const urls = base ? [base.replace(/\/?$/, "/") + file, "/cards/" + file] : ["/cards/" + file];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) continue;
      const json = await res.json();
      if (Array.isArray(json)) return json;
    } catch {}
  }
  throw new Error("no cards for " + file);
}

let started = false;
/** Refresh cards in the background once per app open. Cached copy is used instantly. */
export async function refreshCards(force = false) {
  if (started && !force) return;
  started = true;
  const base = getData().settings.baseUrl;
  const results = await Promise.allSettled(DECKS.map((d) => fetchDeck(base, d.file)));
  if (results.every((r) => r.status === "rejected")) return; // keep last good copy
  const all: Card[] = [];
  results.forEach((r) => {
    if (r.status === "fulfilled") all.push(...r.value.filter((c) => c && c.id && c.prompt));
  });
  setCards(all);
}
