import React from 'react';
import { AppNavbar, AppNavbarProps } from './AppNavbar';
import { AppSidebar, AppSidebarProps } from './AppSidebar';
import { AppMobileQuickNav } from './AppMobileQuickNav';

export interface DashboardLayoutProps {
  sidebarProps: AppSidebarProps;
  navbarProps: AppNavbarProps;
  children: React.ReactNode;
  isSwipeTheme: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  sidebarProps,
  navbarProps,
  children,
  isSwipeTheme,
}) => {
  return (
    <div
      className={`flex min-h-screen w-full transition-colors duration-500 ${
        isSwipeTheme ? 'bg-pink-50' : 'bg-[var(--dashboard-page-bg)]'
      }`}
    >
      <AppSidebar {...sidebarProps} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppNavbar {...navbarProps} />
        <AppMobileQuickNav {...sidebarProps} />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};
