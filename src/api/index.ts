import client from './client'
import type { RosterConstraints } from './types'

// ─── Auth ────────────────────────────────────────────────────────────────────
// baseURL is already /api/v1, so paths below are relative to that

export const login = async (employee_id: string, password: string) => {
  const { data } = await client.post('/login', { employee_id, password })
  return data
}

export const logout = async () => {
  await client.post('/logout')
}

// ─── Rosters ─────────────────────────────────────────────────────────────────
// PATCH /api/v1/rosters/{roster_id}  — only PATCH exists (no PUT)

export const fetchRosters = async () => {
  const { data } = await client.get('/rosters')
  return data.data
}

export const fetchRoster = async (id: string) => {
  const { data } = await client.get(`/rosters/${id}`)
  return data.data
}

export const generateRoster = async (payload: unknown) => {
  const { data } = await client.post('/rosters/generate', payload)
  return data
}

export const patchRoster = async (id: string, payload: unknown) => {
  const { data } = await client.patch(`/rosters/${id}`, payload)
  return data
}

export const deleteRoster = async (id: string) => {
  const { data } = await client.delete(`/rosters/${id}`)
  return data
}

export const fetchPreferencesByPreviousRoster = async (id: string) => {
  const { data } = await client.get(`/rosters/preferences/${id}`)
  return data
}

// NOTE: /rosters/{id}/constraints does NOT exist in the backend — removed.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const updateRosterConstraints = async (_id: string, _c: RosterConstraints) => {
  console.warn('updateRosterConstraints: endpoint does not exist on backend')
  return null
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export const fetchStaff = async (page = 1, limit = 100, search?: string) => {
  const params: Record<string, unknown> = { page, limit }
  if (search?.trim()) params.search = search.trim()
  const { data } = await client.get('/staff', { params })
  return {
    items: data.data?.items ?? data.data ?? [],
    pagination: data.data?.pagination ?? {
      total: 0, limit, offset: (page - 1) * limit,
      current_page: page, total_pages: 0, has_next: false, has_prev: false,
    },
  }
}

export const addStaff = async (payload: unknown) => {
  const { data } = await client.post('/staff', payload)
  return data
}

export const updateStaff = async (id: string, payload: unknown) => {
  const { data } = await client.put(`/staff/${id}`, payload)
  return data
}

export const deleteStaff = async (id: string) => {
  const { data } = await client.delete(`/staff/${id}`)
  return data
}

export const uploadStaffCSV = async (file: File, org_id: string) => {
  const form = new FormData()
  form.append('file', file)
  form.append('hospital_id', org_id)
  const { data } = await client.post('/staff/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ─── Wards ────────────────────────────────────────────────────────────────────

export const fetchWards = async () => {
  const { data } = await client.get('/wards')
  return data.data
}

export const fetchWardById = async (id: string) => {
  const { data } = await client.get(`/wards/${id}`)
  return data.data
}

export const createWard = async (payload: unknown) => {
  const { data } = await client.post('/wards', payload)
  return data
}

export const updateWard = async (id: string, payload: unknown) => {
  const { data } = await client.put(`/wards/${id}`, payload)
  return data
}

export const deleteWard = async (id: string) => {
  const { data } = await client.delete(`/wards/${id}`)
  return data
}

// ─── Hospitals ────────────────────────────────────────────────────────────────

export const fetchHospitals = async () => {
  const { data } = await client.get('/hospitals')
  return data.data
}

export const fetchHospitalById = async (id: string) => {
  const { data } = await client.get(`/hospitals/${id}`)
  return data.data
}

export const createHospital = async (payload: unknown) => {
  const { data } = await client.post('/hospitals', payload)
  return data
}

export const updateHospital = async (id: string, payload: unknown) => {
  const { data } = await client.put(`/hospitals/${id}`, payload)
  return data
}

export const deleteHospital = async (id: string) => {
  const { data } = await client.delete(`/hospitals/${id}`)
  return data
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export const fetchShifts = async () => {
  const { data } = await client.get('/shifts')
  return data.data
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
// Mounted at /api/v1/dashboard (no extra prefix in router)

export const fetchDashboardData = async (hospitalId: string, date: string, shift?: string) => {
  const params = new URLSearchParams({ hospital_id: hospitalId, date })
  if (shift) params.append('shift', shift)
  const { data } = await client.get(`/dashboard/ward-performance?${params}`)
  return data
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const sendChatMessage = async (payload: { message: string; roster_id?: string }) => {
  const { data } = await client.post('/chat', payload)
  return data
}

// ─── Ward Transfers ───────────────────────────────────────────────────────────

export const createWardTransfer = async (payload: unknown) => {
  const { data } = await client.post('/ward-transfers', payload)
  return data
}

export const fetchWardTransfers = async (hospital_id: string) => {
  const { data } = await client.get('/ward-transfers', { params: { hospital_id } })
  return data
}

export const fetchWardTransfersByWard = async (ward_id: string) => {
  const { data } = await client.get('/ward-transfers', { params: { ward_id } })
  return data
}

export const cancelWardTransfer = async (transfer_id: string) => {
  const { data } = await client.put(`/ward-transfers/${transfer_id}/cancel`)
  return data
}

export { default as client } from './client'
