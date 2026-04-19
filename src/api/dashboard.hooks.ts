import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from './index';
import type { DashboardData } from './types';

export const useDashboardData = (hospitalId: string, date: string, shift?: string) => {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', hospitalId, date, shift],
    queryFn: () => fetchDashboardData(hospitalId, date, shift),
    enabled: !!hospitalId && !!date,
  });
};
