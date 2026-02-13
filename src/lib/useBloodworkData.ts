'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { MetricReading, MetricGroup } from '@/types/bloodwork'
import { parseAllBloodworkFiles } from './parser'
import { groupReadingsByMetric } from './utils'
import { userData, BloodworkFile } from '@/data'

/**
 * Load bloodwork data for a user.
 * - For users with static imports (boden), uses the bundled data.
 * - Also fetches from /api/load-data to pick up dynamically uploaded files.
 * - refreshKey can be incremented to force a re-fetch (e.g. after upload or delete).
 */
export function useBloodworkData(userId: string, refreshKey: number = 0) {
  const [readings, setReadings] = useState<MetricReading[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)

      // Start with static imports for this user
      const staticFiles = userData[userId] || []
      const staticFilenames = new Set(staticFiles.map(f => f.filename))

      // Also fetch dynamic files from the API (catches uploads/deletes without rebuild)
      let dynamicFiles: BloodworkFile[] = []
      try {
        const res = await fetch(`/api/load-data?user=${encodeURIComponent(userId)}`)
        if (res.ok) {
          const json = await res.json()
          // Only include files that aren't already in static imports (avoid duplicates)
          dynamicFiles = (json.files || []).filter(
            (f: BloodworkFile) => !staticFilenames.has(f.filename)
          )
        }
      } catch {
        // API not available (e.g. static export) -- static files only
      }

      const allFiles = [...staticFiles, ...dynamicFiles]

      if (cancelled) return

      if (allFiles.length === 0) {
        setReadings([])
        setErrors([])
        setIsLoading(false)
        return
      }

      const { readings: parsed, errors: parseErrors } = parseAllBloodworkFiles(allFiles)

      if (cancelled) return

      setReadings(parsed)
      setErrors(parseErrors)
      setIsLoading(false)
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [userId, refreshKey])

  const metrics = useMemo(() => groupReadingsByMetric(readings), [readings])

  const dates = useMemo(() => {
    const uniqueDates = Array.from(new Set(readings.map(r => r.date)))
    return uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  }, [readings])

  return {
    readings,
    metrics,
    dates,
    errors,
    isLoading,
  }
}

export function useMetricSelection() {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set())

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => {
      const next = new Set(prev)
      if (next.has(metricId)) {
        next.delete(metricId)
      } else {
        next.add(metricId)
      }
      return next
    })
  }

  const selectAll = (metricIds: string[]) => {
    setSelectedMetrics(new Set(metricIds))
  }

  const clearSelection = () => {
    setSelectedMetrics(new Set())
  }

  const isSelected = (metricId: string) => selectedMetrics.has(metricId)

  return {
    selectedMetrics,
    toggleMetric,
    selectAll,
    clearSelection,
    isSelected,
  }
}

export function useDateFilter(availableDates: string[]) {
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [showMostRecentOnly, setShowMostRecentOnly] = useState(false)

  const filterReadings = useCallback((readings: MetricReading[]): MetricReading[] => {
    let filtered = readings

    if (showMostRecentOnly && availableDates.length > 0) {
      const mostRecent = availableDates[availableDates.length - 1]
      filtered = filtered.filter(r => r.date === mostRecent)
    } else {
      if (startDate) {
        filtered = filtered.filter(r => r.date >= startDate)
      }
      if (endDate) {
        filtered = filtered.filter(r => r.date <= endDate)
      }
    }

    return filtered
  }, [availableDates, showMostRecentOnly, startDate, endDate])

  return {
    startDate,
    endDate,
    showMostRecentOnly,
    setStartDate,
    setEndDate,
    setShowMostRecentOnly,
    filterReadings,
  }
}
