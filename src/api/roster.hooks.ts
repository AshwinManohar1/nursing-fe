import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRosters, fetchRoster, generateRoster, patchRoster, deleteRoster } from './index'
import type { Roster, GenerateRosterRequest } from './types'

export const useRosters = () =>
  useQuery<Roster[]>({
    queryKey: ['rosters'],
    queryFn: fetchRosters,
    staleTime: 1000 * 60 * 5,
  })

export const useRoster = (id: string) =>
  useQuery<Roster>({
    queryKey: ['roster', id],
    queryFn: () => fetchRoster(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })

export const useGenerateRoster = () => {
  const qc = useQueryClient()
  return useMutation<Roster, Error, GenerateRosterRequest>({
    mutationFn: generateRoster as (p: GenerateRosterRequest) => Promise<Roster>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rosters'] }),
  })
}

// The backend only has PATCH for roster updates — no PUT endpoint exists.
export const usePatchRoster = () => {
  const qc = useQueryClient()
  return useMutation<unknown, Error, { roster_id: string; payload: unknown }>({
    mutationFn: ({ roster_id, payload }) => patchRoster(roster_id, payload),
    onSuccess: (_, { roster_id }) => {
      qc.invalidateQueries({ queryKey: ['rosters'] })
      qc.invalidateQueries({ queryKey: ['roster', roster_id] })
    },
  })
}

export const useDeleteRoster = () => {
  const qc = useQueryClient()
  return useMutation<unknown, Error, string>({
    mutationFn: deleteRoster,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rosters'] }),
  })
}
