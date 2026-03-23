import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Inbox, GraduationCap, Users, BarChart3, Bell, Settings, FileText } from 'lucide-react';

const items: { to: string; label: string; icon: React.ReactNode }[] = [
  { to: '.', label: 'Home', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: 'requests', label: 'Req', icon: <Inbox className="h-5 w-5" /> },
  { to: 'students', label: 'Stud', icon: <GraduationCap className="h-5 w-5" /> },
  { to: 'staff', label: 'Staff', icon: <Users className="h-5 w-5" /> },
  { to: 'certificates', label: 'Certs', icon: <FileText className="h-5 w-5" /> },
  { to: 'reports', label: 'Rep', icon: <BarChart3 className="h-5 w-5" /> },
  { to: 'notifications', label: 'Bell', icon: <Bell className="h-5 w-5" /> },
  { to: 'settings', label: 'Set', icon: <Settings className="h-5 w-5" /> },
];

export const HodMobileNav: React.FC = () => {
  return (
    <div
      className="flex gap-0.5 overflow-x-auto border-b border-[var(--dashboard-sidebar-border)] bg-[var(--dashboard-sidebar-bg)] px-1 py-1 md:hidden"
      role="navigation"
      aria-label="HoD quick nav"
    >
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '.'}
          className={({ isActive }) =>
            `flex min-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold ${
              isActive ? 'text-orange-700' : 'text-slate-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={isActive ? 'text-orange-600' : ''}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
};
