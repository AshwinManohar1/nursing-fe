import client from "./client";
import type { RosterConstraints } from "./types";

// Roster
export const fetchRoster = async (id: string) => {
  const { data } = await client.get(`/rosters/${id}`);
  return data.data; // Extract the actual roster from the response
};

export const fetchRosters = async () => {
  const { data } = await client.get(`/rosters`);
  return data.data; // Extract the actual rosters array from the response
};

export const generateRoster = async (payload: any) => {
  const { data } = await client.post(`/rosters/generate`, payload);
  return data;
};

export const updateRoster = async (roster_id: string, payload: any) => {
  const { data } = await client.put(`/rosters/${roster_id}`, payload);
  return data;
};

export const deleteRoster = async (roster_id: string) => {
  const { data } = await client.delete(`/rosters/${roster_id}`);
  return data;
};

// Staff
export const fetchStaff = async (page: number = 1, limit: number = 100, search?: string) => {
  const params: any = {
    page,
    limit,
  };
  
  if (search && search.trim()) {
    params.search = search.trim();
  }
  
  const { data } = await client.get(`/staff`, { params });
  // Return the full response with items and pagination
  return {
    items: data.data?.items || data.data || [],
    pagination: data.data?.pagination || data.pagination || {
      total: 0,
      limit,
      offset: (page - 1) * limit,
      current_page: page,
      total_pages: 0,
      has_next: false,
      has_prev: false,
    },
  };
};

export const addStaff = async (payload: any) => {
  const { data } = await client.post(`/staff`, payload);
  return data;
};

export const updateStaff = async (id: string, payload: any) => {
  const { data } = await client.put(`/staff/${id}`, payload);
  return data;
};

export const deleteStaff = async (id: string) => {
  const { data } = await client.delete(`/staff/${id}`);
  return data;
};

export const uploadStaffCSV = async (file: File, org_id: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('hospital_id', org_id);

  const { data } = await client.post(`/staff/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

// Shifts
export const fetchShifts = async () => {
  const { data } = await client.get(`/shifts`);
  return data.data;
};

export const addShift = async (payload: any) => {
  const { data } = await client.post(`/shifts`, payload);
  return data;
};

export const updateShift = async (id: string, payload: any) => {
  const { data } = await client.put(`/shifts/${id}`, payload);
  return data;
};

export const deleteShift = async (id: string) => {
  const { data } = await client.delete(`/shifts/${id}`);
  return data;
};

// Leaves
export const fetchLeaves = async () => {
  const { data } = await client.get(`/leaves`);
  return data.data; // Fixed: return data.data instead of data
};

export const addLeave = async (payload: any) => {
  const { data } = await client.post(`/leaves`, payload);
  return data;
};

export const updateLeave = async (id: string, payload: any) => {
  const { data } = await client.put(`/leaves/${id}`, payload);
  return data;
};

export const deleteLeave = async (id: string) => {
  const { data } = await client.delete(`/leaves/${id}`);
  return data;
};

// Diffs
export const fetchDiffs = async (rosterId: string) => {
  const { data } = await client.get(`/rosters/${rosterId}/diffs`);
  return data;
};

export const approveDiff = async (diffId: string) => {
  const { data } = await client.post(`/diff-logs/${diffId}/approve`);
  return data;
};

export const rejectDiff = async (diffId: string) => {
  const { data } = await client.post(`/diff-logs/${diffId}/reject`);
  return data;
};

// Chat
export const sendChatMessage = async (payload: { message: string; roster_id?: string }) => {
  const { data } = await client.post(`/chat`, payload);
  return data;
};

// Roster Patch Update
export const patchRoster = async (roster_id: string, payload: { patches: Array<{ op: string; path: string; value: string }> }) => {
  const { data } = await client.patch(`/rosters/${roster_id}`, payload);
  return data;
};

// Preferences suggestion based on previous roster
export const fetchPreferencesByPreviousRoster = async (previous_roster_id: string) => {
  const { data } = await client.get(`/rosters/preferences/${previous_roster_id}`);
  return data; // Expecting an array: [{ id: string, preferred_date_offs: string[] }, ...]
};

// Roster Constraints Update
export const updateRosterConstraints = async (roster_id: string, constraints: RosterConstraints) => {
  const { data } = await client.put(`/rosters/${roster_id}/constraints`, constraints);
  console.log("Constraints API response:", data);
  return data;
};

// Ward CRUD
export const fetchWards = async () => {
  const { data } = await client.get(`/wards`);
  return data.data;
};

export const fetchWardById = async (id: string) => {
  const { data } = await client.get(`/wards/${id}`);
  return data.data;
};

export const createWard = async (payload: { name: string; total_beds: number; bed_nurse_ratio: string | number; description?: string; hospital_id: string; incharge_id?: string }) => {
  const { data } = await client.post(`/wards`, payload);
  return data;
};

export const updateWard = async (id: string, payload: { name?: string; total_beds?: number; bed_nurse_ratio?: string | number; description?: string; hospital_id?: string; incharge_id?: string }) => {
  const { data } = await client.put(`/wards/${id}`, payload);
  return data;
};

export const deleteWard = async (id: string) => {
  const { data } = await client.delete(`/wards/${id}`);
  return data;
};

// Hospital CRUD
export const fetchHospitals = async () => {
  const { data } = await client.get(`/hospitals`);
  return data.data;
};

export const fetchHospitalById = async (id: string) => {
  const { data } = await client.get(`/hospitals/${id}`);
  return data.data;
};

export const createHospital = async (payload: { name: string; address?: string; contact?: string; description?: string }) => {
  const { data } = await client.post(`/hospitals`, payload);
  return data;
};

export const updateHospital = async (id: string, payload: { name?: string; address?: string; contact?: string; description?: string }) => {
  const { data } = await client.put(`/hospitals/${id}`, payload);
  return data;
};

export const deleteHospital = async (id: string) => {
  const { data } = await client.delete(`/hospitals/${id}`);
  return data;
};

// Dashboard
export const fetchDashboardData = async (hospitalId: string, date: string, shift?: string) => {
  const params = new URLSearchParams({
    hospital_id: hospitalId,
    date: date,
  });
  
  if (shift) {
    params.append('shift', shift);
  }
  
  // Use local API for dashboard data (different port)
  const { data } = await client.get(`/dashboard/ward-performance?${params.toString()}`);
  return data;
};

// Auth
export const login = async (employee_id: string, password: string) => {
  const { data } = await client.post(`/login`, {
    employee_id,
    password,
  });
  return data;
};

export const logout = async () => {
  await client.post(`/logout`);
};

// Ward Transfers
export const createWardTransfer = async (payload: {
  staff_id: string;
  hospital_id: string;
  transfer_date: string;
  from_ward_id: string;
  to_ward_id: string;
  created_by: string;
  remarks?: string;
}) => {
  const { data } = await client.post(`/ward-transfers`, payload);
  return data;
};

export const fetchWardTransfers = async (hospital_id: string) => {
  const params = new URLSearchParams({
    hospital_id: hospital_id,
  });
  const { data } = await client.get(`/ward-transfers?${params.toString()}`);
  return data;
};

export const fetchWardTransfersByWard = async (ward_id: string) => {
  const params = new URLSearchParams({
    ward_id: ward_id,
  });
  const { data } = await client.get(`/ward-transfers?${params.toString()}`);
  return data;
};

