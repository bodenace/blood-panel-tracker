'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Activity, Loader2, Check, FileText,
  Sun, Moon, BarChart3, MessageSquareText, ArrowRight,
} from 'lucide-react'
import { useBloodworkData } from '@/lib/useBloodworkData'
import { groupReadingsByMetric } from '@/lib/utils'
import { userNames, userIds } from '@/data'
import { VPSession, VPView } from '@/types/virtual-provider'
import { VPSessionList } from '@/components/virtual-provider/VPSessionList'
import { VPAnalysisView } from '@/components/virtual-provider/VPAnalysisView'
import { VPFollowUpQuestions } from '@/components/virtual-provider/VPFollowUpQuestions'
import { VPRecommendations } from '@/components/virtual-provider/VPRecommendations'
import { VPDashboard } from '@/components/virtual-provider/VPDashboard'
import { VPTracking } from '@/components/virtual-provider/VPTracking'

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function VirtualProviderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    }>
      <VirtualProviderContent />
    </Suspense>
  )
}

function VirtualProviderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUser, setCurrentUser] = useState<string>(searchParams.get('user') || 'boden')
  const [view, setView] = useState<VPView>('sessions')
  const [sessions, setSessions] = useState<VPSession[]>([])
  const [currentSession, setCurrentSession] = useState<VPSession | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [darkMode, setDarkMode] = useState(false)
  const [generatingStep, setGeneratingStep] = useState('')
  const [initialPrompt, setInitialPrompt] = useState('')

  const { readings, metrics } = useBloodworkData(currentUser, 0)

  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true)
    }
  }, [])

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

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

  // Load sessions
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const res = await fetch(`/api/analyze?user=${encodeURIComponent(currentUser)}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch {
      setError('Failed to load sessions')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [currentUser])

  useEffect(() => {
    loadSessions()
    setView('sessions')
    setCurrentSession(null)
  }, [loadSessions])

  // Start new consultation flow
  const startNew = () => {
    setInitialPrompt('')
    setSelectedFiles(new Set(availableFiles.map(f => f.filename)))
    setView('new-choice')
    setError(null)
  }

  const startWithContext = () => {
    setView('new-context')
  }

  const proceedToFilePicker = () => {
    setSelectedFiles(new Set(availableFiles.map(f => f.filename)))
    setView('new')
  }

  const toggleFile = (filename: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filename)) next.delete(filename)
      else next.add(filename)
      return next
    })
  }

  // Generate analysis (3-agent pipeline)
  const generateAnalysis = useCallback(async () => {
    if (selectedFiles.size === 0) return
    setIsGenerating(true)
    setError(null)
    setView('analyzing')

    const steps = [
      'Analyzing your bloodwork...',
      'Clinical analyst reviewing metrics...',
      'Senior reviewer verifying accuracy...',
      'Virtual provider synthesizing findings...',
    ]
    let stepIndex = 0
    setGeneratingStep(steps[0])

    const stepInterval = setInterval(() => {
      stepIndex++
      if (stepIndex < steps.length) {
        setGeneratingStep(steps[stepIndex])
      }
    }, 8000)

    try {
      const filteredMetrics = metrics
        .map(m => ({
          metricName: m.metricName,
          category: m.category,
          unit: m.unit,
          readings: m.readings
            .filter(r => selectedFiles.has(r.sourceFile))
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

      const dates = availableFiles
        .filter(f => selectedFiles.has(f.filename))
        .map(f => formatDateLabel(f.date))
      const label = dates.length === 1
        ? dates[0]
        : dates.length === availableFiles.length
          ? 'Full panel review'
          : `${dates[0]} + ${dates.length - 1} more`

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser,
          metrics: filteredMetrics,
          sourceFiles: Array.from(selectedFiles),
          label,
          initialPrompt: initialPrompt || undefined,
        }),
      })

      clearInterval(stepInterval)

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setCurrentSession(data.session)
      setView('follow-up')
      loadSessions()
    } catch (e) {
      clearInterval(stepInterval)
      setError(e instanceof Error ? e.message : 'Failed to generate analysis')
      setView('new')
    } finally {
      setIsGenerating(false)
    }
  }, [currentUser, metrics, selectedFiles, availableFiles, loadSessions, initialPrompt])

  // Open existing session
  const openSession = (session: VPSession) => {
    setCurrentSession(session)
    if (session.status === 'completed' && session.recommendations) {
      setView('dashboard')
    } else {
      setView('follow-up')
    }
  }

  // Delete session
  const deleteSession = useCallback(async (id: string) => {
    try {
      await fetch(`/api/analyze?user=${encodeURIComponent(currentUser)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      loadSessions()
      if (currentSession?.id === id) {
        setCurrentSession(null)
        setView('sessions')
      }
    } catch {
      setError('Failed to delete session')
    }
  }, [currentUser, currentSession, loadSessions])

  // Rename session
  const renameSession = useCallback(async (id: string, label: string) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, id, label }),
      })
      if (res.ok) {
        loadSessions()
        if (currentSession?.id === id) {
          setCurrentSession(prev => prev ? { ...prev, label } : null)
        }
      }
    } catch {
      setError('Failed to rename session')
    }
  }, [currentUser, currentSession, loadSessions])

  // Submit follow-up answers
  const submitAnswers = useCallback(async (answers: Record<string, string>) => {
    if (!currentSession) return
    setIsSubmittingAnswers(true)
    setError(null)
    try {
      const res = await fetch('/api/virtual-provider/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser,
          sessionId: currentSession.id,
          answers,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate recommendations')

      setCurrentSession(data.session)
      setView('recommendations')
      loadSessions()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit answers')
    } finally {
      setIsSubmittingAnswers(false)
    }
  }, [currentUser, currentSession, loadSessions])

  // Update recommendation status
  const updateRecommendationStatus = useCallback(async (
    recommendationId: string,
    category: string,
    status: 'new' | 'following' | 'dismissed'
  ) => {
    if (!currentSession) return
    try {
      const res = await fetch('/api/virtual-provider/tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser,
          sessionId: currentSession.id,
          recommendationId,
          category,
          status,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setCurrentSession(data.session)
      }
    } catch {
      setError('Failed to update recommendation')
    }
  }, [currentUser, currentSession])

  // View title and back behavior
  const viewTitle: Record<VPView, string> = {
    sessions: 'Virtual Provider',
    'new-choice': 'New Consultation',
    'new-context': 'Provide Context',
    new: 'Select Bloodwork',
    analyzing: 'Analyzing...',
    analysis: currentSession?.label || 'Analysis',
    'follow-up': 'A Few Questions',
    recommendations: currentSession?.label || 'Recommendations',
    dashboard: currentSession?.label || 'Dashboard',
    tracking: 'Tracking',
  }

  const handleBack = () => {
    switch (view) {
      case 'sessions':
        router.push('/')
        break
      case 'new-choice':
      case 'tracking':
        setView('sessions')
        break
      case 'new-context':
        setView('new-choice')
        break
      case 'new':
        setView('new-choice')
        break
      case 'analysis':
        setView('sessions')
        break
      case 'follow-up':
        setView('sessions')
        break
      case 'recommendations':
        setView('dashboard')
        break
      case 'dashboard':
        setView('sessions')
        break
      default:
        setView('sessions')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {view === 'sessions' ? 'Dashboard' : 'Back'}
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {viewTitle[view]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
              {userIds.map(id => (
                <button
                  key={id}
                  onClick={() => { setCurrentUser(id); router.replace(`/virtual-provider?user=${id}`) }}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                    currentUser === id
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {userNames[id] || id}
                </button>
              ))}
            </div>

            {/* Dark mode */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode
                ? <Sun className="w-4 h-4 text-yellow-500" />
                : <Moon className="w-4 h-4 text-gray-600" />
              }
            </button>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-3 flex-shrink-0">
          <div className="max-w-2xl mx-auto p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-500 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        {/* ── Sessions List ── */}
        {view === 'sessions' && (
          <VPSessionList
            sessions={sessions}
            isLoading={isLoadingSessions}
            onNewSession={startNew}
            onOpenSession={openSession}
            onDeleteSession={deleteSession}
            onRenameSession={renameSession}
            onViewTracking={() => setView('tracking')}
          />
        )}

        {/* ── Consultation Choice ── */}
        {view === 'new-choice' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Start a New Consultation
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose how you&apos;d like to begin.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Analyze data directly */}
              <button
                onClick={proceedToFilePicker}
                className="group flex flex-col items-start gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all text-left shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    Analyze Bloodwork
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Select bloodwork files and get a full analysis with personalized recommendations.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 mt-auto">
                  Select files
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Option 2: Provide context first */}
              <button
                onClick={startWithContext}
                className="group flex flex-col items-start gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 transition-all text-left shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <MessageSquareText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    Provide Context First
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Share symptoms, medication changes, or concerns before analyzing your data.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 mt-auto">
                  Write a note
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Context Input ── */}
        {view === 'new-context' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                What should the provider know?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Share anything relevant &mdash; recent medication changes, new symptoms, lifestyle updates, or specific concerns. This context will be factored into the analysis.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
              <textarea
                value={initialPrompt}
                onChange={e => setInitialPrompt(e.target.value)}
                placeholder="e.g. &quot;I recently stopped taking metformin&quot; or &quot;I've been experiencing fatigue and brain fog for the past few weeks&quot;"
                rows={6}
                autoFocus
                className="w-full px-5 py-4 text-sm text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 leading-relaxed"
              />
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {initialPrompt.length > 0 ? `${initialPrompt.length} characters` : 'Type your note above'}
                </p>
              </div>
            </div>

            <button
              onClick={proceedToFilePicker}
              disabled={initialPrompt.trim().length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-white bg-purple-500 rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 shadow-sm"
            >
              Continue to Bloodwork Selection
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── File Picker ── */}
        {view === 'new' && (
          <div className="max-w-2xl mx-auto">
            {/* Context attached banner */}
            {initialPrompt.trim() && (
              <div className="mb-4 p-3.5 bg-purple-50 dark:bg-purple-900/15 rounded-xl border border-purple-200 dark:border-purple-800/50">
                <div className="flex items-start gap-2.5">
                  <MessageSquareText className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Patient context attached</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 leading-relaxed line-clamp-2">{initialPrompt}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Select bloodwork files to analyze
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The Virtual Provider will analyze the selected data through a 3-agent verification pipeline.
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSelectedFiles(new Set(availableFiles.map(f => f.filename)))}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Select all
              </button>
              <span className="text-xs text-gray-300">&bull;</span>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
              >
                Clear
              </button>
              <span className="text-xs text-gray-400 ml-auto">
                {selectedFiles.size} of {availableFiles.length} selected
              </span>
            </div>

            <div className="space-y-2 mb-6">
              {availableFiles.map(file => {
                const isSelected = selectedFiles.has(file.filename)
                return (
                  <button
                    key={file.filename}
                    onClick={() => toggleFile(file.filename)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
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
                        {file.filename} &middot; {file.metricCount} metrics
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={generateAnalysis}
              disabled={isGenerating || selectedFiles.size === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Activity className="w-4 h-4" />
              Start Consultation
            </button>
          </div>
        )}

        {/* ── Generating (Loading) ── */}
        {view === 'analyzing' && (
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-20">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <Activity className="absolute inset-0 m-auto w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {generatingStep}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
              Three independent AI agents are analyzing your bloodwork and cross-checking each other for accuracy. This typically takes 30-60 seconds.
            </p>

            {/* Pipeline progress */}
            <div className="mt-8 w-full max-w-xs space-y-3">
              {[
                { label: 'Clinical Analyst', done: generatingStep !== 'Analyzing your bloodwork...' && generatingStep !== 'Clinical analyst reviewing metrics...' },
                { label: 'Senior Reviewer', done: generatingStep === 'Virtual provider synthesizing findings...' || !isGenerating },
                { label: 'Virtual Provider', done: !isGenerating },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.done
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {step.done ? (
                      <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    step.done
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Analysis View ── */}
        {view === 'analysis' && currentSession && (
          <VPAnalysisView
            session={currentSession}
            onProceedToQuestions={() => setView('follow-up')}
          />
        )}

        {/* ── Follow-Up Questions ── */}
        {view === 'follow-up' && currentSession && (
          <VPFollowUpQuestions
            questions={currentSession.analysis.follow_up_questions || []}
            onSubmit={submitAnswers}
            isSubmitting={isSubmittingAnswers}
          />
        )}

        {/* ── Recommendations ── */}
        {view === 'recommendations' && currentSession && (
          <VPRecommendations
            session={currentSession}
            onUpdateStatus={updateRecommendationStatus}
            onContinueToDashboard={() => setView('dashboard')}
          />
        )}

        {/* ── Dashboard ── */}
        {view === 'dashboard' && currentSession && (
          <VPDashboard
            session={currentSession}
            onViewRecommendations={() => setView('recommendations')}
            onNewConsultation={startNew}
            onUpdateStatus={updateRecommendationStatus}
          />
        )}

        {/* ── Tracking ── */}
        {view === 'tracking' && (
          <VPTracking currentUser={currentUser} />
        )}
      </main>
    </div>
  )
}
