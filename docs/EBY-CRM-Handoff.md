# EBY GTM CRM — Project Handoff & Build Context

> Single-file context for continuing this work (including in Claude Code). It summarizes what was decided, what was built, the exact data model, and the plan for a Vercel UI that reads/writes the Google Sheet. Read top to bottom; the data model and the Vercel section are the parts a builder needs most.

---

## 1. What EBY is

EBY (Eliezer Ben Yehuda) is an early-stage startup building an AI-powered product that gets diaspora Jews actually speaking Hebrew, and through it reconnects them to Jewish identity, to Israel, and to each other. Currently in the Birthright Israel Excel accelerator, in the validation phase (customer discovery before heavy building). Team of five: Gal (owner of this workstream), Leah, Mashav, Michael, Ben.

Two go-to-market motions run in parallel:
- **B2B / B2B2C**: selling to Jewish day schools, supplementary schools, synagogues, JCCs, community programs. Buyer (principal/coordinator) is not the user (teacher/student). Per-seat recurring revenue, long cycle. This is the primary revenue thesis.
- **B2C**: a consumer app sold to individual learners (Aliyah movers, identity reconnectors, people with Israeli family). Currently a waitlist.
- Plus a **partner/channel** motion (Ulpan operators, Birthright/Excel program directors who could resell or refer).

Strategic sequencing decision (proposed, pending team ratification): **B2B-led, with a thin B2C line as a hedge.** Rationale: B2B is the revenue engine, but a school cannot close inside the ~7-week sprint and ~2/3 of day-school seats are Haredi where the culture-first angle fits poorly, so the B2B sprint goal is a signed pilot LOI while the B2C goal is one consumer design partner (the realistic "one real user" before demo day).

---

## 2. What this workstream produced

The goal was a GTM pipeline / CRM as the team's single source of truth, built as a Google Sheet now and designed to migrate cleanly to HubSpot later. Deliverables:

1. **EBY-GTM-CRM.xlsx** — the CRM itself (now a live Google Sheet the team uses). Multi-object, 11 tabs, dropdown-driven, with example rows and legends-as-notes added by Gal.
2. **EBY-CRM-Logger-Skill.md** — a copy-paste prompt that parses call transcripts / notes into ready-to-paste rows mapped to the correct dropdown values. Used in Claude or ChatGPT; no install.
3. **EBY-CRM-Context-for-Claude.md** — a standalone context file teammates paste into their own Claude so it understands the CRM and can help them use it.
4. **EBY-CRM-Legends.md** — per-tab "Column = Meaning" legends + stage definitions (Gal pasted these into the sheet as notes).
5. **EBY-CRM-Walkthrough.pptx** — a 15-slide self-serve onboarding deck (imported to Google Slides).
6. **EBY-context.md** — the master project context (updated with the GTM strategy, segmentation model, and CRM decisions).
7. Team announcement messages (drafted, not files).

The methodology basis (researched, not pre-existing team practice): the Mom Test (Fitzpatrick); Eric Ries's 5 discovery questions; best-first-customer = cost × frequency × budget/authority; a16z design-partner criteria (urgency / capability / representativeness); AARRR pirate metrics (McClure) for the B2C funnel; HubSpot's object model as the migration target.

---

## 3. Segmentation model (informs the data, useful for the UI's filters)

A real ICP is a combination across five axes, not one row:
1. Life-stage / trigger (Aliyah <12mo, post-Oct-7 awakening, child entering Hebrew school, b'nai mitzvah prep, conversion, Birthright just ended, dating an Israeli).
2. Relationship to Israel/Israelis (family / partner / program friends / none).
3. Religious posture (secular-cultural through Haredi; culture-first thesis fits secular-to-Conservative).
4. Current competence (target = the literacy-but-not-fluency middle; ~52% know the alphabet, ~10% converse).
5. Buyer type / channel (self-pay consumer, parent-for-child, school, community org, reseller).
Geography is a cross-cutting layer (US primary; UK/France/Canada/Argentina/Australia secondary).

Two POC ICP stacks:
- B2B (lead): non-Orthodox US day school in a major metro, principal feels the "graduates can't speak" pain and holds discretionary budget.
- B2C (hedge): secular/Reform diaspora Jew, 20-40, alphabet-to-intermediate, with an active trigger (Aliyah within 12 months OR an Israeli partner/family), in the US.

---

## 4. The data model (CRITICAL for the UI build)

Objects are separated and linked by ID, mirroring HubSpot (Contacts / Companies / Deals + custom objects). IDs are 7 digits to encode the million-user mission (e.g. PER-0000001). The Sheet has one tab per object plus supporting tabs. Below is the authoritative schema: tab name, then columns in exact left-to-right order. Dropdown fields are marked [dropdown]; auto-filled (formula) fields are marked [auto] and must NOT be written to directly.

### Tab: People  (= HubSpot Contacts, dedupe key = Email)
1. Person_ID  (PK, format PER-0000001)
2. First name
3. Last name
4. Email
5. Role / title  [dropdown: Principal / head of school; Curriculum coordinator; Hebrew teacher; Program director; Parent; Student; Partner contact; Investor; Consumer power-user; Other]
6. Org_ID (link)  (FK -> Organizations.Org_ID)
7. Organization name  [auto: VLOOKUP on Org_ID]
8. Segment  [dropdown: see Segment list below]
9. Source  [dropdown: Excel / Birthright network; Personal network; LinkedIn outreach; Referral / intro; Inbound / waitlist; Community event; Cold outreach]
10. Lifecycle  [dropdown: Discovery; Prospect; Opportunity; Customer; Disqualified; Dormant]
11. Owner  [dropdown: Gal; Leah; Mashav; Michael; Ben]
12. Next step
13. Next-step date  (date; conditional-formatted red if past)
14. Notes

### Tab: Organizations  (= HubSpot Companies, dedupe key = Domain)
1. Org_ID  (PK, ORG-0000001)
2. Organization name
3. Domain
4. Org type  [dropdown: Day school; Supplementary / Hebrew school; Kindergarten / preschool; Synagogue; JCC / community center; Adult-ed program; Ulpan / online program; University Hillel/Chabad; Youth movement / camp; Other]
5. Age / grade band  [dropdown: Preschool / kindergarten; Elementary (K-5); Middle (6-8); High school (9-12); K-12 (full); Adult; Mixed / all ages]
6. Denomination  [dropdown: Secular / cultural; Reform; Conservative; Modern Orthodox; Haredi / Orthodox; Community / pluralistic; N/A (consumer)]
7. City
8. Country  [dropdown: USA; UK; France; Canada; Argentina; Australia; Israel; Other]
9. Size (students / seats)
10. Affiliation / network
11. Segment  [dropdown]
12. Owner  [dropdown]
13. Status  [dropdown: To contact; Outreach sent; Replied; Scheduled; Interviewed; Active; No - dropped]
14. Notes

### Tab: B2B Deals  (= HubSpot Deals)
1. Deal_ID  (PK, DL-0000001)
2. Deal name
3. Org_ID (link)  (FK)
4. Organization  [auto: VLOOKUP on Org_ID]
5. Economic buyer (Person_ID)  (FK -> People)
6. Stage  [dropdown: 1 Discovery; 2 Qualified; 3 Demo/Validated; 4 Pilot/LOI; 5 Proposal; 6 Closed Won; 6 Closed Lost]
7. Has Hebrew program today?  [dropdown: Y; N; Unknown]
8. Current solution / curriculum
9. Current state (how it's going)
10. Pains (their words)
11. Ideal state (what good looks like)
12. Eval start timing  [dropdown: Now / this term; Next term; Next school year; Budget cycle TBD; No timeline]
13. Decision timeline  [dropdown: This term / immediate; Within 3 months; This budget cycle; Next budget cycle; Next school year; 6-12 months; Unknown]
14. Seats (qty)
15. ACV / expected value
16. Expected close  (date)
17. Owner  [dropdown]
18. Next step
19. Next-step date  (date; red if past)
20. Closed-lost reason  [dropdown: No budget; No urgency / weak pain; Wrong buyer / no authority; Chose competitor; Chose status quo; No Hebrew program at all; Bad timing; Unresponsive]
21. Opportunity start date  (date)
22. Opportunity point of contact (Person_ID)  (FK -> People)
23. Champion (Person_ID)  (FK -> People)
24. Closed-won reason  [dropdown: Strong pain + urgency; Champion drove it; Pilot proved ROI; Budget available now; Relationship / trust; Better than incumbent]
25. Priority  [dropdown: High; Medium; Low]

Note: three person-roles on a deal (economic buyer, point of contact, champion) can be the same person or different.

### Tab: Pilots
1. Pilot_ID (PK, PLT-0000001)
2. Org_ID (link) (FK)
3. Organization [auto]
4. Champion (Person_ID) (FK)
5. Stage [dropdown: Identified; Agreed (DPA); Onboarding; Active; Converted; Churned]
6. Urgency [dropdown: High; Medium; Low]
7. Capability (can they implement?)
8. Representativeness (typical of market?)
9. Success metric agreed
10. Feedback cadence [dropdown: Weekly; Biweekly; Monthly; Ad hoc; None yet]
11. DPA signed? [dropdown: Y; N; Unknown]
12. Convert-by date (date)
13. Owner [dropdown]
14. Next step
15. Notes

### Tab: Partners
1. Partner_ID (PK, PTR-0000001)
2. Partner org
3. Partner type [dropdown: Reseller; Referral; Co-marketing; Distribution / list access]
4. Primary contact (Person_ID) (FK)
5. Stage [dropdown: Identified; Pitched; Agreement; Enabled; Productive; Dropped]
6. What they give us (reach / access)
7. Expected reach (# end-customers)
8. Commission / terms
9. Owner [dropdown]
10. Next step
11. Next-step date (date; red if past)
12. Notes

### Tab: Interactions  (append-only activity log)
1. Date (date)
2. Person_ID (link) (FK)
3. Person name [auto: VLOOKUP first+last on Person_ID]
4. Org_ID (FK, optional)
5. Deal_ID (FK, optional)
6. Type [dropdown: Discovery interview; Intro call; Demo; Pilot check-in; Email; Meeting; Partner call]
7. Owner [dropdown]
8. What happened / outcome
9. Verbatim quote / key signal
10. Next step
11. Next-step date (date)

### Tab: B2C Waitlist  (cohorts + funnel, NOT one row per person)
1. Cohort (month + source)
2. Segment [dropdown]
3. Signups (int)
4. Confirmed (int)
5. Activated (int)
6. Retained (D30) (int)
7. Paid (int)
8. Conf %  [auto: Confirmed/Signups]
9. Signup>Paid %  [auto: Paid/Signups]
10. Notes
Plus a TOTAL row and auto % at the bottom.

### Tab: Dashboard  (all [auto], read-only)
Live COUNTIF/SUMPRODUCT rollups: interviews logged, people, orgs, active B2B deals, deals at Pilot/LOI, Closed Won, active pilots, partners, overdue follow-ups (People + Deals), B2C funnel totals.

### Tab: Lists  (controlled vocabulary)
One column per dropdown. Note: in the Google Sheet, dropdowns are stored INLINE (values embedded in each field's data-validation), not as live references to this tab, so they survive the .xlsx -> Google Sheets upload. To add a dropdown value you must add it both on Lists AND to the field's validation. (This matters for the UI: the UI can hold its own copy of these enums; see section 6.)

### Tab: README  and  Tab: B2B Stage Guide
Reference/instruction tabs (no data rows the UI needs to write). The Stage Guide defines each B2B stage's purpose, the question it answers, and explicit exit criteria.

### Shared conventions
- One object per tab; link by ID, never by name.
- Every active row should carry Owner + Next step + Next-step date.
- [auto] columns are formulas, never write to them.
- Header row is row 4 on the object tabs (rows 1-3 are title/subtitle/legend); data starts row 5. Example rows currently occupy the first 3 data rows with "Example" in the ID cell. (Confirm exact offsets against the live sheet before building, Gal may have adjusted.)

---

## 5. The build ahead: a Vercel UI over the Sheet

Goal: a custom web UI (Vercel) so the team manages the CRM visually, views and filters pipeline, and creates/edits records through forms that normalize and validate input before writing back to the Sheet.

### Is API read/write to Google Sheets possible? Yes.
- Use the **Google Sheets API v4**.
- Auth via a **Google Cloud service account** (a robot identity). Create it in Google Cloud Console, enable the Sheets API, download the JSON key, and **share the Sheet with the service account's email** (as Editor). No per-user OAuth needed for a shared internal tool.
- Keep the service-account credentials server-side only: put them in **Vercel environment variables** and call the Sheets API from **serverless / route handlers** (e.g. Next.js App Router `app/api/.../route.ts`). Never expose the key to the browser.
- Libraries: `googleapis` (official) or the lighter `google-spreadsheet` wrapper. For Next.js, `googleapis` in route handlers is the most direct.
- Core operations: `spreadsheets.values.get` (read a tab/range), `.append` (add a row), `.update` (edit a range), and `.batchUpdate` for multi-cell / formatting. Read by range like `People!A5:N`.

### The architecture fork (decide this first, it shapes everything)
**Option A — UI directly on the Sheet (fast path).** The Sheet stays the single source of truth; the UI is a friendly front end. Pros: keeps one source of truth, fastest to ship, team can still open the raw Sheet. Cons: Sheets is not a database, no transactions, concurrent writes can race, no real referential integrity, the Sheets API has quotas (~60 read + 60 write requests/min/user by default), and rows shift if anyone sorts/inserts in the raw sheet (so address rows by a stable ID lookup, not by row number). Best if the team keeps living in the Sheet and the UI is a convenience layer.

**Option B — UI on a real database, Sheet becomes an export (clean path).** Move the source of truth to **Vercel Postgres / Supabase / Neon**, model the objects as proper tables with foreign keys and enums, and optionally sync to the Sheet for those who like the spreadsheet view. Pros: real integrity, validation, concurrency, fast queries, room to grow. Cons: the Sheet is no longer the master (some team rework), more upfront build. Best if the UI becomes the primary surface.

**Option C — skip ahead to HubSpot.** Since migration to HubSpot is already the long-term plan, a third option is to move to HubSpot sooner and build the UI (or just use HubSpot's UI) on its API. Worth a sentence of consideration before investing in a custom UI; if HubSpot would arrive within a couple of months anyway, a heavy custom UI may be wasted effort.

**DECISION (made): Option B.** The custom UI becomes the primary surface for managing the pipeline, backed by a real database. The Google Sheet is no longer the master; it may optionally remain as a read-only export/mirror for anyone who prefers a spreadsheet view, but all create/edit happens through the UI. Reasoning: Gal wants the team to manage pipeline visually through the UI with proper validation, relational integrity, and multi-user reliability, which Sheets-as-DB cannot give. The data model in section 4 is the schema spec; it maps directly to relational tables with foreign keys and enums (section 6 details the mapping).

### Normalization / parsing the UI should enforce (so the Sheet stays clean)
- **Enums**: every [dropdown] field validated against the exact allowed values from section 4. The UI should render these as selects, never free text. Keep the enum lists in the app (mirror of the Lists tab) as the source of truth for the form, and keep them in sync with the sheet's inline validations.
- **IDs**: generate the next 7-digit ID per object (PER/ORG/DL/PLT/PTR-) by reading the current max and incrementing. Guard against collisions if two users create at once (read-modify-write with a check, or move ID generation server-side with a lock; this is exactly where Sheets-as-DB gets fragile, see Option A cons).
- **Links / referential integrity**: when creating a Person, the Org_ID must reference an existing Organization (offer a picker, or create-org-inline). Same for Deal -> Org and Deal/Interaction -> Person. Do NOT write the [auto] name columns; let the sheet formulas fill them (or replicate the lookup in the UI for display and leave the cell blank/let the formula run).
- **Dates**: normalize to ISO `yyyy-mm-dd` to match the sheet's number format.
- **Append vs update**: new record = append a row; edit = locate the row by scanning the ID column for the PK, then update that row's range. Never assume a fixed row number.
- **Append-only Interactions**: the UI should only ever append to Interactions, never edit historical rows.
- **B2C Waitlist**: treat as cohort aggregates (integers), not per-person CRUD.

### Suggested first build slice (thin vertical)
1. Read-only dashboard + table views per object (proves auth + read + the row-by-ID model).
2. Create/edit forms for People and Organizations (proves write + enum validation + ID generation + the FK picker).
3. Then Deals (the richest object), then Interactions (append-only), then Pilots/Partners.
4. B2C Waitlist and Dashboard as read/aggregate views last.

### Things to hand Claude Code
- This file (the schema in section 4 is the spec).
- The live Google Sheet ID / URL and Editor access for the service account.
- The decision on Option A vs B (or a "start A, keep swappable" instruction).
- Stack preference (assume Next.js on Vercel + `googleapis` unless told otherwise).

---

## 6. Relational schema mapping (Option B)

The section 4 objects map directly to database tables. Suggested mapping (adapt to whatever ORM/stack the cloned repo uses):

- **people** (id PK serial or uuid + display_id "PER-0000001"; first_name, last_name, email unique-ish, role enum, org_id FK -> organizations, segment enum, source enum, lifecycle enum, owner enum, next_step text, next_step_date date, notes text). Drop the [auto] "Organization name" column; derive via the org_id join.
- **organizations** (id PK + display_id "ORG-..."; name, domain, org_type enum, age_band enum, denomination enum, city, country enum, size, affiliation, segment enum, owner enum, status enum, notes).
- **deals** (id PK + display_id "DL-..."; name, org_id FK, economic_buyer_id FK -> people, stage enum, has_hebrew enum, current_solution, current_state, pains, ideal_state, eval_timing enum, decision_timeline enum, seats int, acv numeric, expected_close date, owner enum, next_step, next_step_date date, closed_lost_reason enum nullable, opportunity_start_date date, poc_id FK -> people, champion_id FK -> people, closed_won_reason enum nullable, priority enum). Drop [auto] "Organization"; derive via join.
- **pilots** (id + display_id "PLT-..."; org_id FK, champion_id FK, stage enum, urgency enum, capability, representativeness, success_metric, feedback_cadence enum, dpa_signed enum, convert_by date, owner enum, next_step, notes).
- **partners** (id + display_id "PTR-..."; partner_org, partner_type enum, primary_contact_id FK, stage enum, what_they_give, expected_reach, terms, owner enum, next_step, next_step_date date, notes).
- **interactions** (id + display_id; date, person_id FK, org_id FK nullable, deal_id FK nullable, type enum, owner enum, outcome, verbatim_quote, next_step, next_step_date date). Append-only in the UI: no edit/delete of historical rows.
- **waitlist_cohorts** (id; cohort_label, segment enum, signups int, confirmed int, activated int, retained_d30 int, paid int, notes). Conf% and Signup>Paid% are computed, not stored.

All enum values are the exact dropdown lists in section 4 — define them as DB enums or a lookup table, and as the single source of truth for the UI's select inputs. Keep a `display_id` (the 7-digit PER/ORG/DL/... string) for human-facing continuity and clean HubSpot migration later, separate from the internal PK.

Dashboard is a set of aggregate queries, not a table. Owners are a fixed set (Gal, Leah, Mashav, Michael, Ben) — model as an enum now, a users table when auth is added.

Optional Sheet mirror: if kept, write to the Sheet on a one-way push from the DB (cron / on-change) so the spreadsheet view stays current without being a second source of truth.

---

## 7. Open items / decisions still live
- Ratify the B2B-led vs B2C sequencing with the team.
- Build the Vercel UI on Option B (decided); see the separate Claude Code build prompt.
- Decide whether to keep a one-way Sheet mirror or retire the Sheet entirely once the UI is live.
- Pre-existing reconcile items unrelated to GTM/UI (in EBY-context.md): the wartime fundraising figure's currency (ILS vs USD), and the team roster count (6 listed vs 5 described).

---

## 8. File inventory (what exists at the end of this work)
- EBY-GTM-CRM.xlsx — the CRM (now live as a Google Sheet)
- EBY-CRM-Logger-Skill.md — transcript -> rows prompt
- EBY-CRM-Context-for-Claude.md — context for teammates' Claude
- EBY-CRM-Legends.md — per-tab column legends (pasted into sheet notes)
- EBY-CRM-Walkthrough.pptx — 15-slide onboarding deck
- EBY-context.md — master project context (updated)
- EBY-CRM-Handoff.md — this file
