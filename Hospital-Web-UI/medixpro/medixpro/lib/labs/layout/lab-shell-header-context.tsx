"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LabShellHeaderState = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

type LabShellHeaderContextValue = {
  header: LabShellHeaderState | null;
  setHeader: (next: LabShellHeaderState | null) => void;
};

const LabShellHeaderContext = createContext<LabShellHeaderContextValue | null>(null);

export function LabShellHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<LabShellHeaderState | null>(null);
  const setHeader = useCallback((next: LabShellHeaderState | null) => {
    setHeaderState(next);
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
  const title = meta?.title;
  const description = meta?.description;
  const actions = meta?.actions;

  useEffect(() => {
    if (!title) {
      setHeader(null);
      return () => setHeader(null);
    }
    setHeader({ title, description, actions });
    return () => setHeader(null);
  }, [title, description, actions, setHeader]);
}
