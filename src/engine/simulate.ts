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
    foodPriceIndex: 1.0,
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
    kFoodFromLogistics,
    kEnergyPassThrough,
    kIneqFromAI,
    kConcentrationLaborShare,
    gdpIndexMin,
    gdpIndexMax,
    foodPriceIndexMin,
    foodPriceIndexMax,
    inequalityIndexMin,
    inequalityIndexMax,
    stabilityMin,
    stabilityMax,
    laborForce,
    stabilityWeightUnemployment,
    stabilityWeightFoodInflation,
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
    energyCost,
    supplyChainResilience,
  } = sliders

  const nextYear = state.year + 1

  // 7.1 Effective adoption
  const stabilityMultiplier = clamp(
    1 - slowdownMax * Math.max(0, (slowdownThreshold - state.stabilityIndex) / slowdownThreshold),
    stabilityAdoptionMinMultiplier,
    stabilityAdoptionMaxMultiplier
  )
  const effectiveAdoption = adoptionSpeed * (1 - regulation * kRegulationDrag) * stabilityMultiplier

  // Baseline logistics employment
  const baseLogistics = baseOccupations
    .filter(o => o.isLogistics)
    .reduce((sum, o) => sum + o.employment, 0)

  // Per-occupation updates
  const newOccupations = state.occupations.map(occState => {
    const base = baseOccupations.find(o => o.id === occState.id)!

    // 7.2 Job loss rate
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

    // FIX #4 — Wages: complementary roles rise, but displaced-sector wages fall
    // from labor oversupply. Workers competing for fewer jobs push wages down.
    const displacementRatio = newEmployment / base.employment  // 1.0 = no displacement, 0.0 = fully displaced
    const wageGrowth = aiCapability * base.complementarityScore * kComplementarityWage *
      (1 - corporateConcentration * 0.2)
    // Wage suppression: when employment falls, excess labor supply pulls wages down
    const wageSuppression = base.routineScore * (1 - displacementRatio) * 0.04
    const netWageChange = wageGrowth - wageSuppression
    const newWage = Math.max(occState.wage * (1 + netWageChange), base.meanWage * 0.5) // floor at 50% of baseline

    return {
      id: occState.id,
      employment: newEmployment,
      wage: newWage,
    }
  })

  // 7.4 GDP proxy — FIX #2: Include capital/profit side of automation
  // When AI automates work, productivity gains flow partly to firms (capital),
  // not just to remaining workers' wages. GDP captures both.
  const newWageBill = newOccupations.reduce((sum, o) => sum + o.employment * o.wage, 0)
  const totalDisplacedWorkers = newOccupations.reduce((sum, o) => {
    const base = baseOccupations.find(b => b.id === o.id)!
    return sum + Math.max(0, base.employment - o.employment)
  }, 0)
  const avgBaseWage = baseOccupations.reduce((sum, o) => sum + o.meanWage, 0) / baseOccupations.length
  // Displaced work is now done by AI; productivity surplus accrues to firms (~60% efficiency capture)
  const aiCapitalGains = totalDisplacedWorkers * avgBaseWage * aiCapability * 0.6

  const newGDPRaw = newWageBill + aiCapitalGains
  const baseGDP = state._baseGDP ?? newOccupations.reduce((sum, o) => sum + o.employment * o.wage, 0)
  const newGDPIndex = clamp((newGDPRaw / baseGDP) * 100, gdpIndexMin, gdpIndexMax)

  // 7.5 Unemployment
  const newTotalEmployment = newOccupations.reduce((sum, o) => sum + o.employment, 0)
  const newUnemploymentRate = clamp((laborForce - newTotalEmployment) / laborForce, 0, 1)

  // FIX #5 — Demand feedback loop
  // Unemployment destroys consumer spending → businesses lose revenue → more layoffs.
  // Modeled as an amplifier on the stability penalty for unemployment, not directly on jobs
  // (to avoid compounding instability that's hard to tune).
  const demandFeedback = Math.max(0, newUnemploymentRate - 0.08) * 0.3
  const adjustedUnemploymentForStability = newUnemploymentRate + demandFeedback

  // 7.6 Food price — FIX #1: Logistics automation has two opposing effects
  const currentLogistics = newOccupations
    .filter(o => {
      const base = baseOccupations.find(b => b.id === o.id)!
      return base.isLogistics
    })
    .reduce((sum, o) => sum + o.employment, 0)

  const logisticsShortfall = (baseLogistics - currentLogistics) / baseLogistics

  // Mid-transition chaos: workers displaced before AI logistics is reliable = supply disruption
  // At high AI capability, AI logistics works well and this effect fades
  const logisticsTransitionChaos = logisticsShortfall * (1 - aiCapability * 0.7)
  // Long-term AI efficiency gain: capable + adopted AI logistics drives costs down
  const logisticsAIEfficiency = aiCapability * effectiveAdoption * 0.04

  const foodLogisticsEffect = logisticsTransitionChaos * kFoodFromLogistics * (1 - supplyChainResilience)
    - logisticsAIEfficiency * (1 - supplyChainResilience * 0.5)

  // FIX #6: Social transfers don't lower food prices — they help people afford food.
  // Transfers are modeled as a stability buffer, not a supply-side price reducer.
  const newFoodPriceIndex = clamp(
    state.foodPriceIndex *
      (1 + foodLogisticsEffect) *
      (1 + energyCost * kEnergyPassThrough),
    foodPriceIndexMin,
    foodPriceIndexMax
  )

  // Transfers improve food affordability for displaced workers, reducing the
  // stability penalty from food prices (not the price itself).
  const foodAffordabilityBuffer = transfers * 0.35 * Math.max(0, newFoodPriceIndex - 1)

  // 7.7 Inequality index — FIX #3: Scale with actual wage divergence, not fixed increment
  // Measures the real gap: high-complementarity wages rising vs high-routine wages falling
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

  // 7.8 Stability index
  // Uses demand-adjusted unemployment (FIX #5) and food affordability buffer (FIX #6)
  const effectiveFoodPenalty = Math.max(0, (newFoodPriceIndex - 1) * 100 - foodAffordabilityBuffer * 100)
  const newStabilityIndex = clamp(
    100 -
      adjustedUnemploymentForStability * 100 * stabilityWeightUnemployment -
      effectiveFoodPenalty * stabilityWeightFoodInflation -
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
        `${yr} — Automation Surge: AI systems operating at ${(aiCapability * 100).toFixed(0)}% capability are tearing through routine work. ` +
        `${biggestLoserBase.name} has shed ~${biggestLoserLost.toLocaleString()}k positions this year alone (${biggestLoserPct}% below its pre-AI baseline), ` +
        `and across all tracked occupations roughly ${totalDisplacedK.toLocaleString()}k jobs have been eliminated from baseline levels. ` +
        `The speed of displacement is outpacing most workers' ability to retrain — expect unemployment pressure to intensify.`
      )
    } else if (aiCapability > 0.5) {
      events.push(
        `${yr} — Displacement Accelerating: With AI deployment at ${adoptionPct}% effective adoption, ` +
        `${biggestLoserBase.name} is absorbing the sharpest cuts — down ${biggestLoserPct}% from baseline, ` +
        `representing roughly ${biggestLoserLost.toLocaleString()}k fewer positions. ` +
        `Companies are automating call centers, checkout lines, and back-office workflows faster than new roles are being created. ` +
        `Workers in highly routine jobs are facing a narrowing window to find alternatives.`
      )
    } else {
      events.push(
        `${yr} — Early Automation Pressure: AI tools are beginning to visibly affect hiring. ` +
        `${biggestLoserBase.name} is down ${biggestLoserPct}% from baseline as businesses pilot automation in lower-risk workflows first. ` +
        `The net effect is subtle but cumulative — each year that passes without retraining investment widens the gap between those who can adapt and those who cannot.`
      )
    }
  }

  // ── Wage growth narrative for complementary roles ─────────────────────────
  if (aiCapability > 0.4 && biggestWinnerWageGain > 500) {
    const wageGainK = (biggestWinnerWageGain / 1000).toFixed(1)
    if (aiCapability > 0.7) {
      events.push(
        `${yr} — The AI Premium: A sharp divide is forming between those who wield AI and those displaced by it. ` +
        `${biggestWinnerBase.name} are commanding $${wageGainK}k more per year than their pre-AI baseline (+${biggestWinnerWagePct}%), ` +
        `as each worker now handles tasks that previously required teams. ` +
        `Meanwhile, wages in displaced occupations are being suppressed by labor oversupply — too many workers chasing too few positions. ` +
        `Firms are competing fiercely for AI talent, but this productivity windfall is not being shared broadly.`
      )
    } else {
      events.push(
        `${yr} — Productivity Dividend (Uneven): AI tools are making skilled workers measurably more productive. ` +
        `${biggestWinnerBase.name} wages are up $${wageGainK}k from baseline (+${biggestWinnerWagePct}%), ` +
        `reflecting genuine output gains as AI handles the analytical grunt work. ` +
        `The catch: these gains are concentrated among workers with the skills to leverage the tools. ` +
        `In displaced occupations, an oversupply of workers is already pulling wages down before outright job losses register.`
      )
    }
  }

  // ── Demand feedback narrative ─────────────────────────────────────────────
  if (demandFeedback > 0.03) {
    const feedbackPct = (demandFeedback * 100).toFixed(1)
    events.push(
      `${yr} — Demand Spiral Risk: Unemployment above structural norms is triggering a secondary effect. ` +
      `Displaced workers spend less — particularly on local services, restaurants, and retail — which reduces revenue for businesses that aren't yet automated. ` +
      `This demand contraction adds an estimated +${feedbackPct}% to effective unemployment pressure beyond the direct automation effect. ` +
      `This self-reinforcing dynamic is what turns manageable displacement into a prolonged recession.`
    )
  }

  // ── Logistics / food price narratives ─────────────────────────────────────
  if (logisticsShortfall > 0.15 && aiCapability < 0.6) {
    const shortPct = (logisticsShortfall * 100).toFixed(0)
    events.push(
      `${yr} — Supply Chain Disruption: The logistics workforce is ${shortPct}% below its pre-automation baseline, ` +
      `but AI-powered logistics isn't yet capable enough to reliably replace it. ` +
      `This mid-transition gap — workers displaced before automation is ready — is causing longer delivery times, spoilage, and rising food costs. ` +
      `Grocery bills are rising fastest in lower-income households. This is temporary: once AI logistics matures, costs should fall.`
    )
  } else if (logisticsShortfall > 0.15 && aiCapability >= 0.6) {
    events.push(
      `${yr} — Logistics Automation Maturing: AI-powered freight and warehouse systems are replacing the displaced workforce effectively. ` +
      `The supply chain disruption from the early transition is easing — automated routing and robotic warehousing are driving delivery costs down. ` +
      `For food prices, this is a stabilizing and potentially deflationary force: logistics efficiency gains are offsetting earlier inflation.`
    )
  } else if (logisticsShortfall > 0.05 && aiCapability < 0.5) {
    const shortPct = (logisticsShortfall * 100).toFixed(0)
    events.push(
      `${yr} — Logistics Transition Underway: Automation is hollowing out freight and warehousing roles — ` +
      `currently ${shortPct}% below baseline — faster than AI logistics can reliably fill the gap. ` +
      `The effects are trickling into food prices as supply chains become less redundant. ` +
      `This is a temporary disruption cost of the transition, not a permanent structural change.`
    )
  }

  if (energyCost > 0.2) {
    const foodEffect = (energyCost * kEnergyPassThrough * 100).toFixed(1)
    events.push(
      `${yr} — Energy Shock: Energy prices are ${(energyCost * 100).toFixed(0)}% above baseline — ` +
      `a significant external shock passing through directly to transportation and food production costs (+${foodEffect}% on food this year). ` +
      `This compounds any existing logistics disruption. ` +
      `Households squeezed by unemployment face higher prices at the checkout simultaneously.`
    )
  } else if (energyCost > 0.1) {
    const foodEffect = (energyCost * kEnergyPassThrough * 100).toFixed(1)
    events.push(
      `${yr} — Energy Headwinds: Moderately elevated energy costs (+${(energyCost * 100).toFixed(0)}% above baseline) ` +
      `are adding +${foodEffect}% to food prices via transport and refrigeration cost pass-through. ` +
      `Not yet a crisis, but it erodes the purchasing power of workers already facing suppressed wages or displacement.`
    )
  } else if (energyCost < -0.1) {
    events.push(
      `${yr} — Energy Tailwind: Falling energy costs (${(energyCost * 100).toFixed(0)}% below baseline) are providing unexpected relief. ` +
      `Cheaper transport and refrigeration are dampening food price pressure, giving households a small but real buffer. ` +
      `This partially offsets wage suppression in displaced occupations and helps stabilize purchasing power.`
    )
  }

  // ── Unemployment narratives ───────────────────────────────────────────────
  const unemPct = (newUnemploymentRate * 100).toFixed(1)
  const displaceAboveStructural = Math.round(Math.max(0, newUnemploymentRate - 0.08) * params.laborForce / 1000)
  if (newUnemploymentRate > 0.20) {
    events.push(
      `${yr} — ⚠ Unemployment Crisis: ${unemPct}% of the labor force is without work — ` +
      `roughly ${displaceAboveStructural.toLocaleString()}k people above the structural baseline, most of them former routine workers with few adjacent options. ` +
      `Social safety nets are under severe stress. Historical precedent suggests unemployment at this scale, ` +
      `sustained over several years, leads to long-term scarring: workers exit the labor force permanently, ` +
      `communities built around displaced industries decay, and political pressure for intervention intensifies sharply.`
    )
  } else if (newUnemploymentRate > 0.15) {
    events.push(
      `${yr} — Unemployment Surging: At ${unemPct}%, unemployment is well above the structural baseline — ` +
      `approximately ${displaceAboveStructural.toLocaleString()}k workers displaced beyond what frictional churn accounts for. ` +
      `The jobs that were lost were not the same jobs that are being created. ` +
      `Retraining programs are underfunded relative to the scale of the problem; without intervention, this rate tends to be self-reinforcing as spending power falls and businesses contract further.`
    )
  } else if (newUnemploymentRate > 0.12) {
    events.push(
      `${yr} — Unemployment Elevated: The rate has climbed to ${unemPct}%, roughly ${displaceAboveStructural.toLocaleString()}k workers above structural norms. ` +
      `This is the early visible signal of AI displacement — the headline number understates the problem, ` +
      `as many displaced workers have moved to part-time or gig work that doesn't register in these figures. ` +
      `Labor market slack at this level suppresses wage growth — and causes outright wage cuts — in affected occupations.`
    )
  }

  // ── Inequality narratives ─────────────────────────────────────────────────
  if (newInequalityIndex > 2.0) {
    events.push(
      `${yr} — ⚠ Severe Inequality: The inequality index has reached ${newInequalityIndex.toFixed(2)} — ` +
      `more than double the pre-AI baseline. AI productivity gains are being captured almost entirely at the top. ` +
      `The wage gap between an ML engineer (salary surging) and a displaced data entry worker (wages fell before job vanished) is now extreme. ` +
      `At this level, inequality becomes a drag on aggregate demand: concentrated income at the top is spent less efficiently than distributed income would be.`
    )
  } else if (newInequalityIndex > 1.6) {
    events.push(
      `${yr} — Inequality Widening Sharply: Wage dispersion has reached ${newInequalityIndex.toFixed(2)}x baseline. ` +
      `The gap between AI-complementary workers (rising wages) and AI-displaced workers (falling wages, then unemployment) is becoming structural. ` +
      `High corporate concentration amplifies this: firms with market power pocket the AI productivity gains rather than passing them to workers or consumers. ` +
      `Without redistribution, this gap tends to widen further each year.`
    )
  } else if (newInequalityIndex > 1.4) {
    events.push(
      `${yr} — Growing Divide: The inequality index is at ${newInequalityIndex.toFixed(2)}, up from the 1.0 baseline. ` +
      `Two distinct labor markets are emerging: high-skill workers whose productivity and compensation are amplified by AI, ` +
      `and routine workers facing wage suppression or outright displacement. ` +
      `The divergence is still correctable with targeted policy, but it compounds if left unaddressed.`
    )
  }

  // ── Regulation narratives ─────────────────────────────────────────────────
  if (regulation > 0.7) {
    const dragEffect = (regulation * kRegulationDrag * 100).toFixed(0)
    events.push(
      `${yr} — Heavy Regulation in Effect: Government AI policy is imposing significant friction on deployment — ` +
      `reducing effective adoption by ~${dragEffect}% this year. ` +
      `Compliance requirements, mandatory impact assessments, and sector-specific restrictions are slowing rollout. ` +
      `This buys time for workers and institutions to adapt, but comes at a cost: firms operating in less-regulated jurisdictions gain a competitive edge, ` +
      `and the productivity gains that AI enables are deferred.`
    )
  } else if (regulation > 0.6) {
    events.push(
      `${yr} — Regulatory Friction: Moderate AI regulation is slowing deployment in several sectors. ` +
      `Policymakers are threading a difficult needle — enough oversight to limit the worst displacement, ` +
      `not so much that innovation migrates offshore. The current balance is reducing adoption speed meaningfully without halting progress. ` +
      `Whether this is sufficient to prevent mass unemployment depends heavily on how fast retraining can scale.`
    )
  }

  // ── Retraining narratives ─────────────────────────────────────────────────
  if (retraining > 0.6 && aiCapability > 0.3) {
    const cushionPct = (retraining * 30).toFixed(0)
    events.push(
      `${yr} — Retraining Programs Absorbing Shock: With ${(retraining * 100).toFixed(0)}% retraining investment, ` +
      `displacement is running ~${cushionPct}% below what it would be without intervention. ` +
      `Community colleges, employer-sponsored upskilling, and federal transition grants are placing workers into adjacent roles. ` +
      `The pipeline is imperfect — not everyone retrained as a data analyst finds work — but the aggregate effect is measurable. ` +
      `Sustaining this investment is politically difficult when fiscal pressure is rising.`
    )
  } else if (retraining > 0.3 && aiCapability > 0.3) {
    events.push(
      `${yr} — Limited Retraining Underway: Workforce development programs are operating but at insufficient scale. ` +
      `For every worker successfully transitioned into a new role, several more are still waiting — on waitlists, in temporary work, or leaving the labor force altogether. ` +
      `At current displacement rates, the retraining pipeline would need to be ${Math.round((1 - retraining) * 100)}% larger to fully absorb new unemployment.`
    )
  }

  // ── Transfers narratives ──────────────────────────────────────────────────
  if (transfers > 0.6) {
    events.push(
      `${yr} — Social Transfers Cushioning Displacement: Transfer payments at ${(transfers * 100).toFixed(0)}% of scale are maintaining baseline consumption for displaced workers. ` +
      `Transfers don't lower food prices — but they ensure displaced workers can still afford food even as prices rise. ` +
      `This prevents the secondary demand collapse that amplifies recessions: ` +
      `households stay solvent, local businesses keep customers, and inequality is partially compressed through redistribution. ` +
      `The fiscal cost is significant, but the stability data shows the tradeoff is paying off.`
    )
  } else if (transfers > 0.3) {
    events.push(
      `${yr} — Modest Transfer Support: Social transfers are providing a partial floor for displaced workers ` +
      `but are not large enough to fully offset the income loss from automation. ` +
      `Food insecurity is rising in communities hit hardest by displacement — even where headline food prices look modest, ` +
      `families whose incomes have collapsed face real hardship. Transfers soften but don't solve this.`
    )
  }

  // ── Stability narratives ──────────────────────────────────────────────────
  if (newStabilityIndex < 30) {
    events.push(
      `${yr} — ⚠ CRITICAL: Social Stability at ${newStabilityIndex.toFixed(0)}/100. ` +
      `The combination of mass unemployment, food price spikes, and extreme inequality has pushed social cohesion to a breaking point. ` +
      `Historical parallels to this convergence — the Great Depression, deindustrialization shocks of the 1980s — suggest ` +
      `that without immediate and dramatic intervention, the consequences extend well beyond economics: ` +
      `political extremism rises, institutions lose legitimacy, and recovery timelines lengthen from years to decades.`
    )
  } else if (newStabilityIndex < 50) {
    events.push(
      `${yr} — WARNING: Stability at ${newStabilityIndex.toFixed(0)}/100. ` +
      `Public trust in institutions is eroding. Workers who expected AI to create opportunity are experiencing it as pure displacement, ` +
      `and the political center is struggling to hold. ` +
      `Polling in this model's analogue societies shows surging support for protectionist policies, automation taxes, and populist platforms. ` +
      `The window for managed, stable transition is narrowing.`
    )
  } else if (newStabilityIndex < 65) {
    events.push(
      `${yr} — Stability Under Stress: At ${newStabilityIndex.toFixed(0)}/100, the economy is functioning but showing strain. ` +
      `Visible signs: longer unemployment spells in former manufacturing and service hubs, stagnant or falling median wages despite rising GDP, ` +
      `and growing geographic divergence between tech-hub prosperity and hollowed-out communities elsewhere. ` +
      `These are lagging indicators — the underlying pressures driving them are already baked in.`
    )
  }

  // ── GDP narratives ────────────────────────────────────────────────────────
  if (newGDPIndex > 140) {
    events.push(
      `${yr} — Productivity Boom: GDP index at ${newGDPIndex.toFixed(1)} — nearly ${(newGDPIndex - 100).toFixed(0)}% above baseline. ` +
      `AI is delivering an extraordinary productivity dividend: automated systems are producing output that would have required far more labor. ` +
      `But a large share of this GDP gain is captured by firms as profit, not by workers. ` +
      `If these gains flow primarily to capital owners and high-skill labor, GDP growth and human welfare diverge sharply.`
    )
  } else if (newGDPIndex > 115) {
    events.push(
      `${yr} — Strong GDP Growth: Output is ${(newGDPIndex - 100).toFixed(0)}% above baseline, driven by AI productivity gains. ` +
      `Both wage growth for high-complementarity roles and capital gains from automation are contributing. ` +
      `On paper, the economy is doing well. But median household income and GDP are increasingly decoupled — ` +
      `a rising tide that isn't lifting all boats, particularly for workers whose wages are being suppressed by displacement.`
    )
  } else if (newGDPIndex < 80) {
    events.push(
      `${yr} — GDP Contracting: Output index has fallen to ${newGDPIndex.toFixed(1)} — ${(100 - newGDPIndex).toFixed(0)}% below baseline. ` +
      `Mass displacement is destroying consumer spending power faster than AI productivity can compensate. ` +
      `This is the scenario economists most feared: automation without sufficient redistribution creates a demand collapse, ` +
      `as the workers who lost their jobs were precisely the ones whose spending kept local economies running.`
    )
  } else if (newGDPIndex < 92) {
    events.push(
      `${yr} — GDP Softening: Output is tracking ${(100 - newGDPIndex).toFixed(0)}% below baseline. ` +
      `Displacement is outpacing productivity gains in some sectors — a sign that the transition costs are real and front-loaded. ` +
      `Whether this recovers depends on whether displaced workers find new roles quickly enough to sustain consumption.`
    )
  }

  // ── Stable year fallback (only fires if nothing else triggered) ───────────
  if (events.length === 0) {
    const offset = (nextYear - 2026) % 3
    const stableNarratives = [
      `${yr} — Gradual Transition: No major shocks this year. AI integration is proceeding at a measured pace — ` +
      `businesses are deploying automation incrementally rather than all at once, and workforce transitions are happening through attrition rather than mass layoffs. ` +
      `Stability holds at ${newStabilityIndex.toFixed(0)}/100. The foundation is fragile: ` +
      `current conditions reflect a careful balance between capability, regulation, and labor protection that can shift quickly if any slider moves far in either direction.`,

      `${yr} — Holding Pattern: The economy is absorbing AI disruption without acute distress. ` +
      `Unemployment at ${(newUnemploymentRate * 100).toFixed(1)}% remains elevated above structural norms but isn't accelerating. ` +
      `Wage gains for skilled workers are real but modest; wage suppression in routine roles is present but not yet severe. ` +
      `This is what a managed transition looks like — not painless, but orderly. ` +
      `Whether it continues depends on maintaining the policy mix that's producing it.`,

      `${yr} — Stable but Unequal: Aggregate indicators are holding — GDP near baseline, stability at ${newStabilityIndex.toFixed(0)}/100. ` +
      `But the aggregate masks divergence: high-skill workers in tech and healthcare are doing well; ` +
      `routine service workers are treading water or falling behind — wages suppressed even before outright displacement. ` +
      `The story of this year is less about what happened and more about what didn't: ` +
      `no major crisis, but no resolution of the underlying tension between AI's productivity gains and its distributional consequences.`,
    ]
    events.push(stableNarratives[offset])
  }

  return {
    year: nextYear,
    occupations: newOccupations,
    totalEmployment: newTotalEmployment,
    unemploymentRate: newUnemploymentRate,
    gdpIndex: newGDPIndex,
    foodPriceIndex: newFoodPriceIndex,
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
