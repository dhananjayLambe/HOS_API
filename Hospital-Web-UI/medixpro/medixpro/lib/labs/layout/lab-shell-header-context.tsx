"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type LabShellHeaderBack = {
  href: string;
  label?: string;
};

export type LabShellHeaderState = {
  title: string;
  description?: string;
  /** Left-side back control (after menu) — use for sub-pages e.g. upload wizard */
  back?: LabShellHeaderBack;
  actions?: ReactNode;
};

function headerEquals(a: LabShellHeaderState | null, b: LabShellHeaderState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.actions === b.actions &&
    a.back?.href === b.back?.href &&
    a.back?.label === b.back?.label
  );
}

type LabShellHeaderContextValue = {
  header: LabShellHeaderState | null;
  setHeader: (next: LabShellHeaderState | null) => void;
};

const LabShellHeaderContext = createContext<LabShellHeaderContextValue | null>(null);

export function LabShellHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<LabShellHeaderState | null>(null);
  const setHeader = useCallback((next: LabShellHeaderState | null) => {
    setHeaderState((prev) => (headerEquals(prev, next) ? prev : next));
  }, []);

  const value = useMemo(() => ({ header, setHeader }), [header, setHeader]);

  return (
    <LabShellHeaderContext.Provider value={value}>{children}</LabShellHeaderContext.Provider>
  );
}

export function useLabShellHeaderContext() {
  const ctx = useContext(LabShellHeaderContext);
  if (!ctx) {
    throw new Error("useLabShellHeaderContext must be used within LabShellHeaderProvider");
  }
  return ctx;
}

export function useLabShellHeaderRead() {
  return useLabShellHeaderContext().header;
}

/** Register page title/description/actions in the lab shell header; cleared on unmount. */
export function useLabShellHeader(meta: LabShellHeaderState | null) {
  const { setHeader } = useLabShellHeaderContext();
  const metaRef = useRef(meta);
  metaRef.current = meta;

  useLayoutEffect(() => {
    const m = metaRef.current;
    if (!m?.title) {
      setHeader(null);
      return;
    }
    setHeader({
      title: m.title,
      description: m.description,
      actions: m.actions,
      back: m.back?.href ? { href: m.back.href, label: m.back.label } : undefined,
    });
  });

  useLayoutEffect(() => {
    return () => setHeader(null);
  }, [setHeader]);
}
