import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Page } from "@/components/Nav";
import { getData, setData, useData, type Review } from "@/lib/store";
import { refreshCards } from "@/lib/cards";
import { sync } from "@/lib/sync";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Recall — Settings" },
      { name: "description", content: "Daily limits, voice, theme, sync and backups." },
      { property: "og:title", content: "Recall — Settings" },
      { property: "og:description", content: "Daily limits, voice, theme, sync and backups." },
    ],
  }),
  component: Settings,
});

const field = "brut min-h-[52px] w-full bg-card px-4 outline-none";

function Settings() {
  const { settings } = useData();
  const set = (patch: Partial<typeof settings>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(getData().reviews, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `recall-reviews-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const importJson = async (file: File) => {
    try {
      const list = JSON.parse(await file.text()) as Review[];
      setData((d) => {
        const known = new Set(d.reviews.map((r) => r.id));
        const add = list.filter((r) => r && r.id && !known.has(r.id));
        return {
          ...d,
          reviews: [...d.reviews, ...add].sort((a, b) => a.at.localeCompare(b.at)),
          unsynced: [...d.unsynced, ...add.map((r) => r.id)],
        };
      });
      setMsg("Reviews imported.");
      sync();
    } catch {
      setMsg("That file couldn't be read.");
    }
  };

  return (
    <Page title="Settings">
      <div className="space-y-6">
        <section className="brut space-y-4 bg-card p-5">
          <h2 className="text-lg">Daily limits (per deck)</h2>
          <label className="block">
            <span className="font-bold">Review cards</span>
            <input type="number" min={0} value={settings.reviewCap} onChange={(e) => set({ reviewCap: +e.target.value })} className={field} />
          </label>
          <label className="block">
            <span className="font-bold">New cards</span>
            <input type="number" min={0} value={settings.newCap} onChange={(e) => set({ newCap: +e.target.value })} className={field} />
          </label>
        </section>

        <section className="brut space-y-4 bg-card p-5">
          <label className="block">
            <span className="font-bold">Voice language</span>
            <input value={settings.lang} onChange={(e) => set({ lang: e.target.value })} className={field} />
          </label>
          <label className="block">
            <span className="font-bold">Cards address</span>
            <input
              value={settings.baseUrl}
              onChange={(e) => set({ baseUrl: e.target.value })}
              onBlur={() => refreshCards(true)}
              placeholder="https://raw.githubusercontent.com/you/repo/main/public/cards/"
              className={field}
            />
            <span className="text-sm text-muted-foreground">Empty = use the cards built into the app.</span>
          </label>
          <div>
            <span className="font-bold">Theme</span>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(["light", "dark"] as const).map((t) => (
                <button key={t} onClick={() => set({ theme: t })} className={`btn press ${settings.theme === t ? "bg-chem text-on-accent" : ""}`}>
                  {t === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="brut space-y-4 bg-card p-5">
          <h2 className="text-lg">Sync phone and laptop</h2>
          {user ? (
            <>
              <p>Signed in as {user}.</p>
              <button onClick={() => sync()} className="btn press w-full bg-geo text-on-accent">Sync now</button>
              <button onClick={() => supabase.auth.signOut()} className="btn press w-full">Sign out</button>
            </>
          ) : (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const { error } = await supabase.auth.signInWithOtp({
                  email,
                  options: { emailRedirectTo: window.location.origin + "/settings" },
                });
                setMsg(error ? error.message : "Check your email for the sign-in link.");
              }}
            >
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
              <button className="btn press w-full bg-geo text-on-accent">Email me a sign-in link</button>
            </form>
          )}
        </section>

        <section className="brut space-y-3 bg-card p-5">
          <h2 className="text-lg">Backup</h2>
          <button onClick={exportJson} className="btn press w-full">Export reviews (JSON)</button>
          <label className="btn press w-full">
            Import reviews (JSON)
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </label>
        </section>
        {msg && <p className="font-bold" role="status">{msg}</p>}
      </div>
    </Page>
  );
}
