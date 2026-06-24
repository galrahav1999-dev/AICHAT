export type Stage =
  | "Prospecting"
  | "Qualified"
  | "Demo"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

export interface Company {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  stage: Stage;
  ownerRep: string;
  dealValue: number;
  lastActivity: string; // ISO date
  nextFollowUp: string | null; // ISO date or null when closed
  activityNote: string;
  aiFollowUp: string;
}

export interface Dataset {
  generatedAt: string;
  reps: string[];
  stages: Stage[];
  companies: Company[];
}

export type ViewMode = "globe" | "map" | "list";
export type DrillLevel = "globe" | "country" | "city" | "company";

export interface CountryAgg {
  country: string;
  lat: number;
  lng: number;
  totalValue: number;
  dealCount: number;
}

export interface CityAgg {
  city: string;
  country: string;
  lat: number;
  lng: number;
  totalValue: number;
  dealCount: number;
}
