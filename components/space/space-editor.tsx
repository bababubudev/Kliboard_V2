"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { spaceNameSchema } from "@/lib/schemas/space.schema";
import { errorVariants, baseTransition } from "@/lib/animations";
import { CircleAlert } from "lucide-react";

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
          placeholder="Or enter an existing one..."
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
      <div className="mt-2 h-3.5">
        <AnimatePresence initial={false}>
          {nameError && (
            <motion.p
              key={nameError}
              variants={errorVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={baseTransition}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-destructive"
            >
              <CircleAlert className="h-3 w-3 shrink-0" />
              {nameError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
