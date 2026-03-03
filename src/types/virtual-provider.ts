export interface VPFollowUpQuestion {
  id: string
  question: string
  why_asking?: string
  context?: string
  options: string[]
  allow_multiple?: boolean
}

export interface VPKeyFinding {
  title: string
  explanation: string
  severity: 'good' | 'watch' | 'attention'
  related_metrics: string[]
}

export interface VPPattern {
  title: string
  description: string
  severity: 'low' | 'moderate' | 'notable'
  what_it_means?: string
}

export interface VPMedication {
  id: string
  name: string
  type: 'prescription' | 'otc'
  suggested_dosage: string
  reasoning: string
  urgency: 'high' | 'moderate' | 'low'
  related_metrics: string[]
  discuss_with_doctor: string
  status: 'new' | 'following' | 'dismissed'
  started_at: string | null
  notes: string
}

export interface VPSupplement {
  id: string
  name: string
  suggested_dosage: string
  form: string
  reasoning: string
  expected_benefit: string
  related_metrics: string[]
  interactions_note: string
  status: 'new' | 'following' | 'dismissed'
  started_at: string | null
  notes: string
}

export interface VPLifestyle {
  id: string
  category: 'diet' | 'exercise' | 'sleep' | 'stress' | 'hydration' | 'other'
  title: string
  description: string
  reasoning: string
  priority: 'high' | 'moderate' | 'low'
  related_metrics: string[]
  status: 'new' | 'following' | 'dismissed'
  started_at: string | null
  notes: string
}

export interface VPContraindication {
  id: string
  item_a: string
  item_b: string
  reason: string
  severity: 'serious' | 'moderate'
}

export interface VPRecommendations {
  overview: string
  medications: VPMedication[]
  supplements: VPSupplement[]
  lifestyle: VPLifestyle[]
  contraindications: VPContraindication[]
  generated_at: string
}

export interface VPTrackingEvent {
  date: string
  event: string
  [key: string]: unknown
}

export interface VPSession {
  id: string
  user: string
  created_at: string
  status: 'awaiting_answers' | 'completed'
  label: string
  source_files: string[]
  initial_prompt?: string
  out_of_range_count: number
  total_metrics: number
  bloodwork_context: string
  analysis: {
    agent1_raw: Record<string, unknown>
    agent2_review: Record<string, unknown>
    provider_summary: string
    key_findings: VPKeyFinding[]
    patterns: VPPattern[]
    follow_up_questions: VPFollowUpQuestion[]
  }
  answers: Record<string, string>
  recommendations: VPRecommendations | null
  tracking_history: VPTrackingEvent[]
}

export type VPView = 'sessions' | 'new-choice' | 'new-context' | 'new' | 'analyzing' | 'analysis' | 'follow-up' | 'recommendations' | 'dashboard' | 'tracking'
