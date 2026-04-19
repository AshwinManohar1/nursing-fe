// Shift API removed. Provide static data and no-op hooks for compatibility.
import type { Shift, CreateShiftRequest } from "./types";

const staticShifts: Shift[] = [
  { id: "M", name: "Morning", startTime: "06:00", endTime: "12:00", department: "General", requiredSkills: [], maxStaff: 0, createdAt: "", updatedAt: "" },
  { id: "E", name: "Evening", startTime: "12:00", endTime: "18:00", department: "General", requiredSkills: [], maxStaff: 0, createdAt: "", updatedAt: "" },
  { id: "N", name: "Night", startTime: "18:00", endTime: "06:00", department: "General", requiredSkills: [], maxStaff: 0, createdAt: "", updatedAt: "" },
  { id: "G", name: "General", startTime: "09:00", endTime: "17:00", department: "General", requiredSkills: [], maxStaff: 0, createdAt: "", updatedAt: "" },
];

export const useShifts = () => ({
  data: staticShifts as Shift[] | undefined,
  isLoading: false,
  error: undefined as unknown as Error | undefined,
  refetch: async () => ({ data: staticShifts }),
});

export const useShift = (id: string) => ({
  data: staticShifts.find(s => s.id === id) as Shift | undefined,
  isLoading: false,
  error: undefined as unknown as Error | undefined,
});

export const useAddShift = () => ({
  mutate: (_: CreateShiftRequest) => {},
  mutateAsync: async (_: CreateShiftRequest) => undefined,
  isPending: false,
  isError: false,
  error: undefined as unknown as Error | undefined,
});