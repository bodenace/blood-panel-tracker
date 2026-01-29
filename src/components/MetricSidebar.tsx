'use client'

import { useState, useMemo } from 'react'
import { MetricGroup } from '@/types/bloodwork'
import { groupByCategory, cn, getFlagColorClass } from '@/lib/utils'
import { getMetricDescription } from '@/lib/metricDescriptions'
import { Search, ChevronRight, ChevronDown, Check } from 'lucide-react'
import { TooltipCard } from './TooltipCard'

interface MetricSidebarProps {
  metrics: MetricGroup[]
  selectedMetrics: Set<string>
  onToggleMetric: (metricId: string) => void
  onSelectAll: (metricIds: string[]) => void
  onClearSelection: () => void
}

export function MetricSidebar({
  metrics,
  selectedMetrics,
  onToggleMetric,
  onSelectAll,
  onClearSelection,
}: MetricSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [hoveredMetric, setHoveredMetric] = useState<MetricGroup | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Filter metrics by search query
  const filteredMetrics = useMemo(() => {
    if (!searchQuery.trim()) return metrics
    const query = searchQuery.toLowerCase()
    return metrics.filter(
      m =>
        m.metricName.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query)
    )
  }, [metrics, searchQuery])

  // Group by category
  const categorizedMetrics = useMemo(
    () => groupByCategory(filteredMetrics),
    [filteredMetrics]
  )

  // Auto-expand categories when searching
  useMemo(() => {
    if (searchQuery.trim()) {
      setExpandedCategories(new Set(categorizedMetrics.keys()))
    }
  }, [searchQuery, categorizedMetrics])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleMouseEnter = (metric: MetricGroup, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({ x: rect.right + 8, y: rect.top })
    setHoveredMetric(metric)
  }

  const handleMouseLeave = () => {
    setHoveredMetric(null)
  }

  const allMetricIds = metrics.map(m => m.metricId)

  return (
    <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Metrics
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search metrics..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        {/* Selection controls */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSelectAll(allMetricIds)}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={onClearSelection}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Selection count */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {selectedMetrics.size} of {metrics.length} selected
        </p>
      </div>

      {/* Metric list */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(categorizedMetrics.entries()).map(([category, categoryMetrics]) => (
          <div key={category} className="border-b border-gray-100 dark:border-gray-800">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span>{category}</span>
              <span className="ml-auto text-xs text-gray-400">
                {categoryMetrics.length}
              </span>
            </button>

            {/* Category metrics */}
            {expandedCategories.has(category) && (
              <div className="pb-1">
                {categoryMetrics.map(metric => {
                  const latestReading = metric.readings[metric.readings.length - 1]
                  const isSelected = selectedMetrics.has(metric.metricId)

                  return (
                    <button
                      key={metric.metricId}
                      onClick={() => onToggleMetric(metric.metricId)}
                      onMouseEnter={e => handleMouseEnter(metric, e)}
                      onMouseLeave={handleMouseLeave}
                      className={cn(
                        'w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                        isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Metric name and flag */}
                      <div className="flex-1 min-w-0">
                        <span className="truncate block text-gray-900 dark:text-white">
                          {metric.metricName}
                        </span>
                      </div>

                      {/* Flag indicator */}
                      {latestReading?.flag && latestReading.flag !== 'Normal' && (
                        <span
                          className={cn(
                            'text-xs font-medium px-1.5 py-0.5 rounded',
                            latestReading.flag === 'High'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          )}
                        >
                          {latestReading.flag}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {filteredMetrics.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No metrics found
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hoveredMetric && (
        <TooltipCard
          metric={hoveredMetric}
          position={tooltipPosition}
        />
      )}
    </aside>
  )
}
