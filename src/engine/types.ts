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
  isInfrastructure: boolean
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
  techLayoffIndex: number
  inequalityIndex: number
  stabilityIndex: number
  eventLog: string[]
  _baseGDP?: number
}

export type SliderInputs = {
  aiCapability: number
  adoptionSpeed: number
  regulation: number
  retraining: number
  transfers: number
  laborProtection: number
  corporateConcentration: number
  openSourceAccess: number
  talentPipelineStrength: number
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
  kLayoffFromInfra: number
  kOpenSourcePassThrough: number
  kIneqFromAI: number
  kConcentrationLaborShare: number
  gdpIndexMin: number
  gdpIndexMax: number
  techLayoffIndexMin: number
  techLayoffIndexMax: number
  inequalityIndexMin: number
  inequalityIndexMax: number
  stabilityMin: number
  stabilityMax: number
  laborForce: number
  stabilityWeightUnemployment: number
  stabilityWeightTechLayoffs: number
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
