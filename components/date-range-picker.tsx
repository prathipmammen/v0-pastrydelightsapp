"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DateRange {
  from: Date
  to: Date
  label: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

const presetRanges = [
  {
    label: "Year to Date",
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date()
      return { from: start, to: end, label: "Year to Date" }
    },
  },
  {
    label: "Last Year",
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear() - 1, 0, 1)
      const end = new Date(now.getFullYear() - 1, 11, 31)
      return { from: start, to: end, label: "Last Year" }
    },
  },
  {
    label: "Whole Year Outlook",
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date(now.getFullYear(), 11, 31)
      return { from: start, to: end, label: "Whole Year Outlook" }
    },
  },
]

export default function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempRange, setTempRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  })
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedPreset, setSelectedPreset] = useState<string>("")

  // Check if current value matches any preset
  useEffect(() => {
    const matchingPreset = presetRanges.find((preset) => {
      const presetValue = preset.getValue()
      return presetValue.from.getTime() === value.from.getTime() && presetValue.to.getTime() === value.to.getTime()
    })
    setSelectedPreset(matchingPreset?.label || "Custom Range")
  }, [value])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatDateRange = (range: DateRange) => {
    if (range.label !== "Custom Range") {
      return range.label
    }
    return `${formatDate(range.from)} - ${formatDate(range.to)}`
  }

  const handlePresetSelect = (preset: string) => {
    const presetRange = presetRanges.find((p) => p.label === preset)
    if (presetRange) {
      const range = presetRange.getValue()
      onChange(range)
      setIsOpen(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const isDateInRange = (date: Date, from: Date | null, to: Date | null) => {
    if (!from || !to) return false
    const dateTime = date.getTime()
    return dateTime >= from.getTime() && dateTime <= to.getTime()
  }

  const isDateSelected = (date: Date) => {
    return (
      (tempRange.from && date.getTime() === tempRange.from.getTime()) ||
      (tempRange.to && date.getTime() === tempRange.to.getTime())
    )
  }

  const handleDateClick = (date: Date) => {
    if (!tempRange.from || (tempRange.from && tempRange.to)) {
      // Start new selection
      setTempRange({ from: date, to: null })
    } else if (tempRange.from && !tempRange.to) {
      // Complete selection
      const from = tempRange.from
      const to = date
      if (from.getTime() > to.getTime()) {
        setTempRange({ from: to, to: from })
      } else {
        setTempRange({ from, to })
      }
    }
  }

  const applyCustomRange = () => {
    if (tempRange.from && tempRange.to) {
      onChange({
        from: tempRange.from,
        to: tempRange.to,
        label: "Custom Range",
      })
      setIsOpen(false)
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2 items-start sm:items-center", className)}>
      <div className="text-sm font-medium text-gray-700 whitespace-nowrap">Date Range:</div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-start text-left font-normal border-amber-300 hover:bg-amber-50 min-w-[200px]"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-amber-600" />
            <span className="truncate">{formatDateRange(value)}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-full sm:w-auto p-0 shadow-lg border-amber-200" align="start">
          <div className="flex flex-col sm:flex-row">
            {/* Preset Options */}
            <div className="p-4 border-b sm:border-b-0 sm:border-r border-gray-200 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-3">Quick Select</div>
              <div className="space-y-1 min-w-[140px]">
                {presetRanges.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-sm h-11",
                      selectedPreset === preset.label
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        : "hover:bg-gray-100",
                    )}
                    onClick={() => handlePresetSelect(preset.label)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Calendar */}
            <div className="p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Custom Range</div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")} className="p-1 h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")} className="p-1 h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
                    {day}
                  </div>
                ))}

                {days.map((day, index) => {
                  if (!day) {
                    return <div key={index} className="p-2 h-8"></div>
                  }

                  const isSelected = isDateSelected(day)
                  const isInRange = isDateInRange(day, tempRange.from, tempRange.to)
                  const isToday = day.toDateString() === new Date().toDateString()

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "p-1 h-10 w-10 text-xs rounded transition-colors flex items-center justify-center",
                        isSelected
                          ? "bg-amber-600 text-white"
                          : isInRange
                            ? "bg-amber-100 text-amber-800"
                            : isToday
                              ? "bg-blue-100 text-blue-800"
                              : "hover:bg-gray-100",
                      )}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>

              {/* Selected Range Display */}
              {tempRange.from && (
                <div className="text-xs text-gray-600 mb-3">
                  {tempRange.from && tempRange.to
                    ? `${formatDate(tempRange.from)} - ${formatDate(tempRange.to)}`
                    : `From: ${formatDate(tempRange.from)}`}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempRange({ from: null, to: null })
                    setIsOpen(false)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={applyCustomRange}
                  disabled={!tempRange.from || !tempRange.to}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Range Badge */}
      <Badge className="bg-amber-100 text-amber-800 text-xs">
        {value.from.toLocaleDateString()} - {value.to.toLocaleDateString()}
      </Badge>
    </div>
  )
}
