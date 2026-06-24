# Cockpit — Sales Pipeline, in orbit

A clickable, front-end-only prototype for a multi-rep **sales-pipeline cockpit**.
Built to feel like a real product: a cinematic WebGL globe, a Mapbox 2D map, a
sortable table + kanban board, and a rep-in-the-loop follow-up autopilot — all
reading from **one local fake dataset** with no backend.

> This is a validation demo. Polish and delight are the point; there is no
> database, no CRM integration, and nothing is ever actually sent.

## Highlights

- **Signature interaction** — a smooth, animated camera flight that drills
  `Globe → Country → City → Company office`, revealing layer-appropriate data at
  each level (country pipeline totals → city accounts → company pins → an account
  detail card with an AI-suggested next step).
- **Three synchronized views** — Globe, Map, and List/Board all read the same
  dataset. Selecting a company in one reflects in the others.
- **Team-aware** — 5 reps, a "my book vs. whole team" filter, and a prominent
  **account-overlap alert** flagging accounts worked by more than one rep.
- **Follow-up autopilot** — a side panel of AI-drafted emails for due accounts,
  each with Preview / Edit / Veto / Send. Nothing goes out without an explicit
  click, and an indicator shows how many are awaiting approval.
- **Linear/Superhuman-grade dark UI** — refined typography, glassmorphism, and
  smooth transitions; fully mobile-responsive with clean loading/empty states.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Zustand for view/UI state
- react-globe.gl (Three.js / WebGL) for the globe
- Mapbox GL JS for the 2D map (globe projection that morphs to Mercator on zoom)

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

### Mapbox token (optional)

The **Globe** and **List/Board** views work with zero configuration. The **Map**
view needs a free Mapbox token:

```bash
cp .env.local.example .env.local
# then paste your token (starts with pk.) into NEXT_PUBLIC_MAPBOX_TOKEN
```

Get one at <https://account.mapbox.com/access-tokens/>. Without a token the Map
view shows a friendly placeholder explaining where to add it.

## The data

All data lives in [`data/companies.json`](data/companies.json) — ~42 fake
accounts across 15 cities, 5 reps, and all 7 pipeline stages. Regenerate it
deterministically with:

```bash
npm run gen:data
```

**Account-overlap model:** the prototype detects overlaps by finding company
**names** that appear under more than one `ownerRep`. The generator intentionally
seeds a few such cases (including one account worked by three reps).

## Project layout

```
app/            Next.js App Router shell (layout, page, globals)
components/      Header, FilterBar, GlobeView, MapView, ListBoardView,
                AccountDetailCard, AutomationPanel, OverlapAlert, ui, Skeletons
lib/            types, data helpers/aggregations, Zustand store, filter hook
data/           companies.json (the single source of truth)
scripts/        generate-data.mjs (seeded, deterministic)
```
