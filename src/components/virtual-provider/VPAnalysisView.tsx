'use client'

import {
  CheckCircle, AlertTriangle, Eye, ChevronDown, ChevronRight,
  ArrowRight, Shield,
} from 'lucide-react'
import { useState } from 'react'
import { VPSession } from '@/types/virtual-provider'

interface VPAnalysisViewProps {
  session: VPSession
  onProceedToQuestions: () => void
}

function severityIcon(severity: string) {
  switch (severity) {
    case 'attention':
      return <AlertTriangle className="w-4 h-4 text-red-500" />
    case 'watch':
      return <Eye className="w-4 h-4 text-yellow-500" />
    default:
      return <CheckCircle className="w-4 h-4 text-green-500" />
  }
}

function severityStyles(severity: string) {
  switch (severity) {
    case 'attention':
      return 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
    case 'watch':
      return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10'
    default:
      return 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
  }
}

function patternSeverityStyles(severity: string) {
  switch (severity) {
    case 'notable':
      return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
    case 'moderate':
      return 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'
    default:
      return 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
  }
}

function patternBadgeStyles(severity: string) {
  switch (severity) {
    case 'notable':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    case 'moderate':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  }
}

export function VPAnalysisView({ session, onProceedToQuestions }: VPAnalysisViewProps) {
  const [expandedPatterns, setExpandedPatterns] = useState<Set<number>>(new Set([0]))

  const togglePattern = (i: number) => {
    setExpandedPatterns(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const { analysis } = session

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Accuracy badge */}
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-xs text-green-700 dark:text-green-300">
          Verified by 3-agent analysis pipeline for accuracy
        </span>
      </div>

      {/* Summary */}
      <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Summary
        </h3>
        <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
          {analysis.provider_summary}
        </p>
      </div>

      {/* Key Findings */}
      {analysis.key_findings && analysis.key_findings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Key Findings
          </h3>
          <div className="space-y-2">
            {analysis.key_findings.map((finding, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${severityStyles(finding.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{severityIcon(finding.severity)}</div>
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
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {analysis.patterns && analysis.patterns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Identified Patterns
          </h3>
          <div className="space-y-2">
            {analysis.patterns.map((pattern, i) => (
              <div key={i} className={`border rounded-xl overflow-hidden ${patternSeverityStyles(pattern.severity)}`}>
                <button
                  onClick={() => togglePattern(i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    {expandedPatterns.has(i)
                      ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    }
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {pattern.title}
                    </span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${patternBadgeStyles(pattern.severity)}`}>
                    {pattern.severity}
                  </span>
                </button>
                {expandedPatterns.has(i) && (
                  <div className="px-4 pb-4 pt-0 ml-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {pattern.description}
                    </p>
                    {pattern.what_it_means && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                        {pattern.what_it_means}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proceed to questions */}
      <div className="pt-2">
        <button
          onClick={onProceedToQuestions}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
        >
          Answer Follow-Up Questions
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
          Your answers help generate personalized recommendations
        </p>
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          This analysis is AI-generated from a 3-agent verification pipeline and is not medical advice.
          Always consult with a healthcare provider for interpretation of lab results and medical decisions.
        </p>
      </div>
    </div>
  )
}
