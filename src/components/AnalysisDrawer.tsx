'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  X, Plus, AlertTriangle, TrendingUp, TrendingDown,
  Activity, Loader2, ChevronDown, ChevronRight, Info,
  ArrowLeft, Trash2, Check, FileText, Pencil,
} from 'lucide-react'
import { MetricGroup, MetricReading } from '@/types/bloodwork'

// ---------- Types ----------

interface FlaggedMetric {
  name: string
  value: string
  unit: string
  flag: 'High' | 'Low'
  reference_range: string
  explanation: string
  connections: string
  possible_causes: string[]
}

interface Pattern {
  title: string
  description: string
  related_metrics: string[]
  severity: 'low' | 'moderate' | 'notable'
}

interface SavedAnalysis {
  id: string
  summary: string
  flagged_metrics: FlaggedMetric[]
  patterns: Pattern[]
  recommendations: string[]
  generated_at: string
  user: string
  label: string
  source_files: string[]
  out_of_range_count: number
  total_metrics: number
}

type DrawerView = 'list' | 'new' | 'detail'

interface AnalysisDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentUser: string
  metrics: MetricGroup[]
  readings: MetricReading[]
}

// ---------- Helpers ----------

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function severityColor(severity: string) {
  switch (severity) {
    case 'notable': return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
    case 'moderate': return 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'
    default: return 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case 'notable': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    case 'moderate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
    default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  }
}

// ---------- Inline Rename ----------

function InlineRename({
  value,
  onSave,
  onCancel,
}: {
  value: string
  onSave: (newValue: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = text.trim()
      if (trimmed && trimmed !== value) onSave(trimmed)
      else onCancel()
    }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <input
      ref={inputRef}
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => {
        const trimmed = text.trim()
        if (trimmed && trimmed !== value) onSave(trimmed)
        else onCancel()
      }}
      onKeyDown={handleKeyDown}
      className="w-full text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={e => e.stopPropagation()}
    />
  )
}

// ---------- Analysis Detail ----------

function AnalysisDetail({
  analysis,
  onBack,
  onDelete,
  onRename,
}: {
  analysis: SavedAnalysis
  onBack: () => void
  onDelete: (id: string) => void
  onRename: (id: string, newLabel: string) => void
}) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)
  const [expandedPatterns, setExpandedPatterns] = useState<Set<number>>(new Set([0]))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)

  const togglePattern = (index: number) => {
    setExpandedPatterns(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Analyses
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsRenaming(true)}
            className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors"
            title="Rename this analysis"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
              <button
                onClick={() => onDelete(analysis.id)}
                className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
              title="Delete this analysis"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Label + meta */}
        <div>
          {isRenaming ? (
            <InlineRename
              value={analysis.label}
              onSave={(newLabel) => { onRename(analysis.id, newLabel); setIsRenaming(false) }}
              onCancel={() => setIsRenaming(false)}
            />
          ) : (
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {analysis.label}
            </h3>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatTimestamp(analysis.generated_at)}
            {' \u2022 '}{analysis.out_of_range_count} of {analysis.total_metrics} metrics flagged
          </p>
          {analysis.source_files && analysis.source_files.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {analysis.source_files.map(f => (
                <span key={f} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {analysis.summary}
          </p>
        </div>

        {/* Patterns */}
        {analysis.patterns && analysis.patterns.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Identified Patterns
            </h4>
            <div className="space-y-2">
              {analysis.patterns.map((pattern, i) => (
                <div key={i} className={`border rounded-xl overflow-hidden ${severityColor(pattern.severity)}`}>
                  <button
                    onClick={() => togglePattern(i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {expandedPatterns.has(i) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {pattern.title}
                      </span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityBadge(pattern.severity)}`}>
                      {pattern.severity}
                    </span>
                  </button>
                  {expandedPatterns.has(i) && (
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2 ml-6">
                        {pattern.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 ml-6">
                        {pattern.related_metrics.map(name => (
                          <span key={name} className="text-xs px-2 py-1 bg-white/60 dark:bg-gray-900/40 rounded-md text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flagged Metrics */}
        {analysis.flagged_metrics && analysis.flagged_metrics.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              {analysis.flagged_metrics.some(m => m.flag === 'High') ? (
                <TrendingUp className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-blue-500" />
              )}
              Out-of-Range Metrics ({analysis.flagged_metrics.length})
            </h4>
            <div className="space-y-2">
              {analysis.flagged_metrics.map((metric, i) => (
                <div
                  key={i}
                  className="relative group"
                  onMouseEnter={() => setHoveredMetric(metric.name)}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <div className={`p-4 rounded-xl border transition-colors ${
                    metric.flag === 'High'
                      ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                      : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                  } ${hoveredMetric === metric.name ? 'ring-2 ring-blue-400' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {metric.name}
                        </span>
                        <Info className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                          {metric.value} {metric.unit}
                        </span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          metric.flag === 'High'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>
                          {metric.flag}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Reference: {metric.reference_range}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {metric.explanation}
                    </p>
                    {hoveredMetric === metric.name && metric.connections && (
                      <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                          Connections to other metrics:
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          {metric.connections}
                        </p>
                        {metric.possible_causes && metric.possible_causes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {metric.possible_causes.map((cause, j) => (
                              <span key={j} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                {cause}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Recommendations
            </h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            This analysis is AI-generated and is not medical advice. Always consult with a healthcare provider for interpretation of lab results and medical decisions.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------- Main Drawer ----------

export function AnalysisDrawer({ isOpen, onClose, currentUser, metrics, readings }: AnalysisDrawerProps) {
  const [view, setView] = useState<DrawerView>('list')
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // File picker state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // Inline rename state for list items
  const [renamingId, setRenamingId] = useState<string | null>(null)

  // Derive available source files from readings
  const availableFiles = useMemo(() => {
    const fileMap = new Map<string, { filename: string; date: string; metricCount: number }>()
    for (const r of readings) {
      if (!fileMap.has(r.sourceFile)) {
        fileMap.set(r.sourceFile, { filename: r.sourceFile, date: r.date, metricCount: 0 })
      }
      const entry = fileMap.get(r.sourceFile)!
      entry.metricCount++
    }
    return Array.from(fileMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [readings])

  // Load saved analyses list
  const loadAnalyses = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analyze?user=${encodeURIComponent(currentUser)}`)
      if (res.ok) {
        const data = await res.json()
        setAnalyses(data.analyses || [])
      }
    } catch {
      setError('Failed to load analyses')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (isOpen) {
      loadAnalyses()
      setView('list')
      setSelectedAnalysis(null)
      setRenamingId(null)
    }
  }, [isOpen, loadAnalyses])

  // Start new analysis flow
  const startNew = () => {
    setSelectedFiles(new Set(availableFiles.map(f => f.filename)))
    setView('new')
    setError(null)
  }

  const toggleFile = (filename: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }

  // Generate analysis for selected files
  const generateAnalysis = useCallback(async () => {
    if (selectedFiles.size === 0) return
    setIsGenerating(true)
    setError(null)
    try {
      const selectedFileSet = selectedFiles
      const filteredMetrics = metrics
        .map(m => ({
          metricName: m.metricName,
          category: m.category,
          unit: m.unit,
          readings: m.readings
            .filter(r => selectedFileSet.has(r.sourceFile))
            .map(r => ({
              date: r.date,
              value: r.value,
              valueText: r.valueText,
              flag: r.flag,
              refLow: r.refLow,
              refHigh: r.refHigh,
              refText: r.refText,
            })),
        }))
        .filter(m => m.readings.length > 0)

      const sourceFileNames = Array.from(selectedFiles)

      const dates = availableFiles
        .filter(f => selectedFiles.has(f.filename))
        .map(f => formatDateLabel(f.date))
      const label = dates.length === 1
        ? dates[0]
        : dates.length === availableFiles.length
          ? 'All bloodwork'
          : `${dates[0]} + ${dates.length - 1} more`

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser,
          metrics: filteredMetrics,
          sourceFiles: sourceFileNames,
          label,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setSelectedAnalysis(data.analysis)
      setView('detail')
      loadAnalyses()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate analysis')
    } finally {
      setIsGenerating(false)
    }
  }, [currentUser, metrics, selectedFiles, availableFiles, loadAnalyses])

  // Rename an analysis
  const renameAnalysis = useCallback(async (id: string, newLabel: string) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, id, label: newLabel }),
      })
      if (res.ok) {
        const data = await res.json()
        // Update in list
        setAnalyses(prev => prev.map(a => a.id === id ? { ...a, label: newLabel } : a))
        // Update detail view if open
        if (selectedAnalysis?.id === id) {
          setSelectedAnalysis(data.analysis)
        }
      }
    } catch {
      setError('Failed to rename analysis')
    }
    setRenamingId(null)
  }, [currentUser, selectedAnalysis])

  // Delete an analysis
  const deleteAnalysis = useCallback(async (id: string) => {
    try {
      await fetch(`/api/analyze?user=${encodeURIComponent(currentUser)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setView('list')
      setSelectedAnalysis(null)
      loadAnalyses()
    } catch {
      setError('Failed to delete analysis')
    }
  }, [currentUser, loadAnalyses])

  // Open a specific analysis
  const openAnalysis = (a: SavedAnalysis) => {
    setSelectedAnalysis(a)
    setView('detail')
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Analysis
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Error banner */}
          {error && (
            <div className="px-6 py-3 flex-shrink-0">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}

          {/* ============ LIST VIEW ============ */}
          {!isLoading && view === 'list' && (
            <div className="flex-1 overflow-y-auto">
              {/* New analysis button */}
              <div className="p-6 pb-3">
                <button
                  onClick={startNew}
                  disabled={availableFiles.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  New Analysis
                </button>
              </div>

              {analyses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <Activity className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                    No saved analyses yet. Create one by selecting which bloodwork files to analyze.
                  </p>
                </div>
              )}

              {/* Saved analyses list */}
              <div className="px-6 pb-6 space-y-2">
                {analyses.map(a => (
                  <div
                    key={a.id}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => renamingId !== a.id && openAnalysis(a)}>
                        {renamingId === a.id ? (
                          <InlineRename
                            value={a.label}
                            onSave={(newLabel) => renameAnalysis(a.id, newLabel)}
                            onCancel={() => setRenamingId(null)}
                          />
                        ) : (
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {a.label}
                          </h4>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatTimestamp(a.generated_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                        {a.out_of_range_count > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-medium">
                            {a.out_of_range_count} flagged
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setRenamingId(a.id) }}
                          className="p-1 text-gray-300 dark:text-gray-600 hover:text-blue-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight
                          className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 cursor-pointer"
                          onClick={() => openAnalysis(a)}
                        />
                      </div>
                    </div>
                    {a.source_files && a.source_files.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 cursor-pointer" onClick={() => renamingId !== a.id && openAnalysis(a)}>
                        {a.source_files.slice(0, 4).map(f => (
                          <span key={f} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                            {f}
                          </span>
                        ))}
                        {a.source_files.length > 4 && (
                          <span className="text-xs text-gray-400">+{a.source_files.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ NEW ANALYSIS (File Picker) ============ */}
          {!isLoading && view === 'new' && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                <button
                  onClick={() => setView('list')}
                  className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <span className="text-xs text-gray-400">
                  {selectedFiles.size} of {availableFiles.length} selected
                </span>
              </div>

              <div className="p-6 flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  Select bloodwork files to analyze
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Choose which bloodwork results to include. The AI will analyze the selected data together.
                </p>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSelectedFiles(new Set(availableFiles.map(f => f.filename)))}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-xs text-gray-300">{'\u2022'}</span>
                  <button
                    onClick={() => setSelectedFiles(new Set())}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-2">
                  {availableFiles.map(file => {
                    const isSelected = selectedFiles.has(file.filename)
                    return (
                      <button
                        key={file.filename}
                        onClick={() => toggleFile(file.filename)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          isSelected
                            ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {formatDateLabel(file.date)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {file.filename} {'\u2022'} {file.metricCount} metrics
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                  onClick={generateAnalysis}
                  disabled={isGenerating || selectedFiles.size === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating analysis...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      Generate Analysis
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ============ DETAIL VIEW ============ */}
          {!isLoading && view === 'detail' && selectedAnalysis && (
            <AnalysisDetail
              analysis={selectedAnalysis}
              onBack={() => { setView('list'); loadAnalyses() }}
              onDelete={deleteAnalysis}
              onRename={renameAnalysis}
            />
          )}
        </div>
      </div>
    </>
  )
}
