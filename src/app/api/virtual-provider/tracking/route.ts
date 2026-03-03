import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

function getProviderDir(user: string): string {
  return path.join(process.cwd(), 'src', 'data', user, '_provider')
}

interface RecommendationItem {
  id: string
  name?: string
  title?: string
  status: 'new' | 'following' | 'dismissed'
  started_at: string | null
  notes: string
  related_metrics?: string[]
}

interface Session {
  id: string
  user: string
  status: string
  recommendations: {
    medications: RecommendationItem[]
    supplements: RecommendationItem[]
    lifestyle: RecommendationItem[]
  } | null
  tracking_history: Array<Record<string, unknown>>
  [key: string]: unknown
}

// GET /api/virtual-provider/tracking?user=boden
// Returns tracking summary across all completed sessions
export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get('user')

  if (!user) {
    return NextResponse.json({ error: 'No user specified' }, { status: 400 })
  }

  const providerDir = getProviderDir(user)
  if (!fs.existsSync(providerDir)) {
    return NextResponse.json({ tracking: { sessions: [], active_recommendations: [] } })
  }

  try {
    const sessions: Session[] = fs.readdirSync(providerDir)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        try {
          return JSON.parse(fs.readFileSync(path.join(providerDir, filename), 'utf-8'))
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .filter((s: Session) => s.status === 'completed' && s.recommendations)
      .sort((a: Session, b: Session) =>
        ((b.created_at as string) ?? '').localeCompare((a.created_at as string) ?? '')
      )

    const activeRecommendations: Array<{
      session_id: string
      session_label: string
      session_date: string
      category: string
      item: RecommendationItem
    }> = []

    for (const session of sessions) {
      if (!session.recommendations) continue
      const cats = ['medications', 'supplements', 'lifestyle'] as const
      for (const cat of cats) {
        const items = session.recommendations[cat] || []
        for (const item of items) {
          activeRecommendations.push({
            session_id: session.id,
            session_label: (session.label as string) || session.id,
            session_date: (session.created_at as string) || '',
            category: cat,
            item,
          })
        }
      }
    }

    return NextResponse.json({
      tracking: {
        sessions: sessions.map(s => ({
          id: s.id,
          label: s.label,
          created_at: s.created_at,
          status: s.status,
          tracking_history: s.tracking_history,
          recommendation_counts: s.recommendations ? {
            medications: s.recommendations.medications?.length || 0,
            supplements: s.recommendations.supplements?.length || 0,
            lifestyle: s.recommendations.lifestyle?.length || 0,
          } : null,
        })),
        active_recommendations: activeRecommendations,
      },
    })
  } catch {
    return NextResponse.json({ tracking: { sessions: [], active_recommendations: [] } })
  }
}

// PATCH /api/virtual-provider/tracking
// Update a recommendation's status (following, dismissed, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, sessionId, recommendationId, category, status, notes } = body

    if (!user || !sessionId || !recommendationId || !category) {
      return NextResponse.json(
        { error: 'user, sessionId, recommendationId, and category are required' },
        { status: 400 }
      )
    }

    const sessionPath = path.join(getProviderDir(user), `${sessionId}.json`)
    if (!fs.existsSync(sessionPath)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const session: Session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'))
    if (!session.recommendations) {
      return NextResponse.json({ error: 'Session has no recommendations' }, { status: 400 })
    }

    const validCategories = ['medications', 'supplements', 'lifestyle'] as const
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const items = session.recommendations[category as typeof validCategories[number]]
    const item = items.find((i: RecommendationItem) => i.id === recommendationId)
    if (!item) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
    }

    const oldStatus = item.status
    if (status) item.status = status
    if (notes !== undefined) item.notes = notes
    if (status === 'following' && !item.started_at) {
      item.started_at = new Date().toISOString()
    }

    session.tracking_history = session.tracking_history || []
    session.tracking_history.push({
      date: new Date().toISOString(),
      event: 'status_change',
      recommendation_id: recommendationId,
      category,
      from: oldStatus,
      to: status || oldStatus,
    })

    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8')

    return NextResponse.json({ session })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/virtual-provider/tracking
// Auto-compare new bloodwork against active recommendations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, newMetrics } = body

    if (!user || !newMetrics) {
      return NextResponse.json({ error: 'user and newMetrics are required' }, { status: 400 })
    }

    const providerDir = getProviderDir(user)
    if (!fs.existsSync(providerDir)) {
      return NextResponse.json({ comparisons: [] })
    }

    const sessions: Session[] = fs.readdirSync(providerDir)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        try {
          return JSON.parse(fs.readFileSync(path.join(providerDir, filename), 'utf-8'))
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .filter((s: Session) => s.status === 'completed' && s.recommendations)

    const latestMetricMap = new Map<string, { value: number; date: string }>()
    for (const m of newMetrics) {
      if (m.readings?.length > 0) {
        const latest = m.readings[m.readings.length - 1]
        if (latest.value !== null) {
          latestMetricMap.set(m.metricName, { value: latest.value, date: latest.date })
        }
      }
    }

    const comparisons: Array<{
      session_id: string
      recommendation_id: string
      category: string
      recommendation_name: string
      metric_name: string
      direction: 'improving' | 'stable' | 'worsening'
      current_value: number
      date: string
    }> = []

    for (const session of sessions) {
      if (!session.recommendations) continue
      const cats = ['medications', 'supplements', 'lifestyle'] as const
      for (const cat of cats) {
        const items = session.recommendations[cat] || []
        for (const item of items) {
          if (item.status !== 'following') continue
          const relatedMetrics = item.related_metrics || []
          for (const metricName of relatedMetrics) {
            const current = latestMetricMap.get(metricName)
            if (current) {
              comparisons.push({
                session_id: session.id,
                recommendation_id: item.id,
                category: cat,
                recommendation_name: item.name || item.title || item.id,
                metric_name: metricName,
                direction: 'stable',
                current_value: current.value,
                date: current.date,
              })
            }
          }
        }
      }
    }

    // Record the comparison event in the most recent session
    if (sessions.length > 0 && comparisons.length > 0) {
      const mostRecent = sessions.sort((a, b) =>
        ((b.created_at as string) ?? '').localeCompare((a.created_at as string) ?? '')
      )[0]

      mostRecent.tracking_history = mostRecent.tracking_history || []
      mostRecent.tracking_history.push({
        date: new Date().toISOString(),
        event: 'new_bloodwork_comparison',
        comparisons_count: comparisons.length,
        metrics_checked: [...new Set(comparisons.map(c => c.metric_name))],
      })

      const sessionPath = path.join(providerDir, `${mostRecent.id}.json`)
      fs.writeFileSync(sessionPath, JSON.stringify(mostRecent, null, 2), 'utf-8')
    }

    return NextResponse.json({ comparisons })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
