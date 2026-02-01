export interface Position {
  id: string
  name: string
  election_order: number
  active: boolean
  created_at: string
}

export interface CDSMember {
  state_code: string
  full_name: string
  batch: string
  eligible: boolean
  created_at: string
}

export interface ContestantApplication {
  id: string
  full_name: string
  state_code: string
  email: string
  phone: string
  batch: string
  position_id: string
  attendance_rating: number
  reason: string
  mantra: string
  image_url: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  position?: Position
}

export interface Vote {
  id: string
  voter_state_code_hash: string
  position_id: string
  candidate_id: string
  created_at: string
}

export interface SystemSettings {
  id: number
  applications_open: boolean
  voting_open: boolean
  updated_at: string
}

export interface AuditLog {
  id: string
  admin_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
}

export interface VoteCount {
  candidate_id: string
  position_id: string
  votes: number
  candidate?: ContestantApplication
}
