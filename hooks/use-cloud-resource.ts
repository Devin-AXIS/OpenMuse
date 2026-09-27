"use client";

import { useCallback, useEffect, useState } from "react";

import { cloudRequest } from "@/lib/cloud/request";

export function useCloudResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!path) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const next = await cloudRequest<T>(path, { signal });
      if (!signal?.aborted) setData(next);
    }
    catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause : new Error("Request failed")); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [path]);
  useEffect(() => {
    const abort = new AbortController();
    void refresh(abort.signal);
    return () => abort.abort();
  }, [refresh]);
  return { data, error, loading, refresh, setData };
}
