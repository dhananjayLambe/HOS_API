"use client";

import { useAuth } from "@/lib/authContext";
import { isLabAdminRole } from "@/lib/jwtUtils";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchLabSession } from "./lab-session";
import type { LabSession } from "./lab-session-types";

export type LabSessionContextValue = {
  data: LabSession | undefined;
  status: "pending" | "error" | "success";
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  refreshLabSession: () => Promise<void>;
};

const LabSessionContext = createContext<LabSessionContextValue | null>(null);

function LabSessionQueryInner({ children }: { children: ReactNode }) {
  const { sessionChecked, isAuthenticated, role, user, logout } = useAuth();
  const queryClient = useQueryClient();
  const enabled = sessionChecked && isAuthenticated && isLabAdminRole(role);
  const userId = user?.user_id ?? null;
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (prevUserId.current !== null && prevUserId.current !== userId) {
      void queryClient.removeQueries({ queryKey: ["lab-session"] });
    }
    prevUserId.current = userId;
  }, [userId, queryClient]);

  const query = useQuery({
    queryKey: ["lab-session"],
    queryFn: fetchLabSession,
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // JWT + localStorage role survive DB deletes; backend rejects with 403 when lab profile or labadmin group is gone.
  useEffect(() => {
    if (!query.isError || !query.error) return;
    if (!axios.isAxiosError(query.error) || query.error.response?.status !== 403) return;
    void logout();
  }, [query.isError, query.error, logout]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && query.isSuccess && query.data) {
      console.debug("[lab-session]", query.data.organization?.display_name, query.data.branch?.branch_name);
    }
  }, [query.isSuccess, query.data]);

  const value = useMemo<LabSessionContextValue>(
    () => ({
      data: query.data,
      status: query.status,
      isPending: query.isPending,
      isError: query.isError,
      error: query.error instanceof Error ? query.error : query.error != null ? new Error(String(query.error)) : null,
      refetch: () => {
        void query.refetch();
      },
      refreshLabSession: async () => {
        await queryClient.invalidateQueries({ queryKey: ["lab-session"] });
      },
    }),
    [query.data, query.status, query.isPending, query.isError, query.error, query.refetch, queryClient],
  );

  return <LabSessionContext.Provider value={value}>{children}</LabSessionContext.Provider>;
}

export function LabDashboardProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LabSessionQueryInner>{children}</LabSessionQueryInner>
    </QueryClientProvider>
  );
}

export function useLabSession(): LabSessionContextValue {
  const ctx = useContext(LabSessionContext);
  if (!ctx) {
    throw new Error("useLabSession must be used within LabDashboardProviders");
  }
  return ctx;
}

export function useLabPermissions() {
  return useLabSession().data?.permissions ?? null;
}

export function useCurrentLabBranch() {
  return useLabSession().data?.branch ?? null;
}

export function useCurrentOrganization() {
  return useLabSession().data?.organization ?? null;
}
