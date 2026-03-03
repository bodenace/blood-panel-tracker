'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity, CheckCircle, XCircle, Clock, TrendingUp,
  TrendingDown, Minus, ChevronDown, ChevronRight, Loader2,
  Pill, Leaf, Heart,
} from 'lucide-react'

interface TrackingRecommendation {
  session_id: string
  session_label: string
  session_date: string
  category: string
  item: {
    id: string
    name?: string
    title?: string
    status: 'new' | 'following' | 'dismissed'
    started_at: string | null
    notes: string
    related_metrics?: string[]
  }
}

interface TrackingSession {
  id: string
  label: string
  created_at: string
  status: string
  tracking_history: Array<{
    date: string
    event: string
    [key: string]: unknown
  }>
  recommendation_counts: {
    medications: number
    supplements: number
    lifestyle: number
  } | null
}

interface TrackingData {
  sessions: TrackingSession[]
  active_recommendations: TrackingRecommendation[]
}

interface VPTrackingProps {
  currentUser: string
}

function categoryIcon(category: string) {
  switch (category) {
    case 'medications':
      return <Pill className="w-3.5 h-3.5" />
    case 'supplements':
      return <Leaf className="w-3.5 h-3.5" />
    default:
      return <Heart className="w-3.5 h-3.5" />
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'following':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
          <CheckCircle className="w-3 h-3" />
          Following
        </span>
      )
    case 'dismissed':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <XCircle className="w-3 h-3" />
          Dismissed
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
          <Clock className="w-3 h-3" />
          Undecided
        </span>
      )
  }
}

function directionIcon(direction: string) {
  switch (direction) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-green-500" />
    case 'worsening':
      return <TrendingDown className="w-4 h-4 text-red-500" />
    default:
      return <Minus className="w-4 h-4 text-gray-400" />
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function VPTracking({ currentUser }: VPTrackingProps) {
  const [tracking, setTracking] = useState<TrackingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const loadTracking = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/virtual-provider/tracking?user=${encodeURIComponent(currentUser)}`)
      if (res.ok) {
        const data = await res.json()
        setTracking(data.tracking)
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    loadTracking()
  }, [loadTracking])

  const toggleSession = (id: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (!tracking || (tracking.sessions.length === 0 && tracking.active_recommendations.length === 0)) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No tracking data yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
            Complete a Virtual Provider consultation to start tracking recommendations.
          </p>
        </div>
      </div>
    )
  }

  const following = tracking.active_recommendations.filter(r => r.item.status === 'following')
  const undecided = tracking.active_recommendations.filter(r => r.item.status === 'new')
  const dismissed = tracking.active_recommendations.filter(r => r.item.status === 'dismissed')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{following.length}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Following</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{undecided.length}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Undecided</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{dismissed.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dismissed</p>
        </div>
      </div>

      {/* Active recommendations */}
      {following.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Currently Following ({following.length})
          </h3>
          <div className="space-y-2">
            {following.map((rec, i) => (
              <div
                key={`${rec.session_id}-${rec.item.id}-${i}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10"
              >
                <div className="text-green-500">{categoryIcon(rec.category)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {rec.item.name || rec.item.title || rec.item.id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {rec.session_label} &middot; {rec.item.started_at ? `Since ${formatDate(rec.item.started_at)}` : 'Recently started'}
                  </p>
                </div>
                {statusBadge(rec.item.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Undecided */}
      {undecided.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            Needs Decision ({undecided.length})
          </h3>
          <div className="space-y-2">
            {undecided.map((rec, i) => (
              <div
                key={`${rec.session_id}-${rec.item.id}-${i}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10"
              >
                <div className="text-yellow-500">{categoryIcon(rec.category)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {rec.item.name || rec.item.title || rec.item.id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {rec.session_label} &middot; {formatDate(rec.session_date)}
                  </p>
                </div>
                {statusBadge(rec.item.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session timeline */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Consultation History
        </h3>
        <div className="space-y-2">
          {tracking.sessions.map(session => (
            <div
              key={session.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => toggleSession(session.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedSessions.has(session.id)
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />
                  }
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(session.created_at)}
                    </p>
                  </div>
                </div>
                {session.recommendation_counts && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {session.recommendation_counts.medications + session.recommendation_counts.supplements + session.recommendation_counts.lifestyle} recs
                    </span>
                  </div>
                )}
              </button>

              {expandedSessions.has(session.id) && session.tracking_history.length > 0 && (
                <div className="px-4 pb-4 ml-7">
                  <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-3">
                    {session.tracking_history.map((event, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 bg-blue-400 rounded-full" />
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(event.date)}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                          {event.event === 'recommendations_generated' && 'Recommendations generated'}
                          {event.event === 'status_change' && (
                            <>Changed {event.category as string} status to <strong>{event.to as string}</strong></>
                          )}
                          {event.event === 'new_bloodwork_comparison' && (
                            <>New bloodwork compared against {event.comparisons_count as number} recommendations</>
                          )}
                          {!['recommendations_generated', 'status_change', 'new_bloodwork_comparison'].includes(event.event) && event.event}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { directionIcon }
