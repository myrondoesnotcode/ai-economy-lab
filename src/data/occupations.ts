import type { Occupation } from "../engine/types"

// Total tracked employment: ~7,935,000
// BASE_LABOR_FORCE = 7,935,000 / 0.92 → ~8% baseline unemployment
// All wages anchored to BLS May 2024 OEWS data
export const BASE_LABOR_FORCE = 8_625_000

export const occupations: Occupation[] = [

  // ── Core Engineering ─────────────────────────────────────────────────────

  {
    // BLS $133,080 median. Growth +15% projected 2024-2034.
    // High complementarity: AI copilots amplify output dramatically.
    id: "software_dev",
    name: "Software Developers & Engineers",
    employment: 1_600_000,
    meanWage: 133_080,
    routineScore: 0.35,
    analyticalScore: 0.95,
    socialScore: 0.40,
    manualScore: 0.05,
    complementarityScore: 0.95,
    sector: "Engineering",
    isInfrastructure: false
  },
  {
    // BLS $140,910 for Computer & Info Research Scientists (closest SOC).
    // Highest complementarity in simulation — they build the AI.
    id: "ml_engineers",
    name: "ML & AI Engineers",
    employment: 120_000,
    meanWage: 145_000,
    routineScore: 0.15,
    analyticalScore: 0.98,
    socialScore: 0.30,
    manualScore: 0.05,
    complementarityScore: 0.98,
    sector: "Engineering",
    isInfrastructure: false
  },
  {
    // BLS $116,000–$124,590. Growth +34% projected 2024-2034.
    // AI tools dramatically amplify data scientist productivity.
    id: "data_scientists",
    name: "Data Scientists & Analysts",
    employment: 200_000,
    meanWage: 116_000,
    routineScore: 0.40,
    analyticalScore: 0.95,
    socialScore: 0.30,
    manualScore: 0.05,
    complementarityScore: 0.88,
    sector: "Engineering",
    isInfrastructure: false
  },
  {
    // BLS $124,910. Growth +29% projected 2024-2034.
    // Adversarial domain — AI is a force multiplier, not a replacement.
    id: "cybersecurity",
    name: "Cybersecurity Analysts",
    employment: 170_000,
    meanWage: 124_910,
    routineScore: 0.30,
    analyticalScore: 0.90,
    socialScore: 0.30,
    manualScore: 0.05,
    complementarityScore: 0.92,
    sector: "Engineering",
    isInfrastructure: false
  },
  {
    // BLS groups with software devs (~$125K-130K range). isInfrastructure: true.
    // Manages the reliability layer; displaced before AIOps is reliable = instability spike.
    id: "devops_engineers",
    name: "DevOps & Site Reliability Engineers",
    employment: 200_000,
    meanWage: 125_000,
    routineScore: 0.45,
    analyticalScore: 0.88,
    socialScore: 0.35,
    manualScore: 0.10,
    complementarityScore: 0.82,
    sector: "Engineering",
    isInfrastructure: true
  },
  {
    // BLS $98,670. BLS projects -6% decline 2024-2034.
    // Code generation directly threatens lower-level programming tasks.
    id: "computer_programmers",
    name: "Computer Programmers",
    employment: 180_000,
    meanWage: 98_670,
    routineScore: 0.65,
    analyticalScore: 0.80,
    socialScore: 0.20,
    manualScore: 0.05,
    complementarityScore: 0.55,
    sector: "Engineering",
    isInfrastructure: false
  },
  {
    // BLS $102,610 for QA Analysts & Testers.
    // Automated test generation is one of the earliest and clearest AI substitution targets.
    id: "qa_engineers",
    name: "QA & Test Engineers",
    employment: 160_000,
    meanWage: 102_610,
    routineScore: 0.72,
    analyticalScore: 0.75,
    socialScore: 0.25,
    manualScore: 0.05,
    complementarityScore: 0.45,
    sector: "Engineering",
    isInfrastructure: false
  },

  // ── Infrastructure & Systems ─────────────────────────────────────────────

  {
    // BLS ~$150K+ for cloud architects. isInfrastructure: true.
    // High complementarity: AI dramatically amplifies their leverage at scale.
    id: "cloud_architects",
    name: "Cloud Architects & Engineers",
    employment: 150_000,
    meanWage: 155_000,
    routineScore: 0.25,
    analyticalScore: 0.92,
    socialScore: 0.45,
    manualScore: 0.05,
    complementarityScore: 0.90,
    sector: "Infrastructure",
    isInfrastructure: true
  },
  {
    // BLS $103,000. Requirements/documentation routinizable; system design less so.
    id: "systems_analysts",
    name: "Computer Systems Analysts",
    employment: 600_000,
    meanWage: 103_000,
    routineScore: 0.60,
    analyticalScore: 0.85,
    socialScore: 0.40,
    manualScore: 0.05,
    complementarityScore: 0.70,
    sector: "Infrastructure",
    isInfrastructure: false
  },
  {
    // BLS $107,000. isInfrastructure: true. Monitoring routinizable; architecture less so.
    id: "database_admins",
    name: "Database Administrators & Architects",
    employment: 130_000,
    meanWage: 107_000,
    routineScore: 0.55,
    analyticalScore: 0.82,
    socialScore: 0.25,
    manualScore: 0.05,
    complementarityScore: 0.68,
    sector: "Infrastructure",
    isInfrastructure: true
  },
  {
    // BLS $92,000. isInfrastructure: true. Monitoring routinizable; troubleshooting less so.
    id: "network_admins",
    name: "Network & Systems Administrators",
    employment: 350_000,
    meanWage: 92_000,
    routineScore: 0.55,
    analyticalScore: 0.75,
    socialScore: 0.30,
    manualScore: 0.25,
    complementarityScore: 0.62,
    sector: "Infrastructure",
    isInfrastructure: true
  },
  {
    // BLS $62,000. Chatbots already replacing tier-1 tickets; high routine.
    id: "it_support",
    name: "IT Support Specialists",
    employment: 920_000,
    meanWage: 62_000,
    routineScore: 0.75,
    analyticalScore: 0.55,
    socialScore: 0.60,
    manualScore: 0.15,
    complementarityScore: 0.35,
    sector: "Infrastructure",
    isInfrastructure: false
  },

  // ── Product, Design & Strategy ───────────────────────────────────────────

  {
    // BLS ~$145K-160K. High social score: stakeholder alignment is deeply human.
    id: "product_managers",
    name: "Product Managers (Tech)",
    employment: 350_000,
    meanWage: 148_000,
    routineScore: 0.30,
    analyticalScore: 0.82,
    socialScore: 0.85,
    manualScore: 0.05,
    complementarityScore: 0.80,
    sector: "Management",
    isInfrastructure: false
  },
  {
    // BLS $92,750. Front-end templating increasingly AI-generated.
    id: "web_developers",
    name: "Web Developers & Digital Designers",
    employment: 200_000,
    meanWage: 92_750,
    routineScore: 0.60,
    analyticalScore: 0.70,
    socialScore: 0.30,
    manualScore: 0.15,
    complementarityScore: 0.55,
    sector: "Design",
    isInfrastructure: false
  },
  {
    // BLS ~$100K. UX research and system design harder to automate than visual production.
    id: "ux_designers",
    name: "UX/UI Designers",
    employment: 130_000,
    meanWage: 100_000,
    routineScore: 0.50,
    analyticalScore: 0.72,
    socialScore: 0.55,
    manualScore: 0.20,
    complementarityScore: 0.62,
    sector: "Design",
    isInfrastructure: false
  },
  {
    // BLS $58,000. Generative AI directly threatens production design work.
    id: "graphic_designers",
    name: "Graphic Designers",
    employment: 200_000,
    meanWage: 58_000,
    routineScore: 0.70,
    analyticalScore: 0.60,
    socialScore: 0.30,
    manualScore: 0.25,
    complementarityScore: 0.25,
    sector: "Design",
    isInfrastructure: false
  },
  {
    // BLS $99,000. Strategic consulting enhanced by AI data analysis.
    id: "mgmt_analysts",
    name: "Management Analysts & Strategy",
    employment: 950_000,
    meanWage: 99_000,
    routineScore: 0.50,
    analyticalScore: 0.85,
    socialScore: 0.60,
    manualScore: 0.05,
    complementarityScore: 0.75,
    sector: "Management",
    isInfrastructure: false
  },

  // ── Business & Support ───────────────────────────────────────────────────

  {
    // BLS ~$102K base. Highest social score: relationship-based enterprise sales.
    id: "tech_sales",
    name: "Tech Sales & Account Executives",
    employment: 400_000,
    meanWage: 102_000,
    routineScore: 0.40,
    analyticalScore: 0.65,
    socialScore: 0.90,
    manualScore: 0.05,
    complementarityScore: 0.65,
    sector: "Sales",
    isInfrastructure: false
  },
  {
    // BLS ~$107K. Coordination and judgment harder to automate.
    id: "it_project_mgrs",
    name: "IT Project Managers",
    employment: 280_000,
    meanWage: 107_000,
    routineScore: 0.45,
    analyticalScore: 0.78,
    socialScore: 0.75,
    manualScore: 0.05,
    complementarityScore: 0.72,
    sector: "Management",
    isInfrastructure: false
  },
  {
    // BLS ~$75K. Sourcing/screening automatable; final judgment less so.
    id: "tech_recruiters",
    name: "Technical Recruiters & HR",
    employment: 200_000,
    meanWage: 75_000,
    routineScore: 0.60,
    analyticalScore: 0.55,
    socialScore: 0.80,
    manualScore: 0.05,
    complementarityScore: 0.45,
    sector: "HR",
    isInfrastructure: false
  },
  {
    // BLS $80,000. LLMs directly generate documentation — high displacement risk.
    id: "technical_writers",
    name: "Technical Writers",
    employment: 55_000,
    meanWage: 80_000,
    routineScore: 0.80,
    analyticalScore: 0.60,
    socialScore: 0.30,
    manualScore: 0.05,
    complementarityScore: 0.30,
    sector: "Engineering",
    isInfrastructure: false
  },
  {
    // BLS $38,000. Essentially fully automatable — clearest displacement story.
    id: "data_entry",
    name: "Data Entry Keyers",
    employment: 140_000,
    meanWage: 38_000,
    routineScore: 0.95,
    analyticalScore: 0.15,
    socialScore: 0.20,
    manualScore: 0.10,
    complementarityScore: 0.05,
    sector: "Administrative",
    isInfrastructure: false
  }
]
