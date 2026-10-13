import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/Nav";
import { DECKS } from "@/lib/decks";
import { useCards, useData } from "@/lib/store";
import { addDays, today } from "@/lib/schedule";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Recall — Stats" },
      { name: "description", content: "Right and wrong over the last 14 days, and your hardest cards." },
      { property: "og:title", content: "Recall — Stats" },
      { property: "og:description", content: "Right and wrong over the last 14 days." },
    ],
  }),
  component: Stats,
});

function Stats() {
  const { reviews } = useData();
  const cards = useCards();
  const t = today();
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
  const decks = DECKS.filter((d) => reviews.some((r) => r.deck === d.id));
  const wrongCount = new Map<string, number>();
  reviews.filter((r) => r.result === "wrong").forEach((r) => wrongCount.set(r.cardId, (wrongCount.get(r.cardId) ?? 0) + 1));
  const top = [...wrongCount].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <Page title="Stats">
      {decks.length === 0 && <p>No reviews yet.</p>}
      {decks.map((d) => {
        const per = days.map((day) => {
          const rs = reviews.filter((r) => r.deck === d.id && r.date === day);
          return { day, right: rs.filter((r) => r.result === "right").length, wrong: rs.filter((r) => r.result === "wrong").length };
        });
        const max = Math.max(1, ...per.map((p) => p.right + p.wrong));
        return (
          <section key={d.id} className="brut mb-6 bg-card p-4">
            <h2 className="mb-3 text-lg">{d.name}</h2>
            <div className="flex h-32 items-end gap-1">
              {per.map((p) => (
                <div key={p.day} className="flex flex-1 flex-col justify-end" title={`${p.day}: ${p.right} right, ${p.wrong} wrong`}>
                  {p.wrong > 0 && <div className="border-2 border-ink bg-wrong" style={{ height: `${(p.wrong / max) * 120}px` }} />}
                  {p.right > 0 && <div className="border-2 border-ink bg-right" style={{ height: `${(p.right / max) * 120}px` }} />}
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{days[0].slice(5)}</span>
              <span>today</span>
            </div>
          </section>
        );
      })}
      {top.length > 0 && (
        <section className="brut bg-card p-4">
          <h2 className="mb-3 text-lg">Most missed</h2>
          <ol className="space-y-2">
            {top.map(([id, n]) => (
              <li key={id} className="flex justify-between gap-3">
                <span>{cards.find((c) => c.id === id)?.prompt ?? id}</span>
                <b className="shrink-0">{n}×</b>
              </li>
            ))}
          </ol>
        </section>
      )}
    </Page>
  );
}
