'use client'

import { useMemo, useState, Fragment } from 'react'
import { MetricGroup } from '@/types/bloodwork'
import { formatDate, formatValue, calculateChange, cn, getFlagColorClass, getFlagBgClass } from '@/lib/utils'
import { getMetricDescription } from '@/lib/metricDescriptions'
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { Sparkline } from './Sparkline'
import { TooltipCard } from './TooltipCard'

interface MetricTableProps {
  metrics: MetricGroup[]
  selectedMetrics: Set<string>
}

type SortField = 'name' | 'category' | 'value' | 'flag' | 'change'
type SortDirection = 'asc' | 'desc'

export function MetricTable({ metrics, selectedMetrics }: MetricTableProps) {
  const [sortField, setSortField] = useState<SortField>('category')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [hoveredMetric, setHoveredMetric] = useState<MetricGroup | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Filter to selected metrics only
  const selectedMetricsList = useMemo(() => {
    return metrics.filter(m => selectedMetrics.has(m.metricId))
  }, [metrics, selectedMetrics])

  // Sort metrics
  const sortedMetrics = useMemo(() => {
    const sorted = [...selectedMetricsList]
    
    sorted.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'name':
          comparison = a.metricName.localeCompare(b.metricName)
          break
        case 'category': {
          // Primary: category alphabetical, secondary: metric name alphabetical
          comparison = a.category.localeCompare(b.category)
          if (comparison === 0) {
            comparison = a.metricName.localeCompare(b.metricName)
          }
          break
        }
        case 'value': {
          const aVal = a.readings[a.readings.length - 1]?.value ?? -Infinity
          const bVal = b.readings[b.readings.length - 1]?.value ?? -Infinity
          comparison = (aVal as number) - (bVal as number)
          break
        }
        case 'flag': {
          const flagOrder = { High: 0, Low: 1, Normal: 2, null: 3 }
          const aFlag = a.readings[a.readings.length - 1]?.flag
          const bFlag = b.readings[b.readings.length - 1]?.flag
          comparison = (flagOrder[aFlag as keyof typeof flagOrder] ?? 3) - (flagOrder[bFlag as keyof typeof flagOrder] ?? 3)
          break
        }
        case 'change': {
          const aChange = calculateChange(a.readings).percentChange ?? 0
          const bChange = calculateChange(b.readings).percentChange ?? 0
          comparison = Math.abs(bChange) - Math.abs(aChange)
          break
        }
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }, [selectedMetricsList, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-500" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-500" />
    )
  }

  const handleMouseMove = (metric: MetricGroup, e: React.MouseEvent) => {
    const x = Math.min(e.clientX + 16, window.innerWidth - 310)
    const y = Math.min(e.clientY - 10, window.innerHeight - 320)
    setTooltipPosition({ x, y: Math.max(y, 8) })
    if (!hoveredMetric || hoveredMetric.metricId !== metric.metricId) {
      setHoveredMetric(metric)
    }
  }

  const handleMouseLeave = () => {
    setHoveredMetric(null)
  }

  // Build rows with category headers when sorted by category
  const isGroupedByCategory = sortField === 'category'

  if (selectedMetricsList.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No metrics selected</p>
          <p className="text-sm">Select metrics from the sidebar to view them here</p>
        </div>
      </div>
    )
  }

  // Build table rows, inserting category headers when grouped
  const renderRows = () => {
    let lastCategory = ''
    const rows: React.ReactNode[] = []

    sortedMetrics.forEach(metric => {
      const latestReading = metric.readings[metric.readings.length - 1]
      const { delta, percentChange } = calculateChange(metric.readings)

      // Insert category header row
      if (isGroupedByCategory && metric.category !== lastCategory) {
        lastCategory = metric.category
        const categoryCount = sortedMetrics.filter(m => m.category === metric.category).length
        rows.push(
          <tr
            key={`cat-${metric.category}`}
            className="bg-gray-100 dark:bg-gray-800/80"
          >
            <td colSpan={7} className="px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  {metric.category}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {categoryCount}
                </span>
              </div>
            </td>
          </tr>
        )
      }

      rows.push(
        <tr
          key={metric.metricId}
          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          onMouseMove={e => handleMouseMove(metric, e)}
          onMouseLeave={handleMouseLeave}
        >
          {/* Metric name */}
          <td className={cn('px-4 py-3', isGroupedByCategory && 'pl-8')}>
            <span className="font-medium text-gray-900 dark:text-white cursor-help inline-flex items-center gap-1.5 group/name">
              <span className="border-b border-dotted border-gray-300 dark:border-gray-600 group-hover/name:border-blue-400">
                {metric.metricName}
              </span>
              {getMetricDescription(metric.metricName) && (
                <Info className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover/name:text-blue-400 flex-shrink-0" />
              )}
            </span>
          </td>

          {/* Last value */}
          <td className={cn('px-4 py-3', getFlagColorClass(latestReading?.flag ?? null))}>
            {latestReading ? formatValue(latestReading) : '-'}
          </td>

          {/* Unit */}
          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
            {metric.unit || '-'}
          </td>

          {/* Reference range */}
          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
            {latestReading?.refText || '-'}
          </td>

          {/* Flag */}
          <td className="px-4 py-3">
            {latestReading?.flag ? (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  getFlagBgClass(latestReading.flag),
                  getFlagColorClass(latestReading.flag)
                )}
              >
                {latestReading.flag}
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </td>

          {/* Change */}
          <td className="px-4 py-3">
            {delta !== null && percentChange !== null ? (
              <div className="flex items-center gap-1">
                {delta > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : delta < 0 ? (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )}
                <span
                  className={
                    delta > 0
                      ? 'text-red-600 dark:text-red-400'
                      : delta < 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500'
                  }
                >
                  {delta > 0 ? '+' : ''}
                  {percentChange.toFixed(1)}%
                </span>
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </td>

          {/* Sparkline */}
          <td className="px-4 py-3">
            <Sparkline readings={metric.readings} />
          </td>
        </tr>
      )
    })

    return rows
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSort('category')}
                  className={cn(
                    'flex items-center gap-1 hover:text-gray-900 dark:hover:text-white',
                    sortField === 'category' && 'text-blue-600 dark:text-blue-400'
                  )}
                >
                  Category
                  <SortIcon field="category" />
                </button>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <button
                  onClick={() => toggleSort('name')}
                  className={cn(
                    'flex items-center gap-1 hover:text-gray-900 dark:hover:text-white',
                    sortField === 'name' && 'text-blue-600 dark:text-blue-400'
                  )}
                >
                  Name
                  <SortIcon field="name" />
                </button>
              </div>
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              <button
                onClick={() => toggleSort('value')}
                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
              >
                Last Value
                <SortIcon field="value" />
              </button>
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              Unit
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              Reference
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              <button
                onClick={() => toggleSort('flag')}
                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
              >
                Flag
                <SortIcon field="flag" />
              </button>
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              <button
                onClick={() => toggleSort('change')}
                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
              >
                Δ vs Prior
                <SortIcon field="change" />
              </button>
            </th>
            <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
              Trend
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {renderRows()}
        </tbody>
      </table>

      {/* Tooltip */}
      {hoveredMetric && (
        <TooltipCard
          metric={hoveredMetric}
          position={tooltipPosition}
        />
      )}
    </div>
  )
}
