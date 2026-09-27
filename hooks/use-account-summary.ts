"use client";

import { useCallback, useEffect, useState } from "react";

import { CloudApiError, cloudRequest } from "@/lib/cloud/request";

export type AccountUser = { id: string; name: string; email: string; phoneNumber?: string | null; image?: string | null; role?: string };
export type PointsSummary = { balance: number; totalEarned: number; totalSpent: number; updatedAt: string };
export type Entitlement = { id: string; kind: string; status: string; displayName?: string | null; expiresAt?: string | null };

type State = {
  status: "loading" | "signed-out" | "ready" | "error";
  user: AccountUser | null;
  points: PointsSummary | null;
  entitlements: Entitlement[];
};

const initialState: State = { status: "loading", user: null, points: null, entitlements: [] };

export function useAccountSummary() {
  const [state, setState] = useState<State>(initialState);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setState((current) => ({ ...current, status: "loading" }));
    try {
      const summary = await cloudRequest<{ user: AccountUser; points: PointsSummary; entitlements: Entitlement[] }>("/api/v1/me/summary", { signal });
      if (signal?.aborted) return;
      setState({ status: "ready", user: summary.user, points: summary.points, entitlements: summary.entitlements });
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof CloudApiError && error.status === 401) {
        setState({ ...initialState, status: "signed-out" });
      } else {
        setState((current) => ({ ...current, status: "error" }));
      }
    }
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    void refresh(abort.signal);
    return () => abort.abort();
  }, [refresh]);
  return { ...state, refresh };
}
