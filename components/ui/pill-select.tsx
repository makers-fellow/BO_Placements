"use client"

import { cn } from "@/lib/utils"

export interface PillOption {
  value: string
  label: string
}

export interface PillSelectProps {
  options: PillOption[]
  value: string[]
  onChange: (value: string[]) => void
  max?: number
  className?: string
  label?: string
  showCount?: boolean
}

export function PillSelect({
  options,
  value,
  onChange,
  max,
  className,
  label,
  showCount = false,
}: PillSelectProps) {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      if (max && value.length >= max) return
      onChange([...value, optionValue])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, optionValue: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggleOption(optionValue)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {(label || showCount) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-base font-medium text-white">{label}</span>
          )}
          {showCount && max && (
            <span className="text-sm text-[#C7D2FE]">
              {value.length} / {max} seleccionadas
            </span>
          )}
        </div>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={label || "Selección múltiple"}
      >
        {options.map((option) => {
          const isActive = value.includes(option.value)
          const isDisabled = !isActive && max !== undefined && value.length >= max

          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={isActive}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              onClick={() => toggleOption(option.value)}
              onKeyDown={(e) => handleKeyDown(e, option.value)}
              disabled={isDisabled}
              className={cn(
                "min-h-[44px] min-w-[44px] px-4 py-2 rounded-full text-sm transition-all",
                "focus:outline-none focus:ring-2 focus:ring-[#86EFAC] focus:ring-offset-2 focus:ring-offset-[#0F1729]",
                isActive
                  ? "bg-[#86EFAC] text-[#0F1729] font-semibold"
                  : "border border-[#1e3a5f] text-[#C7D2FE] bg-transparent hover:border-[#86EFAC] hover:text-white",
                isDisabled && "opacity-50 cursor-not-allowed hover:border-[#1e3a5f] hover:text-[#C7D2FE]"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export interface GroupedPillSelectProps {
  groups: {
    label: string
    options: PillOption[]
  }[]
  value: string[]
  onChange: (value: string[]) => void
  className?: string
  label?: string
}

export function GroupedPillSelect({
  groups,
  value,
  onChange,
  className,
  label,
}: GroupedPillSelectProps) {
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, optionValue: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggleOption(optionValue)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {label && (
        <span className="text-base font-medium text-white">{label}</span>
      )}
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <span className="text-xs uppercase tracking-wider text-[#C7D2FE] font-medium">
            {group.label}
          </span>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={group.label}
          >
            {group.options.map((option) => {
              const isActive = value.includes(option.value)

              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={isActive}
                  tabIndex={0}
                  onClick={() => toggleOption(option.value)}
                  onKeyDown={(e) => handleKeyDown(e, option.value)}
                  className={cn(
                    "min-h-[44px] min-w-[44px] px-4 py-2 rounded-full text-sm transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-[#86EFAC] focus:ring-offset-2 focus:ring-offset-[#0F1729]",
                    isActive
                      ? "bg-[#86EFAC] text-[#0F1729] font-semibold"
                      : "border border-[#1e3a5f] text-[#C7D2FE] bg-transparent hover:border-[#86EFAC] hover:text-white"
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
