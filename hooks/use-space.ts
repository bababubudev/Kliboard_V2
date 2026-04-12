"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { POLLING_INTERVAL_MS } from "@/lib/constants";

interface Space {
  id: string;
  name: string;
  content: string;
  is_private: boolean;
  duration: number;
  expires_at: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchSpace(name: string, password?: string): Promise<Space> {
  const headers: Record<string, string> = {};
  if (password) {
    headers["x-space-password"] = password;
  }

  const res = await fetch(`/api/spaces/${name}`, { headers });
  if (!res.ok) {
    const data = await res.json();
    const error = new Error(data.error ?? res.statusText) as Error & {
      status: number;
      passwordProtected?: boolean;
    };
    error.status = res.status;
    error.passwordProtected = data.passwordProtected;
    throw error;
  }
  return res.json();
}

export function useSpace(name: string, password?: string) {
  return useQuery({
    queryKey: ["space", name, password],
    queryFn: () => fetchSpace(name, password),
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const err = error as Error & { status?: number };
      if (err.status === 401 || err.status === 404 || err.status === 429) return false;
      return failureCount < 3;
    },
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      content?: string;
      duration?: number;
      password?: string;
    }) => {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        const err = new Error(errorData.error ?? res.statusText) as Error & {
          status: number;
        };
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-spaces"] });
    },
  });
}

export function useUpdateSpace(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { content?: string; duration?: number; password?: string }) => {
      const res = await fetch(`/api/spaces/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error ?? res.statusText);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["space", name, undefined], data);
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/spaces/${name}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error ?? res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-spaces"] });
    },
  });
}

type RecentSpace = Space & { file_count: number };

export function useRecentSpaces() {
  return useQuery({
    queryKey: ["recent-spaces"],
    queryFn: async () => {
      const res = await fetch("/api/spaces/recent");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error ?? res.statusText);
      }
      return res.json() as Promise<RecentSpace[]>;
    },
  });
}
