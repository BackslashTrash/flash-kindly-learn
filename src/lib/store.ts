import { useSyncExternalStore } from "react";
import { CARDS_BASE_URL } from "./decks";

export type CardType = "because" | "keyword" | "worked" | "sketch" | "evaluate" | "sequence" | "describe";
export interface Card {
  id: string;
  deck: string;
  unit: string;
  topic: string;
  type: CardType;
  prompt: string;
  answer: string;
  keywords: string[];
  source?: string;
  created: string;
}
export type Mode = "typed" | "voice" | "aloud" | "sketch";
export interface Review {
  id: string;
  cardId: string;
  deck: string;
  at: string; // ISO
  date: string; // local YYYY-MM-DD
  result: "right" | "wrong";
  missed: string[];
  mode: Mode;
  wasNew: boolean;
}
export interface CardState {
  step: number; // 0-3
  due: string; // YYYY-MM-DD
  last: "right" | "wrong" | null;
  updatedAt: string;
}
export interface Settings {
  reviewCap: number;
  newCap: number;
  lang: string;
  baseUrl: string;
  theme: "light" | "dark";
}
export interface Session {
  deck: string; // "all" or deck id
  startedAt: string;
  reviewIds: string[];
}
export interface AppData {
  settings: Settings;
  states: Record<string, CardState>;
  reviews: Review[];
  unsynced: string[]; // review ids
  unsyncedStates: string[]; // card ids
  session: Session | null;
}

const KEY = "recall-v1";
const defaults: AppData = {
  settings: { reviewCap: 15, newCap: 6, lang: "en-CA", baseUrl: CARDS_BASE_URL, theme: "light" },
  states: {},
  reviews: [],
  unsynced: [],
  unsyncedStates: [],
  session: null,
};

function load(): AppData {
  if (typeof localStorage === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const d = JSON.parse(raw);
    return { ...defaults, ...d, settings: { ...defaults.settings, ...d.settings } };
  } catch {
    return defaults;
  }
}

let data: AppData = load();
const subs = new Set<() => void>();

export function getData() {
  return data;
}
export function setData(fn: (d: AppData) => AppData) {
  data = fn(data);
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
  subs.forEach((s) => s());
}
function subscribe(cb: () => void) {
  subs.add(cb);
  return () => subs.delete(cb);
}
export function useData() {
  return useSyncExternalStore(subscribe, getData, () => defaults);
}

// ---------- cards ----------
const CARDS_KEY = "recall-cards-v1";
let cards: Card[] = (() => {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CARDS_KEY) || "[]");
  } catch {
    return [];
  }
})();
const cardSubs = new Set<() => void>();
export function useCards() {
  return useSyncExternalStore(
    (cb) => {
      cardSubs.add(cb);
      return () => cardSubs.delete(cb);
    },
    () => cards,
    () => cards,
  );
}
export function getCards() {
  return cards;
}
export function setCards(c: Card[]) {
  cards = c;
  try {
    localStorage.setItem(CARDS_KEY, JSON.stringify(c));
  } catch {}
  cardSubs.forEach((s) => s());
}
