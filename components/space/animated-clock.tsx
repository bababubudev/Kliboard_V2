"use client";

import { useMemo } from "react";

interface AnimatedClockProps {
  className?: string;
}

const CX = 12;
const CY = 14;

export function AnimatedClock({ className }: AnimatedClockProps) {
  const startAngle = useMemo(() => {
    const now = new Date();
    return now.getSeconds() * 6 + now.getMilliseconds() * 0.006;
  }, []);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="10" x2="14" y1="2" y2="2" />
      <circle cx={CX} cy={CY} r="8" />
      <line
        x1={CX}
        y1={CY}
        x2={CX}
        y2={CY - 4.5}
        strokeWidth="2"
        style={{
          transformOrigin: `${CX}px ${CY}px`,
          transform: `rotate(${startAngle}deg)`,
          animation: "clock-spin 60s linear infinite",
        }}
      />
      <style>{`@keyframes clock-spin { to { transform: rotate(${startAngle + 360}deg); } }`}</style>
    </svg>
  );
}
