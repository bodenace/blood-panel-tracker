'use client'

import { useState, useCallback, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

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

type FileItemStatus =
  | { status: 'pending' }
  | { status: 'uploading'; step: string }
  | { status: 'success'; result: UploadResult }
  | { status: 'error'; message: string; details?: string[] }

interface FileItem {
  id: string
  file: File
  fileStatus: FileItemStatus
}

type UploadPhase = 'idle' | 'selected' | 'uploading' | 'done'

interface UploadPanelProps {
  currentUser: string
  onSuccess: () => void
  onClose: () => void
  onAutoCompare?: (metrics: unknown[]) => void
}

let nextFileId = 0

export function UploadPanel({ currentUser, onSuccess, onClose }: UploadPanelProps) {
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [files, setFiles] = useState<FileItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCountRef = useRef(0)
  const [isDragOver, setIsDragOver] = useState(false)

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf')
    if (pdfFiles.length === 0) return

    const items: FileItem[] = pdfFiles.map(file => ({
      id: `file-${nextFileId++}`,
      file,
      fileStatus: { status: 'pending' },
    }))

    setFiles(prev => [...prev, ...items])
    setPhase('selected')
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id)
      if (next.length === 0) setPhase('idle')
      return next
    })
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

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles)
    }
  }, [addFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (selected && selected.length > 0) {
      addFiles(Array.from(selected))
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [addFiles])

  const handleUpload = useCallback(async () => {
    if (phase !== 'selected' || files.length === 0) return
    setPhase('uploading')

    const fileIds = files.map(f => f.id)
    const fileMap = new Map(files.map(f => [f.id, f.file]))

    for (const id of fileIds) {
      const file = fileMap.get(id)!

      setFiles(prev => prev.map(f =>
        f.id === id
          ? { ...f, fileStatus: { status: 'uploading', step: 'Uploading PDF...' } }
          : f
      ))

      try {
        const formData = new FormData()
        formData.append('pdf', file)
        formData.append('user', currentUser)

        const timeouts: ReturnType<typeof setTimeout>[] = []
        const updateStep = (step: string, delay: number) => {
          timeouts.push(setTimeout(() => {
            setFiles(prev => prev.map(f =>
              f.id === id && f.fileStatus.status === 'uploading'
                ? { ...f, fileStatus: { status: 'uploading', step } }
                : f
            ))
          }, delay))
        }
        updateStep('Extracting text and converting with AI...', 2000)
        updateStep('Verifying accuracy with AI...', 10000)
        updateStep('Almost done, validating and saving...', 20000)

        const response = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        })

        timeouts.forEach(clearTimeout)
        const result = await response.json()

        if (!response.ok) {
          setFiles(prev => prev.map(f =>
            f.id === id
              ? {
                  ...f, fileStatus: {
                    status: 'error',
                    message: result.error || 'Upload failed',
                    details: result.zodErrors || (result.raw ? [`Raw AI output: ${result.raw}`] : undefined),
                  }
                }
              : f
          ))
        } else {
          setFiles(prev => prev.map(f =>
            f.id === id
              ? {
                  ...f, fileStatus: {
                    status: 'success',
                    result: {
                      filename: result.filename,
                      collectionDate: result.collectionDate,
                      panelCount: result.panelCount,
                      testCount: result.testCount,
                      verification: result.verification,
                      data: result.data,
                    }
                  }
                }
              : f
          ))
        }
      } catch (error) {
        setFiles(prev => prev.map(f =>
          f.id === id
            ? {
                ...f, fileStatus: {
                  status: 'error',
                  message: error instanceof Error ? error.message : 'Network error',
                }
              }
            : f
        ))
      }
    }

    setPhase('done')
  }, [phase, files, currentUser])

  const handleAcceptResults = useCallback(async () => {
    onSuccess()
    try {
      await fetch('/api/virtual-provider/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, newMetrics: [] }),
      })
    } catch {
      // Non-critical — comparison is best-effort
    }
  }, [onSuccess, currentUser])

  const handleReset = useCallback(() => {
    setPhase('idle')
    setFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const hasAnySuccess = files.some(f => f.fileStatus.status === 'success')
  const successCount = files.filter(f => f.fileStatus.status === 'success').length
  const errorCount = files.filter(f => f.fileStatus.status === 'error').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upload Bloodwork PDF{files.length > 1 ? 's' : ''}
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
          {/* Idle / Selected: Drop zone + file list */}
          {(phase === 'idle' || phase === 'selected') && (
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
                    : files.length > 0
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                  {files.length > 0 ? (
                    <>
                      <FileText className="w-10 h-10 text-green-500" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {files.length} PDF{files.length > 1 ? 's' : ''} selected
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Click or drop to add more
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Drop your bloodwork PDFs here
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          or click to browse &mdash; multiple files supported
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Selected file list */}
              {files.length > 0 && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900 dark:text-white truncate">{f.file.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {(f.file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0 ml-2"
                      >
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                Each PDF will be processed by AI to extract test results into structured data.
                Two AI passes ensure accuracy.
              </p>

              {files.length > 0 && (
                <button
                  onClick={handleUpload}
                  className="w-full mt-4 px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Process {files.length} PDF{files.length > 1 ? 's' : ''}
                </button>
              )}
            </>
          )}

          {/* Uploading state */}
          {phase === 'uploading' && (
            <div className="py-4 space-y-3">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {f.fileStatus.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                  )}
                  {f.fileStatus.status === 'uploading' && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  {f.fileStatus.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                  {f.fileStatus.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 dark:text-white truncate">{f.file.name}</p>
                    {f.fileStatus.status === 'uploading' && (
                      <p className="text-xs text-blue-500 mt-0.5">{f.fileStatus.step}</p>
                    )}
                    {f.fileStatus.status === 'success' && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        {f.fileStatus.result.filename} &mdash; {f.fileStatus.result.testCount} tests
                      </p>
                    )}
                    {f.fileStatus.status === 'error' && (
                      <p className="text-xs text-red-500 mt-0.5">{f.fileStatus.message}</p>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                Processing file {files.findIndex(f => f.fileStatus.status === 'uploading') + 1} of {files.length}&hellip; This may take 15&ndash;30 seconds per file.
              </p>
            </div>
          )}

          {/* Done state */}
          {phase === 'done' && (
            <div className="py-4">
              {/* Summary bar */}
              <div className="flex items-center gap-2 mb-4">
                {successCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {successCount} succeeded
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorCount} failed
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {files.map(f => (
                  <div key={f.id} className="px-3 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {f.fileStatus.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {f.file.name}
                        </p>
                        {f.fileStatus.status === 'success' && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {f.fileStatus.result.filename} &mdash; {f.fileStatus.result.collectionDate} &mdash; {f.fileStatus.result.panelCount} panels, {f.fileStatus.result.testCount} tests &mdash; {Math.round(f.fileStatus.result.verification.confidence * 100)}% confidence
                          </p>
                        )}
                        {f.fileStatus.status === 'error' && (
                          <>
                            <p className="text-xs text-red-500">{f.fileStatus.message}</p>
                            {f.fileStatus.details && (
                              <ul className="mt-1 space-y-0.5">
                                {f.fileStatus.details.map((detail, i) => (
                                  <li key={i} className="text-xs text-red-400">{detail}</li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {f.fileStatus.status === 'success' && f.fileStatus.result.verification.issues.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                          {f.fileStatus.result.verification.hadCorrections
                            ? 'Issues found and auto-corrected:'
                            : 'Minor notes from verification:'}
                        </p>
                        <ul className="space-y-0.5">
                          {f.fileStatus.result.verification.issues.map((issue, i) => (
                            <li key={i} className="text-xs text-yellow-700 dark:text-yellow-300">
                              {issue.field}: expected &quot;{issue.expected}&quot;, found &quot;{issue.found}&quot;
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {f.fileStatus.status === 'success' && f.fileStatus.result.verification.is_accurate && f.fileStatus.result.verification.issues.length === 0 && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Verification passed &mdash; all values match the source PDF.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                {hasAnySuccess && (
                  <button
                    onClick={handleAcceptResults}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Load Data
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className={`px-4 py-3 text-gray-700 dark:text-gray-300 font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                    !hasAnySuccess ? 'flex-1' : ''
                  }`}
                >
                  Upload More
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
