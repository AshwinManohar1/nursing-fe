// Staff & Roles
export type StaffRole = 'ward_incharge' | 'staff_nurse' | 'admin' | 'shift_incharge'

export interface Staff {
  _id?: string
  id: string
  name: string
  grade: string
  emp_id: string
  position: StaffRole | string
  contact_no: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  ward_id: string[]
  experience_years: number
  preferred_shifts: string[]
  restrictions: {
    allowed_shifts: string[]
    forbidden_shifts: string[]
    max_consecutive_days: number
    max_consecutive_nights: number | null
    min_weekly_offs: number
  }
  monthly_hour_target: number
}

// Roster
export interface Roster {
  _id: string
  roster_id: string
  roster: {
    [staffId: string]: {
      [dayIndex: string]: string[]
    }
  }
  roster_input: {
    ward_id?: string
    meta: {
      period: string
      total_days: number
      schedule_start_date: string
      schedule_end_date: string
    }
    staff_details: Staff[]
    shift_definitions: {
      [key: string]: { name: string; hours: number }
    }
    preferences?: Array<{ id: string; date: string; shift: string }>
    leave_requests?: Array<{ id: string; leaves: Array<{ date: string; type: string }> }>
    constraints: {
      coverage: {
        per_shift: { [key: string]: { total: number } }
        enforce_exact: boolean
      }
      rules: {
        one_shift_per_day: boolean
        n4_only_g: boolean
        non_n4_pattern: boolean
        rest_after_2n: boolean
        n5_shift_coverage: boolean
        skip_g_coverage_if_infeasible: boolean
      }
    }
  }
  generation_seed: number
  created_at: string
  updated_at?: string
  transfers?: TransferRecord[]
  has_transfers?: boolean
  active_transfer_ids?: string[]
}

// Transfers
export interface TransferRecord {
  transfer_id: string
  direction: 'in' | 'out'
  staff_id: string
  employee_id: string
  day_index: string
  transfer_date: string
  from_shift: string
  to_shift: string
  from_ward_id: string
  to_ward_id: string
  staff_snapshot: {
    staff_id: string
    name: string
    grade: string
    position: string
    contact_no: string
    email: string | null
    hospital_id: string
    ward_ids: string[]
  }
  created_by: string
  created_at: string
}

export interface WardTransfer {
  id: string
  hospital_id: string
  staff_id: string
  employee_id: string
  transfer_date: string
  from_shift: string
  to_shift: string
  from_ward_id: string
  to_ward_id: string
  roster_id?: string
  status: string
  created_by: string
  created_at: string
  updated_at: string
  remarks?: string
}

export interface CreateWardTransferRequest {
  staff_id: string
  hospital_id: string
  transfer_date: string
  from_shift: string
  to_shift: string
  from_ward_id: string
  to_ward_id: string
  created_by: string
  remarks?: string
}

// Dashboard
export interface DashboardKPIs {
  total_patients: number
  bed_occupancy_percentage: number
  live_rosters: string
  active_wards: number
  occupancy_status: string
}

export interface WardPerformance {
  ward_id: string
  ward_name: string
  shift_nurses: number
  shift_patients: number
  beds_available: number
  occupancy: string
  ideal_ratio: string
  deficit_surplus: string
  nurse_utilization: string
  transfers_in?: number
  transfers_out?: number
  total_transfers?: number
}

export interface AISuggestion {
  id: string
  title: string
  description: string
  status: string
  type: 'warning' | 'info' | 'error'
  cleared: boolean
}

export interface DashboardData {
  hospital_id: string
  date: string
  shift: string | null
  kpis: DashboardKPIs
  ward_performance: WardPerformance[]
  ai_suggestions: AISuggestion[]
}

// Copilot / Chat
export interface ChatRequest {
  message: string
  roster_id?: string
}

export interface RosterPatch {
  op: 'replace' | 'add' | 'remove'
  path: string
  value: string | string[]
}

export interface RosterSuggestion {
  title: string
  description: string
  confidence: number
  patches: RosterPatch[]
  button_text: string
  constraints_violated?: string[]
}

export interface RosterModificationWidgetData {
  type: 'roster_modification'
  primary_action: RosterSuggestion
  alternatives?: RosterSuggestion[]
  metadata?: {
    override_allowed: boolean
    constraints_violated: string[]
  }
}

// Auth
export interface LoginRequest {
  employee_id: string
  password: string
}

export interface LoginResponseData {
  id: string
  employee_id: string
  name: string
  role: string
  org_id: string
  staff_id: string
  status: string
  last_login: string
  created_at: string
  updated_at: string
  access_token: string
  refresh_token: string
  expires_in: number
  ward_id: string[]
}

export interface LoginResponse {
  success: boolean
  message: string
  data: LoginResponseData
  timestamp: string
}

// Generic wrappers
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Request types
export interface CreateStaffRequest {
  name: string
  grade: string
  emp_id: string
  email?: string
  position: StaffRole
  contact_no: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  experience_years: number
  hospital_id: string
  ward_id: string[]
}

export interface UpdateStaffRequest extends Partial<CreateStaffRequest> {}

export interface GenerateRosterRequest {
  roster_input: {
    ward_id?: string
    roster_name?: string
    meta: {
      period: string
      total_days: number
      schedule_start_date: string
      schedule_end_date: string
    }
    staff_details: string[]
    shift_definitions: { [key: string]: { name: string; hours: number } }
    preferences?: Array<{ id: string; date: string; shift: string }>
    leave_requests?: Array<{ id: string; leaves: Array<{ date: string; type: string }> }>
    constraints: {
      coverage: {
        per_shift: { [key: string]: { total: number } }
        enforce_exact: boolean
      }
      rules: {
        one_shift_per_day: boolean
        n4_only_g: boolean
        non_n4_pattern: boolean
        rest_after_2n: boolean
        n5_shift_coverage: boolean
        skip_g_coverage_if_infeasible: boolean
      }
    }
  }
  method: string
  seed: number
}

export interface UpdateRosterRequest {
  name?: string
  status?: 'draft' | 'published' | 'archived'
  roster?: {
    [staffId: string]: { [dayIndex: string]: string[] }
  }
}

export interface RosterPatchRequest {
  patches: RosterPatch[]
}
