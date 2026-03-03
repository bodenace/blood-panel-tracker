'use client'

import { useState } from 'react'
import {
  Pill, Leaf, Heart, CheckCircle, XCircle, Clock,
  ArrowRight, Plus, AlertTriangle, ChevronDown,
  Dumbbell, Moon, Droplets, Brain, UtensilsCrossed,
} from 'lucide-react'
import { VPSession, VPContraindication, VPMedication, VPSupplement, VPLifestyle } from '@/types/virtual-provider'

type StatusFilter = 'all' | 'following' | 'new' | 'dismissed'

interface DashboardItem {
  id: string
  status: 'new' | 'following' | 'dismissed'
  _cat: string
  _name: string
  _subtitle: string
  _urgency: string
  _lifestyleCategory?: string
  _raw: VPMedication | VPSupplement | VPLifestyle
}

interface VPDashboardProps {
  session: VPSession
  onViewRecommendations: () => void
  onNewConsultation: () => void
  onUpdateStatus: (
    recommendationId: string,
    category: string,
    status: 'new' | 'following' | 'dismissed'
  ) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function lifestyleIcon(category: string) {
  switch (category) {
    case 'diet': return <UtensilsCrossed className="w-3.5 h-3.5" />
    case 'exercise': return <Dumbbell className="w-3.5 h-3.5" />
    case 'sleep': return <Moon className="w-3.5 h-3.5" />
    case 'stress': return <Brain className="w-3.5 h-3.5" />
    case 'hydration': return <Droplets className="w-3.5 h-3.5" />
    default: return <Heart className="w-3.5 h-3.5" />
  }
}

function urgencyDot(urgency: string) {
  switch (urgency) {
    case 'high': return 'bg-red-500'
    case 'moderate': return 'bg-yellow-500'
    default: return 'bg-blue-500'
  }
}

function buildItems(recs: VPSession['recommendations']): DashboardItem[] {
  if (!recs) return []
  const items: DashboardItem[] = []
  for (const m of recs.medications) {
    items.push({ id: m.id, status: m.status, _cat: 'medications', _name: m.name, _subtitle: m.suggested_dosage, _urgency: m.urgency, _raw: m })
  }
  for (const s of recs.supplements) {
    items.push({ id: s.id, status: s.status, _cat: 'supplements', _name: s.name, _subtitle: `${s.suggested_dosage} · ${s.form}`, _urgency: 'low', _raw: s })
  }
  for (const l of recs.lifestyle) {
    items.push({ id: l.id, status: l.status, _cat: 'lifestyle', _name: l.title, _subtitle: l.description, _urgency: l.priority, _lifestyleCategory: l.category, _raw: l })
  }
  return items
}

function DashboardCard({
  item,
  isExpanded,
  onToggle,
  onChangeStatus,
}: {
  item: DashboardItem
  isExpanded: boolean
  onToggle: () => void
  onChangeStatus: (status: 'new' | 'following' | 'dismissed') => void
}) {
  const statusColors = {
    following: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10',
    dismissed: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60',
    new: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
  }

  const statusIcons = {
    following: <CheckCircle className="w-4 h-4 text-green-500" />,
    dismissed: <XCircle className="w-4 h-4 text-gray-400" />,
    new: <Clock className="w-4 h-4 text-yellow-500" />,
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${statusColors[item.status]}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {statusIcons[item.status]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${urgencyDot(item._urgency)}`} />
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item._name}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{item._subtitle}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex gap-1.5">
              <button
                onClick={() => onChangeStatus('following')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  item.status === 'following'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-300 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400'
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                Following
              </button>
              <button
                onClick={() => onChangeStatus('new')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  item.status === 'new'
                    ? 'bg-yellow-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-yellow-300 dark:hover:border-yellow-700 hover:text-yellow-600 dark:hover:text-yellow-400'
                }`}
              >
                <Clock className="w-3 h-3" />
                Undecided
              </button>
              <button
                onClick={() => onChangeStatus('dismissed')}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  item.status === 'dismissed'
                    ? 'bg-gray-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <XCircle className="w-3 h-3" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ColumnHeader({ icon, label, count, color }: {
  icon: React.ReactNode
  label: string
  count: number
  color: string
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-b ${color}`}>
      <div className="text-gray-500 dark:text-gray-400">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex-1">{label}</h3>
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400">
        {count}
      </span>
    </div>
  )
}

export function VPDashboard({ session, onViewRecommendations, onNewConsultation, onUpdateStatus }: VPDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const recs = session.recommendations
  if (!recs) return null

  const allItems = buildItems(recs)
  const following = allItems.filter(i => i.status === 'following')
  const undecided = allItems.filter(i => i.status === 'new')
  const dismissed = allItems.filter(i => i.status === 'dismissed')
  const contraindications: VPContraindication[] = recs.contraindications || []

  const applyFilter = (items: DashboardItem[]) =>
    activeFilter === 'all' ? items : items.filter(i => i.status === activeFilter)

  const medItems = applyFilter(allItems.filter(i => i._cat === 'medications'))
  const suppItems = applyFilter(allItems.filter(i => i._cat === 'supplements'))
  const lifeItems = applyFilter(allItems.filter(i => i._cat === 'lifestyle'))

  const handleToggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const handleStatusChange = (itemId: string, category: string, status: 'new' | 'following' | 'dismissed') => {
    onUpdateStatus(itemId, category, status)
    setExpandedId(null)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {session.label}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatDate(session.created_at)} &middot; {session.total_metrics} metrics analyzed
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onViewRecommendations}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              View Full Recommendations
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNewConsultation}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Consultation
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 leading-relaxed">
          {recs.overview}
        </p>
      </div>

      {/* Stats row / filter buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setActiveFilter('all')}
          className={`rounded-xl p-4 text-center transition-all border-2 ${
            activeFilter === 'all'
              ? 'border-blue-500 bg-white dark:bg-gray-800 shadow-sm'
              : 'border-transparent bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{allItems.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All Items</p>
        </button>
        <button
          onClick={() => setActiveFilter('following')}
          className={`rounded-xl p-4 text-center transition-all border-2 ${
            activeFilter === 'following'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm'
              : 'border-transparent bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700'
          }`}
        >
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{following.length}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Following</p>
        </button>
        <button
          onClick={() => setActiveFilter('new')}
          className={`rounded-xl p-4 text-center transition-all border-2 ${
            activeFilter === 'new'
              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-sm'
              : 'border-transparent bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700'
          }`}
        >
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{undecided.length}</p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Undecided</p>
        </button>
        <button
          onClick={() => setActiveFilter('dismissed')}
          className={`rounded-xl p-4 text-center transition-all border-2 ${
            activeFilter === 'dismissed'
              ? 'border-gray-500 bg-gray-50 dark:bg-gray-800 shadow-sm'
              : 'border-transparent bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">{dismissed.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Not Following</p>
        </button>
      </div>

      {/* Contraindication banner */}
      {contraindications.length > 0 && activeFilter === 'all' && (
        <div className="p-4 mb-6 bg-amber-50 dark:bg-amber-900/15 rounded-xl border border-amber-200 dark:border-amber-800/50">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Provider note: {contraindications.length} item{contraindications.length !== 1 ? 's' : ''} to consider carefully
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                View full recommendations for details on items best used one at a time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Medications Column */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ColumnHeader
            icon={<Pill className="w-4 h-4" />}
            label="Medications"
            count={medItems.length}
            color="bg-purple-50/50 dark:bg-purple-900/10 border-gray-200 dark:border-gray-700"
          />
          <div className="p-2 space-y-2">
            {medItems.length === 0 ? (
              <div className="py-8 text-center">
                <Pill className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {activeFilter === 'all' ? 'None recommended' : 'No items match filter'}
                </p>
              </div>
            ) : (
              medItems.map(item => (
                <DashboardCard
                  key={item.id}
                  item={item}
                  isExpanded={expandedId === item.id}
                  onToggle={() => handleToggle(item.id)}
                  onChangeStatus={(status) => handleStatusChange(item.id, item._cat, status)}
                />
              ))
            )}
          </div>
        </div>

        {/* Supplements Column */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ColumnHeader
            icon={<Leaf className="w-4 h-4" />}
            label="Supplements"
            count={suppItems.length}
            color="bg-emerald-50/50 dark:bg-emerald-900/10 border-gray-200 dark:border-gray-700"
          />
          <div className="p-2 space-y-2">
            {suppItems.length === 0 ? (
              <div className="py-8 text-center">
                <Leaf className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {activeFilter === 'all' ? 'None recommended' : 'No items match filter'}
                </p>
              </div>
            ) : (
              suppItems.map(item => (
                <DashboardCard
                  key={item.id}
                  item={item}
                  isExpanded={expandedId === item.id}
                  onToggle={() => handleToggle(item.id)}
                  onChangeStatus={(status) => handleStatusChange(item.id, item._cat, status)}
                />
              ))
            )}
          </div>
        </div>

        {/* Lifestyle Column */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ColumnHeader
            icon={<Heart className="w-4 h-4" />}
            label="Lifestyle"
            count={lifeItems.length}
            color="bg-rose-50/50 dark:bg-rose-900/10 border-gray-200 dark:border-gray-700"
          />
          <div className="p-2 space-y-2">
            {lifeItems.length === 0 ? (
              <div className="py-8 text-center">
                <Heart className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {activeFilter === 'all' ? 'None recommended' : 'No items match filter'}
                </p>
              </div>
            ) : (
              lifeItems.map(item => (
                <DashboardCard
                  key={item.id}
                  item={item}
                  isExpanded={expandedId === item.id}
                  onToggle={() => handleToggle(item.id)}
                  onChangeStatus={(status) => handleStatusChange(item.id, item._cat, status)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          These recommendations are AI-generated and not a substitute for professional medical advice.
          Always consult with a healthcare provider before starting any medications or supplements.
        </p>
      </div>
    </div>
  )
}
