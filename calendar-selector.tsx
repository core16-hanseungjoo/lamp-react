// calendar-selector.tsx
"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CalendarSelectorProps {
  onDateSelect: (date: string) => void // Expects YYYY-MM-DD
  selectedDate: string | null // Expects YYYY-MM-DD
  availableDates: string[] // Array of YYYY-MM-DD strings
}

// Helper to format Date to YYYY-MM-DD in local timezone
const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper to parse YYYY-MM-DD string to Date in local timezone
const parseYYYYMMDDToDate = (dateString: string): Date | undefined => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // console.warn(`parseYYYYMMDDToDate: Invalid date string format - ${dateString}`);
    return undefined;
  }
  const [year, month, day] = dateString.split("-").map(Number)
  const d = new Date(year, month - 1, day); // month is 0-indexed
  // 추가 검증: 생성된 날짜가 입력과 일치하는지 (예: 2023-02-30 같은 경우 방지)
  if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
    return d;
  }
  // console.warn(`parseYYYYMMDDToDate: Date object creation resulted in different date - ${dateString}`);
  return undefined;
}

export default function CalendarSelector({ onDateSelect, selectedDate, availableDates }: CalendarSelectorProps) {
  const [date, setDate] = useState<Date | undefined>(
    selectedDate ? parseYYYYMMDDToDate(selectedDate) : undefined
  )

  // Sync internal date state if selectedDate prop changes from parent
  useEffect(() => {
    // console.log("CalendarSelector useEffect - selectedDate prop changed:", selectedDate);
    setDate(selectedDate ? parseYYYYMMDDToDate(selectedDate) : undefined)
  }, [selectedDate])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      const dateString = formatDateToYYYYMMDD(newDate)
      // console.log("Calendar date selected by user (Date obj):", newDate);
      // console.log("Formatted to YYYY-MM-DD string:", dateString);
      setDate(newDate) // Update internal state for UI
      onDateSelect(dateString) // Pass YYYY-MM-DD string to parent
    }
  }

  const isDateAvailable = (dayToTest: Date): boolean => {
    if (!dayToTest) return false
    const dateString = formatDateToYYYYMMDD(dayToTest)
    return availableDates.includes(dateString)
  }
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="p-0 text-lg">Select Date</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center mb-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={(day: Date) => !isDateAvailable(day)}
          // 초기 달력 표시 월 (선택 사항, 데이터의 가장 최근/첫번째 날짜 등으로 설정 가능)
          // month={date || (availableDates.length > 0 ? parseYYYYMMDDToDate(availableDates[0]) : new Date())}
        />
      </CardContent>
    </Card>
  )
}
