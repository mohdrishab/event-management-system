import React, { useMemo } from 'react';
import { BarChart3, Calendar, Loader2, Percent, ThumbsDown, Timer } from 'lucide-react';
import { useHodPortal } from '../../contexts/HodPortalContext';
import { StatCard } from '../../components/hod/StatCard';
import {
  approvalRatePct,
  avgResponseTimeHours,
  buildMonthlyBuckets,
  countByRequestKind,
  countByStatus,
  rejectionRatePct,
  thisMonthCount,
} from '../../lib/hodAnalytics';
import { formatRequestKind } from '../../lib/hodRequestHelpers';

function BarChart({
  title,
  groups,
}: {
  title: string;
  groups: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...groups.map(g => g.value));
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.label}>
            <div className="mb-1 flex justify-between text-xs text-gray-600">
              <span>{g.label}</span>
              <span className="font-medium">{g.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${g.color}`}
                style={{ width: `${(g.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const HodReportsPage: React.FC = () => {
  const { applications, loading } = useHodPortal();

  const metrics = useMemo(() => {
    const decided = applications.filter(a => ['approved', 'rejected'].includes(String(a.status).toLowerCase()));
    return {
      approvalRate: approvalRatePct(applications),
      rejectionRate: rejectionRatePct(applications),
      avgResponse: avgResponseTimeHours(decided),
      thisMonth: thisMonthCount(applications),
      byStatus: countByStatus(applications),
      byKind: countByRequestKind(applications),
      monthly: buildMonthlyBuckets(applications, 6),
    };
  }, [applications]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const apprRej = [
    { label: 'Approved', value: metrics.byStatus.approved, color: 'bg-green-500' },
    { label: 'Rejected', value: metrics.byStatus.rejected, color: 'bg-red-500' },
    { label: 'Pending', value: metrics.byStatus.pending, color: 'bg-amber-400' },
  ];

  const leaveLate = [
    { label: formatRequestKind('leave'), value: metrics.byKind.leave, color: 'bg-orange-500' },
    { label: formatRequestKind('late_entry'), value: metrics.byKind.lateEntry, color: 'bg-violet-500' },
  ];

  const monthBars = metrics.monthly.map(m => ({
    label: m.month,
    value: m.count,
    color: 'bg-orange-500',
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & analytics</h2>
        <p className="text-sm text-gray-500">KPIs and distributions from live request data</p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Approval rate" value={`${metrics.approvalRate}%`} icon={Percent} accent="green" />
        <StatCard label="Avg response time" value={metrics.avgResponse > 0 ? `${metrics.avgResponse} h` : '—'} icon={Timer} accent="slate" />
        <StatCard label="This month" value={metrics.thisMonth} icon={Calendar} accent="orange" />
        <StatCard label="Rejection rate" value={`${metrics.rejectionRate}%`} icon={ThumbsDown} accent="red" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChart title="Requests per month" groups={monthBars} />
        <BarChart title="Approval vs rejection vs pending" groups={apprRej} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChart title="Leave vs late entry" groups={leaveLate} />
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <BarChart3 className="h-4 w-4 text-orange-600" />
            Detailed statistics
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">By status</p>
              <ul className="mt-2 space-y-1 text-gray-700">
                <li>Pending: {metrics.byStatus.pending}</li>
                <li>Approved: {metrics.byStatus.approved}</li>
                <li>Rejected: {metrics.byStatus.rejected}</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">By type</p>
              <ul className="mt-2 space-y-1 text-gray-700">
                <li>Leave: {metrics.byKind.leave}</li>
                <li>Late entry: {metrics.byKind.lateEntry}</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Performance</p>
              <ul className="mt-2 space-y-1 text-gray-700">
                <li>Approval rate: {metrics.approvalRate}%</li>
                <li>Rejection rate: {metrics.rejectionRate}%</li>
                <li>Avg. response (decided): {metrics.avgResponse > 0 ? `${metrics.avgResponse} h` : '—'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
