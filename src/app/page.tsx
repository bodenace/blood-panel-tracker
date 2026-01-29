'use client'

import { useState, useEffect, useMemo } from 'react'
import { useBloodworkData, useMetricSelection, useDateFilter } from '@/lib/useBloodworkData'
import { groupReadingsByMetric, exportToCSV } from '@/lib/utils'
import { MetricSidebar } from '@/components/MetricSidebar'
import { MetricTable } from '@/components/MetricTable'
import { TrendChart } from '@/components/TrendChart'
import { OverlayChart } from '@/components/OverlayChart'
import { ErrorPanel } from '@/components/ErrorPanel'
import { Header } from '@/components/Header'
import { LayoutList, TrendingUp, Layers } from 'lucide-react'

type ViewTab = 'list' | 'trend' | 'overlay'

export default function Home() {
  const { readings, metrics, dates, errors, isLoading } = useBloodworkData()
  const {
    selectedMetrics,
    toggleMetric,
    selectAll,
    clearSelection,
    isSelected,
  } = useMetricSelection()
  const {
    startDate,
    endDate,
    showMostRecentOnly,
    setStartDate,
    setEndDate,
    setShowMostRecentOnly,
    filterReadings,
  } = useDateFilter(dates)

  const [activeTab, setActiveTab] = useState<ViewTab>('list')
  const [darkMode, setDarkMode] = useState(false)
  const [dismissedErrors, setDismissedErrors] = useState(false)

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Check system preference on mount
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true)
    }
  }, [])

  // Filter readings by date
  const filteredReadings = useMemo(
    () => filterReadings(readings),
    [readings, filterReadings]
  )

  // Re-group filtered readings
  const filteredMetrics = useMemo(
    () => groupReadingsByMetric(filteredReadings),
    [filteredReadings]
  )

  // Handle CSV export
  const handleExport = () => {
    const csv = exportToCSV(filteredMetrics, selectedMetrics)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bloodwork-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const tabs = [
    { id: 'list' as const, label: 'List View', icon: LayoutList },
    { id: 'trend' as const, label: 'Trend View', icon: TrendingUp },
    { id: 'overlay' as const, label: 'Overlay View', icon: Layers },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading bloodwork data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onExport={handleExport}
        dates={dates}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        showMostRecentOnly={showMostRecentOnly}
        onToggleMostRecent={() => setShowMostRecentOnly(!showMostRecentOnly)}
      />

      {/* Error panel */}
      {errors.length > 0 && !dismissedErrors && (
        <div className="px-6 pt-4">
          <ErrorPanel errors={errors} onDismiss={() => setDismissedErrors(true)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <MetricSidebar
          metrics={filteredMetrics}
          selectedMetrics={selectedMetrics}
          onToggleMetric={toggleMetric}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
        />

        {/* Center visualization */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6">
            <div className="flex gap-1">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
            {activeTab === 'list' && (
              <MetricTable
                metrics={filteredMetrics}
                selectedMetrics={selectedMetrics}
              />
            )}
            {activeTab === 'trend' && (
              <TrendChart
                metrics={filteredMetrics}
                selectedMetrics={selectedMetrics}
              />
            )}
            {activeTab === 'overlay' && (
              <OverlayChart
                metrics={filteredMetrics}
                selectedMetrics={selectedMetrics}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
