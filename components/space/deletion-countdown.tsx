"use client";

import { useEffect, useRef, useState } from "react";
import { DurationPicker } from "@/components/space/duration-picker";
import { DURATION_OPTIONS } from "@/lib/constants";

interface DeletionCountdownProps {
  countdown: string;
  isSaved: boolean;
  duration: number;
  onDurationChange?: (value: number) => void;
}

export function DeletionCountdown({
  countdown,
  isSaved,
  duration,
  onDurationChange,
}: DeletionCountdownProps) {
  const durationLabel =
    DURATION_OPTIONS.find((o) => o.value === duration)?.label ?? "";

  const [showFlash, setShowFlash] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isSaved) return;
    setShowFlash(true);
    clearTimeout(flashTimeout.current);
    flashTimeout.current = setTimeout(() => setShowFlash(false), 2000);
    return () => clearTimeout(flashTimeout.current);
  }, [duration, isSaved]);

  const showDuration = !isSaved || showFlash;

  const interactive = Boolean(onDurationChange);

  return (
    <div
      className={`flex items-stretch gap-2 px-4 py-2 transition-colors ${interactive ? "cursor-pointer hover:bg-surface-container-high/50" : ""}`}
      onClick={() => interactive && setPickerOpen((v) => !v)}
    >
      <div className="flex flex-col justify-center">
        <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground transition-opacity duration-300">
          {showDuration ? "selected duration" : "time until deletion"}
        </p>
        <div className="relative h-7 overflow-hidden">
          <p
            className={`font-heading text-lg font-medium text-primary transition-transform duration-300 ease-out ${showDuration ? "-translate-y-full" : "translate-y-0"}`}
          >
            {countdown}
          </p>
          <p
            className={`absolute inset-x-0 top-full font-heading text-lg font-medium text-primary transition-transform duration-300 ease-out ${showDuration ? "-translate-y-full" : "translate-y-0"}`}
          >
            {durationLabel}
          </p>
        </div>
      </div>
      {onDurationChange && (
        <>
          <span className="w-px bg-ghost-border" />
          <DurationPicker
            value={duration}
            onChange={onDurationChange}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            iconOnly
          />
        </>
      )}
    </div>
  );
}
