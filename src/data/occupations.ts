import type { Occupation } from "../engine/types"

// Total tracked employment: ~44,845,000
// BASE_LABOR_FORCE = 44,845,000 / 0.92 → ~8% baseline unemployment
export const BASE_LABOR_FORCE = 48_744_565

export const occupations: Occupation[] = [

  // ── Original 15 occupations (some scores updated) ───────────────────────

  {
    id: "home_health_aides",
    name: "Home Health & Personal Care Aides",
    employment: 4_000_000,
    meanWage: 32000,
    routineScore: 0.4,
    analyticalScore: 0.2,
    socialScore: 0.9,
    manualScore: 0.7,
    complementarityScore: 0.3,
    sector: "Healthcare",
    isLogistics: false
  },
  {
    id: "retail_sales",
    name: "Retail Salespersons",
    employment: 3_700_000,
    meanWage: 35000,
    routineScore: 0.7,
    analyticalScore: 0.3,
    socialScore: 0.6,
    manualScore: 0.4,
    complementarityScore: 0.2,
    sector: "Retail",
    isLogistics: false
  },
  {
    id: "fast_food",
    name: "Fast Food & Counter Workers",
    employment: 3_500_000,
    meanWage: 28000,
    routineScore: 0.8,
    analyticalScore: 0.2,
    socialScore: 0.5,
    manualScore: 0.6,
    complementarityScore: 0.1,
    sector: "Food",
    isLogistics: false
  },
  {
    id: "general_managers",
    name: "General & Operations Managers",
    employment: 3_000_000,
    meanWage: 110000,
    routineScore: 0.3,
    analyticalScore: 0.8,
    socialScore: 0.8,
    manualScore: 0.1,
    complementarityScore: 0.8,
    sector: "Management",
    isLogistics: false
  },
  {
    // routineScore lowered 0.4→0.2 (highly adaptive/situational)
    // complementarityScore raised 0.7→0.8 (AI diagnostics genuinely augment nurses)
    id: "registered_nurses",
    name: "Registered Nurses",
    employment: 3_100_000,
    meanWage: 85000,
    routineScore: 0.2,
    analyticalScore: 0.7,
    socialScore: 0.9,
    manualScore: 0.5,
    complementarityScore: 0.8,
    sector: "Healthcare",
    isLogistics: false
  },
  {
    id: "cashiers",
    name: "Cashiers",
    employment: 3_300_000,
    meanWage: 30000,
    routineScore: 0.9,
    analyticalScore: 0.2,
    socialScore: 0.5,
    manualScore: 0.4,
    complementarityScore: 0.1,
    sector: "Retail",
    isLogistics: false
  },
  {
    id: "stockers",
    name: "Stockers & Order Fillers",
    employment: 2_900_000,
    meanWage: 34000,
    routineScore: 0.8,
    analyticalScore: 0.3,
    socialScore: 0.3,
    manualScore: 0.8,
    complementarityScore: 0.2,
    sector: "Retail",
    isLogistics: true
  },
  {
    id: "office_clerks",
    name: "General Office Clerks",
    employment: 2_800_000,
    meanWage: 42000,
    routineScore: 0.85,
    analyticalScore: 0.4,
    socialScore: 0.4,
    manualScore: 0.2,
    complementarityScore: 0.3,
    sector: "Administrative",
    isLogistics: false
  },
  {
    // routineScore raised 0.75→0.85 (modern CSR is heavily scripted)
    id: "customer_service",
    name: "Customer Service Representatives",
    employment: 2_700_000,
    meanWage: 39000,
    routineScore: 0.85,
    analyticalScore: 0.4,
    socialScore: 0.7,
    manualScore: 0.1,
    complementarityScore: 0.4,
    sector: "Services",
    isLogistics: false
  },
  {
    id: "laborers",
    name: "Laborers & Freight Movers",
    employment: 2_600_000,
    meanWage: 36000,
    routineScore: 0.7,
    analyticalScore: 0.2,
    socialScore: 0.2,
    manualScore: 0.9,
    complementarityScore: 0.2,
    sector: "Logistics",
    isLogistics: true
  },
  {
    // routineScore lowered 0.6→0.55 (highway routine, city/docking less so)
    id: "truck_drivers",
    name: "Heavy & Tractor-Trailer Truck Drivers",
    employment: 2_200_000,
    meanWage: 55000,
    routineScore: 0.55,
    analyticalScore: 0.3,
    socialScore: 0.2,
    manualScore: 0.8,
    complementarityScore: 0.3,
    sector: "Logistics",
    isLogistics: true
  },
  {
    id: "teachers",
    name: "Elementary School Teachers",
    employment: 2_000_000,
    meanWage: 65000,
    routineScore: 0.4,
    analyticalScore: 0.6,
    socialScore: 0.9,
    manualScore: 0.2,
    complementarityScore: 0.6,
    sector: "Education",
    isLogistics: false
  },
  {
    // routineScore lowered 0.4→0.35, complementarityScore raised 0.9→0.95
    id: "software_dev",
    name: "Software Developers",
    employment: 1_600_000,
    meanWage: 120000,
    routineScore: 0.35,
    analyticalScore: 0.95,
    socialScore: 0.4,
    manualScore: 0.1,
    complementarityScore: 0.95,
    sector: "Technology",
    isLogistics: false
  },
  {
    id: "janitors",
    name: "Janitors & Cleaners",
    employment: 2_300_000,
    meanWage: 31000,
    routineScore: 0.6,
    analyticalScore: 0.2,
    socialScore: 0.2,
    manualScore: 0.9,
    complementarityScore: 0.2,
    sector: "Facilities",
    isLogistics: false
  },
  {
    // routineScore raised 0.7→0.8 (heavily formulaic — tax prep, audit checklists)
    id: "accountants",
    name: "Accountants & Auditors",
    employment: 1_500_000,
    meanWage: 78000,
    routineScore: 0.8,
    analyticalScore: 0.85,
    socialScore: 0.4,
    manualScore: 0.1,
    complementarityScore: 0.7,
    sector: "Finance",
    isLogistics: false
  },

  // ── 10 New Tech / Knowledge Worker Occupations ──────────────────────────

  {
    // High routine: chatbots already replacing tier-1 tickets
    id: "it_support",
    name: "IT Support Specialists",
    employment: 920_000,
    meanWage: 62000,
    routineScore: 0.75,
    analyticalScore: 0.55,
    socialScore: 0.6,
    manualScore: 0.2,
    complementarityScore: 0.35,
    sector: "Technology",
    isLogistics: false
  },
  {
    // Creative model-building; AI dramatically boosts productivity
    id: "data_scientists",
    name: "Data Scientists",
    employment: 180_000,
    meanWage: 108000,
    routineScore: 0.45,
    analyticalScore: 0.95,
    socialScore: 0.3,
    manualScore: 0.05,
    complementarityScore: 0.85,
    sector: "Technology",
    isLogistics: false
  },
  {
    // Adversarial/creative — AI is a force multiplier not a replacement
    id: "cybersecurity",
    name: "Cybersecurity Analysts",
    employment: 170_000,
    meanWage: 120000,
    routineScore: 0.3,
    analyticalScore: 0.9,
    socialScore: 0.3,
    manualScore: 0.05,
    complementarityScore: 0.9,
    sector: "Technology",
    isLogistics: false
  },
  {
    // LLMs directly generate documentation — among highest substitution in knowledge work
    id: "technical_writers",
    name: "Technical Writers",
    employment: 55_000,
    meanWage: 80000,
    routineScore: 0.8,
    analyticalScore: 0.6,
    socialScore: 0.3,
    manualScore: 0.05,
    complementarityScore: 0.3,
    sector: "Technology",
    isLogistics: false
  },
  {
    // Essentially fully automatable — clearest AI displacement story in simulation
    id: "data_entry",
    name: "Data Entry Keyers",
    employment: 140_000,
    meanWage: 38000,
    routineScore: 0.95,
    analyticalScore: 0.15,
    socialScore: 0.2,
    manualScore: 0.1,
    complementarityScore: 0.05,
    sector: "Administrative",
    isLogistics: false
  },
  {
    // Monitoring routinizable; troubleshooting/architecture less so
    id: "network_admins",
    name: "Network & Systems Admins",
    employment: 350_000,
    meanWage: 92000,
    routineScore: 0.55,
    analyticalScore: 0.75,
    socialScore: 0.3,
    manualScore: 0.3,
    complementarityScore: 0.6,
    sector: "Technology",
    isLogistics: false
  },
  {
    // Strategic consulting enhanced by AI data analysis tools
    id: "mgmt_analysts",
    name: "Management Analysts",
    employment: 950_000,
    meanWage: 99000,
    routineScore: 0.5,
    analyticalScore: 0.85,
    socialScore: 0.6,
    manualScore: 0.05,
    complementarityScore: 0.75,
    sector: "Management",
    isLogistics: false
  },
  {
    // Requirements/documentation routinizable; system design less so
    id: "systems_analysts",
    name: "Computer Systems Analysts",
    employment: 600_000,
    meanWage: 103000,
    routineScore: 0.6,
    analyticalScore: 0.85,
    socialScore: 0.4,
    manualScore: 0.05,
    complementarityScore: 0.7,
    sector: "Technology",
    isLogistics: false
  },
  {
    // Build the AI — highest complementarity score in entire simulation
    id: "ml_engineers",
    name: "ML & AI Engineers",
    employment: 80_000,
    meanWage: 145000,
    routineScore: 0.2,
    analyticalScore: 0.98,
    socialScore: 0.3,
    manualScore: 0.05,
    complementarityScore: 0.95,
    sector: "Technology",
    isLogistics: false
  },
  {
    // Generative AI directly threatens production design work
    id: "graphic_designers",
    name: "Graphic Designers",
    employment: 200_000,
    meanWage: 58000,
    routineScore: 0.7,
    analyticalScore: 0.6,
    socialScore: 0.3,
    manualScore: 0.3,
    complementarityScore: 0.25,
    sector: "Creative",
    isLogistics: false
  }
]
