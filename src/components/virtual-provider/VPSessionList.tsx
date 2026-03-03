'use client'

import { useState } from 'react'
import {
  Plus, ChevronRight, Loader2, Activity, Trash2,
  CheckCircle, Clock, Pencil,
} from 'lucide-react'
import { VPSession } from '@/types/virtual-provider'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

interface VPSessionListProps {
  sessions: VPSession[]
  isLoading: boolean
  onNewSession: () => void
  onOpenSession: (session: VPSession) => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, label: string) => void
  onViewTracking: () => void
}

export function VPSessionList({
  sessions,
  isLoading,
  onNewSession,
  onOpenSession,
  onDeleteSession,
  onRenameSession,
  onViewTracking,
}: VPSessionListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')

  const completedCount = sessions.filter(s => s.status === 'completed').length

  const handleStartRename = (session: VPSession) => {
    setRenamingId(session.id)
    setRenameText(session.label)
  }

  const handleSaveRename = (id: string) => {
    const trimmed = renameText.trim()
    if (trimmed) onRenameSession(id, trimmed)
    setRenamingId(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Actions bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onNewSession}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Consultation
        </button>
        {completedCount > 0 && (
          <button
            onClick={onViewTracking}
            className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Activity className="w-4 h-4" />
            Tracking
          </button>
        )}
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No consultations yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
            Start a new consultation to have the Virtual Provider analyze your bloodwork and provide personalized recommendations.
          </p>
        </div>
      )}

      {/* Session list */}
      <div className="space-y-2">
        {sessions.map(session => (
          <div
            key={session.id}
            className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => renamingId !== session.id && onOpenSession(session)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {session.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  )}
                  {renamingId === session.id ? (
                    <input
                      value={renameText}
                      onChange={e => setRenameText(e.target.value)}
                      onBlur={() => handleSaveRename(session.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveRename(session.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                      className="text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    />
                  ) : (
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {session.label}
                    </h4>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 ml-6">
                  {formatTimestamp(session.created_at)}
                  {' \u2022 '}
                  {session.out_of_range_count} of {session.total_metrics} flagged
                  {session.status === 'completed' && session.recommendations && (
                    <>
                      {' \u2022 '}
                      {session.recommendations.medications.length + session.recommendations.supplements.length + session.recommendations.lifestyle.length} recommendations
                    </>
                  )}
                </p>
                {session.source_files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 ml-6">
                    {session.source_files.slice(0, 3).map(f => (
                      <span key={f} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                        {f}
                      </span>
                    ))}
                    {session.source_files.length > 3 && (
                      <span className="text-xs text-gray-400">+{session.source_files.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); handleStartRename(session) }}
                  className="p-1 text-gray-300 dark:text-gray-600 hover:text-blue-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rename"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {confirmDeleteId === session.id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { onDeleteSession(session.id); setConfirmDeleteId(null) }}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(session.id) }}
                    className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronRight
                  className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-400 cursor-pointer"
                  onClick={() => onOpenSession(session)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
