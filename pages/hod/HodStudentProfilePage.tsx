import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { storageService } from '../../services/storageService';
import type { LeaveApplication } from '../../types';
import { formatRequestKind } from '../../lib/hodRequestHelpers';
import { safeDate } from '../StudentDashboard';

export const HodStudentProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Record<string, string> | null>(null);
  const [apps, setApps] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!studentId) return;
      setLoading(true);
      try {
        const [rec, list] = await Promise.all([
          storageService.getStudentRecord(studentId),
          storageService.getStudentApplications(studentId),
        ]);
        if (!cancelled) {
          setStudent(rec as Record<string, string> | null);
          setApps(list);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        to="/hod-dashboard/students"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to students
      </Link>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Student profile</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium text-gray-900">{student?.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">USN</dt>
            <dd className="font-medium text-gray-900">{student?.usn || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Department</dt>
            <dd className="text-gray-900">{student?.department || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Year</dt>
            <dd className="text-gray-900">{student?.year ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Requests ({apps.length})</h3>
        <ul className="mt-4 divide-y divide-gray-100">
          {apps.map(a => (
            <li key={a.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-gray-900">{a.eventName}</p>
                <p className="text-xs text-gray-500">
                  {formatRequestKind(a.requestKind)} · {format(safeDate(a.startDate), 'MMM d')} –{' '}
                  {format(safeDate(a.endDate), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs capitalize text-gray-600">{a.status}</span>
                <Link to={`/hod-dashboard/requests/${a.id}`} className="text-sm font-medium text-orange-600">
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {apps.length === 0 && <p className="text-sm text-gray-500">No requests filed.</p>}
      </section>
    </div>
  );
};
