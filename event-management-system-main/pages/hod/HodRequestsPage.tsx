import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useHodPortal } from '../../contexts/HodPortalContext';
import { DataTable } from '../../components/hod/DataTable';
import type { LeaveApplication } from '../../types';
import { counselorStatusLabel, formatRequestKind } from '../../lib/hodRequestHelpers';
import { safeDate } from '../StudentDashboard';

export const HodRequestsPage: React.FC = () => {
  const { applications, loading } = useHodPortal();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [kind, setKind] = useState<'all' | 'leave' | 'late_entry'>('all');

  const filtered = useMemo(() => {
    let rows = [...applications];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        a =>
          (a.studentName || '').toLowerCase().includes(q) ||
          (a.studentUSN || '').toLowerCase().includes(q)
      );
    }
    if (status !== 'all') {
      rows = rows.filter(a => a.status?.toLowerCase() === status);
    }
    if (kind !== 'all') {
      rows = rows.filter(a => (a.requestKind || 'leave') === kind);
    }
    return rows.sort(
      (a, b) => (safeDate(b.timestamp).getTime() || 0) - (safeDate(a.timestamp).getTime() || 0)
    );
  }, [applications, search, status, kind]);

  const columns = useMemo(
    () => [
      {
        id: 'student',
        header: 'Student',
        cell: (a: LeaveApplication) => (
          <div>
            <div className="font-medium text-gray-900">{a.studentName}</div>
            <div className="text-xs text-gray-500">{a.studentUSN}</div>
          </div>
        ),
      },
      {
        id: 'type',
        header: 'Request type',
        cell: (a: LeaveApplication) => (
          <span className="text-gray-700">{formatRequestKind(a.requestKind)}</span>
        ),
      },
      {
        id: 'period',
        header: 'Date / period',
        cell: (a: LeaveApplication) => (
          <span className="text-gray-600">
            {format(safeDate(a.startDate), 'MMM d')} – {format(safeDate(a.endDate), 'MMM d, yyyy')}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (a: LeaveApplication) => (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-800">
            {a.status}
          </span>
        ),
      },
      {
        id: 'counselor',
        header: 'Counselor status',
        cell: (a: LeaveApplication) => (
          <span className="text-gray-700">{counselorStatusLabel(a)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        className: 'text-right',
        cell: (a: LeaveApplication) => (
          <Link
            to={`/hod-dashboard/requests/${a.id}`}
            className="font-medium text-orange-600 hover:text-orange-700"
          >
            View / Review
          </Link>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Requests</h2>
        <p className="text-sm text-gray-500">Search, filter, and open requests for review</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by student name or ID (USN)…"
            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          value={status}
          onChange={e => setStatus(e.target.value as typeof status)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          className="rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          value={kind}
          onChange={e => setKind(e.target.value as typeof kind)}
        >
          <option value="all">All types</option>
          <option value="leave">Leave</option>
          <option value="late_entry">Late entry</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={r => r.id}
        emptyMessage="No requests match your filters."
      />
    </div>
  );
};
