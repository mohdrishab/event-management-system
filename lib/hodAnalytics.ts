import { format, startOfMonth, subMonths, parseISO, differenceInHours } from 'date-fns';
import type { LeaveApplication, HodNotificationItem, RequestKind } from '../types';
import { inferRequestKind } from './hodRequestHelpers';

const kindFromApp = (a: LeaveApplication): RequestKind =>
  a.requestKind ?? inferRequestKind(a as unknown as Record<string, unknown>);

export function safeParseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isNaN(d.getTime()) ? null : d;
}

export function responseTimeHours(app: LeaveApplication): number | null {
  const start = safeParseDate(app.timestamp);
  const end = safeParseDate(app.updatedAt || app.reviewedAt);
  if (!start || !end) return null;
  if (app.status === 'pending') return null;
  const h = differenceInHours(end, start);
  return h >= 0 ? h : null;
}

export function buildMonthlyBuckets(apps: LeaveApplication[], monthsBack: number) {
  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    keys.push(format(subMonths(new Date(), i), 'yyyy-MM'));
  }
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k, 0);
  for (const a of apps) {
    const d = safeParseDate(a.timestamp || a.startDate);
    if (!d) continue;
    const key = format(d, 'yyyy-MM');
    if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return keys.map(k => ({ month: k, count: counts.get(k) || 0 }));
}

export function countByStatus(apps: LeaveApplication[]) {
  let pending = 0,
    approved = 0,
    rejected = 0;
  for (const a of apps) {
    const u = a.status?.toUpperCase();
    if (u === 'PENDING') pending++;
    else if (u === 'APPROVED') approved++;
    else if (u === 'REJECTED') rejected++;
  }
  return { pending, approved, rejected, total: apps.length };
}

export function countByRequestKind(apps: LeaveApplication[]) {
  let leave = 0,
    late = 0;
  for (const a of apps) {
    const k = kindFromApp(a);
    if (k === 'late_entry') late++;
    else leave++;
  }
  return { leave, lateEntry: late };
}

export function thisMonthCount(apps: LeaveApplication[]) {
  const start = startOfMonth(new Date());
  let n = 0;
  for (const a of apps) {
    const d = safeParseDate(a.timestamp || a.startDate);
    if (d && d >= start) n++;
  }
  return n;
}

export function approvalRatePct(apps: LeaveApplication[]) {
  const decided = apps.filter(a => ['approved', 'rejected'].includes(String(a.status).toLowerCase()));
  if (decided.length === 0) return 0;
  const ap = decided.filter(a => a.status?.toUpperCase() === 'APPROVED').length;
  return Math.round((ap / decided.length) * 1000) / 10;
}

export function rejectionRatePct(apps: LeaveApplication[]) {
  const decided = apps.filter(a => ['approved', 'rejected'].includes(String(a.status).toLowerCase()));
  if (decided.length === 0) return 0;
  const rj = decided.filter(a => a.status?.toUpperCase() === 'REJECTED').length;
  return Math.round((rj / decided.length) * 1000) / 10;
}

export function avgResponseTimeHours(apps: LeaveApplication[]) {
  const vals: number[] = [];
  for (const a of apps) {
    const h = responseTimeHours(a);
    if (h != null) vals.push(h);
  }
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

export function buildNotifications(apps: LeaveApplication[], limit = 30): HodNotificationItem[] {
  const items: HodNotificationItem[] = [];
  const sorted = [...apps].sort((a, b) => {
    const ta = safeParseDate(a.timestamp)?.getTime() ?? 0;
    const tb = safeParseDate(b.timestamp)?.getTime() ?? 0;
    return tb - ta;
  });
  for (const a of sorted) {
    const t = a.timestamp || a.startDate;
    const timeLabel = t ? format(safeParseDate(t) || new Date(), 'MMM d, yyyy h:mm a') : '';
    const st = a.status?.toUpperCase();
    if (st === 'PENDING') {
      items.push({
        id: `p-${a.id}`,
        type: 'pending',
        studentName: a.studentName || 'Student',
        description: `New request: ${a.eventName}`,
        time: timeLabel,
      });
    } else if (st === 'APPROVED') {
      items.push({
        id: `a-${a.id}`,
        type: 'approved',
        studentName: a.studentName || 'Student',
        description: `Approved: ${a.eventName}`,
        time: timeLabel,
      });
    } else if (st === 'REJECTED') {
      items.push({
        id: `r-${a.id}`,
        type: 'rejected',
        studentName: a.studentName || 'Student',
        description: `Rejected: ${a.eventName}`,
        time: timeLabel,
      });
    }
  }
  return items.slice(0, limit);
}

export function recentActivity(
  apps: LeaveApplication[],
  limit = 12
): { kind: 'approved' | 'rejected' | 'new'; label: string; time: string; id: string }[] {
  const rows: { kind: 'approved' | 'rejected' | 'new'; label: string; time: string; id: string; ts: number }[] = [];
  for (const a of apps) {
    const t = a.timestamp || a.startDate;
    const ts = safeParseDate(t)?.getTime() ?? 0;
    const timeLabel = t ? format(safeParseDate(t) || new Date(), 'MMM d, h:mm a') : '';
    const st = a.status?.toUpperCase();
    const name = a.studentName || 'Student';
    if (st === 'PENDING') {
      rows.push({ kind: 'new', label: `${name} submitted a request`, time: timeLabel, id: `n-${a.id}`, ts });
    } else if (st === 'APPROVED') {
      rows.push({ kind: 'approved', label: `${name} — approved`, time: timeLabel, id: `a-${a.id}`, ts });
    } else if (st === 'REJECTED') {
      rows.push({ kind: 'rejected', label: `${name} — rejected`, time: timeLabel, id: `r-${a.id}`, ts });
    }
  }
  rows.sort((x, y) => y.ts - x.ts);
  return rows.slice(0, limit).map(({ ts: _t, ...rest }) => rest);
}
