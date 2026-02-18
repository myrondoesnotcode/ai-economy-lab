export type Occupation = {
  id: string
  name: string
  employment: number
  meanWage: number
  routineScore: number
  analyticalScore: number
  socialScore: number
  manualScore: number
  complementarityScore: number
  sector: string
  isLogistics: boolean
}

export type SimulationState = {
  year: number
  occupations: {
    id: string
    employment: number
    wage: number
  }[]
  totalEmployment: number
  unemploymentRate: number
  gdpIndex: number
  foodPriceIndex: number
  inequalityIndex: number
  stabilityIndex: number
  eventLog: string[]
}

export type SliderInputs = {
  aiCapability: number
  adoptionSpeed: number
  regulation: number
  retraining: number
  transfers: number
  laborProtection: number
  corporateConcentration: number
  energyCost: number
  supplyChainResilience: number
}

export type ModelParams = {
  kRegulationDrag: number
  slowdownMax: number
  slowdownThreshold: number
  stabilityAdoptionMinMultiplier: number
  stabilityAdoptionMaxMultiplier: number
  kSubstitution: number
  laborProtectionLayoffDamp: number
  employmentFloorRatio: number
  kComplementarityWage: number
  kFoodFromLogistics: number
  kEnergyPassThrough: number
  kIneqFromAI: number
  kConcentrationLaborShare: number
  gdpIndexMin: number
  gdpIndexMax: number
  foodPriceIndexMin: number
  foodPriceIndexMax: number
  inequalityIndexMin: number
  inequalityIndexMax: number
  stabilityMin: number
  stabilityMax: number
  laborForce: number
  stabilityWeightUnemployment: number
  stabilityWeightFoodInflation: number
  stabilityWeightInequality: number
  sliders: {
    [key: string]: {
      label: string
      min: number
      max: number
      step: number
      default: number
      tooltip: string
    }
  }
}
