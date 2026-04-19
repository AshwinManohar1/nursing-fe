import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDiffs, approveDiff, rejectDiff } from "./index";
import type { Diff } from "./types";

export const useDiffs = (rosterId: string) => {
  return useQuery<Diff[]>({
    queryKey: ["diffs", rosterId],
    queryFn: () => fetchDiffs(rosterId),
    enabled: !!rosterId,
    staleTime: 1000 * 60 * 2, // 2 minutes (diffs change frequently)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useDiff = (diffId: string) => {
  return useQuery<Diff>({
    queryKey: ["diff", diffId],
    queryFn: () => fetchDiffs("").then(diffs => diffs.find((d: any) => d.id === diffId)),
    enabled: !!diffId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useApproveDiff = () => {
  const queryClient = useQueryClient();
  return useMutation<Diff, Error, string>({
    mutationFn: approveDiff,
    onSuccess: (updatedDiff) => {
      queryClient.invalidateQueries({ queryKey: ["diffs"] });
      queryClient.setQueryData(["diff", updatedDiff.id], updatedDiff);
    },
    onError: (error) => {
      console.error("Failed to approve diff:", error);
    },
  });
};

export const useRejectDiff = () => {
  const queryClient = useQueryClient();
  return useMutation<Diff, Error, string>({
    mutationFn: rejectDiff,
    onSuccess: (updatedDiff) => {
      queryClient.invalidateQueries({ queryKey: ["diffs"] });
      queryClient.setQueryData(["diff", updatedDiff.id], updatedDiff);
    },
    onError: (error) => {
      console.error("Failed to reject diff:", error);
    },
  });
};