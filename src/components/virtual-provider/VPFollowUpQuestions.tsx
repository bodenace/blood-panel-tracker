'use client'

import { useState } from 'react'
import { ArrowRight, ArrowLeft, Loader2, MessageSquare, Check } from 'lucide-react'
import { VPFollowUpQuestion } from '@/types/virtual-provider'

interface VPFollowUpQuestionsProps {
  questions: VPFollowUpQuestion[]
  onSubmit: (answers: Record<string, string>) => void
  isSubmitting: boolean
}

export function VPFollowUpQuestions({
  questions,
  onSubmit,
  isSubmitting,
}: VPFollowUpQuestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({})

  const question = questions[currentIndex]
  const isMulti = question?.allow_multiple ?? false
  const currentSelections = answers[question?.id] || []
  const hasCustom = currentSelections.includes('__custom__')
  const customText = customTexts[question?.id] || ''
  const isLastQuestion = currentIndex === questions.length - 1
  const answeredCount = Object.keys(answers).filter(k => answers[k].length > 0).length

  const selectSingle = (option: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: [option] }))
  }

  const toggleMulti = (option: string) => {
    setAnswers(prev => {
      const current = prev[question.id] || []
      const exists = current.includes(option)
      const next = exists
        ? current.filter(o => o !== option)
        : [...current, option]
      return { ...prev, [question.id]: next }
    })
  }

  const handleOptionClick = (option: string) => {
    if (isMulti) {
      toggleMulti(option)
    } else {
      selectSingle(option)
    }
  }

  const handleCustomClick = () => {
    if (isMulti) {
      toggleMulti('__custom__')
    } else {
      selectSingle('__custom__')
    }
  }

  const updateCustomText = (text: string) => {
    setCustomTexts(prev => ({ ...prev, [question.id]: text }))
  }

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
    }
  }

  const handleSubmit = () => {
    const finalAnswers: Record<string, string> = {}
    for (const q of questions) {
      const selected = answers[q.id] || []
      if (selected.length === 0) {
        finalAnswers[q.id] = 'No answer provided'
        continue
      }
      const parts: string[] = []
      for (const s of selected) {
        if (s === '__custom__') {
          parts.push(customTexts[q.id] || 'No answer provided')
        } else {
          parts.push(s)
        }
      }
      finalAnswers[q.id] = parts.join('; ')
    }
    onSubmit(finalAnswers)
  }

  const canProceed =
    currentSelections.length > 0 &&
    (!hasCustom || customText.trim().length > 0)

  if (!question) return null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {answeredCount} answered
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        {/* Dots */}
        <div className="flex gap-1.5 mt-3 justify-center">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex
                  ? 'bg-blue-500 w-6'
                  : (answers[q.id]?.length ?? 0) > 0
                    ? 'bg-blue-300 dark:bg-blue-700'
                    : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Question header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white leading-snug">
                {question.question}
              </h3>
              {isMulti && (
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-medium">
                  Select all that apply
                </p>
              )}
              {question.why_asking && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
                  {question.why_asking}
                </p>
              )}
              {question.context && !question.why_asking && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
                  {question.context}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="px-6 pb-4 space-y-2">
          {question.options.map((option, i) => {
            const isSelected = currentSelections.includes(option)
            return (
              <button
                key={i}
                onClick={() => handleOptionClick(option)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isMulti ? (
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  )}
                  {option}
                </div>
              </button>
            )
          })}

          {/* Custom "Other" option */}
          <button
            onClick={handleCustomClick}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
              hasCustom
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-750'
            }`}
          >
            <div className="flex items-center gap-3">
              {isMulti ? (
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  hasCustom
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {hasCustom && <Check className="w-3 h-3 text-white" />}
                </div>
              ) : (
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  hasCustom
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {hasCustom && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              )}
              Other (type your own)
            </div>
          </button>

          {/* Custom text area */}
          {hasCustom && (
            <div className="ml-8 mt-1">
              <textarea
                value={customText}
                onChange={e => updateCustomText(e.target.value)}
                placeholder="Type your answer here..."
                autoFocus
                rows={3}
                className="w-full px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={!canProceed || isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating recommendations...
                </>
              ) : (
                <>
                  Get Recommendations
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canProceed}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
