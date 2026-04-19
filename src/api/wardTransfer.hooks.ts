import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createWardTransfer, fetchWardTransfers, fetchWardTransfersByWard, cancelWardTransfer } from './index'
import type { WardTransferResponse } from './types'

export const useWardTransfers = (hospital_id: string) =>
  useQuery<WardTransferResponse>({
    queryKey: ['ward-transfers', hospital_id],
    queryFn: () => fetchWardTransfers(hospital_id),
    enabled: !!hospital_id,
    staleTime: 1000 * 60 * 2,
  })

export const useWardTransfersByWard = (ward_id: string, enabled = true) =>
  useQuery<WardTransferResponse>({
    queryKey: ['ward-transfers', 'ward', ward_id],
    queryFn: () => fetchWardTransfersByWard(ward_id),
    enabled: enabled && !!ward_id,
    staleTime: 1000 * 60 * 2,
  })

export const useCreateWardTransfer = () => {
  const qc = useQueryClient()
  return useMutation<WardTransferResponse, Error, unknown>({
    mutationFn: createWardTransfer as (p: unknown) => Promise<WardTransferResponse>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ward-transfers'] })
      qc.invalidateQueries({ queryKey: ['rosters'] })
    },
  })
}

export const useCancelWardTransfer = () => {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: cancelWardTransfer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ward-transfers'] }),
  })
}
