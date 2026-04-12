"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useBatchFileUpload() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      spaceName,
      spaceId,
    }: {
      files: File[];
      spaceName: string;
      spaceId: string;
    }) => {
      const results: { filename: string; success: boolean; error?: string }[] =
        [];

      for (const file of files) {
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
          continue;
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
          continue;
        }

        results.push({ filename: file.name, success: true });
      }

      return results;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["files", variables.spaceName],
      });
    },
  });
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
