import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRoster,
  fetchRosters,
  generateRoster,
  updateRoster,
  patchRoster,
  updateRosterConstraints,
  deleteRoster,
} from "./index";
import type { Roster, GenerateRosterRequest, UpdateRosterRequest, RosterConstraints } from "./types";

// Get all rosters
export const useRosters = () => {
  return useQuery<Roster[]>({
    queryKey: ["rosters"],
    queryFn: fetchRosters,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Get single roster
export const useRoster = (id: string) => {
  return useQuery<Roster>({
    queryKey: ["roster", id],
    queryFn: () => fetchRoster(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 3,
  });
};

// Generate roster
export const useGenerateRoster = () => {
  const queryClient = useQueryClient();
  return useMutation<Roster, Error, GenerateRosterRequest>({
    mutationFn: generateRoster,
    onSuccess: (newRoster: any) => {
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
      queryClient.setQueryData(["roster", newRoster.id], newRoster);
    },
    onError: (error) => {
      console.error("Failed to generate roster:", error);
    },
  });
};

// Update roster
export const useUpdateRoster = () => {
  const queryClient = useQueryClient();
  return useMutation<Roster, Error, { id: string; payload: UpdateRosterRequest }>({
    mutationFn: ({ id, payload }) => updateRoster(id, payload),
    onSuccess: (updatedRoster, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
      queryClient.setQueryData(["roster", id], updatedRoster);
    },
    onError: (error) => {
      console.error("Failed to update roster:", error);
    },
  });
};

// Patch roster (for specific field updates)
export const usePatchRoster = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { roster_id: string; payload: any }>({
    mutationFn: ({ roster_id, payload }) => patchRoster(roster_id, payload),
    onSuccess: (_, { roster_id }) => {
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
      queryClient.invalidateQueries({ queryKey: ["roster", roster_id] });
    },
    onError: (error) => {
      console.error("Failed to patch roster:", error);
    },
  });
};

export const useUpdateRosterConstraints = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { roster_id: string; constraints: RosterConstraints }>({
    mutationFn: ({ roster_id, constraints }) => {
      console.log("Updating roster constraints for roster_id:", roster_id, "with constraints:", constraints);
      return updateRosterConstraints(roster_id, constraints);
    },
    onSuccess: (response, { roster_id }) => {
      console.log("Constraints updated successfully for roster:", roster_id, "response:", response);
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
      queryClient.invalidateQueries({ queryKey: ["roster", roster_id] });
    },
    onError: (error) => {
      console.error("Failed to update roster constraints:", error);
    },
  });
};

// Delete roster
export const useDeleteRoster = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: (roster_id: string) => deleteRoster(roster_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (error) => {
      console.error("Failed to delete roster:", error);
    },
  });
};