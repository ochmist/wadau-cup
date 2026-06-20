# Wadau Cup — Leaderboard Redesign · Design Asset Handoff

> **Task for Claude Code: DOWNLOAD ONLY.**
> Save every file in this bundle into the target repository (suggested location:
> `design/wadau-cup/`). **Do not implement, port, refactor, or recreate anything yet.**
> These are design-reference prototypes. An implementation brief will follow separately.
> Your only job right now is to land these assets in the repo, intact, in one flat
> folder so their relative paths keep resolving.

---

## What this is

The **Leaderboard Redesign** prototype for the Wadau Cup app — a single self-contained
HTML showcase that renders interactive React mocks (desktop + mobile, dark + light).

It covers:
- the **leaderboard** (lean rows, expand-in-place ceiling drawer, prize-pool band)
- the persistent **"you" anchor / jump-to-me**
- the **player profile** (ceiling ledger, points path, where-you-stand)
- **team pages** (Team / Pool tabs, full squad, path-so-far + road-ahead, holders)
- the **World Cup group tables** (results board)

The `.html` loads shared `.js` (data) and `.jsx` (React, Babel-in-browser) modules by
**relative path from the same folder** — keep everything flat.

## How to save them

1. Make a folder in the repo, e.g. `design/wadau-cup/`.
2. Copy **all** files from this bundle into it, flat.
3. Commit. No build step, no install.

Preview: open `Wadau Cup - Leaderboard Redesign.html` in a browser (needs internet —
React/Babel/fonts load from CDNs). **Do not** start translating it into the app
framework yet.

---

## Files

**Screen (open this):**
`Wadau Cup - Leaderboard Redesign.html`

**Data (`.js`, populate global `window.WADAU`):**
`wadau-data.js`, `wadau-data2.js`, `wadau-livematch.js` (live-fixture data the team
pages read), `wadau-rank.js`, `wadau-teaminfo.js`, `wadau-squads.js`, `wadau-worldcup.js`

**UI kit (`.jsx`):**
`wadau-components.jsx` (visual system + `.wc` CSS tokens), `wadau-ui.jsx`,
`tweaks-panel.jsx`

**Screen modules (`.jsx`):**
`wadau-rank.jsx`, `wadau-rank-screens.jsx`, `wadau-profile2.jsx`, `wadau-team.jsx`,
`wadau-worldcup.jsx`

---

## Notes for later (not now)

- **Styling/tokens** live in `wadau-components.jsx` + `wadau-ui.jsx` — themed `.wc.wc-dark`
  / `.wc.wc-light` setting `--*` CSS variables. Source of truth for color/type/spacing.
- **Fonts:** Hanken Grotesk (UI) + Geist Mono (numerics/labels), via Google Fonts.
- **Sample data is illustrative** — standings, squads, coaches, group tables, fixtures and
  road-ahead are representative placeholders, to be wired to real feeds in production.
- In-browser Babel + CDN React are for previewing only — not the production stack.
```
