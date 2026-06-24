"use client";

import { create } from "zustand";
import type { Company, DrillLevel, ViewMode } from "./types";
import { companies, dueFollowUps, fmtMoney, relativeFromToday } from "./data";

export type CrmOption = "HubSpot" | "Salesforce" | "Pipedrive";
export type DraftStatus = "queued" | "sent" | "vetoed";

export interface Draft {
  companyId: string;
  subject: string;
  body: string;
  status: DraftStatus;
}

// Build a believable AI-drafted email for a due account.
function buildDraft(c: Company): Draft {
  const firstName = c.ownerRep.split(" ")[0];
  const subject = `Quick next step on ${c.name}`;
  const body =
    `Hi there,\n\n` +
    `Following up on where we left things with ${c.name}. Based on your timeline and ` +
    `the ${c.stage.toLowerCase()} conversation, I put together a concrete next step:\n\n` +
    `  • ${c.aiFollowUp}\n\n` +
    `Happy to find 20 minutes this week — would Thursday or Friday work?\n\n` +
    `Best,\n${firstName}`;
  return { companyId: c.id, subject, body, status: "queued" };
}

interface CockpitState {
  // --- View + drill ---
  view: ViewMode;
  drill: DrillLevel;
  selectedCountry: string | null;
  selectedCity: string | null;
  selectedCompanyId: string | null;

  // --- Filters ---
  repFilter: string; // "all" or a rep name
  overlapsOnly: boolean;

  // --- Cosmetic CRM badge ---
  crm: CrmOption;

  // --- Automation queue ---
  drafts: Record<string, Draft>;
  panelOpen: boolean;

  // --- Actions ---
  setView: (v: ViewMode) => void;
  setRepFilter: (rep: string) => void;
  toggleOverlapsOnly: () => void;
  setCrm: (c: CrmOption) => void;
  togglePanel: (open?: boolean) => void;

  drillToGlobe: () => void;
  drillToCountry: (country: string) => void;
  drillToCity: (country: string, city: string) => void;
  selectCompany: (company: Company) => void;
  clearSelection: () => void;

  editDraft: (companyId: string, patch: Partial<Pick<Draft, "subject" | "body">>) => void;
  sendDraft: (companyId: string) => void;
  vetoDraft: (companyId: string) => void;
  requeueDraft: (companyId: string) => void;
}

const initialDrafts: Record<string, Draft> = {};
for (const c of dueFollowUps(companies)) initialDrafts[c.id] = buildDraft(c);

export const useCockpit = create<CockpitState>((set) => ({
  view: "globe",
  drill: "globe",
  selectedCountry: null,
  selectedCity: null,
  selectedCompanyId: null,

  repFilter: "all",
  overlapsOnly: false,

  crm: "HubSpot",

  drafts: initialDrafts,
  panelOpen: false,

  setView: (v) => set({ view: v }),
  setRepFilter: (rep) => set({ repFilter: rep }),
  toggleOverlapsOnly: () => set((s) => ({ overlapsOnly: !s.overlapsOnly })),
  setCrm: (crm) => set({ crm }),
  togglePanel: (open) => set((s) => ({ panelOpen: open ?? !s.panelOpen })),

  drillToGlobe: () =>
    set({ drill: "globe", selectedCountry: null, selectedCity: null, selectedCompanyId: null }),
  drillToCountry: (country) =>
    set({ drill: "country", selectedCountry: country, selectedCity: null, selectedCompanyId: null }),
  drillToCity: (country, city) =>
    set({ drill: "city", selectedCountry: country, selectedCity: city, selectedCompanyId: null }),
  selectCompany: (company) =>
    set({
      drill: "company",
      selectedCountry: company.country,
      selectedCity: company.city,
      selectedCompanyId: company.id,
    }),
  clearSelection: () => set({ selectedCompanyId: null, drill: "city" }),

  editDraft: (companyId, patch) =>
    set((s) => ({
      drafts: { ...s.drafts, [companyId]: { ...s.drafts[companyId], ...patch } },
    })),
  sendDraft: (companyId) =>
    set((s) => ({
      drafts: { ...s.drafts, [companyId]: { ...s.drafts[companyId], status: "sent" } },
    })),
  vetoDraft: (companyId) =>
    set((s) => ({
      drafts: { ...s.drafts, [companyId]: { ...s.drafts[companyId], status: "vetoed" } },
    })),
  requeueDraft: (companyId) =>
    set((s) => ({
      drafts: { ...s.drafts, [companyId]: { ...s.drafts[companyId], status: "queued" } },
    })),
}));

// Convenience selector used in a couple of headers.
export function pendingCount(drafts: Record<string, Draft>): number {
  return Object.values(drafts).filter((d) => d.status === "queued").length;
}

export const draftMeta = { fmtMoney, relativeFromToday };
