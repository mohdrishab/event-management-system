import type { LeaveApplication, RequestKind } from '../types';

export function inferRequestKind(raw: Record<string, unknown>): RequestKind {
  const rt = String(raw.request_type ?? raw.requestType ?? '').toLowerCase();
  if (rt.includes('late')) return 'late_entry';
  if (rt === 'leave' || rt.includes('leave')) return 'leave';
  const et = String(raw.event_type ?? raw.eventType ?? '').toLowerCase();
  if (et.includes('late')) return 'late_entry';
  const name = String(raw.event_name ?? '').toLowerCase();
  if (name.includes('late entry') || name.includes('late-entry')) return 'late_entry';
  return 'leave';
}

/** Counselor step: unassigned pending → pending; assigned pending → reviewed; terminal → em dash */
export function counselorStatusLabel(app: LeaveApplication): string {
  const st = app.status?.toUpperCase();
  if (st !== 'PENDING') return '—';
  if (app.assignedTeacherId) return 'Reviewed';
  return 'Pending';
}

export function formatRequestKind(k?: RequestKind): string {
  return k === 'late_entry' ? 'Late entry' : 'Leave';
}
