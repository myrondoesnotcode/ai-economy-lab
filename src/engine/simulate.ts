import type { SimulationState, SliderInputs, ModelParams } from "./types"
import { occupations as baseOccupations, BASE_LABOR_FORCE } from "../data/occupations"

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function buildInitialState(): SimulationState {
  const totalEmployment = baseOccupations.reduce((sum, o) => sum + o.employment, 0)
  const laborForce = BASE_LABOR_FORCE
  const unemploymentRate = (laborForce - totalEmployment) / laborForce

  const baseGDP = baseOccupations.reduce((sum, o) => sum + o.employment * o.meanWage, 0)

  return {
    year: 2025,
    occupations: baseOccupations.map(o => ({
      id: o.id,
      employment: o.employment,
      wage: o.meanWage,
    })),
    totalEmployment,
    unemploymentRate,
    gdpIndex: 100,
    techLayoffIndex: 1.0,
    inequalityIndex: 1.0,
    stabilityIndex: 100,
    eventLog: ["2025: Simulation initialized. Adjust sliders to begin."],
    _baseGDP: baseGDP,
  }
}

export function step(
  state: SimulationState,
  sliders: SliderInputs,
  params: ModelParams
): SimulationState {
  const {
    kRegulationDrag,
    slowdownMax,
    slowdownThreshold,
    stabilityAdoptionMinMultiplier,
    stabilityAdoptionMaxMultiplier,
    kSubstitution,
    laborProtectionLayoffDamp,
    employmentFloorRatio,
    kComplementarityWage,
    kLayoffFromInfra,
    kOpenSourcePassThrough,
    kIneqFromAI,
    kConcentrationLaborShare,
    gdpIndexMin,
    gdpIndexMax,
    techLayoffIndexMin,
    techLayoffIndexMax,
    inequalityIndexMin,
    inequalityIndexMax,
    stabilityMin,
    stabilityMax,
    laborForce,
    stabilityWeightUnemployment,
    stabilityWeightTechLayoffs,
    stabilityWeightInequality,
  } = params

  const {
    aiCapability,
    adoptionSpeed,
    regulation,
    retraining,
    transfers,
    laborProtection,
    corporateConcentration,
    openSourceAccess,
    talentPipelineStrength,
  } = sliders

  const nextYear = state.year + 1

  // Effective adoption rate
  const stabilityMultiplier = clamp(
    1 - slowdownMax * Math.max(0, (slowdownThreshold - state.stabilityIndex) / slowdownThreshold),
    stabilityAdoptionMinMultiplier,
    stabilityAdoptionMaxMultiplier
  )
  const effectiveAdoption = adoptionSpeed * (1 - regulation * kRegulationDrag) * stabilityMultiplier

  // Baseline infrastructure employment
  const baseInfrastructure = baseOccupations
    .filter(o => o.isInfrastructure)
    .reduce((sum, o) => sum + o.employment, 0)

  // Per-occupation updates
  const newOccupations = state.occupations.map(occState => {
    const base = baseOccupations.find(o => o.id === occState.id)!

    // Job loss rate: routine × (1 - social) drives substitution
    const retrainingDamp = retraining * 0.55
    const jobLossRate = clamp(
      aiCapability * effectiveAdoption * base.routineScore * (1 - base.socialScore) *
        kSubstitution * (1 - laborProtection * laborProtectionLayoffDamp) * (1 - retrainingDamp),
      0,
      0.5
    )

    const effectiveFloor = employmentFloorRatio + retraining * (0.5 - employmentFloorRatio)
    const newEmployment = Math.max(
      base.employment * effectiveFloor,
      occState.employment * (1 - jobLossRate)
    )

    // Wage dynamics: complementary roles rise, displaced-sector wages fall from oversupply
    const displacementRatio = newEmployment / base.employment
    const wageGrowth = aiCapability * base.complementarityScore * kComplementarityWage *
      (1 - corporateConcentration * 0.2)
    const wageSuppression = base.routineScore * (1 - displacementRatio) * 0.04
    const netWageChange = wageGrowth - wageSuppression
    const newWage = Math.max(occState.wage * (1 + netWageChange), base.meanWage * 0.5)

    return {
      id: occState.id,
      employment: newEmployment,
      wage: newWage,
    }
  })

  // GDP proxy — wage bill + capital/profit side of automation
  const newWageBill = newOccupations.reduce((sum, o) => sum + o.employment * o.wage, 0)
  const totalDisplacedWorkers = newOccupations.reduce((sum, o) => {
    const base = baseOccupations.find(b => b.id === o.id)!
    return sum + Math.max(0, base.employment - o.employment)
  }, 0)
  const avgBaseWage = baseOccupations.reduce((sum, o) => sum + o.meanWage, 0) / baseOccupations.length
  const aiCapitalGains = totalDisplacedWorkers * avgBaseWage * aiCapability * 0.6

  const newGDPRaw = newWageBill + aiCapitalGains
  const baseGDP = state._baseGDP ?? newOccupations.reduce((sum, o) => sum + o.employment * o.wage, 0)
  const newGDPIndex = clamp((newGDPRaw / baseGDP) * 100, gdpIndexMin, gdpIndexMax)

  // Unemployment
  const newTotalEmployment = newOccupations.reduce((sum, o) => sum + o.employment, 0)
  const newUnemploymentRate = clamp((laborForce - newTotalEmployment) / laborForce, 0, 1)

  // Demand feedback loop: unemployment above structural destroys spending → more layoffs
  const demandFeedback = Math.max(0, newUnemploymentRate - 0.08) * 0.3
  const adjustedUnemploymentForStability = newUnemploymentRate + demandFeedback

  // ── Tech Layoff Index ─────────────────────────────────────────────────────
  // Analogous to the food price index — measures structural disruption velocity
  // in the tech labor market. Driven by infrastructure role displacement and
  // open-source AI availability.
  //
  // Two opposing forces on infrastructure:
  //   1. Mid-transition chaos: SRE/DevOps displaced before AIOps is reliable
  //   2. Long-term AIOps efficiency: mature AI ops drives reliability up, costs down
  //
  // Open source access (positive = more open) accelerates displacement pressure
  // because lower barriers mean more roles can be automated more cheaply.

  const currentInfrastructure = newOccupations
    .filter(o => {
      const base = baseOccupations.find(b => b.id === o.id)!
      return base.isInfrastructure
    })
    .reduce((sum, o) => sum + o.employment, 0)

  const infrastructureShortfall = (baseInfrastructure - currentInfrastructure) / baseInfrastructure

  // Mid-transition instability: displaced before AIOps is reliable
  const infraTransitionChaos = infrastructureShortfall * (1 - aiCapability * 0.7)
  // Long-term AIOps efficiency: mature AI ops stabilizes and improves reliability
  const infraAIEfficiency = aiCapability * effectiveAdoption * 0.04

  const techLayoffInfraEffect = infraTransitionChaos * kLayoffFromInfra * (1 - talentPipelineStrength)
    - infraAIEfficiency * (1 - talentPipelineStrength * 0.5)

  // Open source access: positive = more open models = lower automation cost = more displacement
  const openSourceEffect = openSourceAccess * kOpenSourcePassThrough

  const newTechLayoffIndex = clamp(
    state.techLayoffIndex *
      (1 + techLayoffInfraEffect) *
      (1 + openSourceEffect),
    techLayoffIndexMin,
    techLayoffIndexMax
  )

  // Transfers fund retraining/support, reducing the stability hit from layoff waves
  // (not the layoffs themselves — similar to how transfers buffered food affordability)
  const techLayoffBuffer = transfers * 0.35 * Math.max(0, newTechLayoffIndex - 1)

  // ── Inequality index ──────────────────────────────────────────────────────
  const transfersIneqDamp = transfers * 0.4

  const highCompOccupations = newOccupations.filter(o => {
    const base = baseOccupations.find(b => b.id === o.id)!
    return base.complementarityScore > 0.7
  })
  const highRoutineOccupations = newOccupations.filter(o => {
    const base = baseOccupations.find(b => b.id === o.id)!
    return base.routineScore > 0.7
  })

  const highEndWageGain = highCompOccupations.reduce((sum, o) => {
    const base = baseOccupations.find(b => b.id === o.id)!
    return sum + Math.max(0, o.wage - base.meanWage)
  }, 0) / Math.max(1, highCompOccupations.length)

  const lowEndWageLoss = highRoutineOccupations.reduce((sum, o) => {
    const base = baseOccupations.find(b => b.id === o.id)!
    return sum + Math.max(0, base.meanWage - o.wage)
  }, 0) / Math.max(1, highRoutineOccupations.length)

  const wageDivergence = (highEndWageGain + lowEndWageLoss) / avgBaseWage
  const inequalityIncrease = wageDivergence * kIneqFromAI * (1 - transfersIneqDamp)
    + corporateConcentration * kConcentrationLaborShare * (1 - transfersIneqDamp)

  let newInequalityIndex = state.inequalityIndex + inequalityIncrease
  newInequalityIndex = clamp(newInequalityIndex, inequalityIndexMin, inequalityIndexMax)

  // ── Stability index ───────────────────────────────────────────────────────
  const effectiveTechLayoffPenalty = Math.max(0, (newTechLayoffIndex - 1) * 100 - techLayoffBuffer * 100)
  const newStabilityIndex = clamp(
    100 -
      adjustedUnemploymentForStability * 100 * stabilityWeightUnemployment -
      effectiveTechLayoffPenalty * stabilityWeightTechLayoffs -
      (newInequalityIndex - 1.0) * stabilityWeightInequality,
    stabilityMin,
    stabilityMax
  )

  // ── Event log — rich narrative entries ───────────────────────────────────
  const events: string[] = []
  const yr = nextYear

  // Helper: find the occupation currently losing the most workers in absolute terms
  const biggestLoser = newOccupations.reduce((worst, o) => {
    const base = baseOccupations.find(b => b.id === o.id)!
    const lost = base.employment - o.employment
    const worstBase = baseOccupations.find(b => b.id === worst.id)!
    return lost > (worstBase.employment - worst.employment) ? o : worst
  }, newOccupations[0])
  const biggestLoserBase = baseOccupations.find(b => b.id === biggestLoser.id)!
  const biggestLoserLost = Math.round((biggestLoserBase.employment - biggestLoser.employment) / 1000)
  const biggestLoserPct = ((biggestLoserBase.employment - biggestLoser.employment) / biggestLoserBase.employment * 100).toFixed(1)

  // Helper: find the occupation gaining the most in wage terms
  const biggestWinner = newOccupations.reduce((best, o) => {
    const base = baseOccupations.find(b => b.id === o.id)!
    const wageGain = o.wage - base.meanWage
    const bestBase = baseOccupations.find(b => b.id === best.id)!
    return wageGain > (best.wage - bestBase.meanWage) ? o : best
  }, newOccupations[0])
  const biggestWinnerBase = baseOccupations.find(b => b.id === biggestWinner.id)!
  const biggestWinnerWageGain = Math.round(biggestWinner.wage - biggestWinnerBase.meanWage)
  const biggestWinnerWagePct = ((biggestWinner.wage / biggestWinnerBase.meanWage - 1) * 100).toFixed(1)

  const totalDisplacedK = Math.round(totalDisplacedWorkers / 1000)

  // ── AI substitution narrative ─────────────────────────────────────────────
  if (aiCapability > 0.3 && effectiveAdoption > 0.2) {
    const adoptionPct = (effectiveAdoption * 100).toFixed(0)
    if (aiCapability > 0.7) {
      events.push(
        `${yr} — Automation Surge: AI systems operating at ${(aiCapability * 100).toFixed(0)}% capability are tearing through tech workflows. ` +
        `${biggestLoserBase.name} has shed ~${biggestLoserLost.toLocaleString()}k positions this year alone (${biggestLoserPct}% below baseline), ` +
        `and across all tracked roles roughly ${totalDisplacedK.toLocaleString()}k tech jobs have been eliminated. ` +
        `AI coding assistants, automated test suites, and LLM-powered support are replacing entire teams — not augmenting them. ` +
        `The speed of displacement is outpacing most workers' ability to retrain for roles AI can't yet do.`
      )
    } else if (aiCapability > 0.5) {
      events.push(
        `${yr} — Displacement Accelerating: With AI deployment at ${adoptionPct}% effective adoption, ` +
        `${biggestLoserBase.name} is absorbing the sharpest cuts — down ${biggestLoserPct}% from baseline, ` +
        `roughly ${biggestLoserLost.toLocaleString()}k fewer positions. ` +
        `Companies are consolidating engineering headcount behind AI copilots, automated QA pipelines, and AI-generated documentation. ` +
        `Workers in highly routine coding and support roles face a narrowing window to upskill into higher-judgment work.`
      )
    } else {
      events.push(
        `${yr} — Early Automation Pressure: AI tools are beginning to visibly affect tech hiring. ` +
        `${biggestLoserBase.name} is down ${biggestLoserPct}% from baseline as companies pilot Copilot-style tools and automated testing in lower-risk workflows first. ` +
        `The net effect is subtle but cumulative — headcount freezes in junior roles, slower backfill, more productivity extracted per remaining engineer.`
      )
    }
  }

  // ── Wage growth narrative for complementary roles ─────────────────────────
  if (aiCapability > 0.4 && biggestWinnerWageGain > 500) {
    const wageGainK = (biggestWinnerWageGain / 1000).toFixed(1)
    if (aiCapability > 0.7) {
      events.push(
        `${yr} — The AI Premium Widens: A sharp divide is forming between tech workers who wield AI and those replaced by it. ` +
        `${biggestWinnerBase.name} are commanding $${wageGainK}k more per year than their pre-AI baseline (+${biggestWinnerWagePct}%), ` +
        `as each person now handles problems that previously required full teams. ` +
        `Meanwhile, wages in displaced roles — QA engineers, data entry, junior coders — are being suppressed by labor oversupply. ` +
        `Firms are competing fiercely for AI-native talent, but this productivity windfall is not being shared broadly.`
      )
    } else {
      events.push(
        `${yr} — Productivity Dividend (Uneven): AI tools are making senior tech workers measurably more productive. ` +
        `${biggestWinnerBase.name} wages are up $${wageGainK}k from baseline (+${biggestWinnerWagePct}%), ` +
        `reflecting genuine output gains as AI handles repetitive analytical work. ` +
        `The catch: these gains are concentrated among workers with the skills and seniority to leverage the tools. ` +
        `In displaced roles, an oversupply of workers is already pulling wages down before outright job losses register.`
      )
    }
  }

  // ── Demand feedback narrative ─────────────────────────────────────────────
  if (demandFeedback > 0.03) {
    const feedbackPct = (demandFeedback * 100).toFixed(1)
    events.push(
      `${yr} — Demand Spiral Risk: Unemployment above structural norms is triggering a secondary effect. ` +
      `Displaced tech workers cut spending — on SaaS tools, services, and local economies around tech hubs. ` +
      `This demand contraction adds an estimated +${feedbackPct}% to effective unemployment pressure beyond the direct automation effect. ` +
      `This self-reinforcing dynamic is what turns manageable workforce transitions into prolonged sector-wide contractions.`
    )
  }

  // ── Tech layoff / infrastructure narratives ───────────────────────────────
  if (infrastructureShortfall > 0.15 && aiCapability < 0.6) {
    const shortPct = (infrastructureShortfall * 100).toFixed(0)
    events.push(
      `${yr} — Platform Reliability Risk: The infrastructure workforce (DevOps, SREs, network admins) is ${shortPct}% below baseline, ` +
      `but AIOps tooling isn't yet capable enough to reliably replace it. ` +
      `This mid-transition gap — engineers displaced before automation is production-ready — is causing deployment slowdowns, outage spikes, and rising operational costs. ` +
      `The layoff index is climbing. Once AIOps matures, this stabilizes — but the transition window is expensive.`
    )
  } else if (infrastructureShortfall > 0.15 && aiCapability >= 0.6) {
    events.push(
      `${yr} — AIOps Maturing: Automated infrastructure management is replacing the displaced workforce effectively. ` +
      `Self-healing systems, AI-driven incident response, and intelligent monitoring are absorbing the gaps left by departing SREs and network admins. ` +
      `Platform stability is holding — and in some areas improving — as operational costs fall. ` +
      `This is the stabilizing payoff of surviving the earlier transition chaos.`
    )
  } else if (infrastructureShortfall > 0.05 && aiCapability < 0.5) {
    const shortPct = (infrastructureShortfall * 100).toFixed(0)
    events.push(
      `${yr} — Infrastructure Transition Underway: Automation is hollowing out DevOps and admin roles — ` +
      `currently ${shortPct}% below baseline — faster than AIOps can reliably fill the gap. ` +
      `The effects are appearing in upticks to the tech layoff index as platform dependencies become less resilient. ` +
      `This is a temporary disruption cost of the transition, not a permanent structural change.`
    )
  }

  // ── Open source access narratives ─────────────────────────────────────────
  if (openSourceAccess > 0.2) {
    const layoffEffect = (openSourceAccess * kOpenSourcePassThrough * 100).toFixed(1)
    events.push(
      `${yr} — Open Source Acceleration: Freely available AI models (${(openSourceAccess * 100).toFixed(0)}% above baseline access) ` +
      `are dramatically lowering the cost of automating mid-tier tech tasks — ` +
      `adding +${layoffEffect}% to the tech layoff pressure index this year. ` +
      `Any company can now access models powerful enough to replace junior developers, QA engineers, and technical writers. ` +
      `The disruption is no longer limited to firms with large AI R&D budgets.`
    )
  } else if (openSourceAccess > 0.1) {
    const layoffEffect = (openSourceAccess * kOpenSourcePassThrough * 100).toFixed(1)
    events.push(
      `${yr} — Open Source Headwinds: Moderately available open-source models (+${(openSourceAccess * 100).toFixed(0)}% above baseline) ` +
      `are adding +${layoffEffect}% to tech layoff pressure via lower automation cost barriers. ` +
      `Not yet a crisis, but it's eroding the protection that previously came from needing expensive proprietary tools to automate complex work.`
    )
  } else if (openSourceAccess < -0.1) {
    events.push(
      `${yr} — Proprietary Moat: Restricted AI model access (${(openSourceAccess * 100).toFixed(0)}% below baseline) ` +
      `is providing unexpected protection for mid-tier tech roles. ` +
      `Only large tech firms with substantial AI investment can automate at scale — which slows displacement but concentrates competitive advantage among them. ` +
      `This buys time for workers to adapt, but at the cost of widening the gap between big-tech and everyone else.`
    )
  }

  // ── Unemployment narratives ───────────────────────────────────────────────
  const unemPct = (newUnemploymentRate * 100).toFixed(1)
  const displaceAboveStructural = Math.round(Math.max(0, newUnemploymentRate - 0.08) * params.laborForce / 1000)
  if (newUnemploymentRate > 0.20) {
    events.push(
      `${yr} — ⚠ Unemployment Crisis: ${unemPct}% of the tracked tech workforce is without work — ` +
      `roughly ${displaceAboveStructural.toLocaleString()}k people above structural baseline, most former routine-role workers whose skills no longer match available openings. ` +
      `Tech hubs are seeing the fastest office vacancy rates since the dot-com bust. ` +
      `At this scale, sustained over several years, tech unemployment leads to long-term skills decay, ` +
      `geographic decline of tech-concentrated cities, and intense political pressure to regulate AI deployment.`
    )
  } else if (newUnemploymentRate > 0.15) {
    events.push(
      `${yr} — Unemployment Surging: At ${unemPct}%, unemployment is well above structural baseline — ` +
      `approximately ${displaceAboveStructural.toLocaleString()}k tech workers displaced beyond frictional churn. ` +
      `The roles being destroyed are not the same as those being created. ` +
      `Senior ML engineers are in frantic demand; junior devs, QA, and IT support face a shrinking market with too many candidates and too few openings.`
    )
  } else if (newUnemploymentRate > 0.12) {
    events.push(
      `${yr} — Unemployment Elevated: The rate has climbed to ${unemPct}%, roughly ${displaceAboveStructural.toLocaleString()}k workers above structural norms. ` +
      `This is the early visible signal of tech sector displacement — the headline number understates the problem, ` +
      `as many displaced workers have moved to contract, part-time, or lower-tier roles that don't register here. ` +
      `Labor market slack at this level is already suppressing wage growth in non-AI-adjacent roles.`
    )
  }

  // ── Inequality narratives ─────────────────────────────────────────────────
  if (newInequalityIndex > 2.0) {
    events.push(
      `${yr} — ⚠ Severe Inequality: The inequality index has reached ${newInequalityIndex.toFixed(2)} — ` +
      `more than double the pre-AI baseline. AI productivity gains are being captured almost entirely by senior engineers, ML researchers, and tech executives. ` +
      `The wage gap between an ML engineer (salary surging) and a displaced data entry worker or QA engineer (wages fell before job vanished) is now extreme. ` +
      `At this level, inequality becomes a drag on aggregate demand: concentrated income at the top is spent less efficiently.`
    )
  } else if (newInequalityIndex > 1.6) {
    events.push(
      `${yr} — Inequality Widening Sharply: Wage dispersion has reached ${newInequalityIndex.toFixed(2)}x baseline. ` +
      `The gap between AI-complementary workers (ML engineers, cloud architects, PMs — wages rising fast) ` +
      `and AI-displaced workers (QA, technical writers, data entry — falling wages then unemployment) is becoming structural. ` +
      `High corporate concentration amplifies this: big tech captures AI gains rather than sharing them with the broader workforce.`
    )
  } else if (newInequalityIndex > 1.4) {
    events.push(
      `${yr} — Growing Divide: The inequality index is at ${newInequalityIndex.toFixed(2)}, up from the 1.0 baseline. ` +
      `Two distinct tech labor markets are emerging: AI-native workers whose productivity and compensation are amplified, ` +
      `and routine-task workers facing wage suppression or displacement. ` +
      `The divergence is still correctable with targeted policy, but it compounds every year if left unaddressed.`
    )
  }

  // ── Regulation narratives ─────────────────────────────────────────────────
  if (regulation > 0.7) {
    const dragEffect = (regulation * kRegulationDrag * 100).toFixed(0)
    events.push(
      `${yr} — Heavy Regulation in Effect: Government AI policy is imposing significant friction on tech deployment — ` +
      `reducing effective adoption by ~${dragEffect}% this year. ` +
      `Mandatory impact assessments, sector deployment restrictions, and liability frameworks are slowing rollout. ` +
      `This buys time for workers to adapt, but firms in less-regulated markets gain a competitive edge, ` +
      `and productivity gains are deferred.`
    )
  } else if (regulation > 0.6) {
    events.push(
      `${yr} — Regulatory Friction: Moderate AI regulation is slowing deployment in several tech sectors. ` +
      `Policymakers are threading a difficult needle — enough oversight to limit the worst displacement, ` +
      `not so much that AI development migrates offshore. ` +
      `Whether this is sufficient to prevent mass tech unemployment depends heavily on how fast retraining can scale.`
    )
  }

  // ── Retraining narratives ─────────────────────────────────────────────────
  if (retraining > 0.6 && aiCapability > 0.3) {
    const cushionPct = (retraining * 30).toFixed(0)
    events.push(
      `${yr} — Upskilling Programs Absorbing Shock: With ${(retraining * 100).toFixed(0)}% retraining investment, ` +
      `displacement is running ~${cushionPct}% below what it would be without intervention. ` +
      `Bootcamps, company-sponsored AI upskilling, and federal tech transition grants are placing workers into adjacent roles. ` +
      `Displaced QA engineers are moving into prompt engineering and AI operations; data entry workers are transitioning into AI output validation. ` +
      `The pipeline is imperfect, but the aggregate effect is measurable.`
    )
  } else if (retraining > 0.3 && aiCapability > 0.3) {
    events.push(
      `${yr} — Limited Upskilling Underway: Workforce development programs are operating but at insufficient scale. ` +
      `For every tech worker successfully transitioned into an AI-adjacent role, several more are still waiting — on bootcamp waitlists, in gig work, or exiting the industry. ` +
      `At current displacement rates, the retraining pipeline would need to be ${Math.round((1 - retraining) * 100)}% larger to fully absorb new unemployment.`
    )
  }

  // ── Transfers narratives ──────────────────────────────────────────────────
  if (transfers > 0.6) {
    events.push(
      `${yr} — Social Transfers Cushioning Displacement: Transfer payments at ${(transfers * 100).toFixed(0)}% of scale are maintaining baseline living standards for displaced tech workers. ` +
      `Transfers fund retraining access and bridge the income gap during transitions — they don't stop the layoffs, but they prevent the demand collapse that turns layoffs into a prolonged recession. ` +
      `Households stay solvent, local tech-hub economies keep customers, and inequality is partially compressed through redistribution.`
    )
  } else if (transfers > 0.3) {
    events.push(
      `${yr} — Modest Transfer Support: Social transfers are providing a partial floor for displaced tech workers ` +
      `but are not large enough to fully offset income loss from automation. ` +
      `Displaced mid-career engineers in their 40s and 50s — with mortgages and families — face real hardship even where macroeconomic numbers look manageable. ` +
      `Transfers soften but don't solve this.`
    )
  }

  // ── Stability narratives ──────────────────────────────────────────────────
  if (newStabilityIndex < 30) {
    events.push(
      `${yr} — ⚠ CRITICAL: Social Stability at ${newStabilityIndex.toFixed(0)}/100. ` +
      `The combination of mass tech unemployment, surging layoff waves, and extreme wage inequality has pushed social cohesion to a breaking point. ` +
      `Tech hubs that were growth engines are seeing sharp population outflows, office vacancy crises, and collapsing local tax bases. ` +
      `Political extremism is rising; calls for punitive AI taxes and mandatory human replacement ratios are gaining mainstream traction. ` +
      `Without immediate and dramatic intervention, the consequences extend far beyond the tech sector.`
    )
  } else if (newStabilityIndex < 50) {
    events.push(
      `${yr} — WARNING: Stability at ${newStabilityIndex.toFixed(0)}/100. ` +
      `Public trust in the tech industry is eroding sharply. Workers who expected AI to create opportunity are experiencing it as pure displacement, ` +
      `and political pressure for intervention is intensifying. ` +
      `Unionization drives in tech are at all-time highs; legislative proposals for AI-generated work taxes and mandatory human-in-the-loop requirements are advancing. ` +
      `The window for a managed, stable transition is narrowing.`
    )
  } else if (newStabilityIndex < 65) {
    events.push(
      `${yr} — Stability Under Stress: At ${newStabilityIndex.toFixed(0)}/100, the tech economy is functioning but showing strain. ` +
      `Visible signs: longer unemployment spells in former tech-heavy cities, stagnant median salaries despite rising GDP, ` +
      `and growing divergence between AI-native workers thriving and mid-tier workers hollowed out. ` +
      `These are lagging indicators — the underlying pressures are already baked in.`
    )
  }

  // ── GDP narratives ────────────────────────────────────────────────────────
  if (newGDPIndex > 140) {
    events.push(
      `${yr} — Productivity Boom: GDP index at ${newGDPIndex.toFixed(1)} — nearly ${(newGDPIndex - 100).toFixed(0)}% above baseline. ` +
      `AI is delivering an extraordinary productivity dividend: small teams of senior engineers are producing output that previously required entire departments. ` +
      `But a large share of this GDP gain accrues to firms and their highest-paid workers, not to the broader tech labor force. ` +
      `If these gains flow primarily to capital owners and AI-native talent, GDP growth and median worker welfare diverge sharply.`
    )
  } else if (newGDPIndex > 115) {
    events.push(
      `${yr} — Strong GDP Growth: Output is ${(newGDPIndex - 100).toFixed(0)}% above baseline, driven by AI productivity gains in the tech sector. ` +
      `Both wage growth for AI-complementary roles and capital gains from automation are contributing. ` +
      `On paper, the sector is doing well. But median tech compensation and sector GDP are increasingly decoupled — ` +
      `a rising tide that's lifting yachts, not all boats.`
    )
  } else if (newGDPIndex < 80) {
    events.push(
      `${yr} — GDP Contracting: Output index has fallen to ${newGDPIndex.toFixed(1)} — ${(100 - newGDPIndex).toFixed(0)}% below baseline. ` +
      `Mass displacement is destroying tech worker spending power faster than AI productivity can compensate. ` +
      `This is the scenario economists most feared: automation without redistribution creates a demand collapse, ` +
      `as the workers who lost their jobs were precisely the ones whose spending sustained local tech ecosystems.`
    )
  } else if (newGDPIndex < 92) {
    events.push(
      `${yr} — GDP Softening: Output is tracking ${(100 - newGDPIndex).toFixed(0)}% below baseline. ` +
      `Displacement is outpacing productivity gains in some sub-sectors — a sign that transition costs are real and front-loaded. ` +
      `Whether this recovers depends on whether displaced tech workers find new roles quickly enough to sustain spending.`
    )
  }

  // ── Stable year fallback ──────────────────────────────────────────────────
  if (events.length === 0) {
    const offset = (nextYear - 2026) % 3
    const stableNarratives = [
      `${yr} — Gradual Transition: No major shocks this year. AI integration in tech is proceeding at a measured pace — ` +
      `companies are deploying Copilot-style tools incrementally rather than restructuring all at once, and workforce transitions are happening through attrition rather than mass layoffs. ` +
      `Stability holds at ${newStabilityIndex.toFixed(0)}/100. The foundation is fragile: ` +
      `current conditions reflect a careful balance between capability, regulation, and labor protection that can shift quickly.`,

      `${yr} — Holding Pattern: The tech sector is absorbing AI disruption without acute distress. ` +
      `Unemployment at ${(newUnemploymentRate * 100).toFixed(1)}% remains elevated above structural norms but isn't accelerating. ` +
      `Wage gains for senior AI-adjacent engineers are real but modest; wage suppression in routine coding and support roles is present but not yet severe. ` +
      `This is what a managed transition looks like — not painless, but orderly.`,

      `${yr} — Stable but Diverging: Aggregate indicators are holding — GDP near baseline, stability at ${newStabilityIndex.toFixed(0)}/100. ` +
      `But the aggregate masks a widening split: senior engineers in ML, cloud, and security are doing well; ` +
      `junior developers, QA teams, and IT support workers are treading water or falling behind. ` +
      `No major crisis, but no resolution of the underlying tension between AI's productivity gains and its distributional consequences.`,
    ]
    events.push(stableNarratives[offset])
  }

  return {
    year: nextYear,
    occupations: newOccupations,
    totalEmployment: newTotalEmployment,
    unemploymentRate: newUnemploymentRate,
    gdpIndex: newGDPIndex,
    techLayoffIndex: newTechLayoffIndex,
    inequalityIndex: newInequalityIndex,
    stabilityIndex: newStabilityIndex,
    eventLog: [...state.eventLog, ...events],
    _baseGDP: baseGDP,
  }
}

export function runSimulation(
  sliders: SliderInputs,
  params: ModelParams,
  years: number = 10
): SimulationState[] {
  const states: SimulationState[] = []
  let current = buildInitialState()
  states.push(current)

  for (let i = 0; i < years; i++) {
    current = step(current, sliders, params)
    states.push(current)
  }

  return states
}
