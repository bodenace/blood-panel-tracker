import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-20250514'

function getProviderDir(user: string): string {
  return path.join(process.cwd(), 'src', 'data', user, '_provider')
}

// ── System Prompts ──

const AGENT1_SYSTEM = `You are a clinical laboratory data analyst. You receive structured bloodwork data and produce a detailed clinical analysis.

Your job:
1. Analyze every out-of-range metric and explain its clinical significance.
2. Identify patterns across metrics (e.g., iron panel consistency, liver enzyme clusters, thyroid axis).
3. Note any in-range metrics that are borderline or trending in a concerning direction.
4. Generate 4-8 follow-up questions that would help narrow down root causes or optimization strategies. Each question must have 3-5 multiple-choice options plus an "Other" free-text option.

Respond with ONLY valid JSON (no markdown fences):
{
  "detailed_analysis": {
    "summary": "3-5 sentence detailed clinical summary",
    "flagged_metrics": [
      {
        "name": "Metric Name",
        "value": "the value",
        "unit": "unit",
        "flag": "High or Low",
        "reference_range": "range string",
        "clinical_significance": "2-3 sentences on clinical meaning",
        "connections": "How this relates to other flagged metrics",
        "possible_causes": ["cause 1", "cause 2", "cause 3"]
      }
    ],
    "patterns": [
      {
        "title": "Pattern name",
        "description": "2-3 sentence description",
        "related_metrics": ["Metric 1", "Metric 2"],
        "severity": "low | moderate | notable",
        "clinical_implications": "What this pattern suggests clinically"
      }
    ],
    "borderline_concerns": [
      {
        "name": "Metric Name",
        "value": "value",
        "note": "Why this in-range value deserves attention"
      }
    ]
  },
  "follow_up_questions": [
    {
      "id": "q1",
      "question": "Clear, specific question text",
      "context": "Brief note on why this question matters for the analysis",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "allow_multiple": false
    }
  ]
}

IMPORTANT for follow_up_questions: Set "allow_multiple" to true ONLY when a patient could reasonably have more than one answer at the same time (e.g., "Which of these symptoms do you experience?" or "Which of these supplements do you currently take?"). For questions where only one answer makes sense (e.g., "How often do you exercise?" or "How would you describe your diet?"), set it to false.`

const AGENT2_SYSTEM = `You are a senior clinical reviewer specializing in laboratory medicine quality assurance. You receive raw bloodwork data along with a junior analyst's interpretation.

Your job:
1. Verify every clinical claim the analyst made against the raw data.
2. Check for missed patterns or incorrect connections between metrics.
3. Flag any reasoning errors, overstatements, or missed nuances.
4. Confirm what the analyst got right.
5. Review the follow-up questions for clinical relevance and completeness.

Respond with ONLY valid JSON (no markdown fences):
{
  "review": {
    "overall_assessment": "accurate | mostly_accurate | needs_correction",
    "confirmed_findings": ["Finding that is correct", "Another correct finding"],
    "corrections": [
      {
        "original_claim": "What the analyst said",
        "correction": "What should be said instead",
        "reasoning": "Why this correction matters"
      }
    ],
    "missed_findings": [
      {
        "finding": "What was missed",
        "significance": "Why it matters",
        "related_metrics": ["Metric 1"]
      }
    ],
    "question_feedback": [
      {
        "question_id": "q1",
        "assessment": "keep | modify | remove",
        "suggestion": "Optional modification or replacement"
      }
    ],
    "additional_questions": [
      {
        "id": "qr1",
        "question": "Additional question the analyst missed",
        "context": "Why this question is important",
        "options": ["Option A", "Option B", "Option C"]
      }
    ]
  }
}`

const AGENT3_SYSTEM = `You are a virtual healthcare provider synthesizing two independent analyses of a patient's bloodwork. You have:
1. The raw bloodwork data
2. An analyst's detailed interpretation
3. A senior reviewer's validation of that interpretation

Your job is to produce the FINAL output that the patient will see. You must:
1. Synthesize both perspectives into a simple, patient-friendly summary (no jargon).
2. Produce a refined set of follow-up questions incorporating the reviewer's feedback.
3. Be accurate but accessible — explain things the way a good doctor would to a patient.

Respond with ONLY valid JSON (no markdown fences):
{
  "provider_summary": "3-5 sentence patient-friendly summary. Use plain language. Mention what looks good AND what needs attention.",
  "key_findings": [
    {
      "title": "Short finding name",
      "explanation": "1-2 sentence plain-language explanation",
      "severity": "good | watch | attention",
      "related_metrics": ["Metric 1"]
    }
  ],
  "patterns": [
    {
      "title": "Pattern name",
      "description": "Patient-friendly description",
      "severity": "low | moderate | notable",
      "what_it_means": "Plain language explanation of implications"
    }
  ],
  "follow_up_questions": [
    {
      "id": "q1",
      "question": "Clear question in plain language",
      "why_asking": "Brief patient-friendly explanation of why this matters",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "allow_multiple": false
    }
  ]
}

IMPORTANT for follow_up_questions: Set "allow_multiple" to true ONLY when a patient could reasonably have more than one answer at the same time (e.g., "Which of these symptoms do you experience?" or "Which of these supplements do you currently take?"). For questions where only one answer makes sense (e.g., "How often do you exercise?" or "How would you describe your diet?"), set it to false.`

// ── Helpers ──

function buildMetricSummary(metrics: Array<{
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
}>) {
  return metrics.map(m => {
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
}

function parseAgentResponse(responseText: string): unknown {
  let clean = responseText.trim()
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }
  return JSON.parse(clean)
}

// ── GET: list or load sessions ──

export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get('user')
  const id = request.nextUrl.searchParams.get('id')

  if (!user) {
    return NextResponse.json({ error: 'No user specified' }, { status: 400 })
  }

  const providerDir = getProviderDir(user)

  if (!fs.existsSync(providerDir)) {
    return id
      ? NextResponse.json({ session: null })
      : NextResponse.json({ sessions: [] })
  }

  if (id) {
    const filePath = path.join(providerDir, `${id}.json`)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ session: null })
    }
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return NextResponse.json({ session: content })
    } catch {
      return NextResponse.json({ session: null })
    }
  }

  try {
    const files = fs.readdirSync(providerDir)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        try {
          return JSON.parse(fs.readFileSync(path.join(providerDir, filename), 'utf-8'))
        } catch {
          return null
        }
      })
      .filter(Boolean)
      .sort((a: { created_at?: string }, b: { created_at?: string }) =>
        (b.created_at ?? '').localeCompare(a.created_at ?? '')
      )
    return NextResponse.json({ sessions: files })
  } catch {
    return NextResponse.json({ sessions: [] })
  }
}

// ── POST: run 3-agent pipeline ──

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { user, metrics, sourceFiles, label, initialPrompt } = body

    if (!user || !metrics) {
      return NextResponse.json({ error: 'user and metrics are required' }, { status: 400 })
    }

    const metricSummary = buildMetricSummary(metrics)
    const outOfRange = metricSummary.filter(m => m.flag === 'High' || m.flag === 'Low')
    const inRange = metricSummary.filter(m => m.flag !== 'High' && m.flag !== 'Low')

    const filesContext = sourceFiles?.length > 0
      ? `\nBloodwork files analyzed: ${sourceFiles.join(', ')}\n`
      : ''

    const patientContext = initialPrompt?.trim()
      ? `\nPATIENT-PROVIDED CONTEXT:\n"${initialPrompt.trim()}"\n\nIMPORTANT: The patient has shared the above context. Factor this into your analysis — it may explain certain lab values, suggest areas to investigate more closely, or inform which follow-up questions are most relevant.\n`
      : ''

    const bloodworkContext = `${filesContext}${patientContext}
OUT OF RANGE METRICS (${outOfRange.length}):
${JSON.stringify(outOfRange, null, 2)}

IN RANGE METRICS (${inRange.length}):
${JSON.stringify(inRange, null, 2)}`

    // ── Agent 1: Analyst ──
    const agent1Prompt = `Here is a patient's complete bloodwork data. Provide a thorough clinical analysis and generate follow-up questions.

${bloodworkContext}

Analyze ALL out-of-range metrics, identify cross-metric patterns, note borderline in-range values, and create targeted follow-up questions.${initialPrompt?.trim() ? ' Pay special attention to how the lab results relate to the patient-provided context above.' : ''}`

    const agent1Response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: AGENT1_SYSTEM,
      messages: [{ role: 'user', content: agent1Prompt }],
    })

    const agent1Text = agent1Response.content[0].type === 'text' ? agent1Response.content[0].text : '{}'
    let agent1Result: Record<string, unknown>
    try {
      agent1Result = parseAgentResponse(agent1Text) as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { error: 'Agent 1 (Analyst) failed to produce valid JSON', raw: agent1Text.substring(0, 500) },
        { status: 422 }
      )
    }

    // ── Agent 2: Reviewer ──
    const agent2Prompt = `Review this bloodwork analysis for clinical accuracy.

RAW BLOODWORK DATA:
${bloodworkContext}

ANALYST'S INTERPRETATION:
${JSON.stringify(agent1Result, null, 2)}

Validate every claim against the raw data. Flag errors, missed patterns, and assess the follow-up questions.`

    const agent2Response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: AGENT2_SYSTEM,
      messages: [{ role: 'user', content: agent2Prompt }],
    })

    const agent2Text = agent2Response.content[0].type === 'text' ? agent2Response.content[0].text : '{}'
    let agent2Result: Record<string, unknown>
    try {
      agent2Result = parseAgentResponse(agent2Text) as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { error: 'Agent 2 (Reviewer) failed to produce valid JSON', raw: agent2Text.substring(0, 500) },
        { status: 422 }
      )
    }

    // ── Agent 3: Provider ──
    const agent3Prompt = `Synthesize these two analyses into a final patient-facing output.

RAW BLOODWORK DATA:
${bloodworkContext}

ANALYST'S DETAILED INTERPRETATION:
${JSON.stringify(agent1Result, null, 2)}

SENIOR REVIEWER'S VALIDATION:
${JSON.stringify(agent2Result, null, 2)}

Produce a patient-friendly summary, key findings, and refined follow-up questions that incorporate the reviewer's feedback.`

    const agent3Response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: AGENT3_SYSTEM,
      messages: [{ role: 'user', content: agent3Prompt }],
    })

    const agent3Text = agent3Response.content[0].type === 'text' ? agent3Response.content[0].text : '{}'
    let agent3Result: Record<string, unknown>
    try {
      agent3Result = parseAgentResponse(agent3Text) as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { error: 'Agent 3 (Provider) failed to produce valid JSON', raw: agent3Text.substring(0, 500) },
        { status: 422 }
      )
    }

    // ── Build and store session ──
    const sessionId = `vp-${Date.now()}`

    const session = {
      id: sessionId,
      user,
      created_at: new Date().toISOString(),
      status: 'awaiting_answers' as const,
      label: label || `Session - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      source_files: sourceFiles || [],
      initial_prompt: initialPrompt?.trim() || undefined,
      out_of_range_count: outOfRange.length,
      total_metrics: metricSummary.length,
      bloodwork_context: bloodworkContext,
      analysis: {
        agent1_raw: agent1Result,
        agent2_review: agent2Result,
        provider_summary: agent3Result.provider_summary,
        key_findings: agent3Result.key_findings,
        patterns: agent3Result.patterns,
        follow_up_questions: agent3Result.follow_up_questions,
      },
      answers: {} as Record<string, string>,
      recommendations: null,
      tracking_history: [] as Array<Record<string, unknown>>,
    }

    const providerDir = getProviderDir(user)
    fs.mkdirSync(providerDir, { recursive: true })
    fs.writeFileSync(
      path.join(providerDir, `${sessionId}.json`),
      JSON.stringify(session, null, 2),
      'utf-8'
    )

    return NextResponse.json({ session })
  } catch (error: unknown) {
    console.error('Virtual Provider pipeline error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── PATCH: rename or update session ──

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { user, id, label } = body

    if (!user || !id || !label) {
      return NextResponse.json({ error: 'user, id, and label are required' }, { status: 400 })
    }

    const filePath = path.join(getProviderDir(user), `${id}.json`)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    content.label = label
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8')

    return NextResponse.json({ session: content })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── DELETE: remove a session ──

export async function DELETE(request: NextRequest) {
  const user = request.nextUrl.searchParams.get('user')
  const id = request.nextUrl.searchParams.get('id')

  if (!user || !id) {
    return NextResponse.json({ error: 'user and id are required' }, { status: 400 })
  }

  const filePath = path.join(getProviderDir(user), `${id}.json`)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  fs.unlinkSync(filePath)
  return NextResponse.json({ success: true })
}
