'use client'

import { Sun, Moon, Download, Calendar, Upload, FolderOpen, Activity } from 'lucide-react'
import { userNames, userIds } from '@/data'

interface HeaderProps {
  darkMode: boolean
  onToggleDarkMode: () => void
  onExport: () => void
  dates: string[]
  startDate: string | null
  endDate: string | null
  onStartDateChange: (date: string | null) => void
  onEndDateChange: (date: string | null) => void
  showMostRecentOnly: boolean
  onToggleMostRecent: () => void
  currentUser: string
  onUserChange: (userId: string) => void
  onUploadClick?: () => void
  onManageFilesClick?: () => void
  onAnalyzeClick?: () => void
}

export function Header({
  darkMode,
  onToggleDarkMode,
  onExport,
  dates,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  showMostRecentOnly,
  onToggleMostRecent,
  currentUser,
  onUserChange,
  onUploadClick,
  onManageFilesClick,
  onAnalyzeClick,
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side: Title + User Toggle */}
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Blood Panel Tracker
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Visualize and compare your bloodwork results over time
            </p>
          </div>

          {/* User Toggle Pill */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            {userIds.map(id => (
              <button
                key={id}
                onClick={() => onUserChange(id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  currentUser === id
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {userNames[id] || id}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Date filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={startDate || ''}
              onChange={e => onStartDateChange(e.target.value || null)}
              className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">From: All</option>
              {dates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </option>
              ))}
            </select>
            <span className="text-gray-400">-</span>
            <select
              value={endDate || ''}
              onChange={e => onEndDateChange(e.target.value || null)}
              className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">To: All</option>
              {dates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </option>
              ))}
            </select>
          </div>

          {/* Most recent toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMostRecentOnly}
              onChange={onToggleMostRecent}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Most recent only
            </span>
          </label>

          {/* Analysis button */}
          {onAnalyzeClick && (
            <button
              onClick={onAnalyzeClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Activity className="w-4 h-4" />
              Analysis
            </button>
          )}

          {/* Manage Files button */}
          {onManageFilesClick && (
            <button
              onClick={onManageFilesClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Files
            </button>
          )}

          {/* Upload button */}
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
          )}

          {/* Export button */}
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
