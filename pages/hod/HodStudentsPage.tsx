import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useHodPortal } from '../../contexts/HodPortalContext';
import { DataTable } from '../../components/hod/DataTable';
import type { HodStudentRow } from '../../types';

export const HodStudentsPage: React.FC = () => {
  const { students, loading } = useHodPortal();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        (s.department || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Student',
        cell: (s: HodStudentRow) => <span className="font-medium text-gray-900">{s.name}</span>,
      },
      {
        id: 'dept',
        header: 'Department',
        cell: (s: HodStudentRow) => <span className="text-gray-700">{s.department || '—'}</span>,
      },
      {
        id: 'roll',
        header: 'Roll / USN',
        cell: (s: HodStudentRow) => <span className="text-gray-600">{s.rollNumber}</span>,
      },
      {
        id: 'year',
        header: 'Year',
        cell: (s: HodStudentRow) => <span className="text-gray-600">{s.year || '—'}</span>,
      },
      {
        id: 'total',
        header: 'Total requests',
        cell: (s: HodStudentRow) => <span>{s.totalRequests}</span>,
      },
      {
        id: 'pend',
        header: 'Pending',
        cell: (s: HodStudentRow) => <span>{s.pendingRequests}</span>,
      },
      {
        id: 'act',
        header: '',
        className: 'text-right',
        cell: (s: HodStudentRow) => (
          <Link
            to={`/hod-dashboard/students/${s.id}`}
            className="font-medium text-orange-600 hover:text-orange-700"
          >
            View profile
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
        <h2 className="text-2xl font-bold text-gray-900">Students</h2>
        <p className="text-sm text-gray-500">Directory and request counts</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search students…"
          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <DataTable columns={columns} rows={filtered} rowKey={r => r.id} emptyMessage="No students found." />
    </div>
  );
};
