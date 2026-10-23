// Design system tokens for MiniLedger ("Paper Ledger" 1938 Series)
export const theme = {
  colors: {
    paper: '#F3ECDD',
    paperShade: '#EAE1CD',
    ink: '#1B1A17',
    rule: '#CBD5CF',
    marginRed: '#C2473A',
    paidGreen: '#2F6B4F',
    muted: '#6B655A',
  },
  fonts: {
    serif: 'Fraunces_400Regular',
    serifMedium: 'Fraunces_500Medium',
    serifSemiBold: 'Fraunces_600SemiBold',
    serifBold: 'Fraunces_700Bold',
    mono: 'IBMPlexMono_400Regular',
    monoMedium: 'IBMPlexMono_500Medium',
    monoSemiBold: 'IBMPlexMono_600SemiBold',
    monoBold: 'IBMPlexMono_700Bold',
  },
  typography: {
    // Exact requested type scale: 12, 14, 16, 22, 34
    caption: {
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.24,
    },
    label: {
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: 0.5,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
    },
    headline: {
      fontSize: 22,
      lineHeight: 28,
    },
    display: {
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.34,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borders: {
    radius: 2, // Max 2px corners, no rounded pills or circular containers
    thin: 1,
    hairline: 1,
    medium: 1.5,
    thick: 2,
  },
} as const;

export type Theme = typeof theme;
