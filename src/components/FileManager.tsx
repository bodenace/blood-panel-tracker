'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Trash2, FileText, AlertTriangle, Loader2, Pencil } from 'lucide-react'

interface FileInfo {
  filename: string
  collectionDate: string | null
  panelCount: number
  testCount: number
  size: number
  createdAt: string
}

interface FileManagerProps {
  currentUser: string
  onClose: () => void
  onFilesChanged: () => void
}

function InlineRenameInput({
  value,
  onSave,
  onCancel,
}: {
  value: string
  onSave: (newValue: string) => void
  onCancel: () => void
}) {
  // Strip .json for editing
  const baseName = value.endsWith('.json') ? value.slice(0, -5) : value
  const [text, setText] = useState(baseName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (trimmed && trimmed !== baseName) {
      onSave(trimmed + '.json')
    } else {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className="text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-blue-400 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-xs text-gray-400 flex-shrink-0">.json</span>
    </div>
  )
}

export function FileManager({ currentUser, onClose, onFilesChanged }: FileManagerProps) {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [renamingFile, setRenamingFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/files?user=${encodeURIComponent(currentUser)}`)
      if (!res.ok) throw new Error('Failed to load files')
      const data = await res.json()
      setFiles(data.files || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleDelete = useCallback(async (filename: string) => {
    setDeletingFile(filename)
    setError(null)
    try {
      const res = await fetch(
        `/api/files?user=${encodeURIComponent(currentUser)}&filename=${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete file')
      }
      setConfirmDelete(null)
      onFilesChanged()
      await loadFiles()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete file')
    } finally {
      setDeletingFile(null)
    }
  }, [currentUser, loadFiles, onFilesChanged])

  const handleRename = useCallback(async (oldFilename: string, newFilename: string) => {
    setError(null)
    try {
      const res = await fetch('/api/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, oldFilename, newFilename }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to rename file')
      }
      setRenamingFile(null)
      onFilesChanged()
      await loadFiles()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename file')
    }
  }, [currentUser, loadFiles, onFilesChanged])

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Unknown date'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Manage Files
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!isLoading && files.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No data files for this user yet.
              </p>
            </div>
          )}

          {!isLoading && files.length > 0 && (
            <div className="space-y-2">
              {files.map(file => (
                <div
                  key={file.filename}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      {renamingFile === file.filename ? (
                        <InlineRenameInput
                          value={file.filename}
                          onSave={(newName) => handleRename(file.filename, newName)}
                          onCancel={() => setRenamingFile(null)}
                        />
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {formatDate(file.collectionDate)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {file.filename} -- {file.panelCount} panels, {file.testCount} tests -- {formatSize(file.size)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-3 flex items-center gap-1">
                    {confirmDelete === file.filename ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(file.filename)}
                          disabled={deletingFile === file.filename}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {deletingFile === file.filename ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setRenamingFile(file.filename); setConfirmDelete(null) }}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors opacity-0 group-hover:opacity-100"
                          title="Rename file"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setConfirmDelete(file.filename); setRenamingFile(null) }}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && files.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Deleting a file permanently removes it and all its data from the dashboard.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
