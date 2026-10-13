import { deckOrder } from "./decks";
import { getData, setData, type Card, type Mode, type Review } from "./store";

export const LADDER = [1, 3, 9, 21];

export function today(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return today(new Date(y, m - 1, d + n));
}

export function dueDate(card: Card) {
  const s = getData().states[card.id];
  return s ? s.due : card.created;
}

/** Cards to review now for a deck ("all" = every deck in order), respecting daily caps. */
export function buildQueue(cards: Card[], deck: string) {
  const { states, reviews, settings } = getData();
  const t = today();
  const doneToday = reviews.filter((r) => r.date === t);
  const out: Card[] = [];
  const deckIds = [...new Set(cards.map((c) => c.deck))].sort((a, b) => deckOrder(a) - deckOrder(b));
  for (const d of deckIds) {
    if (deck !== "all" && d !== deck) continue;
    const inDeck = cards.filter((c) => c.deck === d);
    const doneIds = new Set(doneToday.filter((r) => r.deck === d).map((r) => r.cardId));
    const newDone = doneToday.filter((r) => r.deck === d && r.wasNew).length;
    const revDone = doneToday.filter((r) => r.deck === d && !r.wasNew).length;
    const sorter = (a: Card, b: Card) =>
      dueDate(a).localeCompare(dueDate(b)) || a.created.localeCompare(b.created);
    const due = inDeck
      .filter((c) => states[c.id] && states[c.id].due <= t)
      .sort(sorter)
      .slice(0, Math.max(0, settings.reviewCap - revDone));
    const fresh = inDeck
      .filter((c) => !states[c.id] && c.created <= t && !doneIds.has(c.id))
      .sort(sorter)
      .slice(0, Math.max(0, settings.newCap - newDone));
    // overdue first within the deck
    const merged = [...due, ...fresh].sort((a, b) => {
      const ao = dueDate(a) < t ? 0 : 1;
      const bo = dueDate(b) < t ? 0 : 1;
      return ao - bo || sorter(a, b);
    });
    out.push(...merged);
  }
  // global: overdue first, then deck order
  return out.sort((a, b) => {
    const ao = dueDate(a) < t ? 0 : 1;
    const bo = dueDate(b) < t ? 0 : 1;
    return ao - bo || deckOrder(a.deck) - deckOrder(b.deck);
  });
}

export function nextDue(cards: Card[]) {
  const t = today();
  const dates = cards.map(dueDate).filter((d) => d > t).sort();
  return dates[0] ?? null;
}

export function grade(card: Card, result: "right" | "wrong", missed: string[], mode: Mode) {
  const t = today();
  const now = new Date().toISOString();
  setData((d) => {
    const prev = d.states[card.id];
    const step = result === "wrong" ? 0 : prev ? Math.min(prev.step + 1, 3) : 0;
    const review: Review = {
      id: crypto.randomUUID(),
      cardId: card.id,
      deck: card.deck,
      at: now,
      date: t,
      result,
      missed,
      mode,
      wasNew: !prev,
    };
    return {
      ...d,
      states: { ...d.states, [card.id]: { step, due: addDays(t, LADDER[step]), last: result, updatedAt: now } },
      reviews: [...d.reviews, review],
      unsynced: [...d.unsynced, review.id],
      unsyncedStates: [...new Set([...d.unsyncedStates, card.id])],
      session: d.session ? { ...d.session, reviewIds: [...d.session.reviewIds, review.id] } : d.session,
    };
  });
}
