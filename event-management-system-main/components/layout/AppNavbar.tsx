import React from 'react';
import { LogOut, RefreshCcw } from 'lucide-react';
import type { User } from '../../types';

export interface AppNavbarProps {
  user: User;
  isHOD: boolean;
  isSwipeTheme: boolean;
  pageLabel: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  user,
  isHOD,
  isSwipeTheme,
  pageLabel,
  isRefreshing,
  onRefresh,
  onLogout,
}) => {
  const initials = (user.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <header
      className="sticky top-0 z-40 flex h-[var(--dashboard-navbar-h)] shrink-0 items-center justify-between gap-4 border-b border-[var(--dashboard-navbar-border)] bg-[var(--dashboard-navbar-bg)]/95 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--dashboard-navbar-bg)]/80"
      role="banner"
    >
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--dashboard-text-primary)]">
          {pageLabel}
        </h1>
        <p className="truncate text-xs text-[var(--dashboard-text-muted)]">
          Signed in as <span className="font-medium text-[var(--dashboard-text-secondary)]">{user.name}</span>
          {isHOD && <span className="ml-1.5 rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">Admin</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`hidden h-9 w-9 items-center justify-center rounded-full text-xs font-bold sm:flex ${
            isSwipeTheme
              ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-sm'
              : 'bg-slate-200 text-slate-700'
          }`}
          aria-hidden
        >
          {initials}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-[var(--dashboard-text-secondary)] transition-colors hover:bg-[var(--dashboard-nav-hover-bg)] hover:text-[var(--dashboard-text-primary)] disabled:opacity-50"
          title="Refresh data"
          aria-label="Refresh data"
        >
          <RefreshCcw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--dashboard-sidebar-border)] text-[var(--dashboard-text-secondary)] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
