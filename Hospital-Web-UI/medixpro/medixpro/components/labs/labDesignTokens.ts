/**
 * MedixPro Lab — Tailwind class fragments composed from [`styles/lab-design-system`].
 */

import {
  labMotion as labMotionTokens,
  labRadii,
  labShadows,
  labTw,
} from "@/styles/lab-design-system";

export const labLavenderBorder = labTw.borderLavender;

export const labShadowSoft = labShadows.soft;
export const labShadowMedium = labShadows.medium;
export const labShadowHover = labShadows.hover;

export const labMotion = labMotionTokens.standard;

export const labCardLift = labMotion + " hover:-translate-y-0.5 " + labShadows.cardHover;

/** Main workspace canvas */
export const labWorkspaceBg = labTw.bgSurface;

export const labSurfaceLavender = labTw.bgSearch;
export const labSurfaceLavenderLight = "bg-[#EAE4FF]";

export const labBorderSubtle = labLavenderBorder;

export const labCardSurface =
  labRadii.tile +
  " border bg-white " +
  labLavenderBorder +
  " " +
  labShadowSoft +
  " " +
  labMotion;

export const labTextPrimary = labTw.textPrimary;
export const labTextMuted = labTw.textSecondary;
export const labTextBody = labTw.textBody;

export const labPageTitle = "text-3xl font-semibold tracking-tight " + labTw.textPrimary;
export const labSectionTitle = "text-xl font-semibold tracking-tight " + labTw.textPrimary;
/** Default body copy inside operational tables (use on cells where overrides are needed). */
export const labTableCellBody = labTw.textBody;
export const labKpiLabel = "text-xs font-medium uppercase tracking-wider " + labTw.textSecondary;
export const labKpiValue = "text-4xl font-bold tabular-nums tracking-tight " + labTw.textPrimary;

export const labBrand = "text-[#7C5CFC]";
export const labBrandHover = "hover:text-[#6D4FF5]";

export const labBtnPrimary =
  "inline-flex h-10 min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#9277FF] px-4 text-sm font-medium text-white sm:min-h-0 " +
  labShadowSoft +
  " " +
  labMotion +
  " hover:brightness-[0.98] hover:shadow-[0_10px_30px_rgba(124,92,252,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/35";

export const labBtnSecondary =
  "inline-flex h-10 min-h-[44px] items-center justify-center rounded-xl border border-[color:rgba(124,92,252,0.2)] bg-white px-4 text-sm font-medium text-[#6B7280] sm:min-h-0 " +
  labMotion +
  " hover:border-[color:rgba(124,92,252,0.35)] hover:bg-[#F4F1FF]/50 hover:text-[#111827]";

export const labBtnDanger =
  "inline-flex h-10 min-h-[44px] items-center justify-center rounded-xl border border-red-200/80 bg-[#FEF3F2] px-4 text-sm font-medium text-[#B42318] sm:min-h-0 " +
  labMotion +
  " hover:bg-[#FEE4E2]";

/** Floating sidebar: frosted rail; `xl` width 260px */
export const labSidebarShell =
  "!fixed bottom-0 left-0 z-50 flex h-full w-full max-w-[260px] flex-col overflow-hidden border-r border-[#ECEBFF] bg-white/90 backdrop-blur-xl " +
  "xl:left-3 xl:top-3 xl:h-[calc(100dvh-1.5rem)] xl:w-[260px] xl:max-w-none xl:rounded-2xl xl:border xl:shadow-[0_10px_40px_rgba(124,92,252,0.1)]";

export const labSidebarNavActive =
  "relative rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#9277FF] py-2.5 pl-3 pr-3 text-sm font-medium text-white " +
  labShadows.navActive +
  " ring-1 ring-white/20 " +
  labMotion;

export const labSidebarNavInactive =
  "relative rounded-xl py-2.5 pl-3 pr-3 text-sm font-medium text-[#6B7280] " + labMotion + " hover:bg-[#F4F1FF] hover:text-[#111827]";

export const labSidebarNavIndicator =
  "pointer-events-none absolute left-2 top-2 bottom-2 w-1 rounded-full bg-white/80";

export const labSidebarIconInactive = "mr-2.5 h-5 w-5 shrink-0 text-[#6B7280] [stroke-width:2]";
export const labSidebarIconActive = "mr-2.5 h-5 w-5 shrink-0 text-white [stroke-width:2]";

/** Main + header offset when sidebar open: 12px + 260px + 12px */
export const labMainOffsetSidebarOpen = "xl:ml-[calc(0.75rem+260px+0.75rem)]";
export const labMainOffsetSidebarClosed = "xl:ml-4";

/** Set on DashboardHeader; consumed by sticky sidebars and toolbars. */
export const labShellHeaderHeightDefault = "5rem";
export const labShellHeaderHeightDense = "2.75rem";

export const labStickyBelowHeader =
  "top-[calc(var(--lab-shell-header-height,4rem)+0.75rem)]";

export const labHeaderAccentLine = "bg-gradient-to-r from-transparent via-[#7C5CFC]/25 to-transparent";

export const labHeaderBar =
  "sticky top-0 z-40 m-0 min-w-0 w-full shrink-0 border-b border-[#ECEBFF] bg-white/90 shadow-sm backdrop-blur-md";

export const labSearchInput =
  "h-12 w-full min-w-0 rounded-2xl border border-[#ECEBFF] bg-[#F4F1FF] py-3 pl-12 pr-4 text-sm text-[#111827] placeholder:text-[#6B7280] " +
  labMotion +
  " focus-visible:border-[#7C5CFC]/40 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/25";

export const labIconButton =
  "inline-flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-[#ECEBFF] bg-white/90 text-[#6B7280] " +
  labShadowSoft +
  " " +
  labMotion +
  " hover:bg-[#F4F1FF] hover:text-[#7C5CFC] sm:h-11 sm:min-h-0 sm:w-11 sm:min-w-0";

/** Section module outer shell (28px radius). */
export const labSectionCardOuter =
  labRadii.section +
  " overflow-hidden border bg-white " +
  labLavenderBorder +
  " " +
  labShadowSoft;

/** KPI / status metric card (24px radius, depth shadow + lift). */
export const labStatusCardShell =
  labRadii.card +
  " relative flex min-h-[148px] flex-col overflow-hidden border bg-white p-5 " +
  labLavenderBorder +
  " " +
  labShadows.card +
  " " +
  labCardLift;

/** Compact KPI strip — no min-height; for dense operational catalog headers. */
export const labStatusCardShellCompact =
  labRadii.card +
  " flex min-h-0 items-center overflow-hidden border bg-white " +
  labLavenderBorder +
  " " +
  labShadowSoft;
