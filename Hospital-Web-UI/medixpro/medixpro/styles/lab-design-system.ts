/**
 * MedixPro Lab — semantic design system (values + Tailwind class fragments).
 * Consumed by `labDesignTokens.ts` and premium components for cohesive product UI.
 */

export const labColors = {
  primary: "#7C5CFC",
  primarySoft: "#F4F1FF",
  primaryMuted: "#F6F4FF",
  primaryHover: "#6D4FF5",
  primaryGradientEnd: "#9277FF",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  surfaceMuted: "#FAF9FF",
  borderSoft: "#ECEBFF",
  borderLavender: "rgba(124,92,252,0.08)",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  success: "#027A48",
  successBg: "#ECFDF3",
  warning: "#B7791F",
  warningBg: "#FFF7E8",
  danger: "#B42318",
  dangerBg: "#FEF3F2",
} as const;

/** Tailwind arbitrary fragments derived from labColors */
export const labTw = {
  textPrimary: "text-[#111827]",
  textSecondary: "text-[#6B7280]",
  textBody: "text-sm text-[#374151]",
  borderSoft: "border-[#ECEBFF]",
  borderLavender: "border-[color:rgba(124,92,252,0.08)]",
  bgSurface: "bg-white",
  bgElevated: "bg-white",
  bgMutedWash: "bg-[#FAF9FF]",
  bgSearch: "bg-[#F4F1FF]",
  bgTableHeader: "bg-[#F6F4FF]",
  bgIconTile: "bg-[#F4F1FF]",
} as const;

export const labShadows = {
  /** shadow-soft */
  soft: "shadow-[0_10px_30px_rgba(124,92,252,0.08)]",
  /** shadow-medium */
  medium: "shadow-[0_10px_40px_rgba(124,92,252,0.1)]",
  /** shadow-hover (cards / interactive) */
  hover: "shadow-[0_12px_36px_rgba(124,92,252,0.14)]",
  /** KPI card hover */
  cardHover: "shadow-[0_18px_60px_rgba(124,92,252,0.14)]",
  /** KPI card at rest */
  card: "shadow-[0_10px_40px_rgba(124,92,252,0.08)]",
  /** Sidebar active nav */
  navActive: "shadow-[0_10px_30px_rgba(124,92,252,0.25)]",
} as const;

export const labRadii = {
  card: "rounded-[24px]",
  section: "rounded-[28px]",
  button: "rounded-xl",
  /** 16px */
  tile: "rounded-2xl",
} as const;

export const labMotion = {
  standard:
    "transition-[color,background-color,box-shadow,transform,opacity] duration-200 ease-out",
  tableRow: "transition-colors duration-200 ease-out",
} as const;

/** 4px grid: prefer gap/padding multiples of 1 (4px) in lab layouts */
export const labSpace = {
  sectionPad: "p-6",
  sectionHeaderGap: "mb-6",
  headerClusterGap: "gap-2",
} as const;
