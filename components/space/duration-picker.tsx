"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DURATION_OPTIONS } from "@/lib/constants";
import { Timer } from "lucide-react";

interface DurationPickerProps {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
  iconOnly?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DurationPicker({
  value,
  onChange,
  compact,
  iconOnly,
  open,
  onOpenChange,
}: DurationPickerProps) {
  const selectedLabel =
    DURATION_OPTIONS.find((o) => o.value === value)?.label ?? "Expiration";

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SelectTrigger
        className={
          iconOnly
            ? "flex w-9 items-center justify-center self-center rounded-md border-0 bg-transparent p-0 text-primary shadow-none transition-colors hover:text-primary/80 [&>svg:last-child]:hidden" : compact
              ? "h-8 w-32.5 gap-1 rounded-md border-0 bg-surface-container-high px-3 text-sm"
              : "w-45"
        }
        size="sm"
      >
        {iconOnly ? (
          <Timer className="size-5" />
        ) : (
          <span>{selectedLabel}</span>
        )}
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {DURATION_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
