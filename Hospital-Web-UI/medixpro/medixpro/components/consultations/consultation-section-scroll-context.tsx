"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useShallow } from "zustand/react/shallow";
import {
  CONSULTATION_CONTAINER_ID,
  CONSULTATION_TAB_SECTION_DATA_ATTR,
  CONSULTATION_TAB_SECTION_ORDER,
  type ConsultationTabSectionKey,
  isConsultationTabSectionKey,
} from "@/lib/consultation-chip-ux";
import {
  flushConsultationAutosave,
  initConsultationAutosaveStoreSubscription,
} from "@/lib/consultation-autosave";
import type { ConsultationSectionType } from "@/lib/consultation-types";
import { useConsultationStore } from "@/store/consultationStore";

/** Sections anchored in the middle column (start consultation). */
export type ConsultationScrollSectionKey = ConsultationSectionType | "procedure";

const SECTION_SCROLL_OFFSET_PX = 70;

type ActivateSectionOptions = {
  /** Default true. Set false for search onChange so typing does not re-scroll every keystroke. */
  scroll?: boolean;
  /** Set true only if flushing autosave would recurse (rare). */
  skipAutosaveFlush?: boolean;
};

type ConsultationSectionScrollContextValue = {
  registerSectionRef: (
    key: ConsultationScrollSectionKey,
    el: HTMLElement | null
  ) => void;
  /**
   * Register `ConsultationSectionCard` expand() for a tab-ring section so Tab can open
   * collapsed cards before focusing the search input (Radix Collapsible hides input when closed).
   */
  registerTabSectionExpander: (
    key: ConsultationTabSectionKey,
    expand: () => void
  ) => () => void;
  scrollSectionIntoView: (key: ConsultationScrollSectionKey) => void;
  /**
   * User is working in this section (chip click, search focus, Add New, typing).
   * Updates highlight intent and scrolls by default.
   */
  activateSection: (
    key: ConsultationScrollSectionKey,
    options?: ActivateSectionOptions
  ) => void;
  /** Which middle section is the current editing context (dims siblings). */
  activeSectionKey: ConsultationScrollSectionKey | null;
  /** Procedures have no `selectedDetail`; use this when the textarea is focused. */
  setProcedureEditorActive: (active: boolean) => void;
};

const ConsultationSectionScrollContext =
  createContext<ConsultationSectionScrollContextValue | null>(null);

function scrollElementInWindow(el: HTMLElement, offsetY: number) {
  const y = el.getBoundingClientRect().top + window.scrollY - offsetY;
  window.scrollTo({
    top: Math.max(0, y),
    behavior: "smooth",
  });
}

function scrollElementInContainer(
  el: HTMLElement,
  container: HTMLElement,
  offsetY: number
) {
  const cRect = container.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const nextTop =
    container.scrollTop + (eRect.top - cRect.top) - offsetY;

  if (
    Math.abs(nextTop - container.scrollTop) < 12 &&
    eRect.top >= cRect.top - 8
  ) {
    return;
  }

  container.scrollTo({
    top: Math.max(0, nextTop),
    behavior: "smooth",
  });
}

function findTabRingInput(
  container: HTMLElement,
  key: ConsultationTabSectionKey
): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>(
    `input[${CONSULTATION_TAB_SECTION_DATA_ATTR}="${key}"]`
  );
}

function focusTabRingSearchInput(
  container: HTMLElement,
  key: ConsultationTabSectionKey,
  expand: (() => void) | undefined
): void {
  expand?.();

  const tryFocus = (): boolean => {
    const el = findTabRingInput(container, key);
    if (!el) return false;
    el.focus();
    try {
      el.select();
    } catch {
      /* ignore */
    }
    return document.activeElement === el;
  };

  requestAnimationFrame(() => {
    if (tryFocus()) return;
    requestAnimationFrame(() => {
      if (tryFocus()) return;
      window.setTimeout(() => {
        if (tryFocus()) return;
        window.setTimeout(() => void tryFocus(), 120);
      }, 60);
    });
  });
}

export function ConsultationSectionScrollProvider({
  children,
}: {
  children: ReactNode;
}) {
  const refs = useRef<
    Partial<Record<ConsultationScrollSectionKey, HTMLElement | null>>
  >({});

  const tabSectionExpandersRef = useRef<
    Partial<Record<ConsultationTabSectionKey, () => void>>
  >({});

  const registerTabSectionExpander = useCallback(
    (key: ConsultationTabSectionKey, expand: () => void) => {
      tabSectionExpandersRef.current[key] = expand;
      return () => {
        delete tabSectionExpandersRef.current[key];
      };
    },
    []
  );

  const [procedureEditorActive, setProcedureEditorActive] = useState(false);
  /** Focus / toolbar intent (search, Add New) so highlight works before any chip is selected. */
  const [intentSectionKey, setIntentSectionKey] =
    useState<ConsultationScrollSectionKey | null>(null);

  const { selectedSymptomId, selectedDetail } = useConsultationStore(
    useShallow((s) => ({
      selectedSymptomId: s.selectedSymptomId,
      selectedDetail: s.selectedDetail,
    }))
  );

  const activeSectionKey = useMemo((): ConsultationScrollSectionKey | null => {
    if (procedureEditorActive) return "procedure";
    if (intentSectionKey) return intentSectionKey;
    if (selectedDetail?.section) {
      return selectedDetail.section as ConsultationScrollSectionKey;
    }
    if (selectedSymptomId) return "symptoms";
    return null;
  }, [
    procedureEditorActive,
    intentSectionKey,
    selectedDetail,
    selectedSymptomId,
  ]);

  const registerSectionRef = useCallback(
    (key: ConsultationScrollSectionKey, el: HTMLElement | null) => {
      if (el) refs.current[key] = el;
      else delete refs.current[key];
    },
    []
  );

  const scrollSectionIntoView = useCallback(
    (key: ConsultationScrollSectionKey) => {
      const el = refs.current[key];
      if (!el || typeof document === "undefined") return;

      const container = document.getElementById(CONSULTATION_CONTAINER_ID);
      const offset = SECTION_SCROLL_OFFSET_PX;

      if (
        container &&
        container.scrollHeight > container.clientHeight + 2
      ) {
        scrollElementInContainer(el, container, offset);
        return;
      }

      scrollElementInWindow(el, offset);
    },
    []
  );

  const intentSectionKeyRef = useRef<ConsultationScrollSectionKey | null>(null);

  const activateSection = useCallback(
    (key: ConsultationScrollSectionKey, options?: ActivateSectionOptions) => {
      const prev = intentSectionKeyRef.current;
      if (
        prev &&
        prev !== key &&
        isConsultationTabSectionKey(prev) &&
        options?.skipAutosaveFlush !== true
      ) {
        void flushConsultationAutosave({
          reason: "section-switch",
          fromSection: prev,
        });
      }
      intentSectionKeyRef.current = key;
      setIntentSectionKey(key);
      if (options?.scroll !== false) {
        scrollSectionIntoView(key);
      }
    },
    [scrollSectionIntoView]
  );

  const activateSectionRef = useRef(activateSection);
  activateSectionRef.current = activateSection;

  useEffect(() => {
    return initConsultationAutosaveStoreSubscription();
  }, []);

  useEffect(() => {
    const container = document.getElementById(CONSULTATION_CONTAINER_ID);
    if (!container) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      const inputType = (target.getAttribute("type") || "text").toLowerCase();
      if (inputType !== "search" && inputType !== "text") return;
      if (!container.contains(target)) return;

      const tabSection = target.getAttribute(CONSULTATION_TAB_SECTION_DATA_ATTR);
      if (!isConsultationTabSectionKey(tabSection)) return;

      const order = CONSULTATION_TAB_SECTION_ORDER;
      const currentIdx = order.indexOf(tabSection);
      if (currentIdx === -1) return;

      e.preventDefault();
      e.stopPropagation();

      const dir = e.shiftKey ? -1 : 1;
      let idx = currentIdx;
      for (let step = 0; step < order.length; step++) {
        idx = (idx + dir + order.length) % order.length;
        const nextKey = order[idx];
        // Section may be collapsed with input unmounted — use wrapper ref, not querySelector.
        if (!refs.current[nextKey]) continue;

        activateSectionRef.current(nextKey);
        focusTabRingSearchInput(
          container,
          nextKey,
          tabSectionExpandersRef.current[nextKey]
        );
        return;
      }
    };

    container.addEventListener("keydown", onKeyDown, true);
    return () => container.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const value = useMemo(
    () => ({
      registerSectionRef,
      registerTabSectionExpander,
      scrollSectionIntoView,
      activateSection,
      activeSectionKey,
      setProcedureEditorActive,
    }),
    [
      registerSectionRef,
      registerTabSectionExpander,
      scrollSectionIntoView,
      activateSection,
      activeSectionKey,
    ]
  );

  return (
    <ConsultationSectionScrollContext.Provider value={value}>
      {children}
    </ConsultationSectionScrollContext.Provider>
  );
}

export function useConsultationSectionScroll() {
  const ctx = useContext(ConsultationSectionScrollContext);
  if (!ctx) {
    throw new Error(
      "useConsultationSectionScroll must be used within ConsultationSectionScrollProvider"
    );
  }
  return ctx;
}
