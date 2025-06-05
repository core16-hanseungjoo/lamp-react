"use client"

import { useRef, useEffect } from "react"
import ReactECharts from "echarts-for-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export interface SignalCounts {
  sell: number
  buy: number
  hold: number
  total: number
}

interface DailySignalGaugeDisplayProps {
  signalCounts: SignalCounts | null
  selectedDate: string | null
}

export default function DailySignalGaugeDisplay({ signalCounts, selectedDate }: DailySignalGaugeDisplayProps) {
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (chartRef.current && signalCounts && signalCounts.total > 0) {
      const echartsInstance = chartRef.current.getEchartsInstance()
      const newOption = getEchartsOption(signalCounts, selectedDate)
      echartsInstance.setOption(newOption, {
        notMerge: false,
        lazyUpdate: false,
        silent: false,
      })
    }
  }, [signalCounts, selectedDate])

  const getEchartsOption = (currentSignalCounts: SignalCounts | null, currentDate: string | null) => {
    if (!currentDate || !currentSignalCounts || currentSignalCounts.total === 0) {
      return {}
    }

    const { sell, buy, hold, total } = currentSignalCounts

    let echartsNeedleValue = 50
    if (total > 0) {
      const buyRatio = buy / total
      const sellRatio = sell / total
      const sentimentScore = buyRatio - sellRatio
      echartsNeedleValue = sentimentScore * 50 + 50
    }
    echartsNeedleValue = Math.max(0, Math.min(100, echartsNeedleValue))

    const colorSegments =
      total > 0
        ? [
            { offset: sell / total, color: "#ef4444" },
            { offset: (sell + hold) / total, color: "#6b7280" },
            { offset: 1, color: "#22c55e" },
          ]
        : [{ offset: 1, color: "#d1d5db" }]

    return {
      animation: true,
      animationDuration: 1500,
      animationDurationUpdate: 1500,
      animationEasing: "cubicInOut",
      animationEasingUpdate: "cubicInOut",
      animationDelay: 0,
      animationDelayUpdate: 0,

      series: [
        {
          name: "일일 신호",
          type: "gauge",
          radius: "95%",
          center: ["50%", "70%"],
          min: 0,
          max: 100,
          splitNumber: 10,
          axisLine: {
            lineStyle: {
              width: 25,
              color: colorSegments.map((seg, index) => {
                const prevOffset = index > 0 ? colorSegments[index - 1].offset : 0
                let currentOffset = seg.offset
                if (currentOffset <= prevOffset) {
                  currentOffset = prevOffset + 0.0001
                }
                return [Math.min(1, currentOffset), seg.color]
              }),
            },
          },
          pointer: {
            value: echartsNeedleValue,
            width: 7,
            length: "70%",
            itemStyle: {
              color: "#1f2937",
              shadowBlur: 3,
              shadowColor: "rgba(0,0,0,0.3)",
              shadowOffsetX: 1,
              shadowOffsetY: 1,
            },
            animation: true,
            animationDuration: 1500,
            animationEasing: "cubicInOut",
          },
          anchor: {
            show: true,
            showAbove: false,
            size: 12,
            itemStyle: {
              color: "#1f2937",
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { show: false },
          data: [{ value: echartsNeedleValue }],
          startAngle: 190,
          endAngle: -10,
        },
      ],
    }
  }

  const currentOption = getEchartsOption(signalCounts, selectedDate)

  if (!selectedDate || !signalCounts || signalCounts.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Daily Navigator</CardTitle>
          <CardDescription>선택된 날짜: {selectedDate || "없음"}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[320px]">
          <p className="text-gray-500">
            {selectedDate ? "선택한 날짜의 신호 데이터가 없습니다." : "버블 차트에서 날짜를 선택하세요."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Daily Navigator</CardTitle>
        <CardDescription>선택된 날짜: {selectedDate}</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] w-full">
        <ReactECharts
          ref={chartRef}
          option={currentOption}
          style={{ height: "100%", width: "100%" }}
          notMerge={true}
          lazyUpdate={false}
          opts={{ renderer: "canvas" }}
        />
        <div className="flex justify-between text-sm text-gray-700 px-4 -mt-12 relative z-10">
          <span>Sell</span>
          <span>Hold</span>
          <span>Buy</span>
        </div>
      </CardContent>
    </Card>
  )
}
