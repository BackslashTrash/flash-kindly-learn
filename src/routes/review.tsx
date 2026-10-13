import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { deckName } from "@/lib/decks";
import { getData, setData, useCards, useData, type Card, type Mode } from "@/lib/store";
import { buildQueue, grade, today } from "@/lib/schedule";
import { compareSequence, hasKeyword, wordCount } from "@/lib/match";
import { useSpeech } from "@/lib/speech";
import { sync } from "@/lib/sync";

export const Route = createFileRoute("/review")({
  validateSearch: (s: Record<string, unknown>) => ({ deck: typeof s.deck === "string" ? s.deck : "all" }),
  head: () => ({
    meta: [
      { title: "Recall — Review" },
      { name: "description", content: "Answer from memory, then reveal." },
      { property: "og:title", content: "Recall — Review" },
      { property: "og:description", content: "Answer from memory, then reveal." },
    ],
  }),
  component: Review,
});

function Review() {
  const { deck } = Route.useSearch();
  const cards = useCards();
  const data = useData();
  const queue = useMemo(() => buildQueue(cards, deck), [cards, deck, data]);

  // start or resume session
  useEffect(() => {
    const s = getData().session;
    if (!s || s.deck !== deck || s.startedAt.slice(0, 10) !== today()) {
      setData((d) => ({ ...d, session: { deck, startedAt: new Date().toISOString(), reviewIds: [] } }));
    }
  }, [deck]);

  const card = queue[0];
  if (!card) return <SessionEnd deck={deck} />;
  return <CardView key={card.id} card={card} left={queue.length} />;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-[4px] border-2 border-ink bg-card px-2 py-0.5 text-sm font-bold">{children}</span>;
}

const HINTS: Partial<Record<Card["type"], string>> = {
  worked: "Work it on paper first.",
  sequence: "One step per line.",
  describe: "What is where, what connects to what, which direction.",
};

function CardView({ card, left }: { card: Card; left: number }) {
  const { settings } = useData();
  const [answer, setAnswer] = useState("");
  const [usedVoice, setUsedVoice] = useState(false);
  const [aloud, setAloud] = useState(false);
  const [drew, setDrew] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [said, setSaid] = useState<Set<string>>(new Set());
  const box = useRef<HTMLTextAreaElement>(null);
  const touch = useRef<number | null>(null);
  const speech = useSpeech(settings.lang, (t) => {
    setUsedVoice(true);
    setAnswer((a) => (a ? a.replace(/\s*$/, " ") : "") + t);
  });
  const isSketch = card.type === "sketch";
  const canReveal = wordCount(answer) >= 3 || aloud || drew;

  useEffect(() => {
    if (!isSketch && window.matchMedia("(min-width: 768px)").matches) box.current?.focus();
  }, [isSketch]);

  const mode: Mode = drew ? "sketch" : aloud && wordCount(answer) < 3 ? "aloud" : usedVoice ? "voice" : "typed";
  const hits = card.keywords.map((k) =>
    mode === "aloud" || mode === "sketch" ? said.has(k) : hasKeyword(answer, k),
  );
  const missed = card.keywords.filter((_, i) => !hits[i]);
  const suggestWrong = missed.length > 0;

  const reveal = () => {
    if (!canReveal) return;
    speech.stop();
    setRevealed(true);
  };
  const finish = (r: "right" | "wrong") => {
    grade(card, r, missed, mode);
    sync();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement === box.current;
      if (!revealed && e.code === "Space" && !typing) {
        e.preventDefault();
        reveal();
      } else if (revealed && e.key === "1") finish("wrong");
      else if (revealed && e.key === "2") finish("right");
      else if (!revealed && typing && e.code === "Space" && e.ctrlKey) reveal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const seq = card.type === "sequence" ? compareSequence(answer.split("\n").filter((l) => l.trim()), card.keywords) : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-8 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="font-bold underline">
          ← Home
        </Link>
        <span className="font-bold">{left} left</span>
      </div>

      <div
        className={`brut bg-card p-5 ${revealed ? "flip-in" : ""}`}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (!revealed || touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (dx > 80) finish("right");
          else if (dx < -80) finish("wrong");
          touch.current = null;
        }}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Tag>{deckName(card.deck)}</Tag>
          <Tag>{card.unit}</Tag>
          <Tag>{card.type}</Tag>
        </div>
        <p className="prompt-text">{card.prompt}</p>
        {card.type === "evaluate" && !revealed && (
          <ol className="mt-3 list-decimal pl-5 text-muted-foreground">
            <li>judgement</li>
            <li>evidence (case + number)</li>
            <li>other side</li>
            <li>why judgement holds</li>
          </ol>
        )}
        {HINTS[card.type] && !revealed && <p className="mt-3 font-bold text-muted-foreground">{HINTS[card.type]}</p>}

        {!revealed ? (
          <div className="mt-5 space-y-3">
            {!isSketch && (
              <>
                <div className="flex gap-3">
                  <textarea
                    ref={box}
                    value={answer + (speech.interim ? (answer ? " " : "") + speech.interim : "")}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={card.type === "sequence" ? 6 : 4}
                    placeholder="Your answer from memory…"
                    className="brut min-h-[120px] w-full flex-1 resize-y bg-background p-3 text-base outline-none"
                  />
                  {speech.supported && (
                    <button
                      onClick={speech.toggle}
                      aria-label={speech.listening ? "Stop microphone" : "Speak your answer"}
                      className={`btn press w-16 shrink-0 self-stretch px-0 text-2xl md:w-14 ${speech.listening ? "bg-wrong text-on-accent" : ""}`}
                    >
                      {speech.listening ? "■" : "🎤"}
                    </button>
                  )}
                </div>
                {!speech.supported && (
                  <p className="text-sm text-muted-foreground">Use your keyboard's dictation mic instead.</p>
                )}
                <button
                  onClick={() => {
                    setAloud(true);
                    speech.stop();
                    setRevealed(true);
                  }}
                  className="btn press w-full"
                >
                  I said it aloud
                </button>
              </>
            )}
            {isSketch && (
              <button
                onClick={() => {
                  setDrew(true);
                  setRevealed(true);
                }}
                className="btn press w-full"
              >
                I drew it on paper
              </button>
            )}
            <button onClick={reveal} disabled={!canReveal} className="btn press w-full bg-chem text-on-accent">
              Reveal
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {answer.trim() && (
              <div>
                <div className="text-sm font-bold text-muted-foreground">Your answer</div>
                <p className="whitespace-pre-wrap">{answer}</p>
              </div>
            )}
            <div className="rounded-[6px] border-[3px] border-ink bg-muted p-3">
              <div className="text-sm font-bold text-muted-foreground">Correct answer</div>
              <p className="whitespace-pre-wrap">{card.answer}</p>
            </div>
            {seq ? (
              <ol className="space-y-2">
                {seq.map((s, i) => (
                  <li
                    key={i}
                    className={`rounded-[6px] border-2 border-ink p-2 text-on-accent ${s.status === "ok" ? "bg-right" : "bg-wrong"}`}
                  >
                    <b>
                      {i + 1}. {s.step}
                    </b>
                    <div className="text-sm">
                      {s.status === "missing" ? "Missing" : s.status === "order" ? `Out of order: “${s.line}”` : `“${s.line}”`}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-wrap gap-2">
                {card.keywords.map((k, i) => {
                  const manual = mode === "aloud" || mode === "sketch";
                  const cls = manual ? (hits[i] ? "bg-right" : "bg-neutral") : hits[i] ? "bg-right" : "bg-wrong";
                  return (
                    <button
                      key={k}
                      disabled={!manual}
                      onClick={() =>
                        setSaid((s) => {
                          const n = new Set(s);
                          if (n.has(k)) n.delete(k);
                          else n.add(k);
                          return n;
                        })
                      }
                      className={`rounded-full border-2 border-ink px-3 py-1 font-bold text-on-accent disabled:cursor-default ${cls}`}
                    >
                      {k}
                    </button>
                  );
                })}
                {(mode === "aloud" || mode === "sketch") && (
                  <p className="w-full text-sm text-muted-foreground">Tap the ones you got.</p>
                )}
              </div>
            )}
            {card.source && <p className="text-sm text-muted-foreground">Source: {card.source}</p>}
          </div>
        )}
      </div>

      {revealed && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => finish("wrong")}
            className={`btn press bg-wrong text-on-accent ${suggestWrong ? "outline outline-4 outline-offset-4 outline-ink" : ""}`}
          >
            Wrong <span className="hidden text-sm md:inline">(1)</span>
          </button>
          <button
            onClick={() => finish("right")}
            className={`btn press bg-right text-on-accent ${!suggestWrong ? "outline outline-4 outline-offset-4 outline-ink" : ""}`}
          >
            Right <span className="hidden text-sm md:inline">(2)</span>
          </button>
          <p className="col-span-2 text-center text-sm text-muted-foreground md:hidden">
            Swipe the card: right = Right, left = Wrong
          </p>
        </div>
      )}
    </div>
  );
}

function SessionEnd({ deck }: { deck: string }) {
  const data = useData();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const s = data.session;
  const revs = s ? data.reviews.filter((r) => s.reviewIds.includes(r.id)) : [];
  if (!s || revs.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-10">
        <div className="brut bg-right p-6 text-on-accent">
          <h1 className="text-2xl">All done for today</h1>
        </div>
        <Link to="/" className="btn press mt-6 w-full">
          Home
        </Link>
      </div>
    );
  }
  const right = revs.filter((r) => r.result === "right").length;
  const last = revs[revs.length - 1].at;
  const secs = Math.round((new Date(last).getTime() - new Date(s.startedAt).getTime()) / 1000);
  const wrong = revs.filter((r) => r.result === "wrong");
  const summary = [
    `RECALL SUMMARY ${today()} ${deck}`,
    ...revs.map(
      (r) => `${r.cardId} | ${r.result}${r.result === "wrong" && r.missed.length ? ` | missed: ${r.missed.join(", ")}` : ""}`,
    ),
    `TOTAL ${right}/${revs.length}`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-10 pt-8">
      <div className="brut bg-chem p-6 text-on-accent">
        <h1 className="text-4xl">
          {right}/{revs.length}
        </h1>
        <p className="mt-1 font-bold">
          {Math.floor(secs / 60)} min {secs % 60} s
        </p>
      </div>
      {wrong.length > 0 && (
        <div className="brut bg-card p-5">
          <h2 className="mb-3 text-xl">To look at again</h2>
          <ul className="space-y-2">
            {wrong.map((r) => (
              <li key={r.id}>
                <b>{r.cardId}</b>
                {r.missed.length > 0 && <div className="text-sm">missed: {r.missed.join(", ")}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(summary);
          setCopied(true);
        }}
        className="btn press w-full bg-geo text-on-accent"
      >
        {copied ? "Copied" : "Copy summary"}
      </button>
      <button
        onClick={() => {
          setData((d) => ({ ...d, session: null }));
          navigate({ to: "/" });
        }}
        className="btn press w-full"
      >
        Done
      </button>
    </div>
  );
}
