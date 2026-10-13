import { supabase } from "@/integrations/supabase/client";
import { getData, setData, type Review, type CardState } from "./store";

let running = false;
export async function sync() {
  if (running || typeof navigator === "undefined" || !navigator.onLine) return;
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return;
  running = true;
  try {
    const d = getData();
    const uid = s.session.user.id;
    const revs = d.reviews.filter((r) => d.unsynced.includes(r.id));
    if (revs.length) {
      const { error } = await supabase.from("reviews").upsert(
        revs.map((r) => ({
          id: r.id,
          user_id: uid,
          card_id: r.cardId,
          deck: r.deck,
          reviewed_at: r.at,
          result: r.result,
          missed_keywords: r.missed,
          mode: (r.wasNew ? "new:" : "") + r.mode,
        })),
      );
      if (error) throw error;
    }
    const sts = d.unsyncedStates.filter((id) => d.states[id]);
    if (sts.length) {
      const { error } = await supabase.from("card_state").upsert(
        sts.map((id) => ({
          user_id: uid,
          card_id: id,
          step: d.states[id].step,
          due_date: d.states[id].due,
          last_result: d.states[id].last,
          updated_at: d.states[id].updatedAt,
        })),
      );
      if (error) throw error;
    }
    const [{ data: rr }, { data: ss }] = await Promise.all([
      supabase.from("reviews").select("*").order("reviewed_at").limit(10000),
      supabase.from("card_state").select("*").limit(10000),
    ]);
    setData((cur) => {
      const known = new Set(cur.reviews.map((r) => r.id));
      const added: Review[] = (rr ?? [])
        .filter((r) => !known.has(r.id))
        .map((r) => {
          const isNew = r.mode.startsWith("new:");
          const at = new Date(r.reviewed_at);
          const pad = (n: number) => String(n).padStart(2, "0");
          return {
            id: r.id,
            cardId: r.card_id,
            deck: r.deck,
            at: r.reviewed_at,
            date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
            result: r.result as Review["result"],
            missed: r.missed_keywords ?? [],
            mode: r.mode.replace("new:", "") as Review["mode"],
            wasNew: isNew,
          };
        });
      const states: Record<string, CardState> = { ...cur.states };
      for (const r of ss ?? []) {
        const local = states[r.card_id];
        if (!local || local.updatedAt < r.updated_at)
          states[r.card_id] = {
            step: r.step,
            due: r.due_date,
            last: (r.last_result as CardState["last"]) ?? null,
            updatedAt: r.updated_at,
          };
      }
      return {
        ...cur,
        reviews: [...cur.reviews, ...added].sort((a, b) => a.at.localeCompare(b.at)),
        states,
        unsynced: cur.unsynced.filter((id) => !revs.some((r) => r.id === id)),
        unsyncedStates: cur.unsyncedStates.filter((id) => !sts.includes(id)),
      };
    });
  } catch (e) {
    console.warn("sync failed", e);
  } finally {
    running = false;
  }
}
