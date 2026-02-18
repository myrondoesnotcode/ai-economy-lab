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
    // Retraining reduces effective displacement by cushioning workforce transitions
    const retrainingDamp = retraining * 0.3
    const jobLossRate = clamp(
      aiCapability * effectiveAdoption * base.routineScore * (1 - base.socialScore) *
        kSubstitution * (1 - laborProtection * laborProtectionLayoffDamp) * (1 - retrainingDamp),
      0,
      0.5
    )

    const newEmployment = Math.max(
      base.employment * employmentFloorRatio,
      occState.employment * (1 - jobLossRate)
    )

    // 7.3 Wage growth
    const wageGrowth = aiCapability * base.complementarityScore * kComplementarityWage *
      (1 - corporateConcentration * 0.2)

    const newWage = occState.wage * (1 + wageGrowth)

    return {
      id: occState.id,
      employment: newEmployment,
      wage: newWage,
    }
  })

  // 7.4 GDP proxy
  const newGDPRaw = newOccupations.reduce((sum, o) => sum + o.employment * o.wage, 0)
  const baseGDP = state._baseGDP ?? newGDPRaw
  const newGDPIndex = clamp((newGDPRaw / baseGDP) * 100, gdpIndexMin, gdpIndexMax)

  // 7.5 Unemployment
  const newTotalEmployment = newOccupations.reduce((sum, o) => sum + o.employment, 0)
  const newUnemploymentRate = clamp((laborForce - newTotalEmployment) / laborForce, 0, 1)

  // 7.6 Food price
  // Social transfers (UBI-style) dampen food price pressure by boosting demand resilience
  const transfersFoodDamp = transfers * 0.25
  const currentLogistics = newOccupations
    .filter(o => {
      const base = baseOccupations.find(b => b.id === o.id)!
      return base.isLogistics
    })
    .reduce((sum, o) => sum + o.employment, 0)

  const logisticsShortfall = (baseLogistics - currentLogistics) / baseLogistics
  const newFoodPriceIndex = clamp(
    state.foodPriceIndex *
      (1 + logisticsShortfall * kFoodFromLogistics * (1 - supplyChainResilience) * (1 - transfersFoodDamp)) *
      (1 + energyCost * kEnergyPassThrough * (1 - transfersFoodDamp)),
    foodPriceIndexMin,
    foodPriceIndexMax
  )

  // 7.7 Inequality index
  // Social transfers directly compress inequality by redistributing income
  const transfersIneqDamp = transfers * 0.4
  const avgComplementarity =
    baseOccupations.reduce((sum, o) => sum + o.complementarityScore, 0) / baseOccupations.length
  const avgRoutine =
    baseOccupations.reduce((sum, o) => sum + o.routineScore, 0) / baseOccupations.length

  let newInequalityIndex = state.inequalityIndex +
    aiCapability * (avgRoutine - avgComplementarity) * kIneqFromAI * (1 - transfersIneqDamp) +  // sign flipped: AI widens inequality
    corporateConcentration * kConcentrationLaborShare * (1 - transfersIneqDamp)                  // additive, not multiplicative
  newInequalityIndex = clamp(newInequalityIndex, inequalityIndexMin, inequalityIndexMax)

  // 7.8 Stability index
  const newStabilityIndex = clamp(
    100 -
      newUnemploymentRate * 100 * stabilityWeightUnemployment -
      (newFoodPriceIndex - 1) * 100 * stabilityWeightFoodInflation -
      (newInequalityIndex - 1.0) * stabilityWeightInequality,  // penalize deviation from baseline, not absolute
    stabilityMin,
    stabilityMax
  )

  // ── Event log (one entry per year, varied phrasing) ──────────────────────
  const events: string[] = []
  const yr = nextYear

  // AI substitution events — vary message based on severity
  const routineOccs = baseOccupations.filter(o => o.routineScore > 0.7).map(o => o.name)
  const mostRoutine = routineOccs[0] ?? "routine workers"
  if (aiCapability > 0.3 && effectiveAdoption > 0.2) {
    const displaced = newOccupations.find(o => {
      const base = baseOccupations.find(b => b.id === o.id)!
      return base.routineScore > 0.8
    })
    const dispBase = displaced ? baseOccupations.find(b => b.id === displaced.id)! : null
    const dispPct = displaced && dispBase
      ? (((dispBase.employment - displaced.employment) / dispBase.employment) * 100).toFixed(1)
      : null

    if (aiCapability > 0.7) {
      events.push(`${yr}: Heavy automation wave — ${mostRoutine} down ${dispPct ? dispPct + "%" : "significantly"} from baseline.`)
    } else if (aiCapability > 0.5) {
      events.push(`${yr}: AI adoption accelerating; ${mostRoutine} seeing notable job displacement.`)
    } else {
      events.push(`${yr}: ${mostRoutine} employment declining as AI handles routine tasks.`)
    }
  }

  // Wage growth events for complementary roles
  const compOccs = baseOccupations.filter(o => o.complementarityScore > 0.7).map(o => o.name)
  const mostComp = compOccs[0] ?? "high-skill workers"
  if (aiCapability > 0.4) {
    const wageBoost = (aiCapability * 0.8 * kComplementarityWage * 100).toFixed(1)
    if (aiCapability > 0.7) {
      events.push(`${yr}: Skilled workers thriving — ${mostComp} wages up ~${wageBoost}% from AI leverage.`)
    } else {
      events.push(`${yr}: Wages rising for ${mostComp} as AI tools boost productivity.`)
    }
  }

  // Logistics / food price events
  if (logisticsShortfall > 0.15) {
    events.push(`${yr}: Severe logistics shortfall (${(logisticsShortfall * 100).toFixed(0)}% below baseline) pushing food prices higher.`)
  } else if (logisticsShortfall > 0.05) {
    events.push(`${yr}: Food prices rising — logistics workforce down ${(logisticsShortfall * 100).toFixed(0)}% from baseline.`)
  }

  if (energyCost > 0.2) {
    events.push(`${yr}: Energy cost spike (+${(energyCost * 100).toFixed(0)}%) adding ${(energyCost * kEnergyPassThrough * 100).toFixed(1)}% to food prices.`)
  } else if (energyCost > 0.1) {
    events.push(`${yr}: Energy cost pressure passed through to food prices (+${(energyCost * kEnergyPassThrough * 100).toFixed(1)}%).`)
  } else if (energyCost < -0.1) {
    events.push(`${yr}: Falling energy costs easing food price pressure.`)
  }

  // Unemployment events
  if (newUnemploymentRate > 0.20) {
    events.push(`${yr}: Unemployment crisis — ${(newUnemploymentRate * 100).toFixed(1)}% of workforce displaced.`)
  } else if (newUnemploymentRate > 0.15) {
    events.push(`${yr}: Unemployment surging to ${(newUnemploymentRate * 100).toFixed(1)}%, straining social systems.`)
  } else if (newUnemploymentRate > 0.12) {
    events.push(`${yr}: Unemployment elevated at ${(newUnemploymentRate * 100).toFixed(1)}%, above structural baseline.`)
  }

  // Inequality events
  if (newInequalityIndex > 2.0) {
    events.push(`${yr}: Severe inequality (index ${newInequalityIndex.toFixed(2)}) — top earners capturing most AI gains.`)
  } else if (newInequalityIndex > 1.4) {
    events.push(`${yr}: Inequality rising (${newInequalityIndex.toFixed(2)}). Corporate concentration amplifying wage gap.`)
  }

  // Regulation events
  if (regulation > 0.7) {
    events.push(`${yr}: Strong AI regulation constraining adoption rate this year.`)
  } else if (regulation > 0.6) {
    events.push(`${yr}: Regulatory friction slowing AI deployment across sectors.`)
  }

  // Retraining events
  if (retraining > 0.5 && aiCapability > 0.3) {
    events.push(`${yr}: Active retraining programs cushioning displacement for some workers.`)
  }

  // Transfers events
  if (transfers > 0.5) {
    events.push(`${yr}: Social transfers helping stabilize household incomes amid disruption.`)
  }

  // Stability events
  if (newStabilityIndex < 30) {
    events.push(`${yr}: ⚠ CRITICAL: Social stability collapsing (${newStabilityIndex.toFixed(0)}/100).`)
  } else if (newStabilityIndex < 50) {
    events.push(`${yr}: WARNING: Social stability critically low (${newStabilityIndex.toFixed(0)}/100).`)
  } else if (newStabilityIndex < 65) {
    events.push(`${yr}: Social stability under stress (${newStabilityIndex.toFixed(0)}/100).`)
  }

  // GDP events
  if (newGDPIndex > 130) {
    events.push(`${yr}: GDP index surging to ${newGDPIndex.toFixed(1)} — productivity gains outpacing displacement.`)
  } else if (newGDPIndex < 80) {
    events.push(`${yr}: GDP index falling to ${newGDPIndex.toFixed(1)} — output contracting as jobs disappear.`)
  }

  // Fallback: stable year
  if (events.length === 0) {
    const stableMessages = [
      `${yr}: Economy holding steady. Conditions stable across all indicators.`,
      `${yr}: No major disruptions this year. Gradual AI integration continuing.`,
      `${yr}: Moderate conditions. Employment and prices within normal range.`,
    ]
    events.push(stableMessages[(nextYear - 2026) % stableMessages.length])
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
