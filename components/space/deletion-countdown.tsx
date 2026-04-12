"use client";

import { DurationPicker } from "@/components/space/duration-picker";

interface DeletionCountdownProps {
  countdown: string;
  isSaved: boolean;
  duration: number;
  onDurationChange: (value: number) => void;
}

export function DeletionCountdown({
  countdown,
  isSaved,
  duration,
  onDurationChange,
}: DeletionCountdownProps) {
  return (
    <div className="flex items-stretch gap-2 px-4 py-2">
      <div className="flex flex-col justify-center">
        <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
          time until deletion
        </p>
        <p className="font-heading text-lg font-medium tabular-nums text-primary">
          {isSaved ? countdown : "unsaved"}
        </p>
      </div>
      <span className="w-px bg-ghost-border" />
      <DurationPicker value={duration} onChange={onDurationChange} iconOnly />
    </div>
  );
}
