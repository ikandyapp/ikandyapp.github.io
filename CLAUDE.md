# CLAUDE.md — IKANDY Website / Arcade

Project notes for future Claude sessions working on the website + arcade.

## Repo
- **Local:** `C:\temp\ikandysite`
- **Remote:** `github.com/ikandyapp/ikandyapp.github.io`
- **Live:** `https://ikandy.app` (GitHub Pages, cached 600s by Fastly)

## Stack
- Plain HTML/CSS/JS, no build step, no framework
- Hosted on GitHub Pages
- Game scores + URL mentions backed by Supabase (PostgREST + Edge Functions)

## Key Files
- `arcade/index.html` — Win98-themed desktop, login flow, taskbar, IKAMP launcher, High Scores window (with Spread tab)
- `arcade/skifree/index.html` + `skifree.js` — basicallydan/skifree.js MIT port (patched: 1 life, fatal trees/rocks/snowboarders, white-on-black HUD, custom game-over overlay)
- `arcade/snake.html`, `pong.html`, `breakout.html`, `pinball.html` — canvas games
- `arcade/spread.html` — Spread the Word URL submission form
- `arcade/ikamp.wsz` — custom Winamp/Webamp skin (non-Winamp-branded)
- `scores.html` — public leaderboard (root, separate from arcade)

## Supabase
- **URL:** `https://grimznincoiujnurhmlx.supabase.co`
- **Anon key (publishable, safe in client JS):** see any HTML file — it's embedded inline
- **Edge Functions:**
  - `arcade-submit-score` — accepts game score POSTs (game must be in VALID_GAMES, score validated against scorePerSecMax, requires UUID + session ID)
  - `arcade-submit-mention` — accepts URL submission POSTs, fetches the URL server-side, verifies "ikandy" keyword AND user handle (or #NNNNN suffix) in the page text, auto-approves or rejects
- **CORS:** locked to `https://ikandy.app` on both functions
- **JWT Verification:** OFF on both
- **Tables / Views:**
  - `arcade_scores` (CHECK constraint on `game` includes all 5 games — must ALTER when adding new games)
  - `arcade_leaderboard` (top 20 per game, dedup to best-per-user)
  - `arcade_mentions` (CHECK on `platform`: youtube/reddit/bluesky/mastodon/hackernews/github/blog)
  - `arcade_mentions_leaderboard` (sum points + rank per user)

## Adding a New Arcade Game (gotchas learned)
1. Add HTML page with canvas + score submission code (copy pattern from `snake.html`)
2. Add icon + start menu entry + switch case in `arcade/index.html`
3. Add tab to High Scores window
4. **Update Edge Function `VALID_GAMES` and `GAME_LIMITS`** — score POSTs return `invalid_game` until redeployed
5. **Update DB CHECK constraint** on `arcade_scores.game` — inserts fail with `23514` until ALTERed
6. Test end-to-end: play → POST 200 with `ok:true,inserted:true` → leaderboard view shows the row

The CHECK constraint and Edge Function whitelist are independent — both must be updated.

## Local Identity (Arcade)
Two localStorage keys:
- `ikandy_arcade_id_v1` — UUID v4, validated against UUID_REGEX, persisted
- `ikandy_arcade_name` — handle string (e.g. "Mildly-Cursed Earl, Quartermaster of the Limp Sail #25429")

Handle suffix `#NNNNN` is unique-per-user (derived from UUID). The Spread the Word verifier accepts either the full handle OR just the `#NNNNN` substring in the post text.

The handle is locked once set (anonymity-with-flavor). A separate optional "display name" exists in the desktop app's Profile panel (`E:\test\ikandy.html`), tracked via `IKANDY_IDENTITY.setDisplayName()` in `src/shadertoy/import.js`.

## Spread the Word
- Supported (auto-verifiable): YouTube, Reddit, Bluesky (via `public.api.bsky.app`), Mastodon, HN, GitHub, generic blogs
- Blocked (SPA): Twitter/X, Instagram, TikTok, Threads, Facebook, LinkedIn
- Points: 250 (YouTube/blog tier), 100 (everything else)
- Daily limits: 3 submissions/day, 1 per platform
- Dedup: canonical URL hash unique across all users (`youtube:VIDEOID`, `reddit:POSTID`, `bsky:HANDLE:RKEY`, etc)
- Edge Function strips `<style>` tags but NOT `<script>` (YouTube hides content in `<script>` JSON blobs)

## Deploy Flow
GitHub Pages auto-deploys on push to `main`. Cache TTL 600s. Hard-refresh (Ctrl+Shift+R) for urgent fixes. Edge Functions deploy via Supabase dashboard (paste code, click Deploy — no CLI set up).
LF→CRLF warnings on commit are harmless.

## PowerShell Patching Patterns
The user works in PowerShell, not bash. Reliable pattern:

Gotchas:
- Avoid PowerShell `-replace` (regex with `$` interpolation can break)
- Multi-line `@'...'@` heredocs use the file's native line endings — mixing CRLF/LF in the file vs anchor causes silent match failures
- Use single-line `.Replace()` calls on unique substrings instead of multi-line blocks when CRLF/LF gets sketchy
- Always confirm with `Select-String` after a patch

## Win98 Aesthetic Conventions
- Title bars: `linear-gradient(90deg, #000080 0%, #1084d0 100%)`
- Buttons: `border-color: #fff #404040 #404040 #fff` + `box-shadow: inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf`
- Pressed state: invert the border colors and box-shadow
- Desktop bg: `#008080` (Win98 teal)
- Cursor: custom SVG (white IKANDY logo + black outline)
- Fonts: `'MS Sans Serif', Tahoma, sans-serif` for UI; `'VT323'` / `'Press Start 2P'` for retro accents

## Game Overlay Pattern
Every game ends with the same structure:
- 44px title (GAME OVER / VICTORY / etc), letter-spaced 0.3em, glow text-shadow
- 12px caps subtitle (FINAL SCORE: N)
- Two buttons in `.btn-row`: `[ PLAY AGAIN ]` (primary white-on-black) and `[ BACK TO ARCADE ]` (secondary muted, links to `index.html`)
- Pinball uses `[ INSERT COIN ]` instead of `[ PRESS START ]` thematically

## Trademark Notes
- **Winamp** is a registered trademark of Winamp Group SA (formerly Llama Group) — actively litigious. Do not use "Winamp" in any visible UI text. We use **IKAMP**. The Webamp library is MIT and fine to use; we ship a custom skin (`ikamp.wsz`) without "WINAMP" baked into bitmaps.
- **SkiFree** uses basicallydan/skifree.js (MIT). LICENSE preserved at `arcade/skifree/LICENSE-skifree.md`. Credit visible in in-game HUD.

## Winners & Founder Badge (DEFERRED — design locked, build later)

Design decisions made but not implemented:
- **6 winners total** (one per game: skifree/snake/pong/breakout/pinball/mentions)
- Each winner gets **free Pro for life**
- Spread the Word winner additionally gets the **Founder badge**
- Winners chosen entirely at user's discretion (leaderboard rank is a signal, not a rule)
- One win per user (no double-dipping across games)
- User can disqualify anyone they suspect of cheating; quality bonuses possible on Spread the Word
- Winners get announced on the main IKANDY site (`ikandy.app` homepage), NOT inside the arcade
- Build deferred until closer to or after Steam launch — pre-launch leaderboards are too noisy to crown

When ready to build:
- New `arcade_winners` table (ikandy_id, game, is_founder, awarded_at, notes; unique on both ikandy_id and game)
- Soft DQ via `disqualified boolean` on `arcade_scores` / `arcade_mentions` (filter from leaderboard views)
- Quality bonus: either separate `arcade_mention_bonuses` table or just SQL UPDATE on the row
- Featured Post mechanism (single hand-picked submission shown on the main site) was discussed but not designed in detail

## Open Items / Deferred
- IKANDY app: "Open Arcade" deep-link menu item with `?id=<uuid>&name=<handle>` params (eliminates retyping login)
- App↔Supabase identity registration (Option C — keypair signing for real handle squat prevention)
- Code signing cert (Certum) for the desktop app
- Steam Direct submission
- Total-mentions meta-leaderboard / IKANDY MVP badge for users holding #1 across multiple games

## Anti-cheat (current state)
The score Edge Function validates:
- UUID format on `ikandyId` and `sessionId`
- Game in whitelist (`VALID_GAMES`)
- Score is non-negative integer ≤ 10M
- timeSec between 0.5 and 7200 (2 hours)
- score ≤ timeSec × scorePerSecMax × 1.08 buffer (per-game)
- interactionCount within plausible per-second bounds (per-game)
- Session ID unique (replay protection via DB unique constraint)

Mention submission protections: server-side fetch + dual keyword/handle check + canonical URL dedup + per-user/per-platform daily caps.

Neither is bulletproof, but both raise the floor enough that drive-by cheating doesn't work.
