import { z } from 'zod'

// Raw JSON schema from bloodwork files
export const TestSchema = z.object({
  name: z.string(),
  result: z.union([z.number(), z.string()]),
  unit: z.string().nullable(),
  reference_range: z.string().nullable(),
  flag: z.enum(['High', 'Low', 'H', 'L']).nullable().optional(),
  comments: z.string().optional(),
})

export const PanelSchema = z.object({
  panel_name: z.string(),
  tests: z.array(TestSchema),
})

export const BloodworkFileSchema = z.object({
  collection_date: z.string(),
  report_date: z.string().optional(),
  panels: z.array(PanelSchema),
})

export type RawTest = z.infer<typeof TestSchema>
export type RawPanel = z.infer<typeof PanelSchema>
export type RawBloodworkFile = z.infer<typeof BloodworkFileSchema>

// Normalized metric reading type
export type Comparator = '<' | '>' | '<=' | '>=' | '=' | null

export type MetricReading = {
  metricId: string
  metricName: string
  category: string
  date: string
  value: number | null
  valueText: string
  comparator: Comparator
  unit: string
  refLow?: number
  refHigh?: number
  refText?: string
  flag: 'Low' | 'Normal' | 'High' | null
  sourceFile: string
}

// Grouped metric for display
export type MetricGroup = {
  metricId: string
  metricName: string
  category: string
  unit: string
  readings: MetricReading[]
  description?: string
}
