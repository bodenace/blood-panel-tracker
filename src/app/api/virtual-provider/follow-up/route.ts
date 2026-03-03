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

const RECOMMENDATION_SYSTEM = `You are a virtual healthcare provider generating personalized recommendations based on a patient's bloodwork analysis and their answers to follow-up questions.

You have access to:
1. The raw bloodwork data
2. A multi-agent clinical analysis (analyst + reviewer + provider synthesis)
3. The patient's answers to follow-up questions

Based on ALL of this context, provide structured recommendations. Be specific with dosages, frequencies, and reasoning. Always explain WHY each recommendation is being made.

IMPORTANT: You are providing educational health information, not prescribing. Frame medication suggestions as "discuss with your doctor" items.

Respond with ONLY valid JSON (no markdown fences):
{
  "overview": "2-3 sentence summary of your recommendation strategy based on the bloodwork and patient answers.",
  "medications": [
    {
      "id": "med-1",
      "name": "Medication name",
      "type": "prescription | otc",
      "suggested_dosage": "Dosage and frequency",
      "reasoning": "2-3 sentences explaining why this is recommended based on the bloodwork findings and patient answers.",
      "urgency": "high | moderate | low",
      "related_metrics": ["Metric Name 1"],
      "discuss_with_doctor": "Specific talking point for their doctor visit"
    }
  ],
  "supplements": [
    {
      "id": "sup-1",
      "name": "Supplement name",
      "suggested_dosage": "Dosage and frequency",
      "form": "Best form/type (e.g., 'D3 cholecalciferol' not just 'Vitamin D')",
      "reasoning": "2-3 sentences explaining the recommendation.",
      "expected_benefit": "What improvement to expect and rough timeline",
      "related_metrics": ["Metric Name 1"],
      "interactions_note": "Any important interactions to be aware of"
    }
  ],
  "lifestyle": [
    {
      "id": "life-1",
      "category": "diet | exercise | sleep | stress | hydration | other",
      "title": "Short actionable title",
      "description": "2-3 sentence specific, actionable recommendation.",
      "reasoning": "Why this matters for their specific bloodwork results.",
      "priority": "high | moderate | low",
      "related_metrics": ["Metric Name 1"]
    }
  ]
}`

const CONTRAINDICATION_SYSTEM = `You are a pharmacology and health safety specialist working alongside a virtual healthcare provider. You will be given a list of recommended medications, supplements, and lifestyle changes for a patient. Your role is to review the full set of recommendations and identify any items that are best not used together.

Check for:
1. Drug-drug interactions between medications
2. Drug-supplement interactions (e.g., blood thinners + fish oil, SSRIs + St. John's Wort)
3. Supplement-supplement conflicts (e.g., calcium interfering with iron absorption)
4. Medication-lifestyle conflicts (e.g., MAOIs + tyramine-rich diet recommendations)
5. Any combination that could cause adverse effects

Only report REAL, clinically significant contraindications. Do not be overly cautious — only flag pairs where combining them poses a genuine risk.

IMPORTANT: Frame the "reason" in a collaborative, professional tone — as a helpful note from the care team, not as a warning or disagreement. The provider recommended both items in good faith; your note simply helps the patient understand they work best when used one at a time.

Respond with ONLY valid JSON (no markdown fences):
{
  "contraindications": [
    {
      "id": "contra-1",
      "item_a": "id of first item (e.g. med-1, sup-2, life-3)",
      "item_b": "id of second item",
      "reason": "Brief, professional 1-2 sentence note explaining why these are best used one at a time and suggesting the patient choose whichever fits their situation.",
      "severity": "serious | moderate"
    }
  ]
}

If there are NO contraindications, return: { "contraindications": [] }`

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { user, sessionId, answers } = body

    if (!user || !sessionId || !answers) {
      return NextResponse.json(
        { error: 'user, sessionId, and answers are required' },
        { status: 400 }
      )
    }

    const sessionPath = path.join(getProviderDir(user), `${sessionId}.json`)
    if (!fs.existsSync(sessionPath)) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'))

    const questionsWithAnswers = (session.analysis.follow_up_questions || []).map(
      (q: { id: string; question: string; why_asking?: string; options: string[] }) => {
        const answer = answers[q.id]
        return {
          question: q.question,
          why_it_was_asked: q.why_asking || '',
          patient_answer: answer || 'No answer provided',
        }
      }
    )

    const prompt = `Generate personalized health recommendations for this patient.

BLOODWORK DATA:
${session.bloodwork_context}

CLINICAL ANALYSIS SUMMARY:
${session.analysis.provider_summary}

KEY FINDINGS:
${JSON.stringify(session.analysis.key_findings, null, 2)}

PATTERNS IDENTIFIED:
${JSON.stringify(session.analysis.patterns, null, 2)}

DETAILED ANALYST NOTES:
${JSON.stringify(session.analysis.agent1_raw?.detailed_analysis, null, 2)}

REVIEWER NOTES:
${JSON.stringify(session.analysis.agent2_review?.review, null, 2)}

PATIENT'S FOLLOW-UP ANSWERS:
${JSON.stringify(questionsWithAnswers, null, 2)}

Based on the complete picture — bloodwork data, clinical analysis, and the patient's own input — provide specific, actionable recommendations for medications to discuss with their doctor, supplements to consider, and lifestyle changes to implement.`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: RECOMMENDATION_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let clean = responseText.trim()
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let recommendations: Record<string, unknown>
    try {
      recommendations = JSON.parse(clean)
    } catch {
      return NextResponse.json(
        { error: 'Recommendation agent failed to produce valid JSON', raw: responseText.substring(0, 500) },
        { status: 422 }
      )
    }

    // Add tracking metadata to each recommendation item
    const now = new Date().toISOString()
    const addTracking = (items: Array<Record<string, unknown>>) =>
      items.map(item => ({
        ...item,
        status: 'new' as const,
        started_at: null,
        notes: '',
      }))

    const rawMeds = (recommendations.medications as Array<Record<string, unknown>>) || []
    const rawSups = (recommendations.supplements as Array<Record<string, unknown>>) || []
    const rawLife = (recommendations.lifestyle as Array<Record<string, unknown>>) || []

    const enrichedRecs = {
      overview: recommendations.overview,
      medications: addTracking(rawMeds),
      supplements: addTracking(rawSups),
      lifestyle: addTracking(rawLife),
      contraindications: [] as Array<Record<string, unknown>>,
      generated_at: now,
    }

    // Second LLM call: check for contraindications across all recommendations
    try {
      const allItems = {
        medications: rawMeds.map(m => ({
          id: m.id, name: m.name, type: m.type, suggested_dosage: m.suggested_dosage,
        })),
        supplements: rawSups.map(s => ({
          id: s.id, name: s.name, suggested_dosage: s.suggested_dosage, form: s.form,
        })),
        lifestyle: rawLife.map(l => ({
          id: l.id, title: l.title, category: l.category, description: l.description,
        })),
      }

      const contraResponse = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: CONTRAINDICATION_SYSTEM,
        messages: [{
          role: 'user',
          content: `Check the following recommendations for any contraindications or dangerous interactions:\n\n${JSON.stringify(allItems, null, 2)}`,
        }],
      })

      const contraText = contraResponse.content[0].type === 'text' ? contraResponse.content[0].text : '{}'
      let contraClean = contraText.trim()
      if (contraClean.startsWith('```')) {
        contraClean = contraClean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const contraResult = JSON.parse(contraClean)
      if (Array.isArray(contraResult.contraindications)) {
        enrichedRecs.contraindications = contraResult.contraindications
      }
    } catch (contraError) {
      console.error('Contraindication check failed (non-fatal):', contraError)
    }

    // Update session
    session.answers = answers
    session.recommendations = enrichedRecs
    session.status = 'completed'
    session.tracking_history = session.tracking_history || []
    session.tracking_history.push({
      date: now,
      event: 'recommendations_generated',
      summary: `Generated ${enrichedRecs.medications.length} medication, ${enrichedRecs.supplements.length} supplement, and ${enrichedRecs.lifestyle.length} lifestyle recommendations`,
    })

    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8')

    return NextResponse.json({ session })
  } catch (error: unknown) {
    console.error('Follow-up processing error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
