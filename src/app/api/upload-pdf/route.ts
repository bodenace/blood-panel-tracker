import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { BloodworkFileSchema } from '@/types/bloodwork'
import * as fs from 'fs'
import * as path from 'path'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Example JSON so Claude knows the exact target format
const EXAMPLE_JSON = `{
  "collection_date": "2024-01-03",
  "panels": [
    {
      "panel_name": "CBC with Diff, Platelet, NLR",
      "tests": [
        { "name": "WBC", "result": 5.4, "unit": "x10E3/uL", "reference_range": "3.4-10.8", "flag": null },
        { "name": "RBC", "result": 5.57, "unit": "x10E6/uL", "reference_range": "4.14-5.80", "flag": null },
        { "name": "Hemoglobin", "result": 16.6, "unit": "g/dL", "reference_range": "13.0-17.7", "flag": null }
      ]
    },
    {
      "panel_name": "Comprehensive Metabolic Panel",
      "tests": [
        { "name": "Glucose", "result": 93, "unit": "mg/dL", "reference_range": "70-99", "flag": null },
        { "name": "Alkaline Phosphatase", "result": 171, "unit": "IU/L", "reference_range": "44-121", "flag": "High" }
      ]
    }
  ]
}`

const CONVERSION_SYSTEM_PROMPT = `You are a medical data extraction specialist. Your job is to read a bloodwork lab report PDF and convert it into a specific JSON format.

CRITICAL RULES:
1. Extract EVERY test result from the document. Do not skip any.
2. The "collection_date" must be in YYYY-MM-DD format. Look for "Date Collected", "Collection Date", "Specimen Collection Date", "Date of Service", or similar fields. If multiple dates exist, use the earliest specimen/collection date.
3. Group tests into panels based on how they appear in the document (e.g., "CBC", "Comprehensive Metabolic Panel", "Lipid Panel", etc.). If the PDF doesn't clearly separate panels, group related tests logically.
4. For each test:
   - "name": The test name exactly as shown (e.g., "WBC", "Hemoglobin", "Glucose")
   - "result": The numeric value as a NUMBER (not a string). For example, 5.4 not "5.4". If the result contains a comparator like "<5.0" or ">60", THEN use a string.
   - "unit": The unit of measurement (e.g., "mg/dL", "x10E3/uL"). Use null if no unit is shown.
   - "reference_range": The reference/normal range as a string (e.g., "3.4-10.8", ">59", "0.0-1.2"). Use null if not provided.
   - "flag": "High" if flagged high/abnormal high (H, HI, HIGH, abnormal high, etc.), "Low" if flagged low/abnormal low (L, LO, LOW, abnormal low, etc.), null if normal or not flagged. Always use the full words "High" or "Low".
5. If a "report_date" is available (different from collection date), include it as "report_date" in YYYY-MM-DD format.
6. Do NOT include any text outside the JSON object. No explanation, no markdown fences, no commentary.

Here is an example of the exact output format:
${EXAMPLE_JSON}`

const VERIFICATION_SYSTEM_PROMPT = `You are a medical data verification specialist. You will receive:
1. A PDF document (the original bloodwork report)
2. A JSON representation of that data

Your job is to carefully re-read the PDF and verify the JSON is accurate.

Check EVERY test in the PDF and verify:
- All tests are present (none missing from the JSON)
- Numeric result values match exactly
- Units are correct
- Reference ranges are correct
- Flags (High/Low/null) are correct
- The collection_date is correct

If you find ANY issues, you MUST provide the full corrected JSON in the "corrected_json" field.

RESPOND WITH ONLY valid JSON in this exact format (no markdown fences, no other text):
{
  "is_accurate": true,
  "confidence": 0.95,
  "issues": [],
  "corrected_json": null
}

Or if issues are found:
{
  "is_accurate": false,
  "confidence": 0.85,
  "issues": [
    { "field": "panels[0].tests[2].result", "expected": "5.4", "found": "54", "severity": "high" }
  ],
  "corrected_json": { ... the entire corrected JSON object ... }
}`

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured. Please add your API key to .env.local' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('pdf') as File | null
    const user = formData.get('user') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })
    }

    if (!user) {
      return NextResponse.json({ error: 'No user specified' }, { status: 400 })
    }

    // Read the PDF and encode as base64
    const arrayBuffer = await file.arrayBuffer()
    const base64Pdf = Buffer.from(arrayBuffer).toString('base64')

    // --- Pass 1: Send PDF directly to Claude for conversion ---
    const conversionMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: CONVERSION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: 'Read this bloodwork PDF carefully and convert it to the specified JSON format. Extract every single test result from every panel.',
            },
          ],
        },
      ],
    })

    const pass1Raw = conversionMessage.content[0].type === 'text' ? conversionMessage.content[0].text : ''

    // Clean up response -- strip markdown fences if present
    let jsonStr = pass1Raw.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        {
          error: 'AI failed to produce valid JSON in conversion pass',
          raw: pass1Raw.substring(0, 1000),
        },
        { status: 422 }
      )
    }

    // --- Pass 2: Send PDF + generated JSON to Claude for verification ---
    const verificationMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: VERIFICATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: `Here is the JSON that was generated from the PDF above. Re-read the PDF and verify every single value.\n\nGENERATED JSON:\n${JSON.stringify(parsedJson, null, 2)}`,
            },
          ],
        },
      ],
    })

    const verificationRaw = verificationMessage.content[0].type === 'text' ? verificationMessage.content[0].text : '{}'

    let verificationClean = verificationRaw.trim()
    if (verificationClean.startsWith('```')) {
      verificationClean = verificationClean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let verification: {
      is_accurate: boolean
      confidence: number
      issues: Array<{ field: string; expected: string; found: string; severity: string }>
      corrected_json: unknown | null
    }

    try {
      verification = JSON.parse(verificationClean)
    } catch {
      verification = {
        is_accurate: true,
        confidence: 0.6,
        issues: [{ field: 'verification', expected: 'valid response', found: 'parse error', severity: 'medium' }],
        corrected_json: null,
      }
    }

    // Use corrected JSON if verification provided corrections
    const finalJson = verification.corrected_json || parsedJson

    // --- Zod validation ---
    const zodResult = BloodworkFileSchema.safeParse(finalJson)
    if (!zodResult.success) {
      return NextResponse.json(
        {
          error: 'Generated JSON does not match the bloodwork schema',
          zodErrors: zodResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
          verification,
          generatedJson: finalJson,
        },
        { status: 422 }
      )
    }

    const validatedData = zodResult.data

    // --- Determine filename from collection_date ---
    const dateParts = validatedData.collection_date.split('-')
    const mm = dateParts[1]
    const dd = dateParts[2]
    const yy = dateParts[0].slice(-2)
    const filename = `${mm}-${dd}-${yy}.json`

    // --- Write files to disk ---
    const projectRoot = process.cwd()
    const dataDir = path.join(projectRoot, 'src', 'data', user)
    const archiveRoot = path.resolve(projectRoot, '..', 'BloodworkJSONS.json', user)

    fs.mkdirSync(dataDir, { recursive: true })
    fs.mkdirSync(archiveRoot, { recursive: true })

    const jsonContent = JSON.stringify(finalJson, null, 2)
    const dataPath = path.join(dataDir, filename)
    const archivePath = path.join(archiveRoot, filename)

    fs.writeFileSync(dataPath, jsonContent, 'utf-8')
    fs.writeFileSync(archivePath, jsonContent, 'utf-8')

    return NextResponse.json({
      success: true,
      filename,
      collectionDate: validatedData.collection_date,
      panelCount: validatedData.panels.length,
      testCount: validatedData.panels.reduce((sum, p) => sum + p.tests.length, 0),
      verification: {
        is_accurate: verification.is_accurate,
        confidence: verification.confidence,
        issues: verification.issues || [],
        hadCorrections: verification.corrected_json !== null,
      },
      data: finalJson,
      savedTo: {
        data: dataPath,
        archive: archivePath,
      },
    })
  } catch (error: unknown) {
    console.error('Upload PDF error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
