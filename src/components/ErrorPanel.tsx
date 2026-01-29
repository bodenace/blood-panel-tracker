'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ErrorPanelProps {
  errors: string[]
  onDismiss?: () => void
}

export function ErrorPanel({ errors, onDismiss }: ErrorPanelProps) {
  if (errors.length === 0) return null

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Data Validation Errors
          </h3>
          <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
