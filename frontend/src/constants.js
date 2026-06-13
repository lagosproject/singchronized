export const WHISPER_MODEL_SPECS = {
  tiny: { parameters: "39M", vram: "~1 GB", speed: "Extremely Fast", accuracy: "Basic (fast draft)" },
  base: { parameters: "74M", vram: "~1 GB", speed: "Fast", accuracy: "Moderate (good balance)" },
  small: { parameters: "244M", vram: "~2 GB", speed: "Balanced", accuracy: "High (recommended)" },
  medium: { parameters: "769M", vram: "~5 GB", speed: "Slow", accuracy: "Very High (best quality)" }
};

export const WHISPER_MODEL_SIZES = ['tiny', 'base', 'small', 'medium'];
