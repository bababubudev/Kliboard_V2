"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DURATION_OPTIONS } from "@/lib/constants";

interface DurationPickerProps {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

export function DurationPicker({
  value,
  onChange,
  compact,
}: DurationPickerProps) {
  const selectedLabel =
    DURATION_OPTIONS.find((o) => o.value === value)?.label ?? "Expiration";

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger
        className={
          compact
            ? "h-8 w-32.5 gap-1 rounded-md border-0 bg-surface-container-high px-3 text-sm"
            : "w-45"
        }
      >
        <span>{selectedLabel}</span>
      </SelectTrigger>
      <SelectContent>
        {DURATION_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
