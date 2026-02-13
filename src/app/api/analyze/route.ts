import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function getAnalysisDir(user: string): string {
  return path.join(process.cwd(), 'src', 'data', user, '_analyses')
}

// GET /api/analyze?user=boden -- list all saved analyses
// GET /api/analyze?user=boden&id=abc123 -- load a specific analysis
export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get('user')
  const id = request.nextUrl.searchParams.get('id')

  if (!user) {
    return NextResponse.json({ error: 'No user specified' }, { status: 400 })
  }

  const analysisDir = getAnalysisDir(user)

  if (!fs.existsSync(analysisDir)) {
    // If no _analyses dir, check for legacy _analysis.json and migrate it
    const legacyPath = path.join(process.cwd(), 'src', 'data', user, '_analysis.json')
    if (fs.existsSync(legacyPath)) {
      try {
        const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'))
        // Migrate: create _analyses dir and move it there
        fs.mkdirSync(analysisDir, { recursive: true })
        const legacyId = 'migrated-' + Date.now()
        const migrated = { ...legacy, id: legacyId, label: 'Previous Analysis', source_files: [] }
        fs.writeFileSync(path.join(analysisDir, `${legacyId}.json`), JSON.stringify(migrated, null, 2), 'utf-8')
        fs.unlinkSync(legacyPath)
        if (!id) {
          return NextResponse.json({ analyses: [migrated] })
        }
      } catch {
        // If migration fails, just proceed with empty
      }
    }
    if (!fs.existsSync(analysisDir)) {
      return id ? NextResponse.json({ analysis: null }) : NextResponse.json({ analyses: [] })
    }
  }

  // Load specific analysis
  if (id) {
    const filePath = path.join(analysisDir, `${id}.json`)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ analysis: null })
    }
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return NextResponse.json({ analysis: content })
    } catch {
      return NextResponse.json({ analysis: null })
    }
  }

  // List all analyses
  try {
    const files = fs.readdirSync(analysisDir)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(analysisDir, filename), 'utf-8'))
          return content
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .sort((a: { generated_at?: string }, b: { generated_at?: string }) =>
        (b.generated_at ?? '').localeCompare(a.generated_at ?? '')
      )
    return NextResponse.json({ analyses: files })
  } catch {
    return NextResponse.json({ analyses: [] })
  }
}

const ANALYSIS_SYSTEM_PROMPT = `You are a health data analyst reviewing bloodwork lab results. You will receive structured data about a person's blood panel metrics, including which ones are out of range.

Your job is to provide a clear, actionable health analysis. You are NOT a doctor and should note that, but you can identify patterns and suggest areas to discuss with a healthcare provider.

Respond with ONLY valid JSON (no markdown fences) in this exact structure:
{
  "summary": "2-3 sentence overall health summary based on the bloodwork data.",
  "flagged_metrics": [
    {
      "name": "Metric Name",
      "value": "the value",
      "unit": "unit",
      "flag": "High or Low",
      "reference_range": "range string",
      "explanation": "1-2 sentences about what this specific out-of-range value means clinically.",
      "connections": "1-2 sentences about how this metric relates to OTHER flagged metrics. What pattern emerges when you look at them together.",
      "possible_causes": ["cause 1", "cause 2"]
    }
  ],
  "patterns": [
    {
      "title": "Short pattern name (e.g. 'Possible Iron Deficiency')",
      "description": "2-3 sentences explaining the pattern across multiple metrics and what it could indicate.",
      "related_metrics": ["Metric Name 1", "Metric Name 2"],
      "severity": "low | moderate | notable"
    }
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ]
}`

// POST /api/analyze -- generate new analysis for selected files
export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { user, metrics, sourceFiles, label } = body

    if (!user || !metrics) {
      return NextResponse.json({ error: 'user and metrics are required' }, { status: 400 })
    }

    // Build a clean data summary for Claude
    const metricSummary = metrics.map((m: {
      metricName: string
      category: string
      unit: string
      readings: Array<{
        date: string
        value: number | null
        valueText: string
        flag: string | null
        refLow?: number
        refHigh?: number
        refText?: string
      }>
    }) => {
      const latest = m.readings[m.readings.length - 1]
      const previous = m.readings.length > 1 ? m.readings[m.readings.length - 2] : null
      return {
        name: m.metricName,
        category: m.category,
        latestValue: latest?.valueText ?? 'N/A',
        unit: m.unit,
        flag: latest?.flag ?? null,
        referenceRange: latest?.refText ?? null,
        previousValue: previous?.valueText ?? null,
        previousDate: previous?.date ?? null,
        latestDate: latest?.date ?? null,
        dataPoints: m.readings.length,
      }
    })

    const outOfRange = metricSummary.filter((m: { flag: string | null }) => m.flag === 'High' || m.flag === 'Low')
    const inRange = metricSummary.filter((m: { flag: string | null }) => m.flag !== 'High' && m.flag !== 'Low')

    const filesContext = sourceFiles && sourceFiles.length > 0
      ? `\nThis data comes from the following bloodwork files: ${sourceFiles.join(', ')}\n`
      : ''

    const prompt = `Here is a person's complete bloodwork data. Analyze it with focus on the out-of-range metrics.
${filesContext}
OUT OF RANGE METRICS (${outOfRange.length}):
${JSON.stringify(outOfRange, null, 2)}

IN RANGE METRICS (${inRange.length}):
${JSON.stringify(inRange, null, 2)}

Please analyze ALL out-of-range metrics, identify patterns between them, and provide actionable insights. Consider how flagged metrics may relate to each other.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'

    let cleanJson = responseText.trim()
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let analysis: unknown
    try {
      analysis = JSON.parse(cleanJson)
    } catch {
      return NextResponse.json(
        { error: 'AI failed to produce valid analysis JSON', raw: responseText.substring(0, 500) },
        { status: 422 }
      )
    }

    // Generate a unique ID
    const analysisId = `analysis-${Date.now()}`

    // Store the analysis with metadata
    const storedAnalysis = {
      ...analysis as Record<string, unknown>,
      id: analysisId,
      generated_at: new Date().toISOString(),
      user,
      label: label || `Analysis - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      source_files: sourceFiles || [],
      out_of_range_count: outOfRange.length,
      total_metrics: metricSummary.length,
    }

    // Write to _analyses directory
    const analysisDir = getAnalysisDir(user)
    fs.mkdirSync(analysisDir, { recursive: true })
    fs.writeFileSync(path.join(analysisDir, `${analysisId}.json`), JSON.stringify(storedAnalysis, null, 2), 'utf-8')

    return NextResponse.json({ analysis: storedAnalysis })
  } catch (error: unknown) {
    console.error('Analysis error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/analyze -- rename a saved analysis
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, id, label } = body

    if (!user || !id || !label) {
      return NextResponse.json({ error: 'user, id, and label are required' }, { status: 400 })
    }

    const filePath = path.join(getAnalysisDir(user), `${id}.json`)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    content.label = label
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')

    return NextResponse.json({ analysis: content })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/analyze?user=boden&id=abc123 -- delete a saved analysis
export async function DELETE(request: NextRequest) {
  const user = request.nextUrl.searchParams.get('user')
  const id = request.nextUrl.searchParams.get('id')

  if (!user || !id) {
    return NextResponse.json({ error: 'user and id are required' }, { status: 400 })
  }

  const filePath = path.join(getAnalysisDir(user), `${id}.json`)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  }

  fs.unlinkSync(filePath)
  return NextResponse.json({ success: true })
}
