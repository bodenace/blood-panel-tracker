'use client'

import { useState, useMemo } from 'react'
import { MetricGroup } from '@/types/bloodwork'
import { formatDate, normalizeValue } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface OverlayChartProps {
  metrics: MetricGroup[]
  selectedMetrics: Set<string>
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

export function OverlayChart({ metrics, selectedMetrics }: OverlayChartProps) {
  const [mode, setMode] = useState<'raw' | 'normalized'>('normalized')
  const [showWarning, setShowWarning] = useState(false)

  // Get selected metrics
  const selectedMetricsList = useMemo(() => {
    return metrics.filter(m => selectedMetrics.has(m.metricId))
  }, [metrics, selectedMetrics])

  // Check if units match for raw mode
  const unitsMatch = useMemo(() => {
    if (selectedMetricsList.length < 2) return true
    const firstUnit = selectedMetricsList[0].unit
    return selectedMetricsList.every(m => m.unit === firstUnit)
  }, [selectedMetricsList])

  // Warn if more than 5 metrics
  const tooManyMetrics = selectedMetricsList.length > 5

  // Get all unique dates across selected metrics
  const allDates = useMemo(() => {
    const dates = new Set<string>()
    selectedMetricsList.forEach(m => {
      m.readings.forEach(r => dates.add(r.date))
    })
    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  }, [selectedMetricsList])

  // Prepare chart data
  const chartData = useMemo(() => {
    if (mode === 'raw' && !unitsMatch) return []

    return allDates.map(date => {
      const point: Record<string, any> = {
        date,
        dateFormatted: formatDate(date),
      }

      selectedMetricsList.forEach(metric => {
        const reading = metric.readings.find(r => r.date === date)
        if (reading?.value !== null && reading?.value !== undefined) {
          if (mode === 'normalized') {
            // Normalize to 0-1 range
            const values = metric.readings
              .map(r => r.value)
              .filter((v): v is number => v !== null)
            const min = Math.min(...values)
            const max = Math.max(...values)
            point[metric.metricId] = normalizeValue(reading.value, min, max)
            point[`${metric.metricId}_raw`] = reading.value
          } else {
            point[metric.metricId] = reading.value
          }
          point[`${metric.metricId}_unit`] = metric.unit
        }
      })

      return point
    })
  }, [allDates, selectedMetricsList, mode, unitsMatch])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {payload[0]?.payload?.dateFormatted}
          </p>
          {payload.map((entry: any, index: number) => {
            const metric = selectedMetricsList.find(m => m.metricId === entry.dataKey)
            const rawValue = entry.payload[`${entry.dataKey}_raw`]
            const unit = entry.payload[`${entry.dataKey}_unit`]
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {metric?.metricName}: {rawValue ?? entry.value.toFixed(2)} {mode === 'normalized' ? `(${unit})` : unit}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  if (selectedMetricsList.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No metrics selected</p>
          <p className="text-sm">Select multiple metrics from the sidebar to compare them</p>
        </div>
      </div>
    )
  }

  if (selectedMetricsList.length === 1) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Select more metrics</p>
          <p className="text-sm">Select at least 2 metrics to overlay and compare</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Overlay Comparison
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Comparing {selectedMetricsList.length} metrics
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Mode:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setMode('normalized')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'normalized'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Normalized
            </button>
            <button
              onClick={() => setMode('raw')}
              disabled={!unitsMatch}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'raw'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${!unitsMatch ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!unitsMatch ? 'Units must match to use raw mode' : ''}
            >
              Raw
            </button>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {tooManyMetrics && !showWarning && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You have selected more than 5 metrics. This may make the chart difficult to read.
          </p>
          <button
            onClick={() => setShowWarning(true)}
            className="text-sm font-medium text-yellow-700 dark:text-yellow-300 underline mt-1"
          >
            Show anyway
          </button>
        </div>
      )}

      {!unitsMatch && mode === 'raw' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Selected metrics have different units. Using normalized mode for comparison.
          </p>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {(tooManyMetrics && !showWarning) ? null : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis
                domain={mode === 'normalized' ? [0, 1] : ['auto', 'auto']}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => mode === 'normalized' ? value.toFixed(1) : value.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {selectedMetricsList.map((metric, index) => (
                <Line
                  key={metric.metricId}
                  type="monotone"
                  dataKey={metric.metricId}
                  name={metric.metricName}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend with metric details */}
      <div className="mt-4 flex flex-wrap gap-3">
        {selectedMetricsList.map((metric, index) => {
          const latestReading = metric.readings[metric.readings.length - 1]
          return (
            <div
              key={metric.metricId}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {metric.metricName}
              </span>
              {latestReading && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({latestReading.value} {metric.unit})
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
