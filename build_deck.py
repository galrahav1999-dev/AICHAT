#!/usr/bin/env python3
"""
Jargon AI — presentation builder.
Run:  python3 build_deck.py
Out:  jargon_ai_deck.pptx
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor

# ── Design tokens ─────────────────────────────────────────────────────────────
BLUE   = RGBColor(0x25, 0x63, 0xEB)   # enterprise blue
BLU_DK = RGBColor(0x1D, 0x4E, 0xD8)   # darker blue (table headers)
BLU_LT = RGBColor(0xDB, 0xEA, 0xFE)   # pale blue (placeholder fills)
DARK   = RGBColor(0x0F, 0x17, 0x2A)   # near-black
MUTED  = RGBColor(0x64, 0x74, 0x8B)   # muted gray-blue
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
GRAY   = RGBColor(0xF1, 0xF5, 0xF9)   # card background
GRAYLN = RGBColor(0xE2, 0xE8, 0xF0)   # subtle border
GREEN  = RGBColor(0x16, 0xA3, 0x4A)
AMBER  = RGBColor(0xD9, 0x77, 0x06)

FONT = "Inter"

# Slide canvas (16:9 widescreen)
W  = Inches(13.333)
H  = Inches(7.5)
ML = Inches(0.75)   # left/right margin
MT = Inches(0.55)   # top margin
CW = W - 2 * ML     # content width ≈ 11.833"


# ── Low-level helpers ─────────────────────────────────────────────────────────

def new_prs():
    prs = Presentation()
    prs.slide_width  = W
    prs.slide_height = H
    return prs


def blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def set_bg(slide, rgb):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = rgb


def rect(slide, left, top, width, height, fill=None, line=None, line_w=Pt(0.75)):
    shape = slide.shapes.add_shape(1, left, top, width, height)
    if fill:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    else:
        shape.fill.background()
    if line:
        shape.line.color.rgb = line
        shape.line.width = line_w
    else:
        shape.line.fill.background()
    return shape


def divider(slide, y, color=BLUE, thickness=Pt(1.5)):
    return rect(slide, ML, y, CW, thickness, fill=color)


def placeholder_box(slide, left, top, width, height, label):
    shape = slide.shapes.add_shape(1, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = BLU_LT
    shape.line.color.rgb = BLUE
    shape.line.width = Pt(1.0)
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = label
    r.font.name = FONT
    r.font.size = Pt(12)
    r.font.color.rgb = BLUE
    r.font.italic = True
    return shape


def add_notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


# ── Text helpers ──────────────────────────────────────────────────────────────

def txt(slide, text, left, top, width, height, *,
        size=Pt(14), bold=False, italic=False, color=DARK,
        align=PP_ALIGN.LEFT, wrap=True, font=FONT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf  = box.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    r = p.add_run()
    r.text  = text
    r.font.name   = font
    r.font.size   = size
    r.font.bold   = bold
    r.font.italic = italic
    r.font.color.rgb = color
    return box


def mixed_para(tf, parts, *, align=PP_ALIGN.LEFT, space_before=Pt(0), space_after=Pt(6), first=False):
    """Add a paragraph with multiple (text, bold, size, color) runs."""
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.alignment   = align
    p.space_before = space_before
    p.space_after  = space_after
    for text, bold, size, color in parts:
        r = p.add_run()
        r.text = text
        r.font.name  = FONT
        r.font.bold  = bold
        r.font.size  = size
        r.font.color.rgb = color
    return p


def bullet_box(slide, items, left, top, width, height, *,
               label_size=Pt(14), body_size=Pt(13),
               label_color=DARK, body_color=MUTED,
               space_before=Pt(10), space_after=Pt(4)):
    """
    items: list of (label_bold_str, body_str)  — body_str may be empty.
    Returns the textbox.
    """
    box = slide.shapes.add_textbox(left, top, width, height)
    tf  = box.text_frame
    tf.word_wrap = True
    for i, (label, body) in enumerate(items):
        parts = [(f"• {label}", True, label_size, label_color)]
        if body:
            parts.append((f"  {body}", False, body_size, body_color))
        mixed_para(tf, parts,
                   space_before=(Pt(0) if i == 0 else space_before),
                   space_after=space_after,
                   first=(i == 0))
    return box


# ── Slide header helper ───────────────────────────────────────────────────────

def header(slide, title, subtitle=""):
    """Draws slide title + optional subtitle + blue divider. Returns y below divider."""
    txt(slide, title, ML, MT, CW, Inches(0.62),
        size=Pt(26), bold=True, color=DARK)
    if subtitle:
        txt(slide, subtitle, ML, MT + Inches(0.62), CW, Inches(0.38),
            size=Pt(14), italic=True, color=MUTED)
    div_y = MT + Inches(0.62) + (Inches(0.42) if subtitle else Inches(0.06))
    divider(slide, div_y)
    return div_y + Inches(0.14)


# ── Table helpers ─────────────────────────────────────────────────────────────

def style_cell(cell, text, *, bold=False, size=Pt(11), fg=DARK, bg=None,
               align=PP_ALIGN.LEFT, italic=False):
    cell.text = ""
    tf = cell.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    r = p.add_run()
    r.text = text
    r.font.name  = FONT
    r.font.size  = size
    r.font.bold  = bold
    r.font.italic = italic
    r.font.color.rgb = fg
    if bg:
        cell.fill.solid()
        cell.fill.fore_color.rgb = bg
    else:
        cell.fill.background()


def add_table(slide, rows, cols, left, top, width, height):
    return slide.shapes.add_table(rows, cols, left, top, width, height).table


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 1 — Title
# ═══════════════════════════════════════════════════════════════════════════════

def s01(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)

    # Left accent bar
    r = sl.shapes.add_shape(1, Inches(0), Inches(0), Inches(0.15), H)
    r.fill.solid(); r.fill.fore_color.rgb = BLUE; r.line.fill.background()

    txt(sl, "Jargon AI",
        ML, Inches(1.6), CW, Inches(1.5),
        size=Pt(68), bold=True, color=DARK)

    txt(sl, "An AI system for jargon-heavy documents",
        ML, Inches(3.05), CW, Inches(0.6),
        size=Pt(24), color=BLUE)

    txt(sl, "Medical  ·  Legal  ·  Financial",
        ML, Inches(3.72), CW, Inches(0.45),
        size=Pt(17), color=MUTED)

    divider(sl, Inches(4.45), color=GRAYLN, thickness=Pt(1))

    txt(sl, "Gal Rahav  ·  TPM Home Assignment  ·  Jeen.ai",
        ML, Inches(4.65), CW, Inches(0.38),
        size=Pt(13), color=MUTED)

    add_notes(sl, "Thanks for the time. I want to walk you through the design, but more importantly, the thinking that got there. I'll keep slides short and lean on the diagrams — and stop wherever you want to go deeper.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 2 — The promise
# ═══════════════════════════════════════════════════════════════════════════════

def s02(prs):
    sl = blank(prs)
    set_bg(sl, DARK)

    box = sl.shapes.add_textbox(ML, Inches(1.5), CW, Inches(4.8))
    tf  = box.text_frame
    tf.word_wrap = True

    lines = [
        ("In medicine, law, and finance,", False, Pt(38), WHITE),
        ("a confident wrong answer",        True,  Pt(42), BLUE),
        ("is worse than no answer.",        False, Pt(38), WHITE),
    ]
    for i, (text, bold, size, color) in enumerate(lines):
        mixed_para(tf,
                   [(text, bold, size, color)],
                   align=PP_ALIGN.CENTER,
                   space_before=Pt(18),
                   space_after=Pt(6),
                   first=(i == 0))

    add_notes(sl, "This is the single rule the whole system has to hold to. A bank's compliance officer or a clinician acting on a wrong but confident answer — that's a worse outcome than the system saying 'I don't know.' So everything we built sits on this. The system either cites where the answer came from, or it honestly refuses.\n\n[Pause here. This is the anchor.]")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 3 — Before designing, I'd ask
# ═══════════════════════════════════════════════════════════════════════════════

def s03(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Before designing, I'd ask", "I started with questions, not a solution.")

    cards = [
        ("Users & jobs",        "Who, what tasks, accuracy bar"),
        ("Domain & data",       "PHI / MNPI / PII, regulations binding the customer"),
        ("Deployment",          "Cloud, on-prem, air-gapped, who owns the GPUs"),
        ("Failure & liability", "Who owns 'correct,' what happens to a wrong answer"),
        ("Cross-domain access", "Can a Finance user query Legal docs?"),
        ("Scope & integration", "Which systems, which versions, which connectors"),
    ]

    cols, gap = 3, Inches(0.18)
    card_w = (CW - gap * (cols - 1)) / cols
    card_h = Inches(1.85)

    for i, (title, desc) in enumerate(cards):
        col, row = i % 3, i // 3
        x = ML + col * (card_w + gap)
        y = cy + Inches(0.15) + row * (card_h + gap)

        rect(sl, x, y, card_w, card_h, fill=GRAY, line=GRAYLN)
        txt(sl, title, x + Inches(0.2), y + Inches(0.2), card_w - Inches(0.4), Inches(0.45),
            size=Pt(14), bold=True, color=BLUE)
        txt(sl, desc,  x + Inches(0.2), y + Inches(0.65), card_w - Inches(0.4), Inches(1.0),
            size=Pt(12), color=DARK, wrap=True)

    add_notes(sl, "Or mentioned the trap is jumping to a solution. So I want to show the path I took — and the path starts with what I'd ask. Six clusters. Two examples worth naming: the customer's cross-domain RBAC policy — strict per-department, cross-read, redacted — shapes the whole product, and it's never an engineering choice, it's their policy. And the systems-and-versions question that came up in our chat — I don't assume Confluence Cloud vs Data Center, I confirm it, because connectors live and die on that.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 4 — Assumptions
# ═══════════════════════════════════════════════════════════════════════════════

def s04(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "What I assumed up front", "Assumptions I'm willing to defend")

    items = [
        ("Input is text and numbers —",          "PDF, DOCX, PPTX, XLSX, CSV, scanned PDFs. Out of scope: images, audio, video."),
        ("Lead with Financial as the MVP wedge.", "Easiest measurement, lowest liability, biggest budget. Legal next, Medical last."),
        ("Cross-domain access defaults to OFF.",  "Customer policy overrides."),
        ("No system versions assumed.",           "Connector support is acceptance criteria, not assumption."),
    ]

    bullet_box(sl, items, ML, cy + Inches(0.2), CW, Inches(5.2),
               label_size=Pt(17), body_size=Pt(14),
               label_color=DARK, body_color=MUTED,
               space_before=Pt(20), space_after=Pt(6))

    add_notes(sl, "Four. I lead with financial because that's where the time-saved is most measurable and the wrong-answer cost is lowest of the three. Medical I'd touch last — that's where a wrong dose actually hurts someone.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 5 — Shape of the system
# ═══════════════════════════════════════════════════════════════════════════════

def s05(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "The shape of the system", "Two passes. Three stores. One promise.")

    placeholder_box(sl,
                    ML, cy + Inches(0.1),
                    CW, H - cy - Inches(0.8),
                    "[ Overview architecture diagram ]\n"
                    "Two passes (Ingest → Query)  ·  Three stores (Vector / SQL / Graph)\n"
                    "Governance + Deployment running through both  ·  Eval watching end-to-end")

    add_notes(sl, "Quick orientation. Two passes — ingest a document, then answer a question. Three memory stores — vector for meaning, SQL for exact values, graph for relationships — the question type picks the store. Governance and deployment run through both passes. Eval watches the whole thing. I'm going to walk into each piece next, but if anything jumps out now, stop me.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 6 — Ingest
# ═══════════════════════════════════════════════════════════════════════════════

def s06(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Ingest", "Reliability starts before the model")

    placeholder_box(sl,
                    ML, cy + Inches(0.05),
                    CW, H - cy - Inches(1.3),
                    "[ Ingest deep-dive diagram ]\n"
                    "Triggers (ad-hoc + webhook/CDC)  →  Branch by file type\n"
                    "Scans: confidence ladder (cheap OCR → preprocess → strong model → human flag)\n"
                    "Every chunk carries provenance (page + section) — no provenance = no citation")

    txt(sl, "Triggers: ad-hoc + automated (webhook/CDC). Files branch by type. Scans go through a cost-aware confidence ladder. Provenance attached at chunking — without it, no citation later.",
        ML, H - Inches(0.95), CW, Inches(0.75),
        size=Pt(11), italic=True, color=MUTED, wrap=True)

    add_notes(sl, "Most teams underestimate this. If parsing is bad — a scanned page badly OCR'd, a financial table flattened into prose, a locked file silently skipped — everything downstream inherits that error. Three things matter here. One, file type branches: digital PDF, DOCX, spreadsheet — each needs its own path. A financial XLSX gets a table parser that keeps rows and columns; flatten it to prose and you lose every relationship between the numbers. Two, scans go through a confidence ladder. Cheap OCR first, then preprocessing and retry, then a stronger model, then flag for human. Never silently accept. Three, every chunk keeps its page and section — that's what makes citation possible later.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 7 — Memory: the question type picks the store
# ═══════════════════════════════════════════════════════════════════════════════

def s07(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Memory", "One question, the right database.")

    col_w = [CW * 0.32, CW * 0.40, CW * 0.28]
    t = add_table(sl, 4, 3, ML, cy + Inches(0.2), CW, Inches(3.4))

    # set column widths
    t.columns[0].width = int(col_w[0])
    t.columns[1].width = int(col_w[1])
    t.columns[2].width = int(col_w[2])

    headers = ["Question shape", "Example", "Store"]
    rows_data = [
        ("Find information",        '"What does this contract say about termination?"', "Vector DB"),
        ("Relationship / multi-hop", '"Which subsidiaries are exposed to this liability?"', "Knowledge Graph"),
        ("Exact value",             '"What\'s the coverage ratio?"',                    "SQL  (via Text-to-SQL)"),
    ]

    for c, h in enumerate(headers):
        style_cell(t.cell(0, c), h, bold=True, fg=WHITE, bg=BLU_DK, size=Pt(13))

    for r, (shape, example, store) in enumerate(rows_data, 1):
        bg = GRAY if r % 2 == 0 else WHITE
        style_cell(t.cell(r, 0), shape,   bold=True,  fg=DARK,  bg=bg, size=Pt(13))
        style_cell(t.cell(r, 1), example, bold=False, fg=MUTED, bg=bg, size=Pt(12), italic=True)
        style_cell(t.cell(r, 2), store,   bold=True,  fg=BLUE,  bg=bg, size=Pt(13))

    txt(sl,
        "A number with legal weight should be retrieved exactly, not approximated.",
        ML, cy + Inches(3.9), CW, Inches(0.65),
        size=Pt(18), italic=True, color=DARK, align=PP_ALIGN.CENTER)

    add_notes(sl, "This is the one I'd argue hardest for. RAG with a single vector store is the default, but it's wrong for these domains. If a clinician asks for the dose, or an analyst asks for the EBITDA, you want the exact number from a structured table — not the text that mentions that number. SQL via text-to-SQL handles it. Graph handles the 'how does A connect to B' questions a vector store can't traverse. And the gate matters: I only build the graph store when the corpus is actually large and interconnected enough to justify it.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 8 — Query / RAG
# ═══════════════════════════════════════════════════════════════════════════════

def s08(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Query", "Trust isn't assumed — it's engineered.")

    placeholder_box(sl,
                    ML, cy + Inches(0.05),
                    CW, H - cy - Inches(1.3),
                    "[ RAG deep-dive diagram ]\n"
                    "Hybrid retrieval (vector + BM25) → RBAC filter → Rerank\n"
                    "→ Cite-or-refuse generation → Citation verification (judge model)")

    txt(sl,
        "1. Grounded retrieval.  2. Cite-or-refuse generation.  3. Citation verification.  The LLM proposes, the code enforces.",
        ML, H - Inches(0.95), CW, Inches(0.75),
        size=Pt(11), italic=True, color=MUTED, wrap=True)

    add_notes(sl, "The pipeline is six steps but trust is enforced at three of them. First, retrieval is grounded — hybrid vector + BM25, RBAC-filtered before search even runs. Second, generation has a hard rule: cite every claim, or refuse. Third, a separate smaller model — a 'judge' — verifies that each claim is actually backed by the source it cites. The line I'd give Or: I don't trust the model to be honest; I build a pipeline that makes dishonesty hard.\n\nIf they probe on routing: Routing is layered. Fast keyword rules first. If unclear, a small router model classifies and returns a structured label — like JSON {\"route\": \"sql\"}. Then plain application code routes on that label. The model decides, the code acts.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 9 — Jargon
# ═══════════════════════════════════════════════════════════════════════════════

def s09(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Jargon is the actual problem.", "The assignment isn't 'build RAG'")

    failures = [
        ("Many names → one concept",    "MI = myocardial infarction = heart attack"),
        ("Same name → many concepts",   "MS = Morgan Stanley / Multiple Sclerosis / Mitral Stenosis"),
        ("General ≠ in-context meaning", '"subordinated" textbook vs. in this specific indenture'),
    ]
    bullet_box(sl, failures, ML, cy + Inches(0.15), CW * 0.55, Inches(2.8),
               label_size=Pt(15), body_size=Pt(13),
               label_color=DARK, body_color=MUTED,
               space_before=Pt(18))

    # Double-grounding callout
    bg_box = rect(sl, ML, cy + Inches(3.1), CW, Inches(1.55), fill=GRAY, line=GRAYLN)
    txt(sl, "Every term explanation is double-grounded:",
        ML + Inches(0.25), cy + Inches(3.25), CW - Inches(0.5), Inches(0.4),
        size=Pt(14), bold=True, color=DARK)
    txt(sl,
        "General meaning from an authoritative source  (UMLS / SNOMED / financial taxonomies)  ·  "
        "In-context meaning from this document with a citation.  When they diverge — the system flags it.",
        ML + Inches(0.25), cy + Inches(3.65), CW - Inches(0.5), Inches(0.75),
        size=Pt(13), color=MUTED, wrap=True)

    add_notes(sl, "The assignment isn't 'build RAG' — it's 'handle jargon.' Three concrete failure modes. The third is the one general LLMs miss: a financial 'subordinated' means one thing in textbook law and might mean something more specific in this particular indenture. So I built a jargon layer that double-grounds — general meaning from UMLS, SNOMED, or financial taxonomies; in-context meaning from this document with a citation. And critically, when those two diverge, the system flags it. That's the kind of catch a junior analyst would miss and a senior one would notice.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 10 — Evaluation
# ═══════════════════════════════════════════════════════════════════════════════

def s10(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Evaluation", "Accuracy. Bias. Relevance.")

    placeholder_box(sl,
                    ML, cy + Inches(0.05),
                    CW, H - cy - Inches(1.35),
                    "[ Eval diagram ]\n"
                    "Offline: expert golden set → regression suite → CI gate before deploy\n"
                    "Online: live signals (edit-rate, 👍/👎, citation-click rate)")

    txt(sl,
        "Offline = regression net + CI gate before deploy.  Online = live signals.  Edit-rate is the trust signal — it should fall over time.",
        ML, H - Inches(0.95), CW, Inches(0.75),
        size=Pt(11), italic=True, color=MUTED, wrap=True)

    add_notes(sl, "Three things to highlight here. One, the golden set is expert-built — for medical, that means an actual clinician validates the test set. Two, evals run as a CI gate, so every prompt change, model change, or index change re-tests against that golden set before it ships. And three, the load-bearing online metric is edit-rate — how much users change the answer before using it. That should fall over time. If it doesn't, the system isn't actually getting more trusted.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 11 — Tooling stack
# ═══════════════════════════════════════════════════════════════════════════════

def s11(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Tooling stack", "Conventional defaults — with one assumption + one tradeoff each.")

    stack = [
        ("Doc parsing",      "PyMuPDF / pdfplumber (digital), vision-model OCR (scans)",          "Cheap-then-strong ladder. Tradeoff: latency on bad scans."),
        ("Vector DB",        "pgvector (MVP) → Qdrant / Milvus (scale / on-prem)",                "Postgres-native at start. Tradeoff: scale limits ~10M chunks."),
        ("Hybrid retrieval", "Vector + BM25 (OpenSearch or built-in)",                            "Catches exact strings vectors blur. Tradeoff: index size doubles."),
        ("Reranker",         "Cohere Rerank 3.5 (hosted) or BGE Reranker (self-host)",            "~+33% accuracy, ~+150ms latency. Gated by stakes."),
        ("Embeddings",       "OpenAI text-embedding-3-small (cloud), BGE-M3 (local)",             "Local for air-gapped. Tradeoff: BGE slightly weaker on English."),
        ("LLM generation",   "Claude / GPT / Gemini (cloud), Llama / Mistral via vLLM (local)",  "Routing per task + sensitivity. Customer compute in air-gap."),
        ("Knowledge graph",  "Neo4j or LightRAG",                                                 "Gated: only for large+interconnected corpora. Build cost is real."),
        ("Eval & tracing",   "LangSmith or Arize Phoenix",                                        "Phoenix is framework-agnostic + open-source for on-prem."),
        ("Cache",            "Redis",                                                              "4 tiers: query / retrieval / KV / embedding. RBAC-scoped keys."),
        ("Connectors",       "MCP servers + native SharePoint / Confluence / Drive APIs",         "Standardizes integration. Tradeoff: ecosystem still maturing."),
    ]

    col_w = [CW * 0.18, CW * 0.40, CW * 0.42]
    t = add_table(sl, len(stack) + 1, 3, ML, cy + Inches(0.1), CW, H - cy - Inches(0.85))

    t.columns[0].width = int(col_w[0])
    t.columns[1].width = int(col_w[1])
    t.columns[2].width = int(col_w[2])

    for c, h in enumerate(["Layer", "Default choice", "Assumption / tradeoff"]):
        style_cell(t.cell(0, c), h, bold=True, fg=WHITE, bg=BLU_DK, size=Pt(11))

    for r, (layer, choice, tradeoff) in enumerate(stack, 1):
        bg = GRAY if r % 2 == 0 else WHITE
        style_cell(t.cell(r, 0), layer,    bold=True,  fg=BLUE, bg=bg,  size=Pt(10))
        style_cell(t.cell(r, 1), choice,   bold=False, fg=DARK, bg=bg,  size=Pt(10))
        style_cell(t.cell(r, 2), tradeoff, bold=False, fg=MUTED, bg=bg, size=Pt(10), italic=True)

    txt(sl, "Final picks settle with R&D against the customer's existing stack.",
        ML, H - Inches(0.65), CW, Inches(0.45),
        size=Pt(11), italic=True, color=MUTED)

    add_notes(sl, "This is one slide to show I've thought about implementation, not just architecture. The default I'd commit to per layer, with one assumption and one tradeoff. I want to be clear — these are conventional choices, not exotic ones. The strongest move isn't picking the trendiest tool, it's defending the capability and being honest about the tradeoff. If R&D has a different opinion on any row, I'd want to hear it before committing.\n\nReady: 'Why pgvector and not Pinecone at MVP?' — because pgvector lives inside the Postgres customers already trust; there's no new database for the security team to approve.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 12 — Governance
# ═══════════════════════════════════════════════════════════════════════════════

def s12(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Governance — every layer", "Same architecture. Different walls.")

    modes = [
        ("Cloud",               "Egress allowed. Routing optimizes for cost & latency."),
        ("Private Cloud / On-Prem", "Egress controlled. Routing respects data residency."),
        ("Air-Gapped",          "No egress. Only local models. Customer pays compute."),
        ("Hybrid",              "Sensitive routes local. Everything else routes cloud."),
    ]

    box_w = (CW - Inches(0.45)) / 4
    box_h = Inches(1.6)
    for i, (label, desc) in enumerate(modes):
        x = ML + i * (box_w + Inches(0.15))
        y = cy + Inches(0.2)
        rect(sl, x, y, box_w, box_h, fill=GRAY, line=BLUE)
        txt(sl, label, x + Inches(0.15), y + Inches(0.15), box_w - Inches(0.3), Inches(0.4),
            size=Pt(13), bold=True, color=BLUE)
        txt(sl, desc,  x + Inches(0.15), y + Inches(0.58), box_w - Inches(0.3), Inches(0.85),
            size=Pt(11), color=DARK, wrap=True)

    gov_items = [
        ("RBAC mapped to the org tree",   "dept → team → role, IdP-synced"),
        ("Enforced before retrieval",     "filter the search space — and after (defense in depth)"),
        ("Sensitive data tokenized",      "at ingest — never stored raw"),
        ("Every query audited",           "full lineage, immutable log"),
    ]
    bullet_box(sl, gov_items, ML, cy + Inches(2.1), CW, Inches(2.8),
               label_size=Pt(14), body_size=Pt(12),
               label_color=DARK, body_color=MUTED,
               space_before=Pt(14))

    add_notes(sl, "One architecture, four modes. The thin swap layer changes which model runs and where. The routing driver shifts from 'cost' in cloud to 'what's allowed' in air-gap. And on RBAC — it's enforced twice. Before retrieval we filter what the user can even see; after retrieval we double-check, because defense in depth in a regulated environment isn't paranoia, it's the standard.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 13 — Product (wireframe thumbnails)
# ═══════════════════════════════════════════════════════════════════════════════

def s13(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "The product", "How the user lives in it.")

    screens = [
        ("Upload",  "Drag-drop + file picker. Progress + confidence score per document."),
        ("Ask",     "Chat interface. Inline citations. Confidence band. Observability strip."),
        ("Explain", "Term card: general definition + in-context meaning + divergence flag."),
    ]

    box_w = (CW - Inches(0.4)) / 3
    box_h = H - cy - Inches(1.0)
    for i, (label, desc) in enumerate(screens):
        x = ML + i * (box_w + Inches(0.2))
        y = cy + Inches(0.15)
        placeholder_box(sl, x, y, box_w, box_h - Inches(0.6),
                        f"[ Screen: {label} ]")
        txt(sl, label, x, y + box_h - Inches(0.6) + Inches(0.1), box_w, Inches(0.38),
            size=Pt(15), bold=True, color=DARK, align=PP_ALIGN.CENTER)
        txt(sl, desc,  x, y + box_h - Inches(0.15), box_w, Inches(0.45),
            size=Pt(11), color=MUTED, align=PP_ALIGN.CENTER, wrap=True)

    add_notes(sl, "I won't walk through every pixel — these are in the appendix — but three things to call out across all of them: one, citations are first-class and one tap away, never buried. Two, confidence is always visible on every answer and every term. Three, a refusal is a designed state — gray, not red — because in this product, an honest refusal is a feature, not an error.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 14 — Q&A hero screen
# ═══════════════════════════════════════════════════════════════════════════════

def s14(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "The hero screen", "The Q&A interface — three deliberate design choices.")

    # Main wireframe placeholder (left 65%)
    pw = CW * 0.63
    placeholder_box(sl, ML, cy + Inches(0.1), pw, H - cy - Inches(0.75),
                    "[ Q&A wireframe ]\nQuery bar  →  Observability strip\n→  Answer with inline citations\n→  Suppressed-claim warning  →  Vote chips")

    # Callout annotations (right 33%)
    ann_x = ML + pw + Inches(0.3)
    ann_w = CW - pw - Inches(0.3)

    callouts = [
        (BLUE,  "Observability strip",      "Routing, rerank, citation-check — how the answer was produced, surfaced to the user."),
        (DARK,  "Inline citations",          "Answer broken into claims. Each claim → source. Verified in two seconds."),
        (AMBER, "Suppressed-claim warning",  "When citation-check kills a claim, it shows — never hidden. Cite-or-refuse made visible."),
    ]

    ann_y = cy + Inches(0.2)
    for color, title, desc in callouts:
        rect(sl, ann_x, ann_y, Inches(0.06), Inches(0.9), fill=color)
        txt(sl, title, ann_x + Inches(0.15), ann_y, ann_w - Inches(0.15), Inches(0.35),
            size=Pt(13), bold=True, color=color)
        txt(sl, desc,  ann_x + Inches(0.15), ann_y + Inches(0.35), ann_w - Inches(0.15), Inches(0.7),
            size=Pt(11), color=MUTED, wrap=True)
        ann_y += Inches(1.1)

    add_notes(sl, "Three things designed deliberately here. The observability strip — 'Routing: semantic, Rerank: applied, Citation-check: full' — is the API's metadata block surfaced to the user. They see how the answer was produced, which is itself a trust signal. The inline citations break the answer into claims, each citation clickable, so the user verifies in two seconds. And the suppressed-claim warning — when the citation-check killed a claim that couldn't be backed — is visible, not hidden. That's the cite-or-refuse promise in the UI.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 15 — Refusal as a feature
# ═══════════════════════════════════════════════════════════════════════════════

def s15(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Refusal: a feature, not an error.", '"I cannot find this in the documents."')

    # Gray refusal card
    card_h = Inches(3.5)
    rect(sl, ML, cy + Inches(0.2), CW, card_h, fill=GRAY, line=GRAYLN)

    # Icon stand-in
    circle = sl.shapes.add_shape(9, ML + Inches(0.4), cy + Inches(0.55), Inches(0.5), Inches(0.5))
    circle.fill.solid(); circle.fill.fore_color.rgb = MUTED
    circle.line.fill.background()

    txt(sl, "I cannot find this in the documents.",
        ML + Inches(1.1), cy + Inches(0.45), CW - Inches(1.4), Inches(0.5),
        size=Pt(20), bold=True, color=DARK)

    txt(sl, "Why:",
        ML + Inches(0.4), cy + Inches(1.1), Inches(0.6), Inches(0.35),
        size=Pt(13), bold=True, color=MUTED)
    txt(sl, "The question references documents not in the current corpus, or the confidence threshold was not met.",
        ML + Inches(1.1), cy + Inches(1.1), CW - Inches(1.4), Inches(0.6),
        size=Pt(13), color=MUTED, wrap=True)

    txt(sl, "You might try:",
        ML + Inches(0.4), cy + Inches(1.9), Inches(1.3), Inches(0.35),
        size=Pt(13), bold=True, color=MUTED)
    txt(sl, "Upload additional documents  ·  Rephrase with a specific section or date  ·  Contact a specialist",
        ML + Inches(1.1), cy + Inches(1.9), CW - Inches(1.4), Inches(0.6),
        size=Pt(13), color=MUTED, wrap=True)

    txt(sl,
        "Gray, not red — because saying 'I don't know' isn't a system failure. It's the product working correctly.",
        ML, cy + card_h + Inches(0.45), CW, Inches(0.55),
        size=Pt(17), italic=True, color=DARK, align=PP_ALIGN.CENTER, wrap=True)

    add_notes(sl, "This is probably the slide that says the most about the product. A refusal isn't a 500 error. It's a designed state, with three parts: what we couldn't answer, why we couldn't answer it given what's in the corpus, and what the user might try instead. Gray, not red, because saying 'I don't know' isn't a system failure — it's the product working correctly.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 16 — The API as a contract
# ═══════════════════════════════════════════════════════════════════════════════

def s16(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "The API as a contract", "Cite-or-refuse isn't just model behavior. It's the API.")

    endpoints = [
        ("POST /v1/documents",              "Honest async + confidence score + low-quality handling"),
        ("POST /v1/documents/{id}/explain", "Jargon layer made tangible — disambiguation, divergence, double-grounding"),
        ("POST /v1/documents/{id}/query",   "Refusal is a 200 OK with answer: null — not an error"),
    ]

    t = add_table(sl, 4, 2, ML, cy + Inches(0.15), CW * 0.68, Inches(2.4))
    t.columns[0].width = int(CW * 0.68 * 0.42)
    t.columns[1].width = int(CW * 0.68 * 0.58)

    for c, h in enumerate(["Endpoint", "What it proves"]):
        style_cell(t.cell(0, c), h, bold=True, fg=WHITE, bg=BLU_DK, size=Pt(12))

    for r, (ep, proof) in enumerate(endpoints, 1):
        bg = GRAY if r % 2 == 0 else WHITE
        style_cell(t.cell(r, 0), ep,    bold=True,  fg=BLUE, bg=bg, size=Pt(11))
        style_cell(t.cell(r, 1), proof, bold=False, fg=DARK, bg=bg, size=Pt(11))

    # Three principles (right column)
    principles = [
        "1.  Cite-or-refuse is a first-class response, not an error",
        "2.  Confidence is always exposed",
        "3.  Async where work is real",
    ]
    px = ML + CW * 0.70
    pw = CW * 0.30
    txt(sl, "Three principles:", px, cy + Inches(0.15), pw, Inches(0.35),
        size=Pt(13), bold=True, color=DARK)
    for i, p in enumerate(principles):
        txt(sl, p, px, cy + Inches(0.6) + i * Inches(0.6), pw, Inches(0.55),
            size=Pt(12), color=MUTED, wrap=True)

    add_notes(sl, "Three endpoints — one per core use case, one per wireframe screen. The most distinctive design choice: a refusal is a 200 OK, not an error code. Errors are for system failures — auth, outage. Refusals are part of the product. The user gets a structured 'answer is null, here's why, here's what you might try.' That's the product philosophy turned into the response schema.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 17 — Edge cases
# ═══════════════════════════════════════════════════════════════════════════════

def s17(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Edge cases I designed for", "Honest failure beats fake success.")

    cases = [
        ("Low-confidence OCR",        "Flagged for review — never silently accepted"),
        ("Ambiguous term",            "Disambiguation chips — user picks the meaning"),
        ("Conflicting sources",       "Both shown side-by-side — never averaged away"),
        ("RBAC partial denial",       "Answer from what user can see — warning shows the gap"),
        ("Sensitive data in query",   "Blocked per customer policy — never logged raw"),
        ("Stale cache after update",  "CDC event re-ingests AND invalidates cache — one mechanism, two jobs"),
    ]

    col_w = (CW - Inches(0.3)) / 2
    for i, (trigger, response) in enumerate(cases):
        col, row = i % 2, i // 2
        x = ML + col * (col_w + Inches(0.3))
        y = cy + Inches(0.2) + row * Inches(1.45)
        rect(sl, x, y, col_w, Inches(1.3), fill=GRAY, line=GRAYLN)
        txt(sl, trigger,  x + Inches(0.2), y + Inches(0.15), col_w - Inches(0.4), Inches(0.38),
            size=Pt(13), bold=True, color=DARK)
        txt(sl, response, x + Inches(0.2), y + Inches(0.55), col_w - Inches(0.4), Inches(0.6),
            size=Pt(12), color=MUTED, wrap=True)

    add_notes(sl, "I won't read them. The point is the design has a position on each. The two I'd highlight: conflicting sources — we surface the conflict, never average it away, because in legal that's a litigable difference. And the stale-cache one — when a document updates, the CDC event that re-ingests it is the same event that invalidates the cache. One mechanism, two jobs.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 18 — Metrics
# ═══════════════════════════════════════════════════════════════════════════════

def s18(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "How we know it worked", "North star. Secondary. Guardrails.")

    bands = [
        (GREEN, "North star",  "Grounded-answer rate ≥ 95%",
         "Does every claim trace back to a source? That's the promise."),
        (BLUE,  "Secondary",   "Term accuracy ≥ 90%  ·  WAU growing  ·  TTV < 10 min  ·  👍/👎 ≥ 85%  ·  hours saved ≥ 5/user/week",
         "Is it adopted and valued?"),
        (AMBER, "Guardrails",  "Hallucination rate < 2%  ·  p50 < 2s / p95 < 4s  ·  edit-rate falls  ·  bias scores stable  ·  cost/query within budget",
         "Catch regressions before they compound."),
    ]

    heights = [Inches(1.2), Inches(1.4), Inches(1.5)]
    y = cy + Inches(0.2)
    for (color, tier, metric, sub), h in zip(bands, heights):
        rect(sl, ML, y, Inches(0.12), h, fill=color)
        txt(sl, tier,   ML + Inches(0.25), y + Inches(0.1),  CW * 0.2, Inches(0.38),
            size=Pt(15), bold=True, color=color)
        txt(sl, metric, ML + Inches(0.25), y + Inches(0.48), CW - Inches(0.4), Inches(0.5),
            size=Pt(12), bold=True, color=DARK, wrap=True)
        txt(sl, sub,    ML + CW * 0.22,    y + Inches(0.12), CW * 0.75, Inches(0.35),
            size=Pt(12), italic=True, color=MUTED, wrap=True)
        y += h + Inches(0.12)

    txt(sl,
        "The clearest trust signal: users edit the output less, and click citations more.",
        ML, y + Inches(0.15), CW, Inches(0.55),
        size=Pt(17), italic=True, color=DARK, align=PP_ALIGN.CENTER)

    add_notes(sl, "Three tiers. The north star is grounding rate — does every claim trace back to a source? That's the promise. Secondary metrics tell us if it's adopted and valued. Guardrails catch regressions. Numbers shown are illustrative — I'd set the real bars with R&D against the customer's risk tolerance. The clearest signal of all is edit-rate. If users stop editing and start clicking the citations, they've started trusting it. That's the moment that matters.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 19 — Rollout
# ═══════════════════════════════════════════════════════════════════════════════

def s19(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Rollout", "Four stages. We promote on quality, not calendar.")

    stages = [
        ("Closed Alpha", "Solutions + design partners. Single domain.\nProve technical feasibility."),
        ("Beta — MVP",   "Financial. Term + cited Q&A + summaries.\nReal users, real feedback."),
        ("Maturation",   "Add Legal. Cross-doc. API. Graph only where corpus justifies it."),
        ("GA — V1",      "Medical added last. Hardened. Full FinOps. NPS / CSAT."),
    ]

    box_w = (CW - Inches(0.45)) / 4
    box_h = Inches(2.4)
    for i, (stage, desc) in enumerate(stages):
        x = ML + i * (box_w + Inches(0.15))
        y = cy + Inches(0.35)

        # filled box
        rect(sl, x, y, box_w, box_h,
             fill=(BLU_LT if i == 0 else GRAY),
             line=(BLUE if i == 0 else GRAYLN))

        # stage number
        num = sl.shapes.add_shape(9, x + Inches(0.2), y + Inches(0.18), Inches(0.35), Inches(0.35))
        num.fill.solid(); num.fill.fore_color.rgb = BLUE; num.line.fill.background()
        nt = num.text_frame.paragraphs[0]
        nt.alignment = PP_ALIGN.CENTER
        nr = nt.add_run()
        nr.text = str(i + 1); nr.font.size = Pt(11); nr.font.bold = True
        nr.font.name = FONT; nr.font.color.rgb = WHITE

        txt(sl, stage, x + Inches(0.65), y + Inches(0.2), box_w - Inches(0.8), Inches(0.45),
            size=Pt(13), bold=True, color=(BLUE if i == 0 else DARK))
        txt(sl, desc,  x + Inches(0.2),  y + Inches(0.7), box_w - Inches(0.4), Inches(1.55),
            size=Pt(11.5), color=DARK, wrap=True)

        # arrow between boxes
        if i < 3:
            ax = x + box_w + Inches(0.04)
            ay = y + box_h / 2 - Pt(4)
            arrow = sl.shapes.add_shape(1, ax, ay, Inches(0.1), Pt(8))
            arrow.fill.solid(); arrow.fill.fore_color.rgb = MUTED; arrow.line.fill.background()

    txt(sl,
        "Feature flags everywhere  ·  Rollback by flag flip  ·  Build–Measure–Learn loop",
        ML, cy + Inches(3.0), CW, Inches(0.45),
        size=Pt(13), italic=True, color=MUTED, align=PP_ALIGN.CENTER)

    add_notes(sl, "Four stages. The principle is: we promote on quality thresholds, not on dates. If grounding hasn't cleared 95% on the golden set, we don't ship. Medical is intentionally last because that's where a wrong answer hurts most — I want the system mature before it's deployed there. And every new feature ships behind a feature flag, so if we see a guardrail regression we flip it back without a code deploy.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 20 — What I deliberately did NOT build
# ═══════════════════════════════════════════════════════════════════════════════

def s20(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "What I deliberately did NOT build", "What I left out — and why.")

    cuts = [
        ("Hebbia-style Matrix grid",          "Bulk extraction across many docs.", "Re-enters at V-next once bulk-extraction pattern is validated in user data."),
        ("Deep Research",                     "Multi-step investigations.",        "Different latency / cost shape. V-next once 30%+ of queries are investigative-multi-step."),
        ("Always-on full citation-check",     "Every claim, every time.",          "Sampled on low-stakes is enough. Gate by domain / sensitivity label, not a universal tax."),
        ("GraphRAG by default",               "Graph store in the default path.",  "Build cost is real. Gated — earned by corpus shape, not added speculatively."),
    ]

    col_w = (CW - Inches(0.3)) / 2
    for i, (feature, why_cut, trigger) in enumerate(cuts):
        col, row = i % 2, i // 2
        x = ML + col * (col_w + Inches(0.3))
        y = cy + Inches(0.2) + row * Inches(1.8)
        rect(sl, x, y, col_w, Inches(1.65), fill=GRAY, line=GRAYLN)
        txt(sl, f"✕  {feature}", x + Inches(0.2), y + Inches(0.15), col_w - Inches(0.4), Inches(0.38),
            size=Pt(14), bold=True, color=DARK)
        txt(sl, why_cut, x + Inches(0.2), y + Inches(0.55), col_w - Inches(0.4), Inches(0.3),
            size=Pt(11), color=MUTED)
        txt(sl, f"↑ Trigger: {trigger}", x + Inches(0.2), y + Inches(0.88), col_w - Inches(0.4), Inches(0.65),
            size=Pt(11), italic=True, color=BLUE, wrap=True)

    add_notes(sl, "This is the anti-feature-factory slide. Each of these I considered, named, and cut deliberately — and each has a trigger that brings it back. The Matrix grid is Hebbia's pattern; it's the right surface when the job is bulk extraction across many docs, but our MVP is cited Q&A. The discipline isn't 'don't build,' it's 'don't build yet.' The trigger writes itself: when 30% of user questions are clearly investigative-multi-step, Deep Research earns its place.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 21 — Closing
# ═══════════════════════════════════════════════════════════════════════════════

def s21(prs):
    sl = blank(prs)
    set_bg(sl, DARK)

    # Subtle top border
    divider(sl, Inches(0.0), color=BLUE, thickness=Inches(0.08))

    txt(sl, "What I'd want to defend.",
        ML, Inches(0.75), CW, Inches(0.65),
        size=Pt(30), bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    paragraphs = [
        ("The frame:       ", "In regulated domains, a confident wrong answer is the worst outcome.\nSo we cite, or we refuse."),
        ("The architecture:", "Three stores by question type. Two passes. One promise.\nGovernance and deployment run through everything."),
        ("The discipline:  ", "Gate the expensive steps. Refuse the unsupported.\nLeave the unproven features for V-next."),
    ]

    y = Inches(1.75)
    for label, body in paragraphs:
        box = sl.shapes.add_textbox(ML, y, CW, Inches(1.3))
        tf  = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.space_after = Pt(4)
        r1 = p.add_run()
        r1.text = label
        r1.font.name = FONT; r1.font.size = Pt(16); r1.font.bold = True
        r1.font.color.rgb = BLUE
        r2 = p.add_run()
        r2.text = "  " + body
        r2.font.name = FONT; r2.font.size = Pt(16); r2.font.bold = False
        r2.font.color.rgb = WHITE
        y += Inches(1.4)

    add_notes(sl, "Three things I'd defend hardest if you pressed me. The frame, the architecture, the discipline. The frame is the cite-or-refuse promise — non-negotiable in these domains. The architecture is the three-store model — vector for meaning, SQL for exact values, graph for relationships — because a number with legal weight should be retrieved exactly, not approximated. The discipline is the anti-over-engineering one — gate the expensive, refuse the unsupported, defer the unproven. That's the product I'd build, and the way I'd build it. Happy to go anywhere you want from here.")


# ═══════════════════════════════════════════════════════════════════════════════
# Slide 22 — Appendix
# ═══════════════════════════════════════════════════════════════════════════════

def s22(prs):
    sl = blank(prs)
    set_bg(sl, WHITE)
    cy = header(sl, "Appendix: what else exists", "What I'm submitting alongside this deck")

    docs = [
        ("Full PRD",                 "16 sections — problem, personas, JTBD, full functional spec, NFRs, edge cases, KPIs, rollout, Jira mapping"),
        ("Deep-Dive HLD",            "Every component, every tradeoff, the master architecture diagram"),
        ("API design",               "Full request/response schemas, failure handling, design rationale"),
        ("Wireframes",               "3 core screens + 2 variants + error-state grid"),
        ("Discovery & assumptions",  "Full log of what was asked, assumed, and why"),
        ("Tooling research",         "Verified 2026 stack defaults with sourced benchmarks"),
    ]

    box = sl.shapes.add_textbox(ML, cy + Inches(0.3), CW, Inches(5.0))
    tf  = box.text_frame
    tf.word_wrap = True

    for i, (title, desc) in enumerate(docs):
        mixed_para(
            tf,
            [(f"— {title}", True, Pt(15), DARK), (f"   {desc}", False, Pt(13), MUTED)],
            space_before=(Pt(0) if i == 0 else Pt(16)),
            space_after=Pt(4),
            first=(i == 0),
        )

    txt(sl,
        "Each document goes deeper than the deck. The deck is the spine; the documents are the depth.",
        ML, H - Inches(0.95), CW, Inches(0.6),
        size=Pt(14), italic=True, color=MUTED, align=PP_ALIGN.CENTER)

    add_notes(sl, "Quick map of what else is in the submission, in case you want to go deeper anywhere. I tried to keep this deck to the spine — the documents are where the depth lives. Where would you like to dig in?")


# ═══════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    prs = new_prs()

    builders = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10,
                s11, s12, s13, s14, s15, s16, s17, s18, s19, s20,
                s21, s22]

    for i, fn in enumerate(builders, 1):
        print(f"  Building slide {i:02d} — {fn.__name__}...")
        fn(prs)

    out = "jargon_ai_deck.pptx"
    prs.save(out)
    print(f"\n✓ Saved → {out}  ({len(prs.slides)} slides)")


if __name__ == "__main__":
    main()
