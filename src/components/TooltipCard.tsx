'use client'

import { MetricGroup } from '@/types/bloodwork'
import { getMetricDescription } from '@/lib/metricDescriptions'
import { formatDate, formatValue, calculateChange, getFlagColorClass } from '@/lib/utils'

interface TooltipCardProps {
  metric: MetricGroup
  position: { x: number; y: number }
}

export function TooltipCard({ metric, position }: TooltipCardProps) {
  const description = getMetricDescription(metric.metricName)
  const latestReading = metric.readings[metric.readings.length - 1]
  const { delta, percentChange } = calculateChange(metric.readings)

  // Keep tooltip within viewport
  const adjustedY = Math.min(position.y, window.innerHeight - 300)

  return (
    <div
      className="fixed z-50 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 pointer-events-none"
      style={{
        left: position.x,
        top: adjustedY,
      }}
    >
      {/* Metric name */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
        {metric.metricName}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
          {description}
        </p>
      )}

      {/* Details grid */}
      <div className="space-y-2 text-xs">
        {/* Latest value */}
        {latestReading && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Last Value</span>
            <span className={getFlagColorClass(latestReading.flag)}>
              {formatValue(latestReading)} {latestReading.unit}
            </span>
          </div>
        )}

        {/* Reference range */}
        {latestReading?.refText && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Reference</span>
            <span className="text-gray-900 dark:text-white">
              {latestReading.refText} {latestReading.unit}
            </span>
          </div>
        )}

        {/* Change from previous */}
        {delta !== null && percentChange !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Δ vs Prior</span>
            <span
              className={
                delta > 0
                  ? 'text-red-600 dark:text-red-400'
                  : delta < 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              }
            >
              {delta > 0 ? '+' : ''}
              {delta.toFixed(2)} ({percentChange > 0 ? '+' : ''}
              {percentChange.toFixed(1)}%)
            </span>
          </div>
        )}

        {/* Collection date */}
        {latestReading && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Collected</span>
            <span className="text-gray-900 dark:text-white">
              {formatDate(latestReading.date)}
            </span>
          </div>
        )}

        {/* Number of readings */}
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Data Points</span>
          <span className="text-gray-900 dark:text-white">
            {metric.readings.length}
          </span>
        </div>
      </div>
    </div>
  )
}
