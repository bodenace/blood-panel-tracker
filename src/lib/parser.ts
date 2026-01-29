import { BloodworkFileSchema, RawBloodworkFile, MetricReading, Comparator } from '@/types/bloodwork'
import { getCanonicalName, slugify } from './metricAliases'

// Category normalization
const categoryOverrides: Record<string, string> = {
  'Hormones / Other': 'Hormones',
  'FSH and LH': 'Hormones',
  'Free Testosterone': 'Hormones',
  'Free Testosterone (Direct)': 'Hormones',
  'DHEA-Sulfate': 'Hormones',
  'DHEA-S': 'Hormones',
  'Testosterone': 'Hormones',
  'Prolactin': 'Hormones',
  'Estradiol': 'Hormones',
  'IGF-1': 'Hormones',
  'Cortisol': 'Hormones',
  'Follicle-Stimulating Hormone': 'Hormones',
  'Luteinizing Hormone': 'Hormones',
  'PSA': 'Hormones',
  'Free PSA': 'Hormones',
  'Total PSA': 'Hormones',
  'TSH and Free T4': 'Thyroid',
  'T3, Free': 'Thyroid',
  'T4, Free': 'Thyroid',
  'Thyroid Stimulating Hormone': 'Thyroid',
  'Total T3 (Triiodothyronine)': 'Thyroid',
  'Total T4 (Thyroxine)': 'Thyroid',
  'Free T3': 'Thyroid',
  'SHBG': 'Hormones',
  'Ferritin': 'Iron Studies',
  'Lipid Panel': 'Lipids',
  'Lipid Panel with LDL/HDL Ratio': 'Lipids',
  'CBC with Diff, Platelet, NLR': 'CBC',
  'CBC with Platelet Count and Auto Diff': 'CBC',
  'CBC with Auto Differential': 'CBC',
  'Comprehensive Metabolic Panel (14)': 'Metabolic Panel',
  'Comprehensive Metabolic Panel': 'Metabolic Panel',
  'Hemoglobin A1c': 'Metabolic Panel',
  'Cardiac CRP': 'Inflammation',
  'Magnesium': 'Minerals',
  'Phosphorus': 'Minerals',
  'Vitamin B12': 'Vitamins',
  'Vitamin D25-OH': 'Vitamins',
  'Insulin, Random': 'Metabolic Panel',
}

function normalizeCategory(panelName: string): string {
  return categoryOverrides[panelName] || panelName
}

// Parse result value
function parseResult(result: number | string): {
  value: number | null
  valueText: string
  comparator: Comparator
} {
  if (typeof result === 'number') {
    return {
      value: result,
      valueText: result.toString(),
      comparator: null,
    }
  }

  const str = result.trim()
  
  // Match patterns like "<5.0", ">59", "<=10", ">=5"
  const match = str.match(/^([<>]=?)\s*(\d+\.?\d*)$/)
  if (match) {
    const [, comp, numStr] = match
    return {
      value: parseFloat(numStr),
      valueText: str,
      comparator: comp as Comparator,
    }
  }

  // Try parsing as plain number
  const num = parseFloat(str)
  if (!isNaN(num)) {
    return {
      value: num,
      valueText: str,
      comparator: null,
    }
  }

  return {
    value: null,
    valueText: str,
    comparator: null,
  }
}

// Parse reference range
function parseReferenceRange(range: string | null): {
  refLow?: number
  refHigh?: number
  refText?: string
} {
  if (!range) return {}

  const trimmed = range.trim()
  
  // Match "a-b", "a - b" patterns
  const rangeMatch = trimmed.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/)
  if (rangeMatch) {
    return {
      refLow: parseFloat(rangeMatch[1]),
      refHigh: parseFloat(rangeMatch[2]),
      refText: trimmed,
    }
  }

  // Match ">x", "> x", ">= x"
  const gtMatch = trimmed.match(/^>=?\s*(\d+\.?\d*)$/)
  if (gtMatch) {
    return {
      refLow: parseFloat(gtMatch[1]),
      refText: trimmed,
    }
  }

  // Match "x <=" or "x <"
  const gtSuffixMatch = trimmed.match(/^(\d+\.?\d*)\s*<=?$/)
  if (gtSuffixMatch) {
    return {
      refLow: parseFloat(gtSuffixMatch[1]),
      refText: trimmed,
    }
  }

  // Match "<x", "< x", "<= x"
  const ltMatch = trimmed.match(/^<=?\s*(\d+\.?\d*)$/)
  if (ltMatch) {
    return {
      refHigh: parseFloat(ltMatch[1]),
      refText: trimmed,
    }
  }

  // Match "x" plain number (treat as max)
  const plainMatch = trimmed.match(/^(\d+\.?\d*)$/)
  if (plainMatch) {
    return {
      refHigh: parseFloat(plainMatch[1]),
      refText: trimmed,
    }
  }

  return { refText: trimmed }
}

// Determine flag
function determineFlag(
  jsonFlag: string | null | undefined,
  value: number | null,
  comparator: Comparator,
  refLow?: number,
  refHigh?: number
): 'Low' | 'Normal' | 'High' | null {
  // Normalize JSON flag
  if (jsonFlag === 'High' || jsonFlag === 'H') return 'High'
  if (jsonFlag === 'Low' || jsonFlag === 'L') return 'Low'

  // If comparator result exists and is ambiguous, don't auto-flag
  if (comparator && value !== null) {
    return null
  }

  // Compute flag from reference range
  if (value !== null) {
    if (refLow !== undefined && value < refLow) return 'Low'
    if (refHigh !== undefined && value > refHigh) return 'High'
    if (refLow !== undefined || refHigh !== undefined) return 'Normal'
  }

  return null
}

// Parse a single bloodwork file
export function parseBloodworkFile(
  data: unknown,
  sourceFile: string
): { readings: MetricReading[]; errors: string[] } {
  const errors: string[] = []
  const readings: MetricReading[] = []

  // Validate with Zod
  const result = BloodworkFileSchema.safeParse(data)
  if (!result.success) {
    errors.push(`Invalid file format: ${result.error.message}`)
    return { readings, errors }
  }

  const file = result.data
  const date = file.collection_date

  for (const panel of file.panels) {
    const category = normalizeCategory(panel.panel_name)

    for (const test of panel.tests) {
      const canonicalName = getCanonicalName(test.name)
      const metricId = slugify(canonicalName)
      
      const { value, valueText, comparator } = parseResult(test.result)
      const { refLow, refHigh, refText } = parseReferenceRange(test.reference_range)
      const flag = determineFlag(test.flag, value, comparator, refLow, refHigh)

      readings.push({
        metricId,
        metricName: canonicalName,
        category,
        date,
        value,
        valueText,
        comparator,
        unit: test.unit || '',
        refLow,
        refHigh,
        refText,
        flag,
        sourceFile,
      })
    }
  }

  return { readings, errors }
}

// Parse multiple bloodwork files
export function parseAllBloodworkFiles(
  files: { data: unknown; filename: string }[]
): { readings: MetricReading[]; errors: string[] } {
  const allReadings: MetricReading[] = []
  const allErrors: string[] = []

  for (const file of files) {
    const { readings, errors } = parseBloodworkFile(file.data, file.filename)
    allReadings.push(...readings)
    errors.forEach(e => allErrors.push(`${file.filename}: ${e}`))
  }

  // Sort by date
  allReadings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return { readings: allReadings, errors: allErrors }
}
