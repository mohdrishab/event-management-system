import React, { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import type { User } from '../../types';
import { HodPortalProvider, useHodPortal } from '../../contexts/HodPortalContext';
import { HodSidebar } from '../../components/layout/HodSidebar';
import { HodMobileNav } from '../../components/layout/HodMobileNav';
import { AppNavbar } from '../../components/layout/AppNavbar';

function pageLabel(pathname: string): string {
  if (
    pathname.startsWith('/hod-dashboard/requests/') &&
    pathname !== '/hod-dashboard/requests'
  ) {
    return 'Request details';
  }
  if (
    pathname.startsWith('/hod-dashboard/students/') &&
    pathname !== '/hod-dashboard/students'
  ) {
    return 'Student profile';
  }
  const map: Record<string, string> = {
    '/hod-dashboard': 'Dashboard',
    '/hod-dashboard/requests': 'Requests',
    '/hod-dashboard/students': 'Students',
    '/hod-dashboard/staff': 'Staff',
    '/hod-dashboard/certificates': 'Certificates',
    '/hod-dashboard/reports': 'Reports & analytics',
    '/hod-dashboard/notifications': 'Notifications',
    '/hod-dashboard/settings': 'Settings',
  };
  return map[pathname] || 'HoD Portal';
}

const Inner: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const location = useLocation();
  const { refresh, refreshing } = useHodPortal();
  const label = useMemo(() => pageLabel(location.pathname), [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-[var(--dashboard-page-bg)]">
      <HodSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppNavbar
          user={user}
          isHOD
          isSwipeTheme={false}
          pageLabel={label}
          isRefreshing={refreshing}
          onRefresh={() => refresh()}
          onLogout={onLogout}
        />
        <HodMobileNav />
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export interface HodDashboardLayoutProps {
  user: User;
  onLogout: () => void;
}

export const HodDashboardLayout: React.FC<HodDashboardLayoutProps> = ({ user, onLogout }) => {
  return (
    <HodPortalProvider user={user}>
      <Inner user={user} onLogout={onLogout} />
    </HodPortalProvider>
  );
};
