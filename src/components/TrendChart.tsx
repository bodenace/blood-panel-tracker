'use client'

import { MetricGroup } from '@/types/bloodwork'
import { formatDate, formatValue, getFlagColorClass } from '@/lib/utils'
import { getMetricDescription } from '@/lib/metricDescriptions'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

interface TrendChartProps {
  metrics: MetricGroup[]
  selectedMetrics: Set<string>
}

export function TrendChart({ metrics, selectedMetrics }: TrendChartProps) {
  // Get the first selected metric for single metric trend view
  const selectedMetric = metrics.find(m => selectedMetrics.has(m.metricId))

  if (!selectedMetric) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No metric selected</p>
          <p className="text-sm">Select a metric from the sidebar to view its trend</p>
        </div>
      </div>
    )
  }

  const description = getMetricDescription(selectedMetric.metricName)
  const latestReading = selectedMetric.readings[selectedMetric.readings.length - 1]

  // Prepare chart data
  const chartData = selectedMetric.readings
    .filter(r => r.value !== null)
    .map(r => ({
      date: r.date,
      dateFormatted: formatDate(r.date),
      value: r.value,
      flag: r.flag,
    }))

  // Get reference range
  const refLow = latestReading?.refLow
  const refHigh = latestReading?.refHigh

  // Calculate Y axis domain with padding
  const values = chartData.map(d => d.value as number)
  const allValues = [...values]
  if (refLow !== undefined) allValues.push(refLow)
  if (refHigh !== undefined) allValues.push(refHigh)
  
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const padding = (maxValue - minValue) * 0.1 || maxValue * 0.1 || 1
  const yMin = Math.max(0, minValue - padding)
  const yMax = maxValue + padding

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {data.dateFormatted}
          </p>
          <p className={cn('text-sm', getFlagColorClass(data.flag))}>
            {data.value} {selectedMetric.unit}
          </p>
          {data.flag && data.flag !== 'Normal' && (
            <p className={cn('text-xs font-medium', getFlagColorClass(data.flag))}>
              {data.flag}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {selectedMetric.metricName}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
        <div className="flex gap-4 mt-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Unit: <span className="font-medium text-gray-900 dark:text-white">{selectedMetric.unit || '-'}</span>
          </span>
          {latestReading?.refText && (
            <span className="text-gray-600 dark:text-gray-400">
              Reference: <span className="font-medium text-gray-900 dark:text-white">{latestReading.refText}</span>
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {chartData.length < 2 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p className="text-sm">Not enough data points to show trend (need at least 2)</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              
              {/* Reference range area */}
              {refLow !== undefined && refHigh !== undefined && (
                <ReferenceArea
                  y1={refLow}
                  y2={refHigh}
                  fill="#10b981"
                  fillOpacity={0.1}
                />
              )}
              
              {/* Reference lines */}
              {refLow !== undefined && (
                <ReferenceLine
                  y={refLow}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  label={{ value: 'Low', position: 'right', fill: '#10b981', fontSize: 12 }}
                />
              )}
              {refHigh !== undefined && (
                <ReferenceLine
                  y={refHigh}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  label={{ value: 'High', position: 'right', fill: '#10b981', fontSize: 12 }}
                />
              )}

              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  const color =
                    payload.flag === 'High'
                      ? '#ef4444'
                      : payload.flag === 'Low'
                      ? '#3b82f6'
                      : '#10b981'
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  )
                }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}
