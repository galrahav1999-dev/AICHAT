// Deterministic fake-data generator for the Pipeline Cockpit prototype.
// Run with: npm run gen:data  ->  writes data/companies.json
//
// Account-overlap model: the dataset intentionally contains a few company
// NAMES that appear more than once, owned by DIFFERENT reps. The app detects
// overlaps by grouping records with the same (normalized) name across >1 rep.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Seeded RNG (mulberry32) so output is stable across runs ----------------
function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260624);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

// --- Reference data ---------------------------------------------------------
const REPS = ["Maya Okafor", "Diego Ramirez", "Priya Nair", "Tom Becker", "Sora Kim"];

const STAGES = [
  "Prospecting",
  "Qualified",
  "Demo",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

// City -> coordinates + country. Coordinates are real city centers; individual
// company pins get a small jitter so they don't perfectly overlap on the globe.
const CITIES = [
  { city: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194 },
  { city: "New York", country: "United States", lat: 40.7128, lng: -74.006 },
  { city: "Austin", country: "United States", lat: 30.2672, lng: -97.7431 },
  { city: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
  { city: "Manchester", country: "United Kingdom", lat: 53.4808, lng: -2.2426 },
  { city: "Berlin", country: "Germany", lat: 52.52, lng: 13.405 },
  { city: "Munich", country: "Germany", lat: 48.1351, lng: 11.582 },
  { city: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { city: "Tel Aviv", country: "Israel", lat: 32.0853, lng: 34.7818 },
  { city: "Bangalore", country: "India", lat: 12.9716, lng: 77.5946 },
  { city: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  { city: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { city: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { city: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
  { city: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333 },
];

const NAME_PREFIX = [
  "Northwind", "Acme", "Hyperion", "Lumen", "Vertex", "Aster", "Quanta",
  "Helio", "Cobalt", "Meridian", "Atlas", "Nimbus", "Falcon", "Orbit",
  "Cedar", "Aurora", "Pioneer", "Summit", "Beacon", "Granite", "Ironclad",
  "Lattice", "Verve", "Solstice", "Tideway", "Brightline", "Keystone",
  "Magnolia", "Onyx", "Pinecrest", "Riverstone", "Sentinel", "Tessera",
];
const NAME_SUFFIX = ["Labs", "Systems", "Dynamics", "Analytics", "Cloud", "Robotics", "Health", "Capital", "Logistics", "Studios"];

// --- Helpers ----------------------------------------------------------------
const jitter = () => (rand() - 0.5) * 0.06; // ~3km

function daysAgo(n) {
  const d = new Date("2026-06-24T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysAhead(n) {
  const d = new Date("2026-06-24T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const FOLLOWUPS = [
  "Send tailored ROI one-pager referencing their Q3 expansion plans.",
  "Loop in their VP of RevOps before the next call — economic buyer.",
  "Share the security questionnaire + SOC2 packet to unblock procurement.",
  "Propose a 30-min technical deep-dive with their data team.",
  "Follow up on pricing objection with the annual-commit discount option.",
  "Re-engage: no reply in 12 days. Send a short value-recap nudge.",
  "Confirm mutual action plan and target go-live date.",
  "Send case study from a similar logo in their vertical.",
  "Schedule exec-to-exec alignment to sponsor the deal internally.",
  "Draft proposal with phased rollout to lower first-year cost.",
];

const ACTIVITIES = [
  "Demo call completed",
  "Email reply received",
  "Pricing sent",
  "LinkedIn message",
  "Discovery call",
  "Left voicemail",
  "Proposal opened 3×",
  "Met at conference",
  "Intro from referral",
];

function makeName(used) {
  let name;
  let guard = 0;
  do {
    name = `${pick(NAME_PREFIX)} ${pick(NAME_SUFFIX)}`;
    guard++;
  } while (used.has(name) && guard < 50);
  used.add(name);
  return name;
}

// --- Build the dataset ------------------------------------------------------
const companies = [];
const usedNames = new Set();
let counter = 1;

function makeRecord({ name, loc, rep, stageBias }) {
  const stage = stageBias ?? pick(STAGES);
  const isClosed = stage === "Closed Won" || stage === "Closed Lost";
  const last = between(0, 24);
  return {
    id: `co_${String(counter++).padStart(3, "0")}`,
    name,
    lat: +(loc.lat + jitter()).toFixed(4),
    lng: +(loc.lng + jitter()).toFixed(4),
    city: loc.city,
    country: loc.country,
    stage,
    ownerRep: rep,
    dealValue: between(8, 480) * 1000,
    lastActivity: daysAgo(last),
    // Some follow-ups are overdue (negative => past), some upcoming.
    nextFollowUp: isClosed ? null : (rand() < 0.45 ? daysAgo(between(1, 9)) : daysAhead(between(0, 14))),
    activityNote: pick(ACTIVITIES),
    aiFollowUp: pick(FOLLOWUPS),
  };
}

// 1) Seed a handful of intentional OVERLAPS: same company name, two reps.
const overlapSeeds = [
  { loc: CITIES[0], reps: ["Maya Okafor", "Diego Ramirez"] }, // SF
  { loc: CITIES[3], reps: ["Priya Nair", "Tom Becker"] }, // London
  { loc: CITIES[5], reps: ["Sora Kim", "Maya Okafor"] }, // Berlin
  { loc: CITIES[8], reps: ["Diego Ramirez", "Priya Nair", "Tom Becker"] }, // Tel Aviv (triple!)
];
for (const seed of overlapSeeds) {
  const name = makeName(usedNames);
  for (const rep of seed.reps) {
    companies.push(makeRecord({ name, loc: seed.loc, rep }));
  }
}

// 2) Fill the rest with unique accounts up to ~42 records total.
const TARGET = 42;
while (companies.length < TARGET) {
  companies.push(
    makeRecord({
      name: makeName(usedNames),
      loc: pick(CITIES),
      rep: pick(REPS),
    })
  );
}

mkdirSync(join(__dirname, "..", "data"), { recursive: true });
const payload = {
  generatedAt: "2026-06-24",
  reps: REPS,
  stages: STAGES,
  companies,
};
writeFileSync(
  join(__dirname, "..", "data", "companies.json"),
  JSON.stringify(payload, null, 2) + "\n"
);
console.log(`Wrote ${companies.length} companies to data/companies.json`);
