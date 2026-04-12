"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
      <form onSubmit={handleSubmit} className="flex">
        <Input
          placeholder="space_name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value) validateName(e.target.value);
          }}
          className="h-12 rounded-r-none border-r-0 bg-card font-mono text-base"
        />
        <Button
          type="submit"
          className="h-12 rounded-l-none px-6 text-xs font-medium uppercase tracking-widest"
        >
          enter_space
        </Button>
      </form>
      {nameError && (
        <p className="mt-2 text-xs text-destructive">{nameError}</p>
      )}
    </div>
  );
}
