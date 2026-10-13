<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Rules
- App is local-first: all state lives in localStorage (src/lib/store.ts); Cloud is only a sync target (src/lib/sync.ts). Why: reviewing must never wait on the network or require sign-in.
- Card content only comes from /public/cards/*.json (or the configured remote base URL); never store cards in the database. Why: another tool owns the card files.
- Decks are defined in one config array (src/lib/decks.ts). Why: adding a deck = one entry + one JSON file.
- Root renders routes only after mount. Why: all data is client-side; avoids hydration mismatches.
