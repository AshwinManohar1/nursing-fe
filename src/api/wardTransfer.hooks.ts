import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createWardTransfer, fetchWardTransfers, fetchWardTransfersByWard } from "./index";
import type { CreateWardTransferRequest, WardTransferResponse } from "./types";

export const useWardTransfers = (hospital_id: string) => {
  return useQuery<WardTransferResponse>({
    queryKey: ["ward-transfers", hospital_id],
    queryFn: () => fetchWardTransfers(hospital_id),
    enabled: !!hospital_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useWardTransfersByWard = (ward_id: string, enabled: boolean = true) => {
  return useQuery<WardTransferResponse>({
    queryKey: ["ward-transfers", "ward", ward_id],
    queryFn: () => fetchWardTransfersByWard(ward_id),
    enabled: enabled && !!ward_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCreateWardTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation<WardTransferResponse, Error, CreateWardTransferRequest>({
    mutationFn: createWardTransfer,
    onSuccess: (_, variables) => {
      // Invalidate transfers list for the hospital
      queryClient.invalidateQueries({ queryKey: ["ward-transfers", variables.hospital_id] });
      // Invalidate transfers by ward
      queryClient.invalidateQueries({ queryKey: ["ward-transfers", "ward"] });
      // Invalidate rosters since transfers are part of roster data
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    },
    onError: (error) => {
      console.error("Failed to create ward transfer:", error);
    },
  });
};

