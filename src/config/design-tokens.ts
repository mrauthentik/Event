/**
 * Master Design Tokens for IHGC 2026.
 * Derived from KILO design reference screenshots (/design-reference).
 * Centralized for easy swappability when Horemow brand assets are finalized.
 */
export const DESIGN_TOKENS = {
  colors: {
    mint: {
      DEFAULT: "#8EE3D6",
      hover: "#7BD4C7",
      light: "#EAF9F7",
      border: "#CDEFEA",
    },
    navy: {
      dark: "#0E1020",
      footerBar: "#171A2B",
      card: "#121528",
      overlay: "rgba(14, 16, 32, 0.82)",
    },
    neutral: {
      ink: "#111320",
      muted: "#6B7280",
      subtle: "#9CA3AF",
      border: "#E5E7EB",
      inputBg: "#F9FAFB",
      cardBg: "#FFFFFF",
    },
    status: {
      validGreen: "#10B981",
      amberWarning: "#F59E0B",
      redError: "#EF4444",
    },
  },
  typography: {
    fontHeading: "var(--font-montserrat)",
    fontBody: "var(--font-inter)",
    lineHeightHeading: "1.1",
    trackingTight: "-0.02em",
    trackingLabel: "0.1em",
  },
  radii: {
    input: "6px",
    cardStandard: "16px",
    cardLarge: "24px",
    pill: "9999px",
  },
  layout: {
    headerHeight: "55px",
    maxContentWidth: "1200px",
  },
} as const;

