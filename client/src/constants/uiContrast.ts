/** Contrast rule stored in SchoolProfile.metadata.uiContrast */
export const UI_CONTRAST_METADATA = {
  enabled: true,
  darkBackgroundUsesLightText: true,
  lightBackgroundUsesDarkText: true,
  description:
    'Always use light (white) font colour on dark backgrounds and dark font colour on light backgrounds so text stays readable.',
} as const

export const contrastTextOnDark = {
  title: 'text-white',
  muted: 'text-white/70',
} as const

export const contrastTextOnLight = {
  title: 'text-slate-900',
  muted: 'text-slate-500',
} as const
