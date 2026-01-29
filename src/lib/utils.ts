import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { MetricReading, MetricGroup } from '@/types/bloodwork'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Group readings by metric
export function groupReadingsByMetric(readings: MetricReading[]): MetricGroup[] {
  const groups = new Map<string, MetricGroup>()

  for (const reading of readings) {
    if (!groups.has(reading.metricId)) {
      groups.set(reading.metricId, {
        metricId: reading.metricId,
        metricName: reading.metricName,
        category: reading.category,
        unit: reading.unit,
        readings: [],
      })
    }
    groups.get(reading.metricId)!.readings.push(reading)
  }

  // Sort readings within each group by date
  for (const group of groups.values()) {
    group.readings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  return Array.from(groups.values()).sort((a, b) => 
    a.metricName.localeCompare(b.metricName)
  )
}

// Group metrics by category
export function groupByCategory(metrics: MetricGroup[]): Map<string, MetricGroup[]> {
  const categories = new Map<string, MetricGroup[]>()

  for (const metric of metrics) {
    if (!categories.has(metric.category)) {
      categories.set(metric.category, [])
    }
    categories.get(metric.category)!.push(metric)
  }

  // Sort categories alphabetically
  return new Map([...categories.entries()].sort((a, b) => a[0].localeCompare(b[0])))
}

// Calculate change between readings
export function calculateChange(readings: MetricReading[]): {
  delta: number | null
  percentChange: number | null
} {
  if (readings.length < 2) return { delta: null, percentChange: null }

  const latest = readings[readings.length - 1]
  const previous = readings[readings.length - 2]

  if (latest.value === null || previous.value === null || previous.value === 0) {
    return { delta: null, percentChange: null }
  }

  const delta = latest.value - previous.value
  const percentChange = (delta / previous.value) * 100

  return { delta, percentChange }
}

// Format date for display
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Format value with comparator
export function formatValue(reading: MetricReading): string {
  if (reading.comparator && reading.value !== null) {
    return `${reading.comparator}${reading.value}`
  }
  if (reading.value !== null) {
    return reading.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return reading.valueText
}

// Export metrics to CSV
export function exportToCSV(metrics: MetricGroup[], selectedIds: Set<string>): string {
  const headers = ['Metric', 'Date', 'Value', 'Unit', 'Reference Range', 'Flag']
  const rows: string[][] = [headers]

  for (const metric of metrics) {
    if (!selectedIds.has(metric.metricId)) continue

    for (const reading of metric.readings) {
      rows.push([
        reading.metricName,
        reading.date,
        formatValue(reading),
        reading.unit,
        reading.refText || '',
        reading.flag || '',
      ])
    }
  }

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
}

// Normalize value to 0-1 range for overlay chart
export function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return (value - min) / (max - min)
}

// Get flag color class
export function getFlagColorClass(flag: 'Low' | 'Normal' | 'High' | null): string {
  switch (flag) {
    case 'High':
      return 'text-red-600 dark:text-red-400'
    case 'Low':
      return 'text-blue-600 dark:text-blue-400'
    case 'Normal':
      return 'text-green-600 dark:text-green-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

export function getFlagBgClass(flag: 'Low' | 'Normal' | 'High' | null): string {
  switch (flag) {
    case 'High':
      return 'bg-red-100 dark:bg-red-900/30'
    case 'Low':
      return 'bg-blue-100 dark:bg-blue-900/30'
    case 'Normal':
      return 'bg-green-100 dark:bg-green-900/30'
    default:
      return 'bg-gray-100 dark:bg-gray-800'
  }
}
