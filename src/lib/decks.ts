// Add a deck: one entry here + one JSON file in /public/cards/.
export const DECKS = [
  { id: "chem", name: "Chemistry", code: "SCH4U", file: "chem.json", color: "chem" },
  { id: "geo", name: "Geography", code: "CGW4U", file: "geo.json", color: "geo" },
  { id: "ess", name: "Earth and Space", code: "SES4U", file: "ess.json", color: "ess" },
] as const;

export type DeckId = string;

// Default: raw GitHub URL of this repo's main branch + "/public/cards/".
// Leave empty to use the bundled /cards/ copy. Editable in Settings.
export const CARDS_BASE_URL = "";

export const deckName = (id: string) => DECKS.find((d) => d.id === id)?.name ?? id;
export const deckOrder = (id: string) => {
  const i = DECKS.findIndex((d) => d.id === id);
  return i < 0 ? 99 : i;
};
