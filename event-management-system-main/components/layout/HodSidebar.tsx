import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  GraduationCap,
  Users,
  BarChart3,
  Bell,
  Settings,
  FileText,
} from 'lucide-react';

const navItemBase =
  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dashboard-sidebar-bg)]';

const items: { to: string; label: string; icon: React.ReactNode }[] = [
  { to: '.', label: 'Dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} /> },
  { to: 'requests', label: 'Requests', icon: <Inbox className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} /> },
  { to: 'students', label: 'Students', icon: <GraduationCap className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} /> },
  { to: 'staff', label: 'Staff', icon: <Users className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} /> },
  { to: 'certificates', label: 'Certificates', icon: <FileText className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} /> },
  { to: 'reports', label: 'Reports', icon: <BarChart3 className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} /> },
  { to: 'notifications', label: 'Notifications', icon: <Bell className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} /> },
  { to: 'settings', label: 'Settings', icon: <Settings className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={2} /> },
];

export const HodSidebar: React.FC = () => {
  return (
    <aside
      className="hidden h-full w-[var(--dashboard-sidebar-w)] shrink-0 flex-col border-r border-[var(--dashboard-sidebar-border)] bg-[var(--dashboard-sidebar-bg)] md:flex md:flex-col"
      aria-label="HoD navigation"
    >
      <div className="flex items-center gap-3 border-b border-[var(--dashboard-sidebar-border)] px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--dashboard-brand-icon-bg)] text-[var(--dashboard-brand-icon-fg)]">
          <GraduationCap className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-[var(--dashboard-text-primary)]">
            HoD Portal
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--dashboard-text-muted)]">LeaveSync · UniEvent</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--dashboard-text-muted)]">
          Menu
        </p>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '.'}
            className={({ isActive }) =>
              `${navItemBase} ${
                isActive
                  ? 'bg-orange-50 text-orange-900 shadow-sm ring-1 ring-orange-100'
                  : 'text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-nav-hover-bg)] hover:text-[var(--dashboard-text-primary)]'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
