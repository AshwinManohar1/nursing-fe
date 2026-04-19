import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLeaves, addLeave } from "./index";
import type { Leave, CreateLeaveRequest } from "./types";

export const useLeaves = () => {
  return useQuery<Leave[]>({
    queryKey: ["leaves"],
    queryFn: fetchLeaves,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useLeave = (id: string) => {
  return useQuery<Leave | undefined>({
    queryKey: ["leave", id],
    queryFn: () => fetchLeaves().then(leaves => leaves.find((l: Leave) => l.id === id)),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLeavesByStaff = (staffId: string) => {
  return useQuery<Leave[]>({
    queryKey: ["leaves", "staff", staffId],
    queryFn: () => fetchLeaves().then(leaves => leaves.filter((l: Leave) => l.staffId === staffId)),
    enabled: !!staffId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddLeave = () => {
  const queryClient = useQueryClient();
  return useMutation<Leave, Error, CreateLeaveRequest>({
    mutationFn: addLeave,
    onSuccess: (newLeave) => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leaves", "staff", newLeave.staffId] });
      queryClient.setQueryData(["leave", newLeave.id], newLeave);
    },
    onError: (error) => {
      console.error("Failed to add leave:", error);
    },
  });
};