import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  LogIn,
  Plane,
  Loader2,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { useHodPortal } from '../../contexts/HodPortalContext';
import { StatCard } from '../../components/hod/StatCard';
import { countByRequestKind, countByStatus, recentActivity, approvalRatePct, avgResponseTimeHours } from '../../lib/hodAnalytics';
import { formatRequestKind } from '../../lib/hodRequestHelpers';
import { safeDate } from '../StudentDashboard';

export const HodOverviewPage: React.FC = () => {
  const { applications, students, staff, loading, refresh } = useHodPortal();

  const stats = useMemo(() => {
    const c = countByStatus(applications);
    const rk = countByRequestKind(applications);
    return {
      ...c,
      lateEntry: rk.lateEntry,
      leave: rk.leave,
    };
  }, [applications]);

  const dept = useMemo(() => {
    const decided = applications.filter(a => ['approved', 'rejected'].includes(String(a.status).toLowerCase()));
    return {
      totalStudents: students.length,
      totalStaff: staff.length,
      approvalRate: approvalRatePct(applications),
      avgResponseH: avgResponseTimeHours(decided),
    };
  }, [applications, students, staff]);

  const pendingList = useMemo(() => {
    return applications
      .filter(a => a.status?.toUpperCase() === 'PENDING')
      .sort((a, b) => (safeDate(b.timestamp).getTime() || 0) - (safeDate(a.timestamp).getTime() || 0))
      .slice(0, 8);
  }, [applications]);

  const activity = useMemo(() => recentActivity(applications, 10), [applications]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">Overview of leave activity and pending work</p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          Refresh data
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total requests" value={stats.total} icon={ClipboardList} accent="slate" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} accent="amber" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="green" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} accent="red" />
        <StatCard label="Late entry" value={stats.lateEntry} icon={LogIn} accent="violet" />
        <StatCard label="Leave" value={stats.leave} icon={Plane} accent="orange" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pending approval</h3>
            <Link to="/hod-dashboard/requests" className="text-sm font-medium text-orange-600 hover:underline">
              View all
            </Link>
          </div>
          {pendingList.length === 0 ? (
            <p className="text-sm text-gray-500">No pending requests.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pendingList.map(app => (
                <li key={app.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{app.studentName}</p>
                    <p className="text-xs text-gray-500">
                      {app.studentUSN} · {formatRequestKind(app.requestKind)} ·{' '}
                      {format(safeDate(app.startDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-100">
                      {app.status}
                    </span>
                    <Link
                      to={`/hod-dashboard/requests/${app.id}`}
                      className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
                    >
                      Review
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent activity</h3>
          {activity.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map(row => (
                <li key={row.id} className="flex gap-3 text-sm">
                  <span
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      row.kind === 'new'
                        ? 'bg-amber-400'
                        : row.kind === 'approved'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="text-gray-800">{row.label}</p>
                    <p className="text-xs text-gray-400">{row.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Department summary</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total students</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{dept.totalStudents}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total staff</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{dept.totalStaff}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Approval rate</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{dept.approvalRate}%</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avg response time</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {dept.avgResponseH > 0 ? `${dept.avgResponseH} h` : '—'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
