import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User, LeaveApplication, HodStudentRow, HodStaffRow } from '../types';
import { storageService } from '../services/storageService';

interface HodPortalValue {
  user: User;
  applications: LeaveApplication[];
  students: HodStudentRow[];
  staff: HodStaffRow[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

const HodPortalContext = createContext<HodPortalValue | null>(null);

export const HodPortalProvider: React.FC<{ user: User; children: React.ReactNode }> = ({ user, children }) => {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [students, setStudents] = useState<HodStudentRow[]>([]);
  const [staff, setStaff] = useState<HodStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent: boolean) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [apps, stud, stf] = await Promise.all([
        storageService.getApplications(),
        storageService.getHodStudentRows(),
        storageService.getHodStaffRows(),
      ]);
      setApplications(apps);
      setStudents(stud);
      setStaff(stf);
    } catch (e) {
      console.error('HoD refresh failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const value = useMemo(
    () => ({
      user,
      applications,
      students,
      staff,
      loading,
      refreshing,
      refresh,
    }),
    [user, applications, students, staff, loading, refreshing, refresh]
  );

  return <HodPortalContext.Provider value={value}>{children}</HodPortalContext.Provider>;
};

export function useHodPortal() {
  const ctx = useContext(HodPortalContext);
  if (!ctx) throw new Error('useHodPortal must be used within HodPortalProvider');
  return ctx;
}
