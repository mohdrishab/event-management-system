import React, { useEffect, useState } from 'react';
import { KeyRound, Bell, Shield, Download, Loader2 } from 'lucide-react';
import type { HodSettingsState } from '../../types';
import { storageService } from '../../services/storageService';
import { useHodPortal } from '../../contexts/HodPortalContext';

const defaultSettings: HodSettingsState = {
  emailNotifications: true,
  smsNotifications: false,
  requestAlerts: true,
  weeklyReports: false,
  activityLogging: true,
};

function loadSettings(userId: string): HodSettingsState {
  try {
    const raw = localStorage.getItem(`hod_settings_${userId}`);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(userId: string, s: HodSettingsState) {
  localStorage.setItem(`hod_settings_${userId}`, JSON.stringify(s));
}

export const HodSettingsPage: React.FC = () => {
  const { user, applications, refresh } = useHodPortal();
  const [settings, setSettings] = useState<HodSettingsState>(defaultSettings);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    setSettings(loadSettings(user.id));
  }, [user.id]);

  const update = (patch: Partial<HodSettingsState>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(user.id, next);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.next.length < 4) {
      alert('Password should be at least 4 characters.');
      return;
    }
    if (pwd.next !== pwd.confirm) {
      alert('New passwords do not match.');
      return;
    }
    setPwdBusy(true);
    try {
      await storageService.updateStaffPassword(user.id, pwd.next);
      setPwd({ current: '', next: '', confirm: '' });
      alert('Password updated. Use the new password on next sign-in.');
    } catch (err) {
      console.error(err);
      alert('Could not update password. Check Supabase permissions on the staff table.');
    } finally {
      setPwdBusy(false);
    }
  };

  const exportCsv = () => {
    const csv = storageService.exportApplicationsCsv(applications);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hod-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({
    label,
    checked,
    onChange,
  }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 p-4 sm:p-6 lg:p-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Security, notifications, and data (UI preferences stored locally)</p>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Security</h3>
        </div>
        <form onSubmit={changePassword} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-500">
            Updates the password on your `staff` row (same credential you use to sign in).
          </p>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">New password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={pwd.next}
              onChange={e => setPwd(p => ({ ...p, next: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Confirm</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={pwd.confirm}
              onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={pwdBusy}
            className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {pwdBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change password'}
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Notification preferences</h3>
        </div>
        <div className="space-y-2">
          <Toggle
            label="Email notifications"
            checked={settings.emailNotifications}
            onChange={v => update({ emailNotifications: v })}
          />
          <Toggle
            label="SMS notifications"
            checked={settings.smsNotifications}
            onChange={v => update({ smsNotifications: v })}
          />
          <Toggle
            label="Request alerts"
            checked={settings.requestAlerts}
            onChange={v => update({ requestAlerts: v })}
          />
          <Toggle
            label="Weekly reports"
            checked={settings.weeklyReports}
            onChange={v => update({ weeklyReports: v })}
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Privacy & data</h3>
        </div>
        <div className="space-y-2">
          <Toggle
            label="Activity logging (local)"
            checked={settings.activityLogging}
            onChange={v => update({ activityLogging: v })}
          />
          <button
            type="button"
            onClick={exportCsv}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export data (CSV)
          </button>
          <button
            type="button"
            onClick={() => refresh()}
            className="w-full text-center text-sm text-orange-600 hover:underline"
          >
            Refresh portal data from server
          </button>
        </div>
      </section>
    </div>
  );
};
