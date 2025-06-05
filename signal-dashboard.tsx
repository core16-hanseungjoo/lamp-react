// signal-dashboard.tsx
"use client"

import { useEffect, useState, useMemo } from "react"
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TooltipProps } from "recharts"

import DailySignalGaugeDisplay, { type SignalCounts } from "./daily-signal-gauge-display"
import CalendarSelector from "./calendar-selector"

// --- Constants --- (사용자 제공 값 유지)
const CSV_DATA_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/text_data-TxcIugcuYaYqDyUrW97pwyWEJyCQWT.csv"
const RECENT_DAYS_COUNT = 30
const SIGNAL_SUFFIX = "_signal"
const DEFAULT_BUBBLE_SIZE = 400 // 사용자 제공 값
const DATE_COLUMN_INDEX = 0

// --- Interfaces --- (기존과 동일)
interface SignalDataRow {
  date: string
  [key: string]: string | null
}
interface FormattedChartDataPoint {
  x: number
  y: number
  z: number
  date: string
  value: string
  signalName: string
  color: string
}
interface ScatterTooltipPayloadItem {
  payload: FormattedChartDataPoint
  [key: string]: any
}
interface SignalBubbleTooltipProps extends TooltipProps<number, string> {
  payload?: ScatterTooltipPayloadItem[]
}
interface SignalBubbleXAxisTickProps {
  x?: number
  y?: number
  payload?: { value: number }
  dateLabels: string[]
}

// --- Helper Functions --- (스타일 유지)
const getSignalColor = (value: string | null): string => {
  const lowerValue = value?.toLowerCase() || "hold"
  switch (lowerValue) {
    case "sell":
      return "#ef4444"
    case "buy":
      return "#22c55e"
    case "hold":
    default:
      return "#6b72801a" // 사용자 제공 값 (투명도 없음)
  }
}

// --- Sub-components --- (스타일 유지)
const CustomTooltipContent = ({ active, payload }: SignalBubbleTooltipProps) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-base">{dataPoint.signalName}</p>
        <p className="text-sm text-gray-600 mt-1">날짜: {dataPoint.date}</p>
        <p className="text-sm font-medium mt-2" style={{ color: getSignalColor(dataPoint.value) }}>
          신호: {dataPoint.value}
        </p>
      </div>
    )
  }
  return null
}
const StatsSummaryCard = ({
  stats,
}: { stats: { totalDays: number; totalSignals: number; sellCount: number; buyCount: number; holdCount: number } }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Total</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>표시 기간:</span>
          <span>{stats.totalDays}일</span>
        </div>
        <div className="flex justify-between">
          <span>총 지표 종류:</span>
          <span>{stats.totalSignals}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-red-500">총 Sell 신호:</span>
          <span>{stats.sellCount}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">총 Hold 신호:</span>
          <span>{stats.holdCount}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-500">총 Buy 신호:</span>
          <span>{stats.buyCount}개</span>
        </div>
      </div>
    </CardContent>
  </Card>
)

// --- Main Component ---
export default function SignalDashboard() {
  const [allFetchedData, setAllFetchedData] = useState<SignalDataRow[]>([])
  const [bubbleChartData, setBubbleChartData] = useState<FormattedChartDataPoint[]>([]) // 이름 변경
  const [signalNames, setSignalNames] = useState<string[]>([])
  const [dateLabelsForBubble, setDateLabelsForBubble] = useState<string[]>([]) // 이름 변경
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  const [gaugeSignalCounts, setGaugeSignalCounts] = useState<SignalCounts | null>(null)
  const [currentSelectedDate, setCurrentSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    const fetchDataAndProcess = async () => {
      setLoading(true)
      setError("")
      // console.log("CSV 데이터 요청 시작...");

      try {
        const response = await fetch(CSV_DATA_URL)
        // console.log("CSV 응답 상태:", response.status);
        if (!response.ok) throw new Error(`HTTP 오류! 상태: ${response.status}`)
        const csvText = await response.text()
        const lines = csvText.trim().split("\n") // Ensure consistent line splitting
        if (lines.length < 2) throw new Error("CSV 데이터 부족")

        const rawHeaders = lines[0].split(",").map((h) => h.trim())
        const extractedSignalHeaders = rawHeaders.filter(
          (h, i) => i !== DATE_COLUMN_INDEX && h.includes(SIGNAL_SUFFIX) && h !== "",
        )
        setSignalNames(extractedSignalHeaders)

        const parsedRows: SignalDataRow[] = []
        // console.log("--- CSV 행 파싱 시작 ---");
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim())
          if (values.length < rawHeaders.length) {
            // console.warn(`행 ${i + 1} 스킵: 열 개수 부족.`);
            continue
          }

          const rawDateFromCsv = values[DATE_COLUMN_INDEX] || ""
          let formattedDateForApp = ""
          // console.log(`  행 ${i + 1}: 원본 CSV 날짜 = "${rawDateFromCsv}"`);

          // ##########################################################################
          // ### 중요: 실제 CSV 날짜 형식에 맞춰 아래 파싱 로직을 수정/확장해야 합니다 ###
          // ##########################################################################
          if (/^\d{4}-\d{2}-\d{2}$/.test(rawDateFromCsv)) {
            // YYYY-MM-DD
            formattedDateForApp = rawDateFromCsv
          } else if (rawDateFromCsv.length === 8 && /^\d+$/.test(rawDateFromCsv)) {
            // YYYYMMDD
            formattedDateForApp = `${rawDateFromCsv.substring(0, 4)}-${rawDateFromCsv.substring(4, 6)}-${rawDateFromCsv.substring(6, 8)}`
          } else if (rawDateFromCsv.includes("/") && rawDateFromCsv.split("/").length === 3) {
            const parts = rawDateFromCsv.split("/")
            if (parts.length === 3 && parts[2].length === 4 && parts[0].length <= 2 && parts[1].length <= 2) {
              // MM/DD/YYYY (월/일이 1~2자리)
              formattedDateForApp = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
            } else if (parts.length === 3 && parts[0].length === 4 && parts[1].length <= 2 && parts[2].length <= 2) {
              // YYYY/MM/DD
              formattedDateForApp = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
            } else {
              // console.warn(`  행 ${i + 1}: 모호한 '/' 날짜 형식 "${rawDateFromCsv}", 스킵.`);
              continue
            }
          } else if (rawDateFromCsv) {
            // new Date()로 마지막 시도 (주의: 브라우저/환경 의존적일 수 있음)
            try {
              const d = new Date(rawDateFromCsv)
              if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
                // 간단한 유효성 검사
                formattedDateForApp = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
              } else {
                continue
              }
            } catch (e) {
              continue
            }
          } else {
            continue
          } // 날짜 없음 스킵

          // 최종 YYYY-MM-DD 형식 및 유효성 검사
          if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDateForApp)) continue
          try {
            const [year, month, day] = formattedDateForApp.split("-").map(Number)
            const dateObj = new Date(year, month - 1, day) // 로컬 시간 기준
            if (
              isNaN(dateObj.getTime()) ||
              dateObj.getFullYear() !== year ||
              dateObj.getMonth() !== month - 1 ||
              dateObj.getDate() !== day
            ) {
              // console.warn(`  행 ${i + 1}: 포맷팅 후 유효하지 않은 날짜 객체 생성됨 "${formattedDateForApp}", 스킵.`);
              continue
            }
          } catch (e) {
            continue
          }

          const row: SignalDataRow = { date: formattedDateForApp }
          rawHeaders.forEach((header, index) => {
            if (index !== DATE_COLUMN_INDEX && header !== "") row[header] = values[index] || null
          })
          parsedRows.push(row)
        }
        // console.log("--- CSV 행 파싱 완료 ---");

        if (parsedRows.length === 0) throw new Error("파싱된 유효한 데이터 행 없음.")

        parsedRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // 날짜 오름차순 정렬
        setAllFetchedData(parsedRows)

        // 버블 차트 데이터 준비
        const recentParsedData = parsedRows.slice(-RECENT_DAYS_COUNT)
        const formattedPoints: FormattedChartDataPoint[] = []
        const datesForBubbleChart: string[] = recentParsedData.map((r) => r.date)
        console.log("X축 날짜 레이블:", datesForBubbleChart) // 디버깅 로그
        setDateLabelsForBubble(datesForBubbleChart)

        recentParsedData.forEach((rowData, dateIdx) => {
          extractedSignalHeaders.forEach((signalHeader, signalIdx) => {
            const signalValue = (rowData[signalHeader] as string) || "Hold"
            formattedPoints.push({
              x: dateIdx,
              y: signalIdx,
              z: DEFAULT_BUBBLE_SIZE,
              date: rowData.date,
              value: signalValue,
              signalName: signalHeader.replace(SIGNAL_SUFFIX, ""),
              color: getSignalColor(signalValue),
            })
          })
        })
        setBubbleChartData(formattedPoints)
      } catch (err) {
        console.error("데이터 로딩/처리 오류:", err)
        setError(err instanceof Error ? err.message : "알 수 없는 오류")
      } finally {
        setLoading(false)
        // console.log("데이터 요청 및 처리 완료.");
      }
    }
    fetchDataAndProcess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const availableDates = useMemo(() => {
    const uniqueDates = [...new Set(allFetchedData.map((row) => row.date).filter(Boolean))]
    // console.log("계산된 availableDates:", uniqueDates);
    return uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b.date).getTime()) // 캘린더에 순서대로 표시되도록 오름차순 정렬
  }, [allFetchedData])

  // 데이터 로드 후 초기 날짜 선택
  useEffect(() => {
    if (!loading && availableDates.length > 0 && !currentSelectedDate) {
      // currentSelectedDate가 없을 때만 초기화
      // console.log("초기 선택 날짜 설정 시도. Available:", availableDates);
      setCurrentSelectedDate(availableDates[availableDates.length - 1]) // 가장 최근 날짜 (availableDates가 오름차순 정렬되어 있으므로 마지막 요소)
    }
  }, [loading, availableDates, currentSelectedDate])

  // 선택된 날짜 변경 시 게이지 데이터 업데이트
  useEffect(() => {
    if (currentSelectedDate && allFetchedData.length > 0 && signalNames.length > 0) {
      const signalsOnSelectedDateRow = allFetchedData.find((row) => row.date === currentSelectedDate)
      let sell = 0,
        buy = 0,
        hold = 0
      if (signalsOnSelectedDateRow) {
        signalNames.forEach((signalHeader) => {
          const value = ((signalsOnSelectedDateRow[signalHeader] as string) || "Hold").toLowerCase()
          if (value === "sell") sell++
          else if (value === "buy") buy++
          else hold++
        })
      }
      const total = sell + buy + hold
      setGaugeSignalCounts(total > 0 ? { sell, buy, hold, total } : null)
    } else {
      setGaugeSignalCounts(null)
    }
  }, [currentSelectedDate, allFetchedData, signalNames])

  const bubbleChartStats = useMemo(
    () => ({
      /* ... 이전과 동일 ... */
      totalDays: dateLabelsForBubble.length,
      totalSignals: signalNames.length,
      sellCount: bubbleChartData.filter((d) => d.value.toLowerCase() === "sell").length,
      buyCount: bubbleChartData.filter((d) => d.value.toLowerCase() === "buy").length,
      holdCount: bubbleChartData.filter((d) => d.value.toLowerCase() === "hold").length,
    }),
    [dateLabelsForBubble.length, signalNames.length, bubbleChartData],
  )

  const xAxisTicksForBubble = useMemo(() => {
    const ticks = Array.from({ length: dateLabelsForBubble.length }, (_, i) => i)
    console.log("X축 틱 값:", ticks) // 디버깅 로그
    return ticks
  }, [dateLabelsForBubble.length])

  const handleCalendarDateSelect = (selectedDate: string) => {
    setCurrentSelectedDate(selectedDate)
  }

  const handleBubbleClick = (bubbleData: FormattedChartDataPoint) => {
    // setSelectedBubble(bubbleData); // 필요시 주석 해제
    setCurrentSelectedDate(bubbleData.date)
  }

  if (loading)
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64">
          <p>데이터 로딩 중...</p>
        </CardContent>
      </Card>
    )
  if (error)
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-2">오류: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  if (allFetchedData.length === 0 && !loading)
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-64">
          <p>표시할 데이터가 없습니다.</p>
        </CardContent>
      </Card>
    )

  return (
    <div className="w-full space-y-6">
      {" "}
      {/* 스타일 유지 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        {" "}
        {/* 스타일 유지 */}
        <div className="h-full">
          {" "}
          {/* 스타일 유지 */}
          <DailySignalGaugeDisplay signalCounts={gaugeSignalCounts} selectedDate={currentSelectedDate} />
        </div>
        <div>
          <CalendarSelector
            onDateSelect={handleCalendarDateSelect}
            selectedDate={currentSelectedDate}
            availableDates={availableDates}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        {" "}
        {/* 스타일 유지 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>SellSmart Lamp</CardTitle>
              {/* Hydration 오류 수정: CardDescription 다음에 범례 div 배치 */}
              <CardDescription>최근 {RECENT_DAYS_COUNT}일간 투자 신호. X축: 날짜, Y축: 지표명.</CardDescription>
              <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: getSignalColor("buy") }}></div>{" "}
                  Buy
                </span>
                <span className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-1.5"
                    style={{ backgroundColor: getSignalColor("hold") }}
                  ></div>{" "}
                  Hold
                </span>
                <span className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-1.5"
                    style={{ backgroundColor: getSignalColor("sell") }}
                  ></div>{" "}
                  Sell
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex justify-center">
              {" "}
              {/* 스타일 유지 */}
              <div className="h-[500px] w-full max-w-full">
                {" "}
                {/* 스타일 유지 */}
                <ResponsiveContainer width="100%" height="100%" clas>
                  <ScatterChart margin={{ top: 15, right: 20, bottom: 0, left: 0 }}>
                    {" "}
                    {/* 스타일 유지 */}
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="날짜"
                      domain={[0, Math.max(0, dateLabelsForBubble.length - 1)]}
                      height={35}
                      axisLine={false}
                      tickLine={false}
                      ticks={Array.from({ length: dateLabelsForBubble.length }, (_, i) => i)}
                      tickFormatter={(value) => {
                        const index = Math.floor(value)
                        if (dateLabelsForBubble && index >= 0 && index < dateLabelsForBubble.length) {
                          const fullDate = dateLabelsForBubble[index]
                          return fullDate && fullDate.length >= 10 ? fullDate.slice(5) : fullDate
                        }
                        return ""
                      }}
                      interval={0}
                      tick={{ fontSize: 9, fill: "#666", textAnchor: "middle" }}
                      tickMargin={20}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="지표"
                      domain={[0, Math.max(0, signalNames.length - 1)]}
                      tickFormatter={(val: number) => signalNames[Math.floor(val)]?.replace(SIGNAL_SUFFIX, "") || ""}
                      tick={{ fontSize: 11 }}
                      width={90}
                      interval={0}
                      tickCount={signalNames.length || 1}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={20}
                    />{" "}
                    {/* 스타일 유지 */}
                    <ZAxis type="number" dataKey="z" range={[DEFAULT_BUBBLE_SIZE, DEFAULT_BUBBLE_SIZE]} />
                    <Tooltip
                      content={<CustomTooltipContent />}
                      wrapperStyle={{ zIndex: 100 }}
                      cursor={{ strokeDasharray: "3 3" }}
                    />
                    <Scatter
                      data={bubbleChartData}
                      onClick={(props: any) => {
                        if (props.payload) handleBubbleClick(props.payload as FormattedChartDataPoint)
                      }}
                      className="hover:opacity-90 transition-opacity"
                    >
                      {bubbleChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} strokeWidth={0} />
                      ))}{" "}
                      {/* 스타일 유지 */}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <StatsSummaryCard stats={bubbleChartStats} />
        </div>
      </div>
    </div>
  )
}
