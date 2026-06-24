"use client";

import { useState } from "react";
import { companies, fmtMoney, relativeFromToday } from "@/lib/data";
import { useCockpit, pendingCount, type Draft } from "@/lib/store";
import { RepAvatar, StageBadge, SparkIcon } from "./ui";

export default function AutomationPanel() {
  const open = useCockpit((s) => s.panelOpen);
  const togglePanel = useCockpit((s) => s.togglePanel);
  const drafts = useCockpit((s) => s.drafts);
  const selectCompany = useCockpit((s) => s.selectCompany);

  const pending = pendingCount(drafts);
  const items = Object.values(drafts);
  const queued = items.filter((d) => d.status === "queued");
  const resolved = items.filter((d) => d.status !== "queued");

  return (
    <>
      {/* Scrim */}
      <div
        onClick={() => togglePanel(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900/95 backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-white/5 p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-sky-500 shadow-glow">
            <SparkIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">Follow-up autopilot</h2>
            <p className="text-xs text-slate-400">
              AI drafts the outreach. You stay in control.
            </p>
          </div>
          <button
            onClick={() => togglePanel(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white"
            aria-label="Close panel"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Approval indicator */}
        <div className="flex items-center gap-2 border-b border-white/5 bg-accent/5 px-4 py-3">
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-white">
            {pending}
          </span>
          <span className="text-sm font-medium text-slate-200">
            follow-up{pending === 1 ? "" : "s"} awaiting your approval
          </span>
        </div>

        {/* Principle banner */}
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5 text-[11px] text-emerald-300/90">
          <LockIcon className="h-3.5 w-3.5" />
          Nothing is sent in your name without an explicit click.
        </div>

        {/* List */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {queued.length === 0 && resolved.length === 0 && <EmptyState />}

          {queued.map((d) => (
            <DraftCard key={d.companyId} draft={d} onOpenAccount={selectCompany} />
          ))}

          {resolved.length > 0 && (
            <div className="pt-2">
              <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Recently actioned
              </div>
              <div className="space-y-2">
                {resolved.map((d) => (
                  <ResolvedRow key={d.companyId} draft={d} />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function DraftCard({
  draft,
  onOpenAccount,
}: {
  draft: Draft;
  onOpenAccount: (c: (typeof companies)[number]) => void;
}) {
  const company = companies.find((c) => c.id === draft.companyId)!;
  const editDraft = useCockpit((s) => s.editDraft);
  const sendDraft = useCockpit((s) => s.sendDraft);
  const vetoDraft = useCockpit((s) => s.vetoDraft);
  const togglePanel = useCockpit((s) => s.togglePanel);

  const [mode, setMode] = useState<"collapsed" | "preview" | "edit">("collapsed");

  const overdue = (relativeFromToday(company.nextFollowUp) || "").includes("ago");

  return (
    <div className="animate-fade-in rounded-2xl border border-white/5 bg-ink-850/80 p-3 shadow-card">
      {/* Account row */}
      <div className="flex items-center gap-2.5">
        <RepAvatar rep={company.ownerRep} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenAccount(company);
                togglePanel(false);
              }}
              className="truncate text-sm font-semibold text-white hover:text-accent-soft"
            >
              {company.name}
            </button>
            <span className="text-[11px] text-slate-500">{fmtMoney(company.dealValue)}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className={overdue ? "font-medium text-rose-400" : "text-slate-500"}>
              Due {relativeFromToday(company.nextFollowUp)}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">{company.ownerRep.split(" ")[0]}</span>
          </div>
        </div>
        <StageBadge stage={company.stage} />
      </div>

      {/* Draft body */}
      <div className="mt-3 rounded-xl border border-white/5 bg-ink-900/60 p-3">
        <div className="text-[11px] font-medium text-slate-500">Subject</div>
        {mode === "edit" ? (
          <input
            value={draft.subject}
            onChange={(e) => editDraft(draft.companyId, { subject: e.target.value })}
            className="mt-0.5 w-full rounded-md bg-ink-800 px-2 py-1 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-accent/50"
          />
        ) : (
          <div className="text-sm font-medium text-white">{draft.subject}</div>
        )}

        {mode !== "collapsed" && (
          <>
            <div className="mt-2 text-[11px] font-medium text-slate-500">Body</div>
            {mode === "edit" ? (
              <textarea
                value={draft.body}
                onChange={(e) => editDraft(draft.companyId, { body: e.target.value })}
                rows={9}
                className="mt-0.5 w-full resize-none rounded-md bg-ink-800 px-2 py-1.5 text-[13px] leading-relaxed text-slate-200 outline-none ring-1 ring-white/10 focus:ring-accent/50"
              />
            ) : (
              <pre className="mt-0.5 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-300">
                {draft.body}
              </pre>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1.5">
        <button
          onClick={() => setMode(mode === "preview" ? "collapsed" : "preview")}
          className="btn-ghost flex-1 ring-1 ring-white/5"
        >
          <EyeIcon className="h-4 w-4" />
          {mode === "preview" ? "Hide" : "Preview"}
        </button>
        <button
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
          className={`btn-ghost flex-1 ring-1 ring-white/5 ${mode === "edit" ? "text-accent-soft" : ""}`}
        >
          <PencilIcon className="h-4 w-4" />
          {mode === "edit" ? "Done" : "Edit"}
        </button>
        <button onClick={() => vetoDraft(draft.companyId)} className="btn-danger flex-1 ring-1 ring-white/5">
          <BanIcon className="h-4 w-4" />
          Veto
        </button>
        <button onClick={() => sendDraft(draft.companyId)} className="btn-primary flex-[1.2]">
          <SendIcon className="h-4 w-4" />
          Send
        </button>
      </div>
    </div>
  );
}

function ResolvedRow({ draft }: { draft: Draft }) {
  const company = companies.find((c) => c.id === draft.companyId)!;
  const requeue = useCockpit((s) => s.requeueDraft);
  const sent = draft.status === "sent";
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-ink-850/50 px-3 py-2">
      <span
        className={`grid h-6 w-6 place-items-center rounded-lg ${
          sent ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"
        }`}
      >
        {sent ? <CheckIcon className="h-3.5 w-3.5" /> : <BanIcon className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-slate-300">{company.name}</div>
        <div className="text-[11px] text-slate-500">{sent ? "Approved & sent" : "Vetoed — won’t send"}</div>
      </div>
      <button onClick={() => requeue(draft.companyId)} className="text-[11px] text-slate-500 hover:text-slate-300">
        Undo
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-800 text-slate-600">
        <SparkIcon className="h-7 w-7" />
      </div>
      <div className="text-sm font-medium text-slate-300">You’re all caught up</div>
      <div className="max-w-[15rem] text-xs text-slate-500">
        New AI drafts appear here the moment an account becomes due for follow-up.
      </div>
    </div>
  );
}

/* --- icons --- */
function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function PencilIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function BanIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="m6 6 12 12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
