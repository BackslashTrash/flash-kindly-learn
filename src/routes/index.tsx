import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/Nav";
import { DECKS } from "@/lib/decks";
import { useCards, useData } from "@/lib/store";
import { addDays, buildQueue, nextDue, today } from "@/lib/schedule";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recall — Review now" },
      { name: "description", content: "Your due flashcards for today, one tap away." },
      { property: "og:title", content: "Recall — Review now" },
      { property: "og:description", content: "Your due flashcards for today, one tap away." },
    ],
  }),
  component: Home,
});

const mins = (n: number) => Math.max(1, Math.round(n * 0.5));

function Home() {
  const cards = useCards();
  const data = useData();
  const all = buildQueue(cards, "all");
  const t = today();
  const decks = DECKS.filter((d) => cards.some((c) => c.deck === d.id));
  const next = nextDue(cards);
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const reviewedDays = new Set(data.reviews.map((r) => r.date));
  const resume = data.session && data.session.reviewIds.length > 0;

  return (
    <Page>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Recall</h1>
        <div className="flex gap-1" aria-label="Last 7 days">
          {days.map((d) => (
            <span
              key={d}
              title={d}
              className={`h-5 w-5 rounded-[4px] border-2 border-ink ${reviewedDays.has(d) ? "bg-right" : "bg-card"}`}
            />
          ))}
        </div>
      </header>

      {all.length > 0 ? (
        <Link
          to="/review"
          search={{ deck: "all" }}
          className="btn press mb-8 w-full bg-chem py-6 text-xl text-on-accent"
        >
          {resume ? "Continue" : "Review now"} ({all.length} due · ~{mins(all.length)} min)
        </Link>
      ) : (
        <div className="brut mb-8 bg-right p-6 text-on-accent">
          <h2 className="text-2xl">All done for today</h2>
          <p className="mt-1">
            {next ? `Next cards due ${next === addDays(t, 1) ? "tomorrow" : next}.` : "No cards scheduled."}
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {decks.map((d) => {
          const q = buildQueue(cards, d.id);
          if (q.length === 0) return null;
          const fresh = q.filter((c) => !data.states[c.id]).length;
          return (
            <div key={d.id} className={`brut p-5 text-on-accent bg-${d.color}`}>
              <div className="text-sm font-bold">{d.code}</div>
              <h2 className="text-xl">{d.name}</h2>
              <p className="mt-2">
                {q.length - fresh} due · {fresh} new · ~{mins(q.length)} min
              </p>
              <Link to="/review" search={{ deck: d.id }} className="btn press mt-4 w-full">
                Start
              </Link>
            </div>
          );
        })}
      </div>
      {/* keep tailwind aware of dynamic deck colours */}
      <span className="hidden bg-chem bg-geo bg-ess" />
    </Page>
  );
}
