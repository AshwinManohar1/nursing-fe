import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchStaff, addStaff, updateStaff, deleteStaff, uploadStaffCSV } from './index'
import type { Staff, CreateStaffRequest, UpdateStaffRequest } from './types'

export interface PaginatedStaffResponse {
  items: Staff[]
  pagination: {
    total: number; limit: number; offset: number
    current_page: number; total_pages: number; has_next: boolean; has_prev: boolean
  }
}

export const useStaffList = (page = 1, limit = 100, search?: string) =>
  useQuery<PaginatedStaffResponse>({
    queryKey: ['staff', page, limit, search],
    queryFn: () => fetchStaff(page, limit, search),
    staleTime: 1000 * 60 * 5,
  })

export const useAddStaff = () => {
  const qc = useQueryClient()
  return useMutation<Staff, Error, CreateStaffRequest>({
    mutationFn: addStaff as (p: CreateStaffRequest) => Promise<Staff>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export const useUpdateStaff = () => {
  const qc = useQueryClient()
  return useMutation<Staff, Error, { id: string; payload: UpdateStaffRequest }>({
    mutationFn: ({ id, payload }) => updateStaff(id, payload) as Promise<Staff>,
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      qc.invalidateQueries({ queryKey: ['staff', id] })
    },
  })
}

export const useDeleteStaff = () => {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: deleteStaff as (id: string) => Promise<void>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })
}

export const useUploadStaffCSV = () => {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { file: File; org_id: string }>({
    mutationFn: ({ file, org_id }) => uploadStaffCSV(file, org_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  })
}
