// API Response Types
export type StaffRole = 'ward_incharge' | 'staff_nurse' | 'admin' | 'shift_incharge';

export interface Staff {
  _id?: string; // Optional for backward compatibility
  id: string; // Changed from number to string to match new response
  name: string;
  grade: string;
  emp_id: string;
  position: StaffRole | string; // Changed from role to position, can be StaffRole or string for API compatibility
  contact_no: string; // Changed from contact to contact_no
  gender?: "MALE" | "FEMALE" | "OTHER"; // Gender field
  ward_id: string[]; // Array of ward IDs the staff member is assigned to
  experience_years: number;
  preferred_shifts: string[];
  restrictions: {
    allowed_shifts: string[];
    forbidden_shifts: string[];
    max_consecutive_days: number;
    max_consecutive_nights: number | null;
    min_weekly_offs: number;
  };
  monthly_hour_target: number;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  department: string;
  requiredSkills: string[];
  maxStaff: number;
  createdAt: string;
  updatedAt: string;
}

export interface Leave {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface TransferSnapshot {
  staff_id: string;
  name: string;
  grade: string;
  position: string;
  contact_no: string;
  email: string | null;
  hospital_id: string;
  ward_ids: string[];
}

export interface TransferRecord {
  transfer_id: string;
  direction: 'in' | 'out';
  staff_id: string;
  employee_id: string;
  day_index: string;
  transfer_date: string;
  from_shift: string;
  to_shift: string;
  from_ward_id: string;
  to_ward_id: string;
  staff_snapshot: {
    staff_id: string;
    name: string;
    grade: string;
    position: string;
    contact_no: string;
    email: string | null;
    hospital_id: string;
    ward_ids: string[];
  };
  created_by: string;
  created_at: string;
}

export interface Roster {
  _id: string;
  roster_id: string;
  roster: {
    [staffId: string]: {
      [dayIndex: string]: string[]; // Array of shift codes or ["OFF"]
    };
  };
  roster_input: {
    ward_id?: string;
    meta: {
      period: string;
      total_days: number;
      schedule_start_date: string;
      schedule_end_date: string;
    };
    staff_details: Staff[];
    shift_definitions: {
      [key: string]: {
        name: string;
        hours: number;
      };
    };
    preferences?: Array<{
      id: string;
      date: string;
      shift: string;
    }>;
    leave_requests?: Array<{
      id: string;
      leaves: Array<{
        date: string;
        type: string;
      }>;
    }>;
    constraints: {
      coverage: {
        per_shift: {
          [key: string]: {
            total: number;
          };
        };
        enforce_exact: boolean;
      };
      rules: {
        one_shift_per_day: boolean;
        n4_only_g: boolean;
        non_n4_pattern: boolean;
        rest_after_2n: boolean;
        n5_shift_coverage: boolean;
        skip_g_coverage_if_infeasible: boolean;
      };
    };
  };
  generation_seed: number;
  created_at: string;
  updated_at?: string;
  transfers?: TransferRecord[];
  has_transfers?: boolean;
  active_transfer_ids?: string[];
}

export interface Diff {
  id: string;
  rosterId: string;
  type: 'shift_change' | 'staff_change' | 'time_change';
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  changes: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// API Request Types
export interface CreateStaffRequest {
  name: string;
  grade: string;
  emp_id: string;
  email?: string;
  position: StaffRole; // Valid roles: 'ward_incharge', 'staff_nurse', 'admin', 'shift_incharge'
  contact_no: string; // Changed from contact to contact_no
  gender?: "MALE" | "FEMALE" | "OTHER"; // Gender field
  experience_years: number;
  hospital_id: string;
  ward_id: string[]; // multiple ward assignments
}

export interface UpdateStaffRequest extends Partial<CreateStaffRequest> {}

export interface CreateShiftRequest {
  name: string;
  startTime: string;
  endTime: string;
  department: string;
  requiredSkills: string[];
  maxStaff: number;
}

export interface CreateLeaveRequest {
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface GenerateRosterRequest {
  roster_input: {
    ward_id?: string;
    roster_name?: string;
    meta: {
      period: string;
      total_days: number;
      schedule_start_date: string;
      schedule_end_date: string;
    };
    staff_details: string[]; // Array of staff IDs
    shift_definitions: {
      [key: string]: {
        name: string;
        hours: number;
      };
    };
    preferences?: Array<{
      id: string;
      date: string;
      shift: string;
    }>;
    leave_requests?: Array<{
      id: string;
      leaves: Array<{
        date: string;
        type: string;
      }>;
    }>;
    constraints: {
      coverage: {
        per_shift: {
          [key: string]: {
            total: number;
          };
        };
        enforce_exact: boolean;
      };
      rules: {
        one_shift_per_day: boolean;
        n4_only_g: boolean;
        non_n4_pattern: boolean;
        rest_after_2n: boolean;
        n5_shift_coverage: boolean;
        skip_g_coverage_if_infeasible: boolean;
      };
    };
  };
  method: string;
  seed: number;
}

export interface UpdateRosterRequest {
  name?: string;
  status?: 'draft' | 'published' | 'archived';
  shifts?: any[];
  roster?: {
    [staffId: string]: {
      [dayIndex: string]: string[];
    };
  };
}

// API Response Wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChatRequest {
  message: string;
  roster_id?: string;
}

// Widget Data Types for Copilot
export interface RosterDiff {
  date: string;
  shift: string;
  before: {
    staff_id: string;
    shift: string;
  };
  after: {
    staff_id: string;
    shift: string;
  };
}

export interface RosterSuggestion {
  title: string;
  description: string;
  confidence: number;
  patches: RosterPatch[];
  button_text: string;
  constraints_violated?: string[];
}

export interface RosterModificationWidgetData {
  type: "roster_modification";
  primary_action: RosterSuggestion;
  alternatives?: RosterSuggestion[];
  metadata?: {
    override_allowed: boolean;
    constraints_violated: string[];
  };
}

// Roster Patch Types
export interface RosterPatch {
  op: "replace" | "add" | "remove";
  path: string;
  value: string | string[];
}

export interface RosterPatchRequest {
  patches: RosterPatch[];
}

// Roster Constraints Types
export interface RosterConstraints {
  coverage: {
    per_shift: {
      [key: string]: {
        total: number;
      };
    };
    enforce_exact: boolean;
  };
  rules: {
    enforce_one_shift_per_day: boolean;
    n4_rule: boolean;
    n5_rule: boolean;
    weekly_counts: boolean;
    rest_after_2nights: boolean;
  };
}

// Dashboard Types
export interface DashboardKPIs {
  total_patients: number;
  bed_occupancy_percentage: number;
  live_rosters: string;
  active_wards: number;
  occupancy_status: string;
}

export interface WardPerformance {
  ward_id: string;
  ward_name: string;
  shift_nurses: number;
  shift_patients: number;
  beds_available: number;
  occupancy: string; // Status as string (e.g., "High", "Medium", "Low")
  ideal_ratio: string; // Ratio as string (e.g., "6.3:1")
  deficit_surplus: string; // Deficit/surplus as string (e.g., "-3")
  nurse_utilization: string; // Utilization status (e.g., "N/A (0 nurses)")
  transfers_in?: number;
  transfers_out?: number;
  total_transfers?: number;
}

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  status: string;
  type: 'warning' | 'info' | 'error';
  cleared: boolean;
}

export interface DashboardData {
  hospital_id: string;
  date: string;
  shift: string | null;
  kpis: DashboardKPIs;
  ward_performance: WardPerformance[];
  ai_suggestions: AISuggestion[];
}

// Auth Types
export interface LoginRequest {
  employee_id: string;
  password: string;
}

export interface LoginResponseData {
  id: string;
  employee_id: string;
  name: string;
  role: string;
  org_id: string;
  staff_id: string;
  status: string;
  last_login: string;
  created_at: string;
  updated_at: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  ward_id: string[]; // Array of ward IDs the user is assigned to
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginResponseData;
  timestamp: string;
}

// Ward Transfer Types
export interface WardTransfer {
  id: string;
  hospital_id: string;
  staff_id: string;
  employee_id: string;
  transfer_date: string;
  from_shift: string;
  to_shift: string;
  from_ward_id: string;
  to_ward_id: string;
  roster_id?: string;
  roster_details_id?: string;
  destination_roster_id?: string;
  destination_roster_details_id?: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  remarks?: string;
}

export interface CreateWardTransferRequest {
  staff_id: string;
  hospital_id: string;
  transfer_date: string;
  from_shift: string; // Source shift (auto-populated from roster)
  to_shift: string; // Destination shift (user selectable, defaults to from_shift)
  from_ward_id: string;
  to_ward_id: string;
  created_by: string;
  remarks?: string;
}

export interface WardTransferResponse {
  success: boolean;
  message: string;
  data: {
    transfers: WardTransfer[];
    total: number;
    limit: number;
    offset: number;
  };
  timestamp: string;
}
