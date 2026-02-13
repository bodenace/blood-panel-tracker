'use client'

import { useState, useCallback, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

type UploadState =
  | { status: 'idle' }
  | { status: 'selected'; file: File }
  | { status: 'uploading'; file: File; step: string }
  | { status: 'success'; file: File; result: UploadResult }
  | { status: 'error'; file: File | null; message: string; details?: string[] }

interface UploadResult {
  filename: string
  collectionDate: string
  panelCount: number
  testCount: number
  verification: {
    is_accurate: boolean
    confidence: number
    issues: Array<{ field: string; expected: string; found: string; severity: string }>
    hadCorrections: boolean
  }
  data: unknown
}

interface UploadPanelProps {
  currentUser: string
  onSuccess: () => void
  onClose: () => void
}

export function UploadPanel({ currentUser, onSuccess, onClose }: UploadPanelProps) {
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCountRef = useRef(0)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      setState({ status: 'error', file: null, message: 'Please select a PDF file.' })
      return
    }
    setState({ status: 'selected', file })
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current += 1
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current -= 1
    if (dragCountRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current = 0
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleUpload = useCallback(async () => {
    if (state.status !== 'selected') return

    const file = state.file
    setState({ status: 'uploading', file, step: 'Uploading PDF...' })

    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('user', currentUser)

      // Update step as we wait
      const stepTimeout = setTimeout(() => {
        setState(prev => {
          if (prev.status === 'uploading') {
            return { ...prev, step: 'Extracting text and converting with AI...' }
          }
          return prev
        })
      }, 2000)

      const stepTimeout2 = setTimeout(() => {
        setState(prev => {
          if (prev.status === 'uploading') {
            return { ...prev, step: 'Verifying accuracy with AI...' }
          }
          return prev
        })
      }, 10000)

      const stepTimeout3 = setTimeout(() => {
        setState(prev => {
          if (prev.status === 'uploading') {
            return { ...prev, step: 'Almost done, validating and saving...' }
          }
          return prev
        })
      }, 20000)

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      })

      clearTimeout(stepTimeout)
      clearTimeout(stepTimeout2)
      clearTimeout(stepTimeout3)

      const result = await response.json()

      if (!response.ok) {
        setState({
          status: 'error',
          file,
          message: result.error || 'Upload failed',
          details: result.zodErrors || (result.raw ? [`Raw AI output: ${result.raw}`] : undefined),
        })
        return
      }

      setState({
        status: 'success',
        file,
        result: {
          filename: result.filename,
          collectionDate: result.collectionDate,
          panelCount: result.panelCount,
          testCount: result.testCount,
          verification: result.verification,
          data: result.data,
        },
      })
    } catch (error) {
      setState({
        status: 'error',
        file,
        message: error instanceof Error ? error.message : 'Network error',
      })
    }
  }, [state, currentUser])

  const handleAcceptResult = useCallback(() => {
    if (state.status === 'success') {
      onSuccess()
    }
  }, [state, onSuccess])

  const handleReset = useCallback(() => {
    setState({ status: 'idle' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upload Bloodwork PDF
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Idle / Selected state: Drop zone */}
          {(state.status === 'idle' || state.status === 'selected') && (
            <>
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : state.status === 'selected'
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />

                {state.status === 'selected' ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-10 h-10 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {state.file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(state.file.size / 1024).toFixed(1)} KB -- Click to change
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Drop your bloodwork PDF here
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        or click to browse
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                The PDF will be processed by AI to extract test results into structured data.
                Two AI passes ensure accuracy.
              </p>

              {state.status === 'selected' && (
                <button
                  onClick={handleUpload}
                  className="w-full mt-4 px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Process PDF
                </button>
              )}
            </>
          )}

          {/* Uploading state */}
          {state.status === 'uploading' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {state.step}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                This may take 15-30 seconds
              </p>
            </div>
          )}

          {/* Success state */}
          {state.status === 'success' && (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Successfully processed!
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {state.result.filename} -- {state.result.collectionDate}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {state.result.panelCount}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Panels</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {state.result.testCount}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tests</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(state.result.verification.confidence * 100)}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Confidence</p>
                </div>
              </div>

              {/* Verification details */}
              {state.result.verification.issues.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    {state.result.verification.hadCorrections
                      ? 'Issues found and auto-corrected:'
                      : 'Minor notes from verification:'}
                  </p>
                  <ul className="space-y-1">
                    {state.result.verification.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-yellow-700 dark:text-yellow-300">
                        {issue.field}: expected &quot;{issue.expected}&quot;, found &quot;{issue.found}&quot;
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {state.result.verification.is_accurate && state.result.verification.issues.length === 0 && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Verification passed -- all values match the source PDF.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAcceptResult}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Load Data
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Upload Another
                </button>
              </div>
            </div>
          )}

          {/* Error state */}
          {state.status === 'error' && (
            <div className="py-4">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {state.message}
                  </p>
                  {state.details && (
                    <ul className="mt-2 space-y-1">
                      {state.details.map((detail, i) => (
                        <li key={i} className="text-xs text-red-500 dark:text-red-400">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <button
                onClick={handleReset}
                className="w-full px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
