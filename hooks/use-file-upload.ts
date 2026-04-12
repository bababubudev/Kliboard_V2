"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const MAX_CONCURRENT = 3;

interface UploadResult {
  filename: string;
  success: boolean;
  error?: string;
}

export interface StorageUploadResult {
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  success: boolean;
  error?: string;
}

export async function uploadFilesToStorage(
  files: File[],
  spaceName: string
): Promise<StorageUploadResult[]> {
  const supabase = createClient();
  const results: StorageUploadResult[] = [];

  for (const file of files) {
    const path = `${spaceName}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage
      .from("space-files")
      .upload(path, file);

    if (error) {
      results.push({
        filename: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        success: false,
        error: error.message,
      });
    } else {
      results.push({
        filename: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        success: true,
      });
    }
  }

  return results;
}

interface UploadProgress {
  completed: number;
  total: number;
}

export function useBatchFileUpload() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress>({ completed: 0, total: 0 });

  const mutation = useMutation({
    mutationFn: async ({
      files,
      spaceName,
      spaceId,
    }: {
      files: File[];
      spaceName: string;
      spaceId: string;
    }) => {
      const results: UploadResult[] = [];
      setProgress({ completed: 0, total: files.length });

      const queue = [...files];
      const inFlight: Promise<void>[] = [];

      async function uploadOne(file: File) {
        const path = `${spaceName}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("space-files")
          .upload(path, file);

        if (uploadError) {
          results.push({
            filename: file.name,
            success: false,
            error: uploadError.message,
          });
          setProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
          return;
        }

        const res = await fetch(`/api/spaces/${spaceName}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            storage_path: path,
            mime_type: file.type,
            size_bytes: file.size,
            space_id: spaceId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          results.push({
            filename: file.name,
            success: false,
            error: errorData.error ?? "Failed to save metadata",
          });
          await supabase.storage.from("space-files").remove([path]);
        } else {
          results.push({ filename: file.name, success: true });
        }

        setProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
      }

      async function processQueue() {
        while (queue.length > 0) {
          const file = queue.shift()!;
          const task = uploadOne(file);
          inFlight.push(task);

          if (inFlight.length >= MAX_CONCURRENT) {
            await Promise.race(inFlight);
            const settled = await Promise.allSettled(inFlight);
            const stillPending: Promise<void>[] = [];
            for (let i = 0; i < inFlight.length; i++) {
              if (settled[i].status !== "fulfilled" && settled[i].status !== "rejected") {
                stillPending.push(inFlight[i]);
              }
            }
            inFlight.length = 0;
            inFlight.push(...stillPending);
          }
        }
        await Promise.all(inFlight);
      }

      await processQueue();
      return results;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["files", variables.spaceName],
      });
    },
  });

  const reset = useCallback(() => {
    setProgress({ completed: 0, total: 0 });
  }, []);

  return { ...mutation, progress, resetProgress: reset };
}

export function useSpaceFiles(spaceName: string) {
  const queryClient = useQueryClient();

  return {
    deleteFile: useMutation({
      mutationFn: async (fileId: string) => {
        const res = await fetch(`/api/spaces/${spaceName}/files/${fileId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error ?? "Failed to delete file");
        }
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["files", spaceName] });
      },
    }),
  };
}
