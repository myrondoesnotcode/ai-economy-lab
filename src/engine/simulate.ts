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
    eventLog: ["Simulation initialized. Adjust sliders to begin."],
    _baseGDP: baseGDP,
  } as SimulationState & { _baseGDP: number }
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
    laborProtection,
    corporateConcentration,
    energyCost,
    supplyChainResilience,
  } = sliders

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
    const jobLossRate = clamp(
      aiCapability * effectiveAdoption * base.routineScore * (1 - base.socialScore) *
        kSubstitution * (1 - laborProtection * laborProtectionLayoffDamp),
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
  const baseGDP = (state as any)._baseGDP ?? newGDPRaw
  const newGDPIndex = clamp((newGDPRaw / baseGDP) * 100, gdpIndexMin, gdpIndexMax)

  // 7.5 Unemployment
  const newTotalEmployment = newOccupations.reduce((sum, o) => sum + o.employment, 0)
  const newUnemploymentRate = clamp((laborForce - newTotalEmployment) / laborForce, 0, 1)

  // 7.6 Food price
  const currentLogistics = newOccupations
    .filter(o => {
      const base = baseOccupations.find(b => b.id === o.id)!
      return base.isLogistics
    })
    .reduce((sum, o) => sum + o.employment, 0)

  const logisticsShortfall = (baseLogistics - currentLogistics) / baseLogistics
  const newFoodPriceIndex = clamp(
    state.foodPriceIndex *
      (1 + logisticsShortfall * kFoodFromLogistics * (1 - supplyChainResilience)) *
      (1 + energyCost * kEnergyPassThrough),
    foodPriceIndexMin,
    foodPriceIndexMax
  )

  // 7.7 Inequality index
  const avgComplementarity =
    baseOccupations.reduce((sum, o) => sum + o.complementarityScore, 0) / baseOccupations.length
  const avgRoutine =
    baseOccupations.reduce((sum, o) => sum + o.routineScore, 0) / baseOccupations.length

  let newInequalityIndex = state.inequalityIndex +
    aiCapability * (avgRoutine - avgComplementarity) * kIneqFromAI +  // sign flipped: AI widens inequality
    corporateConcentration * kConcentrationLaborShare                   // additive, not multiplicative
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

  // Event log
  const events: string[] = []

  const routineOccs = baseOccupations.filter(o => o.routineScore > 0.7).map(o => o.name)
  const mostRoutine = routineOccs[0] ?? "routine workers"
  if (aiCapability > 0.3 && effectiveAdoption > 0.2) {
    events.push(`${mostRoutine} employment declined due to AI substitution.`)
  }

  const compOccs = baseOccupations.filter(o => o.complementarityScore > 0.7).map(o => o.name)
  const mostComp = compOccs[0] ?? "high-skill workers"
  if (aiCapability > 0.4) {
    events.push(`Wages rose for ${mostComp} as AI complementarity increased.`)
  }

  if (logisticsShortfall > 0.05) {
    events.push(`Food prices increased due to logistics workforce shortfall.`)
  }

  if (energyCost > 0.1) {
    events.push(`Energy cost shock passed through to food prices (+${(energyCost * kEnergyPassThrough * 100).toFixed(1)}%).`)
  }

  if (newUnemploymentRate > 0.12) {
    events.push(`Stability weakened — unemployment rate reached ${(newUnemploymentRate * 100).toFixed(1)}%.`)
  }

  if (newInequalityIndex > 1.4) {
    events.push(`Inequality index rising (${newInequalityIndex.toFixed(2)}). Corporate concentration amplifying gap.`)
  }

  if (regulation > 0.6) {
    events.push(`Strong regulation slowed AI adoption this year.`)
  }

  if (newStabilityIndex < 50) {
    events.push(`WARNING: Social stability critically low (${newStabilityIndex.toFixed(0)}).`)
  }

  if (events.length === 0) {
    events.push(`Year ${state.year + 1}: Economy stable. Conditions holding.`)
  }

  return {
    year: state.year + 1,
    occupations: newOccupations,
    totalEmployment: newTotalEmployment,
    unemploymentRate: newUnemploymentRate,
    gdpIndex: newGDPIndex,
    foodPriceIndex: newFoodPriceIndex,
    inequalityIndex: newInequalityIndex,
    stabilityIndex: newStabilityIndex,
    eventLog: [...state.eventLog, ...events],
    _baseGDP: baseGDP,
  } as SimulationState & { _baseGDP: number }
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
