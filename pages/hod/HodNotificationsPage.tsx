import React, { useMemo } from 'react';
import { Bell, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useHodPortal } from '../../contexts/HodPortalContext';
import { buildNotifications } from '../../lib/hodAnalytics';

export const HodNotificationsPage: React.FC = () => {
  const { applications, loading } = useHodPortal();

  const items = useMemo(() => buildNotifications(applications, 50), [applications]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-2">
        <Bell className="h-6 w-6 text-orange-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">Derived from recent request activity</p>
        </div>
      </div>

      <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm">
        {items.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-500">No notifications.</li>
        )}
        {items.map(n => (
          <li key={n.id} className="flex gap-4 px-4 py-4">
            <div className="mt-0.5">
              {n.type === 'pending' && <Clock className="h-5 w-5 text-amber-500" />}
              {n.type === 'approved' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {n.type === 'rejected' && <XCircle className="h-5 w-5 text-red-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900">{n.studentName}</p>
              <p className="text-sm text-gray-600">{n.description}</p>
              <p className="mt-1 text-xs text-gray-400">{n.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
