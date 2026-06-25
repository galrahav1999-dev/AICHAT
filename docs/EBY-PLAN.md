# EBY GTM CRM — Build Plan & Session Handoff

> Status: **PLANNING — do not build yet.** This branch (`eby-gtm-crm`) is the
> tailoring base, cloned from the generic "Cockpit" pipeline UI. The next session
> will QA the research + system design + feature list, then build slice by slice.
> Authoritative schema lives in [`docs/EBY-CRM-Handoff.md`](./EBY-CRM-Handoff.md)
> (section 4 = fields/enums, section 6 = relational mapping). Build to that.

## Decisions locked (with Gal)
- **Architecture:** Handoff Option B — the UI is the primary surface, backed by a
  real relational DB. The Google Sheet is no longer the source of truth.
- **New project home:** a separate GitHub repo (`eby-gtm-crm`) is the goal. The
  current session's GitHub integration cannot create new repos (403), so this
  **base branch** is the interim home. TODO: promote to its own repo (Gal creates
  an empty `eby-gtm-crm` repo + grants access → push; or the next session's
  environment is pointed at it).
- **Stack:** keep the generic app's **Next.js 14 (App Router) + TypeScript +
  Tailwind**. Add **Supabase** for **Postgres + Auth** (5 team users) + row-level
  security. ORM: decide Prisma vs Drizzle in the design session.
- **Hosting:** Vercel.

## What the generic base gives us (reuse)
- Next.js/TS/Tailwind foundation + dark design system + component library.
- Strong **table + kanban board**, **map** (maplibre) and **globe** (react-globe.gl)
  views, filtering/segmentation UX, and a metrics/dashboard pattern.
- Zustand for UI state (`lib/store.ts`).

## What must change (the real work)
- **Data layer:** replace local `data/companies.json` + in-memory edits with a
  **Supabase Postgres** schema — the 7 objects, enums, FKs, and `display_id`
  (PER-/ORG-/DL-/PLT-/PTR-0000001) per handoff §6. Add a repository/service layer.
- **Schema:** discard the single-object "company" model; build the relational
  multi-object EBY model (People, Organizations, B2B Deals, Pilots, Partners,
  Interactions, B2C Waitlist cohorts).
- **Add:** API route handlers; **CRUD forms** with enum-validated selects,
  required-field validation, FK pickers + create-inline; per-object
  list/detail/create/edit; **auth**; append-only Interactions; B2C cohort funnel;
  SQL-backed dashboard; overdue-follow-up highlighting (next_step_date < today).
- **Repurpose (optional):** the globe/map as an "Organizations by geography" view.

## Build sequence (thin vertical slices)
1. DB schema + enums + FKs (Supabase) + seed script of clearly-marked EBY sample data.
2. Organizations + People end to end (list, detail, create/edit, FK link, enum
   validation, display_id generation) — prove the pattern.
3. Deals (3 person-roles, qualification block, 6 stages + exit criteria in UI).
4. Interactions (append-only) + Person/Org linked-history views.
5. Pilots, Partners.
6. B2C Waitlist cohort view + Dashboard aggregates.
7. Deploy to Vercel.

## Segmentation / filters to support (handoff §3)
org type · age band · denomination · geography · segment · owner · stage · priority.

## Feature-suggestion process (Gal approves Y/N)
Next session delivers a categorized list — **Core MVP / High-value / Nice-to-have /
Future** — each item with a one-line rationale and a Y/N, approved before coding.

## OPEN — needed before/at the design session
- [ ] **Links blocked in build sandbox (403):** Gal to paste content from the
      founders hub (`eby-founders.vercel.app`), the research brief
      (`excel-accelerator.vercel.app/eby-research.html`), and a few **live sample
      rows** from the CRM Google Sheet (so seed data matches reality).
- [ ] Confirm separate-repo path (create empty `eby-gtm-crm` repo, or keep branch).
- [ ] Final ORM choice (Prisma vs Drizzle).
- [ ] Confirm verify-against-live-sheet offsets are moot under Option B (DB is master).
- [ ] Don't fabricate EBY facts — leave marked TODOs for anything unsourced.

## Guardrails
Secrets in env/Vercel server-side only; clean repository/service layer for future
HubSpot migration / one-way Sheet mirror; match existing conventions; vertical
slices, one object fully working before the next.
