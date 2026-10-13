import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/Nav";
import { deckName, deckOrder } from "@/lib/decks";
import { useCards, useData } from "@/lib/store";
import { LADDER } from "@/lib/schedule";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Recall — Browse cards" },
      { name: "description", content: "All cards by unit, with their next review date." },
      { property: "og:title", content: "Recall — Browse cards" },
      { property: "og:description", content: "All cards by unit, with their next review date." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const cards = useCards();
  const { states } = useData();
  const [q, setQ] = useState("");
  const ql = q.toLowerCase();
  const list = cards
    .filter((c) => !ql || `${c.prompt} ${c.topic} ${c.unit} ${c.answer}`.toLowerCase().includes(ql))
    .sort((a, b) => deckOrder(a.deck) - deckOrder(b.deck) || a.unit.localeCompare(b.unit));
  const groups = new Map<string, typeof list>();
  list.forEach((c) => {
    const k = `${deckName(c.deck)} · ${c.unit}`;
    groups.set(k, [...(groups.get(k) ?? []), c]);
  });

  return (
    <Page title="Browse">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cards"
        className="brut mb-6 min-h-[52px] w-full bg-card px-4 outline-none"
      />
      {[...groups].map(([g, cs]) => (
        <section key={g} className="mb-6">
          <h2 className="mb-3 text-lg">{g}</h2>
          <ul className="space-y-3">
            {cs.map((c) => {
              const s = states[c.id];
              return (
                <li key={c.id} className="brut bg-card p-4">
                  <p className="font-bold">{c.prompt}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s ? `Step ${LADDER[s.step]} days · next ${s.due}` : `New · from ${c.created}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {list.length === 0 && <p>No cards match.</p>}
    </Page>
  );
}
