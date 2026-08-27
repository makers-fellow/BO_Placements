"use client"

import { cn } from "@/lib/utils"

interface ProfileProgressBarProps {
  percent: number
  step?: number
  stepCount?: number
}

export function ProfileProgressBar({ percent, step, stepCount }: ProfileProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)))
  const labelInside = clamped >= 18
  const showStep =
    typeof step === "number" &&
    typeof stepCount === "number" &&
    step >= 1 &&
    stepCount >= 1

  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso del formulario"
        className="relative h-[22px] min-w-0 flex-1 overflow-hidden rounded-full border border-[#1e3a5f] bg-[#1a2340]"
      >
        <div
          className="h-full rounded-r-full bg-[#86EFAC] transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 flex items-center text-xs font-semibold tabular-nums",
            labelInside ? "text-[#0F1729]" : "text-[#C7D2FE]"
          )}
          style={
            labelInside
              ? { left: 12 }
              : { left: `calc(${clamped}% + 8px)` }
          }
        >
          {clamped}%
        </span>
      </div>
      {showStep && (
        <span className="shrink-0 text-xs font-semibold tabular-nums text-[#C7D2FE]">
          Paso {step} de {stepCount}
        </span>
      )}
    </div>
  )
}
