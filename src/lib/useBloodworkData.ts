'use client'

import { useState, useEffect, useMemo } from 'react'
import { MetricReading, MetricGroup } from '@/types/bloodwork'
import { parseAllBloodworkFiles } from './parser'
import { groupReadingsByMetric } from './utils'

// Import bloodwork data statically
import data0103 from '../data/01-03-24.json'
import data0928 from '../data/09-28-24.json'
import data1008 from '../data/10-08-25.json'
import data0127 from '../data/01-27-26.json'

export function useBloodworkData() {
  const [readings, setReadings] = useState<MetricReading[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const files = [
      { data: data0103, filename: '01-03-24.json' },
      { data: data0928, filename: '09-28-24.json' },
      { data: data1008, filename: '10-08-25.json' },
      { data: data0127, filename: '01-27-26.json' },
    ]

    const { readings: parsed, errors: parseErrors } = parseAllBloodworkFiles(files)
    setReadings(parsed)
    setErrors(parseErrors)
    setIsLoading(false)
  }, [])

  const metrics = useMemo(() => groupReadingsByMetric(readings), [readings])

  const dates = useMemo(() => {
    const uniqueDates = [...new Set(readings.map(r => r.date))]
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

  const filterReadings = (readings: MetricReading[]): MetricReading[] => {
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
  }

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
