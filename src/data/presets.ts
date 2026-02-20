import type { SliderInputs } from "../engine/types"

export interface Preset {
  label: string
  icon: string
  desc: string
  sliders: SliderInputs
}

export const PRESETS: Preset[] = [
  {
    label: "Business as Usual",
    icon: "📊",
    desc: "Moderate AI growth, limited policy response",
    sliders: {
      aiCapability: 0.3,
      adoptionSpeed: 0.4,
      regulation: 0.3,
      retraining: 0.2,
      transfers: 0.2,
      laborProtection: 0.3,
      corporateConcentration: 0.4,
      openSourceAccess: 0.0,
      talentPipelineStrength: 0.5,
    },
  },
  {
    label: "AI Boom",
    icon: "🚀",
    desc: "Rapid AI deployment, minimal friction",
    sliders: {
      aiCapability: 0.9,
      adoptionSpeed: 0.85,
      regulation: 0.1,
      retraining: 0.1,
      transfers: 0.1,
      laborProtection: 0.1,
      corporateConcentration: 0.7,
      openSourceAccess: 0.4,
      talentPipelineStrength: 0.4,
    },
  },
  {
    label: "Heavy Regulation",
    icon: "🏛️",
    desc: "Government slows AI, protects workers",
    sliders: {
      aiCapability: 0.5,
      adoptionSpeed: 0.3,
      regulation: 0.85,
      retraining: 0.5,
      transfers: 0.4,
      laborProtection: 0.8,
      corporateConcentration: 0.2,
      openSourceAccess: -0.2,
      talentPipelineStrength: 0.6,
    },
  },
  {
    label: "UBI Future",
    icon: "🤝",
    desc: "Strong safety net, robust retraining",
    sliders: {
      aiCapability: 0.6,
      adoptionSpeed: 0.55,
      regulation: 0.4,
      retraining: 0.8,
      transfers: 0.85,
      laborProtection: 0.5,
      corporateConcentration: 0.3,
      openSourceAccess: 0.2,
      talentPipelineStrength: 0.8,
    },
  },
]

/** Returns the preset whose sliders exactly match current values, or null */
export function matchingPreset(sliders: SliderInputs): Preset | null {
  return PRESETS.find(p =>
    (Object.keys(p.sliders) as (keyof SliderInputs)[]).every(
      k => Math.abs(p.sliders[k] - sliders[k]) < 0.001
    )
  ) ?? null
}
