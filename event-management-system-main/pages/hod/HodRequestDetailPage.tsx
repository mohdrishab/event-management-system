import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { LeaveApplication } from '../../types';
import { storageService } from '../../services/storageService';
import { counselorStatusLabel, formatRequestKind } from '../../lib/hodRequestHelpers';
import { safeDate } from '../StudentDashboard';
import { useHodPortal } from '../../contexts/HodPortalContext';

export const HodRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refresh } = useHodPortal();
  const [app, setApp] = useState<LeaveApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const row = await storageService.getApplicationById(id);
        if (!cancelled) setApp(row);
      } catch (e) {
        console.error(e);
        if (!cancelled) setApp(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const decide = async (status: 'approved' | 'rejected') => {
    if (!app || !user) return;
    setActing(true);
    try {
      await storageService.updateApplicationStatus(app.id, status, user.id, user.name);
      await refresh();
      const next = await storageService.getApplicationById(app.id);
      setApp(next);
    } catch (e) {
      console.error(e);
      alert('Could not update request. Check your connection and permissions.');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Request not found.</p>
        <button type="button" className="mt-4 text-orange-600" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  const timelineDone = (label: string, done: boolean) => (
    <div className="flex gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {done ? '✓' : '•'}
      </div>
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{done ? 'Completed' : 'Waiting'}</p>
      </div>
    </div>
  );

  const submitted = !!app.timestamp;
  const counselorOk = app.status === 'pending' ? !!app.assignedTeacherId : true;
  const hodDone = app.status !== 'pending';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 sm:p-6 lg:p-8">
      <button
        type="button"
        onClick={() => navigate('/hod-dashboard/requests')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to requests
      </button>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Request details</h2>
        <p className="text-sm text-gray-500">{formatRequestKind(app.requestKind)} request</p>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Student</h3>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-gray-500">Name</span>
            <p className="font-medium text-gray-900">{app.studentName || '—'}</p>
          </div>
          <div>
            <span className="text-gray-500">ID / USN</span>
            <p className="font-medium text-gray-900">{app.studentUSN || '—'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Request</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Event / title</dt>
            <dd className="font-medium text-gray-900">{app.eventName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Type</dt>
            <dd className="font-medium text-gray-900">{formatRequestKind(app.requestKind)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Period</dt>
            <dd className="text-gray-900">
              {format(safeDate(app.startDate), 'MMM d, yyyy')} – {format(safeDate(app.endDate), 'MMM d, yyyy')}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="capitalize text-gray-900">{app.status}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Reason</dt>
            <dd className="mt-1 text-gray-800">{app.reason || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Approval timeline</h3>
        <div className="space-y-4">
          {timelineDone('Submitted', submitted)}
          {timelineDone('Counselor reviewed', counselorOk)}
          {timelineDone('HoD decision', hodDone)}
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Counselor status: <strong>{counselorStatusLabel(app)}</strong>
        </p>
      </section>

      {app.status === 'pending' && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={acting}
            onClick={() => decide('approved')}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
          >
            {acting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Approve request
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={() => decide('rejected')}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-800 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            <XCircle className="h-5 w-5" />
            Reject request
          </button>
        </div>
      )}
    </div>
  );
};
