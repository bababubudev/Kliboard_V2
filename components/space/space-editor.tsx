"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { spaceNameSchema } from "@/lib/schemas/space.schema";

export function SpaceEditor() {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const router = useRouter();

  function validateName(value: string) {
    const result = spaceNameSchema.safeParse(value);
    setNameError(result.success ? "" : result.error.issues[0].message);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = spaceNameSchema.safeParse(name);
    if (!result.success) {
      setNameError(result.error.issues[0].message);
      return;
    }
    router.push(`/space/${name.toLowerCase()}`);
  }

  return (
    <div className="w-full max-w-lg">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-lg bg-surface-container-high p-2 pl-4 ring-1 ring-ghost-border transition-colors focus-within:ring-primary/30"
      >
        <Input
          placeholder="Type a name..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value) validateName(e.target.value);
          }}
          className="h-10 border-0 font-heading bg-transparent text-sm shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-md bg-linear-to-br from-primary to-primary-container px-6 text-xs font-medium uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
        >
          enter space
        </button>
      </form>
      {nameError && (
        <p className="mt-2 text-xs text-destructive">{nameError}</p>
      )}
    </div>
  );
}
