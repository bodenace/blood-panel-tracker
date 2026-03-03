'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Pill, Leaf, Heart, ChevronDown, ChevronRight, ChevronUp,
  CheckCircle, XCircle, Clock, AlertTriangle, X, ArrowRight,
  Dumbbell, Moon, Droplets, Brain, UtensilsCrossed, Shield, Eye,
} from 'lucide-react'
import {
  VPSession, VPMedication, VPSupplement, VPLifestyle, VPContraindication,
} from '@/types/virtual-provider'

const PRIORITY_ORDER: Record<string, number> = { high: 0, moderate: 1, low: 2 }
const TOP_LIFESTYLE_COUNT = 3
const TOAST_TIMEOUT = 5000

type RecTab = 'medications' | 'supplements' | 'lifestyle'

interface Toast {
  id: string
  message: string
  dismissedItem: string
}

interface VPRecommendationsProps {
  session: VPSession
  onUpdateStatus: (
    recommendationId: string,
    category: string,
    status: 'new' | 'following' | 'dismissed'
  ) => void
  onContinueToDashboard?: () => void
}

function getItemName(id: string, recs: VPSession['recommendations']): string {
  if (!recs) return id
  const med = recs.medications.find(m => m.id === id)
  if (med) return med.name
  const sup = recs.supplements.find(s => s.id === id)
  if (sup) return sup.name
  const life = recs.lifestyle.find(l => l.id === id)
  if (life) return life.title
  return id
}

function getItemCategory(id: string, recs: VPSession['recommendations']): string {
  if (!recs) return ''
  if (recs.medications.find(m => m.id === id)) return 'medications'
  if (recs.supplements.find(s => s.id === id)) return 'supplements'
  if (recs.lifestyle.find(l => l.id === id)) return 'lifestyle'
  return ''
}

function urgencyBadge(urgency: string) {
  switch (urgency) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    case 'moderate':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'following':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'dismissed':
      return <XCircle className="w-4 h-4 text-gray-400" />
    default:
      return <Clock className="w-4 h-4 text-yellow-500" />
  }
}

function lifestyleIcon(category: string) {
  switch (category) {
    case 'diet':
      return <UtensilsCrossed className="w-4 h-4" />
    case 'exercise':
      return <Dumbbell className="w-4 h-4" />
    case 'sleep':
      return <Moon className="w-4 h-4" />
    case 'stress':
      return <Brain className="w-4 h-4" />
    case 'hydration':
      return <Droplets className="w-4 h-4" />
    default:
      return <Heart className="w-4 h-4" />
  }
}

function ContraindicationBadge({ contra, otherName }: { contra: VPContraindication; otherName: string }) {
  return (
    <div className="mt-2 ml-7 flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/15 rounded-lg border border-amber-200 dark:border-amber-800/50">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
          Note: Consider alongside {otherName}
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 leading-relaxed">
          {contra.reason}
        </p>
      </div>
    </div>
  )
}

function StatusToggle({
  currentStatus,
  onChangeStatus,
}: {
  currentStatus: string
  onChangeStatus: (status: 'new' | 'following' | 'dismissed') => void
}) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
      <button
        onClick={() => onChangeStatus('following')}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
          currentStatus === 'following'
            ? 'bg-green-500 text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        Following
      </button>
      <button
        onClick={() => onChangeStatus('new')}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
          currentStatus === 'new'
            ? 'bg-yellow-500 text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        Undecided
      </button>
      <button
        onClick={() => onChangeStatus('dismissed')}
        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
          currentStatus === 'dismissed'
            ? 'bg-gray-500 text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        Dismiss
      </button>
    </div>
  )
}

function MedicationCard({
  med,
  onChangeStatus,
  contraBadge,
}: {
  med: VPMedication
  onChangeStatus: (status: 'new' | 'following' | 'dismissed') => void
  contraBadge?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      med.status === 'dismissed' ? 'opacity-60 border-gray-200 dark:border-gray-800' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5">{statusIcon(med.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {med.name}
                </h4>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgencyBadge(med.urgency)}`}>
                  {med.urgency}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {med.type === 'prescription' ? 'Rx' : 'OTC'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {med.suggested_dosage}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {contraBadge}

        {expanded && (
          <div className="mt-3 ml-7 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Why recommended</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{med.reasoning}</p>
            </div>
            {med.discuss_with_doctor && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">Discuss with your doctor</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">{med.discuss_with_doctor}</p>
                  </div>
                </div>
              </div>
            )}
            {med.related_metrics && med.related_metrics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {med.related_metrics.map(m => (
                  <span key={m} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <StatusToggle currentStatus={med.status} onChangeStatus={onChangeStatus} />
      </div>
    </div>
  )
}

function SupplementCard({
  sup,
  onChangeStatus,
  contraBadge,
}: {
  sup: VPSupplement
  onChangeStatus: (status: 'new' | 'following' | 'dismissed') => void
  contraBadge?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      sup.status === 'dismissed' ? 'opacity-60 border-gray-200 dark:border-gray-800' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5">{statusIcon(sup.status)}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {sup.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {sup.suggested_dosage} &middot; {sup.form}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {contraBadge}

        {expanded && (
          <div className="mt-3 ml-7 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Why recommended</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{sup.reasoning}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expected benefit</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{sup.expected_benefit}</p>
            </div>
            {sup.interactions_note && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-xs font-medium text-orange-800 dark:text-orange-200">Interactions</p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">{sup.interactions_note}</p>
              </div>
            )}
            {sup.related_metrics && sup.related_metrics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sup.related_metrics.map(m => (
                  <span key={m} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <StatusToggle currentStatus={sup.status} onChangeStatus={onChangeStatus} />
      </div>
    </div>
  )
}

function LifestyleCard({
  item,
  onChangeStatus,
  contraBadge,
}: {
  item: VPLifestyle
  onChangeStatus: (status: 'new' | 'following' | 'dismissed') => void
  contraBadge?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      item.status === 'dismissed' ? 'opacity-60 border-gray-200 dark:border-gray-800' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 text-gray-500 dark:text-gray-400">
              {lifestyleIcon(item.category)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h4>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgencyBadge(item.priority)}`}>
                  {item.priority}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 capitalize">
                  {item.category}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {contraBadge}

        {expanded && (
          <div className="mt-3 ml-7 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Why this matters for you</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item.reasoning}</p>
            </div>
            {item.related_metrics && item.related_metrics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.related_metrics.map(m => (
                  <span key={m} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <StatusToggle currentStatus={item.status} onChangeStatus={onChangeStatus} />
      </div>
    </div>
  )
}

export function VPRecommendations({ session, onUpdateStatus, onContinueToDashboard }: VPRecommendationsProps) {
  const [activeTab, setActiveTab] = useState<RecTab>('medications')
  const [showAllLifestyle, setShowAllLifestyle] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const recs = session.recommendations
  if (!recs) return null

  const contraindications = recs.contraindications || []

  const contraMap = useMemo(() => {
    const map = new Map<string, { contra: VPContraindication; otherId: string }[]>()
    for (const c of contraindications) {
      const aEntries = map.get(c.item_a) || []
      aEntries.push({ contra: c, otherId: c.item_b })
      map.set(c.item_a, aEntries)

      const bEntries = map.get(c.item_b) || []
      bEntries.push({ contra: c, otherId: c.item_a })
      map.set(c.item_b, bEntries)
    }
    return map
  }, [contraindications])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map(t =>
      setTimeout(() => dismissToast(t.id), TOAST_TIMEOUT)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, dismissToast])

  const handleStatusChange = useCallback((
    itemId: string,
    category: string,
    status: 'new' | 'following' | 'dismissed'
  ) => {
    onUpdateStatus(itemId, category, status)

    if (status !== 'following') return

    const conflicts = contraMap.get(itemId)
    if (!conflicts) return

    for (const { contra, otherId } of conflicts) {
      const otherCategory = getItemCategory(otherId, recs)
      if (!otherCategory) continue

      onUpdateStatus(otherId, otherCategory, 'dismissed')

      const otherName = getItemName(otherId, recs)
      setToasts(prev => [...prev, {
        id: `${contra.id}-${Date.now()}`,
        message: `Since these are best used separately, "${otherName}" has been moved to undecided. You can review and adjust this anytime.`,
        dismissedItem: otherName,
      }])
    }
  }, [onUpdateStatus, contraMap, recs])

  function buildContraBadge(itemId: string): React.ReactNode {
    const conflicts = contraMap.get(itemId)
    if (!conflicts || conflicts.length === 0) return null
    return (
      <>
        {conflicts.map(({ contra, otherId }) => (
          <ContraindicationBadge
            key={contra.id}
            contra={contra}
            otherName={getItemName(otherId, recs)}
          />
        ))}
      </>
    )
  }

  const sortedLifestyle = [...recs.lifestyle].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
  )
  const topLifestyle = sortedLifestyle.slice(0, TOP_LIFESTYLE_COUNT)
  const extraLifestyle = sortedLifestyle.slice(TOP_LIFESTYLE_COUNT)
  const visibleLifestyle = showAllLifestyle ? sortedLifestyle : topLifestyle

  const tabs: { id: RecTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'medications', label: 'Medications', icon: <Pill className="w-4 h-4" />, count: recs.medications.length },
    { id: 'supplements', label: 'Supplements', icon: <Leaf className="w-4 h-4" />, count: recs.supplements.length },
    { id: 'lifestyle', label: 'Lifestyle', icon: <Heart className="w-4 h-4" />, count: recs.lifestyle.length },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl shadow-lg"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed flex-1">
                {toast.message}
              </p>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Accuracy badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
        <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-xs text-green-700 dark:text-green-300">
          Verified by 3-agent analysis pipeline for accuracy
        </span>
      </div>

      {/* Provider summary */}
      {session.analysis.provider_summary && (
        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Analysis Summary
          </h3>
          <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
            {session.analysis.provider_summary}
          </p>
        </div>
      )}

      {/* Key Findings */}
      {session.analysis.key_findings && session.analysis.key_findings.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Key Findings
          </h3>
          <div className="space-y-2">
            {session.analysis.key_findings.map((finding, i) => {
              const severityStyle = finding.severity === 'attention'
                ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                : finding.severity === 'watch'
                  ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10'
                  : 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
              const severityIconEl = finding.severity === 'attention'
                ? <AlertTriangle className="w-4 h-4 text-red-500" />
                : finding.severity === 'watch'
                  ? <Eye className="w-4 h-4 text-yellow-500" />
                  : <CheckCircle className="w-4 h-4 text-green-500" />
              return (
                <div key={i} className={`p-4 rounded-xl border ${severityStyle}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{severityIconEl}</div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {finding.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        {finding.explanation}
                      </p>
                      {finding.related_metrics && finding.related_metrics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {finding.related_metrics.map(m => (
                            <span key={m} className="text-xs px-2 py-0.5 bg-white/60 dark:bg-gray-900/40 rounded-md text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Patterns */}
      {session.analysis.patterns && session.analysis.patterns.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Identified Patterns
          </h3>
          <div className="space-y-2">
            {session.analysis.patterns.map((pattern, i) => {
              const pStyle = pattern.severity === 'notable'
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                : pattern.severity === 'moderate'
                  ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
              const pBadge = pattern.severity === 'notable'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                : pattern.severity === 'moderate'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              return (
                <div key={i} className={`border rounded-xl p-4 ${pStyle}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {pattern.title}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pBadge}`}>
                      {pattern.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {pattern.description}
                  </p>
                  {pattern.what_it_means && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                      {pattern.what_it_means}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recommendations overview */}
      <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Recommendations
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {recs.overview}
        </p>
      </div>

      {/* Contraindication advisory banner */}
      {contraindications.length > 0 && (
        <div className="p-4 mb-4 bg-amber-50 dark:bg-amber-900/15 rounded-xl border border-amber-200 dark:border-amber-800/50">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Provider note: {contraindications.length} item{contraindications.length !== 1 ? 's require' : ' requires'} your attention
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
                While both options were recommended, some items are best used one at a time. Selecting one will adjust the other accordingly. See the notes on each item for details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-3">
        {activeTab === 'medications' && recs.medications.map(med => (
          <MedicationCard
            key={med.id}
            med={med}
            onChangeStatus={(status) => handleStatusChange(med.id, 'medications', status)}
            contraBadge={buildContraBadge(med.id)}
          />
        ))}
        {activeTab === 'medications' && recs.medications.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            No medication recommendations for this consultation.
          </p>
        )}

        {activeTab === 'supplements' && recs.supplements.map(sup => (
          <SupplementCard
            key={sup.id}
            sup={sup}
            onChangeStatus={(status) => handleStatusChange(sup.id, 'supplements', status)}
            contraBadge={buildContraBadge(sup.id)}
          />
        ))}
        {activeTab === 'supplements' && recs.supplements.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            No supplement recommendations for this consultation.
          </p>
        )}

        {activeTab === 'lifestyle' && visibleLifestyle.map(item => (
          <LifestyleCard
            key={item.id}
            item={item}
            onChangeStatus={(status) => handleStatusChange(item.id, 'lifestyle', status)}
            contraBadge={buildContraBadge(item.id)}
          />
        ))}
        {activeTab === 'lifestyle' && extraLifestyle.length > 0 && (
          <button
            onClick={() => setShowAllLifestyle(!showAllLifestyle)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 transition-colors"
          >
            {showAllLifestyle ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show fewer lifestyle changes
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show {extraLifestyle.length} more lifestyle change{extraLifestyle.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        )}
        {activeTab === 'lifestyle' && recs.lifestyle.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            No lifestyle recommendations for this consultation.
          </p>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          These recommendations are AI-generated and not a substitute for professional medical advice.
          Always consult with a healthcare provider before starting any medications or supplements.
          Mark items as &quot;Following&quot; to track your progress over time.
        </p>
      </div>

      {/* Continue to Dashboard */}
      {onContinueToDashboard && (
        <button
          onClick={onContinueToDashboard}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
        >
          Continue to Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
