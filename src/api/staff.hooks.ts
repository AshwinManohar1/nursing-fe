import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchStaff, addStaff, updateStaff, deleteStaff, uploadStaffCSV } from "./index";
import type { Staff, CreateStaffRequest, UpdateStaffRequest } from "./types";

export interface PaginatedStaffResponse {
  items: Staff[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export const useStaffList = (page: number = 1, limit: number = 100, search?: string) => {
  return useQuery<PaginatedStaffResponse>({
    queryKey: ["staff", page, limit, search],
    queryFn: () => fetchStaff(page, limit, search),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useStaff = (id: string) => {
  return useQuery<Staff | undefined>({
    queryKey: ["staff", id],
    queryFn: async () => {
      // Fetch first page with a large limit to find the staff member
      const response = await fetchStaff(1, 1000);
      return response.items.find((s: Staff) => s._id === id || s.id === id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddStaff = () => {
  const queryClient = useQueryClient();
  return useMutation<Staff, Error, CreateStaffRequest>({
    mutationFn: addStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error) => {
      console.error("Failed to add staff:", error);
    },
  });
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();
  return useMutation<Staff, Error, { id: string; payload: UpdateStaffRequest }>({
    mutationFn: ({ id, payload }) => updateStaff(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff", id] });
    },
    onError: (error) => {
      console.error("Failed to update staff:", error);
    },
  });
};

export const useDeleteStaff = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error) => {
      console.error("Failed to delete staff:", error);
    },
  });
};

export const useUploadStaffCSV = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { file: File; org_id: string }>({
    mutationFn: ({ file, org_id }) => uploadStaffCSV(file, org_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error) => {
      console.error("Failed to upload staff CSV:", error);
    },
  });
};