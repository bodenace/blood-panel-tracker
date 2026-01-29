'use client'

import { MetricReading } from '@/types/bloodwork'
import { useMemo } from 'react'

interface SparklineProps {
  readings: MetricReading[]
  width?: number
  height?: number
}

export function Sparkline({ readings, width = 100, height = 24 }: SparklineProps) {
  const path = useMemo(() => {
    const values = readings
      .map(r => r.value)
      .filter((v): v is number => v !== null)

    if (values.length < 2) return null

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const padding = 2
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const points = values.map((v, i) => {
      const x = padding + (i / (values.length - 1)) * chartWidth
      const y = padding + chartHeight - ((v - min) / range) * chartHeight
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }, [readings, width, height])

  const latestReading = readings[readings.length - 1]
  const strokeColor = 
    latestReading?.flag === 'High' 
      ? '#ef4444' 
      : latestReading?.flag === 'Low' 
      ? '#3b82f6' 
      : '#10b981'

  if (!path) {
    return (
      <div 
        className="flex items-center justify-center text-gray-400 text-xs"
        style={{ width, height }}
      >
        -
      </div>
    )
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest point indicator */}
      {readings.length > 0 && readings[readings.length - 1].value !== null && (
        <circle
          cx={width - 2}
          cy={
            2 +
            (height - 4) -
            ((readings[readings.length - 1].value! -
              Math.min(...readings.filter(r => r.value !== null).map(r => r.value!))) /
              (Math.max(...readings.filter(r => r.value !== null).map(r => r.value!)) -
                Math.min(...readings.filter(r => r.value !== null).map(r => r.value!)) || 1)) *
              (height - 4)
          }
          r={2.5}
          fill={strokeColor}
        />
      )}
    </svg>
  )
}
