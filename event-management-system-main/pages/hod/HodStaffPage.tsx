import React, { useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useHodPortal } from '../../contexts/HodPortalContext';
import { DataTable } from '../../components/hod/DataTable';
import { storageService } from '../../services/storageService';
import type { HodStaffRow } from '../../types';

export const HodStaffPage: React.FC = () => {
  const { staff, loading, refresh } = useHodPortal();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.department || '').toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
    );
  }, [staff, search]);

  const toggleActive = async (row: HodStaffRow) => {
    if (row.role === 'HoD') return;
    setBusyId(row.id);
    try {
      await storageService.updateStaffActive(row.id, !row.isActive);
      await refresh();
    } catch (e) {
      console.error(e);
      alert('Could not update staff status. Ensure your Supabase `staff` table has an `is_active` column.');
    } finally {
      setBusyId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Staff',
        cell: (s: HodStaffRow) => <span className="font-medium text-gray-900">{s.name}</span>,
      },
      {
        id: 'dept',
        header: 'Department',
        cell: (s: HodStaffRow) => <span className="text-gray-700">{s.department || '—'}</span>,
      },
      {
        id: 'role',
        header: 'Role',
        cell: (s: HodStaffRow) => <span className="text-gray-700">{s.role}</span>,
      },
      {
        id: 'rev',
        header: 'Requests reviewed',
        cell: (s: HodStaffRow) => <span>{s.requestsReviewed}</span>,
      },
      {
        id: 'st',
        header: 'Status',
        cell: (s: HodStaffRow) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              s.isActive ? 'bg-green-50 text-green-800 ring-1 ring-green-100' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        className: 'text-right',
        cell: (s: HodStaffRow) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="text-sm font-medium text-orange-600 hover:underline"
              onClick={() => alert(`Profile: ${s.name}\nDepartment: ${s.department || '—'}\nRole: ${s.role}`)}
            >
              View
            </button>
            {s.role !== 'HoD' && (
              <button
                type="button"
                disabled={busyId === s.id}
                className="text-sm font-medium text-gray-700 hover:text-orange-600 disabled:opacity-50"
                onClick={() => toggleActive(s)}
              >
                {busyId === s.id ? '…' : s.isActive ? 'Disable' : 'Enable'}
              </button>
            )}
          </div>
        ),
      },
    ],
    [busyId]
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
        <h2 className="text-2xl font-bold text-gray-900">Staff</h2>
        <p className="text-sm text-gray-500">Counselors and faculty (from `staff` table)</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search staff…"
          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <DataTable columns={columns} rows={filtered} rowKey={r => r.id} emptyMessage="No staff rows." />
    </div>
  );
};
