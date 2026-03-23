import React from 'react';
import { List, Layers, History, Users, GraduationCap, Heart } from 'lucide-react';

export type SidebarViewMode = 'TRADITIONAL' | 'SWIPE' | 'HISTORY' | 'STAFF';

export interface AppSidebarProps {
  viewMode: SidebarViewMode;
  onViewModeChange: (mode: SidebarViewMode) => void;
  isHOD: boolean;
  canApproveGlobal: boolean;
  isSwipeTheme: boolean;
  portalTitle: string;
}

const navItemBase =
  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dashboard-sidebar-bg)]';

export const AppSidebar: React.FC<AppSidebarProps> = ({
  viewMode,
  onViewModeChange,
  isHOD,
  canApproveGlobal,
  isSwipeTheme,
  portalTitle,
}) => {
  const activeList = viewMode === 'TRADITIONAL';
  const activeSwipe = viewMode === 'SWIPE';
  const activeHistory = viewMode === 'HISTORY';
  const activeStaff = viewMode === 'STAFF';

  const accentSwipe = isSwipeTheme;

  return (
    <aside
      className="hidden h-full w-[var(--dashboard-sidebar-w)] shrink-0 flex-col border-r border-[var(--dashboard-sidebar-border)] bg-[var(--dashboard-sidebar-bg)] md:flex md:flex-col"
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-3 border-b border-[var(--dashboard-sidebar-border)] px-5 py-5">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            accentSwipe
              ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25'
              : 'bg-[var(--dashboard-brand-icon-bg)] text-[var(--dashboard-brand-icon-fg)]'
          }`}
        >
          {accentSwipe ? <Heart className="h-5 w-5" strokeWidth={2} /> : <GraduationCap className="h-5 w-5" strokeWidth={2} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-[var(--dashboard-text-primary)]">
            {portalTitle}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--dashboard-text-muted)]">Leave approvals</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--dashboard-text-muted)]">
          Views
        </p>
        <button
          type="button"
          onClick={() => onViewModeChange('TRADITIONAL')}
          className={`${navItemBase} ${
            activeList
              ? accentSwipe
                ? 'bg-pink-50 text-pink-700 shadow-sm ring-1 ring-pink-100'
                : 'bg-orange-50 text-orange-900 shadow-sm ring-1 ring-orange-100'
              : 'text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-nav-hover-bg)] hover:text-[var(--dashboard-text-primary)]'
          }`}
        >
          <List className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} />
          <span>List</span>
        </button>

        {canApproveGlobal && (
          <button
            type="button"
            onClick={() => onViewModeChange('SWIPE')}
            className={`${navItemBase} ${
              activeSwipe
                ? 'bg-gradient-to-r from-pink-500/10 to-rose-500/10 text-pink-700 shadow-sm ring-1 ring-pink-100'
                : 'text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-nav-hover-bg)] hover:text-[var(--dashboard-text-primary)]'
            }`}
          >
            <Layers className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} />
            <span>Swipe</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onViewModeChange('HISTORY')}
          className={`${navItemBase} ${
            activeHistory
              ? accentSwipe
                ? 'bg-pink-50 text-pink-800 shadow-sm ring-1 ring-pink-100'
                : 'bg-orange-50 text-orange-900 shadow-sm ring-1 ring-orange-100'
              : 'text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-nav-hover-bg)] hover:text-[var(--dashboard-text-primary)]'
          }`}
        >
          <History className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} />
          <span>History</span>
        </button>

        {isHOD && (
          <button
            type="button"
            onClick={() => onViewModeChange('STAFF')}
            className={`${navItemBase} ${
              activeStaff
                ? accentSwipe
                  ? 'bg-pink-50 text-pink-800 shadow-sm ring-1 ring-pink-100'
                  : 'bg-orange-50 text-orange-900 shadow-sm ring-1 ring-orange-100'
                : 'text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-nav-hover-bg)] hover:text-[var(--dashboard-text-primary)]'
            }`}
          >
            <Users className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} />
            <span>Staff</span>
          </button>
        )}
      </nav>
    </aside>
  );
};
