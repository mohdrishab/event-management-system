import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'orange' | 'amber' | 'green' | 'red' | 'slate' | 'violet';
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  orange: 'bg-orange-50 text-orange-600 ring-orange-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  green: 'bg-green-50 text-green-600 ring-green-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
  slate: 'bg-slate-50 text-slate-600 ring-slate-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, accent = 'orange' }) => {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1 ${accentMap[accent]}`}>
        <Icon className="h-6 w-6" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="truncate text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};
