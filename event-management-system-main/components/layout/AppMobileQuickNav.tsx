import React from 'react';
import { List, Layers, History, Users } from 'lucide-react';
import type { AppSidebarProps } from './AppSidebar';

/** Icon-only horizontal nav for small viewports (sidebar is hidden). */
export const AppMobileQuickNav: React.FC<AppSidebarProps> = ({
  viewMode,
  onViewModeChange,
  isHOD,
  canApproveGlobal,
  isSwipeTheme,
}) => {
  const item = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
        active
          ? isSwipeTheme
            ? 'text-pink-700'
            : 'text-orange-700'
          : 'text-slate-500 hover:text-slate-800'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <span className={active ? (isSwipeTheme ? 'text-pink-600' : 'text-orange-600') : ''}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div
      className="flex border-b border-[var(--dashboard-sidebar-border)] bg-[var(--dashboard-sidebar-bg)] md:hidden"
      role="navigation"
      aria-label="Quick views"
    >
      {item(viewMode === 'TRADITIONAL', () => onViewModeChange('TRADITIONAL'), <List className="h-5 w-5" />, 'List')}
      {canApproveGlobal &&
        item(viewMode === 'SWIPE', () => onViewModeChange('SWIPE'), <Layers className="h-5 w-5" />, 'Swipe')}
      {item(viewMode === 'HISTORY', () => onViewModeChange('HISTORY'), <History className="h-5 w-5" />, 'History')}
      {isHOD && item(viewMode === 'STAFF', () => onViewModeChange('STAFF'), <Users className="h-5 w-5" />, 'Staff')}
    </div>
  );
};
