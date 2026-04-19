import { useEffect, useState } from 'react';
import { TextField, Button, Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import supabase from '@lib/supabase';
import { APP_NOTIFICATION_ICON } from '@utils/notificationIcons';

type Settings = {
  enableSlack: boolean;
  slackWebhookUrl: string;
  enableEmail: boolean;
  emailTo: string;
  enableOsNotifications: boolean;
  frequency: 'daily' | 'weekly' | 'never';
  timeOfDay: string; // HH:MM
};



const STORAGE_KEY = 'wkly_notifications_settings_v1';

interface Props {
  registerSave?: (saveFn: () => Promise<void>) => void;
}

export default function NotificationsSettings({ registerSave }: Props) {
  const defaultSettings: Settings = {
    enableSlack: false,
    slackWebhookUrl: '',
    enableEmail: false,
    emailTo: '',
    enableOsNotifications: false,
    frequency: 'daily',
    timeOfDay: '09:00',
  };

  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [busy, setBusy] = useState(false);
  const [osNotificationPermission, setOsNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Try to load saved preferences from Supabase (if logged in). If that
    // fails or no session is available, fall back to localStorage.
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from('notification_preferences')
            .select('settings')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (!error && data?.settings && mounted) {
            // Merge with defaults to ensure all fields are defined
            setSettings({ ...defaultSettings, ...data.settings });
            return;
          }
        }
      } catch (e) {
        // continue to fallback
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && mounted) {
          const loaded = JSON.parse(raw);
          // Merge with defaults to ensure all fields are defined
          setSettings({ ...defaultSettings, ...loaded });
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check OS notification permission status
  useEffect(() => {
    if ('Notification' in window) {
      setOsNotificationPermission(Notification.permission);
    }
  }, []);

  const save = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const payload = { user_id: session.user.id, settings };
        // supabase-js types don't recognize the 'returning' option here; omit it.
        const { error } = await supabase.from('notification_preferences').upsert(payload);
        if (error) throw error;
        return;
      }

      // Not logged in: fallback to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      // final fallback: attempt localStorage and report failure
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
      catch (_) { throw e; }
    }
  };

  useEffect(() => {
    if (registerSave) registerSave(save);
    // intentionally run when registerSave or settings changes to keep parent reference fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerSave]);

  const testSlack = async () => {
    if (!settings.slackWebhookUrl) return alert('Please configure a Slack webhook URL first.');
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Authentication required');
        setBusy(false);
        return;
      }
      
      const res = await fetch('/.netlify/functions/sendSlackNotification', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ webhookUrl: settings.slackWebhookUrl, message: 'Test notification from Wkly: this is a test.' }),
      });
      const body = await res.json();
      if (res.ok) {
        alert('Test Slack notification sent successfully!');
      } else {
        alert('Slack test failed: ' + (body?.error || res.statusText));
      }
    } catch (err: any) {
      alert('Slack test failed: ' + String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const testEmail = async () => {
    if (!settings.emailTo) return alert('Please configure an email recipient first.');
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Authentication required');
        setBusy(false);
        return;
      }
      
      console.log('[NotificationsSettings] Sending test email to:', settings.emailTo);
      const res = await fetch('/.netlify/functions/sendTestEmail', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ to: settings.emailTo, subject: 'Wkly test', content: 'This is a test reminder from Wkly.' }),
      });
      const body = await res.json();
      console.log('[NotificationsSettings] Test email response:', body);
      if (res.ok) {
        alert('✅ Test email sent successfully via Mailgun!\n\nCheck your inbox (and spam folder).');
      } else {
        alert('❌ Email test failed: ' + (body?.error || res.statusText) + '\n\n' + (body?.detail || ''));
      }
    } catch (err: any) {
      console.error('[NotificationsSettings] Email test error:', err);
      alert('Email test failed: ' + String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const requestOsNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      const newSettings = { ...settings, enableOsNotifications: true };
      setSettings(newSettings);
      // Save immediately
      await saveSettings(newSettings);
      // Show a test notification
      new Notification('Wkly Notifications Enabled', {
        body: 'You will now receive task reminders as OS notifications',
        icon: APP_NOTIFICATION_ICON,
      });
      return;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setOsNotificationPermission(permission);
      if (permission === 'granted') {
        const newSettings = { ...settings, enableOsNotifications: true };
        setSettings(newSettings);
        // Save immediately
        await saveSettings(newSettings);
        new Notification('Wkly Notifications Enabled', {
          body: 'You will now receive task reminders as OS notifications',
          icon: APP_NOTIFICATION_ICON,
        });
      } else {
        const newSettings = { ...settings, enableOsNotifications: false };
        setSettings(newSettings);
        await saveSettings(newSettings);
      }
    }
  };

  const handleOsNotificationToggle = async (checked: boolean) => {
    if (checked) {
      await requestOsNotificationPermission();
    } else {
      const newSettings = { ...settings, enableOsNotifications: false };
      setSettings(newSettings);
      await saveSettings(newSettings);
    }
  };

  // Helper function to save settings immediately
  const saveSettings = async (settingsToSave: Settings) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const payload = { user_id: session.user.id, settings: settingsToSave };
        const { error } = await supabase.from('notification_preferences').upsert(payload);
        if (error) throw error;
        console.log('[NotificationsSettings] Settings saved to Supabase');
      } else {
        // Not logged in: fallback to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
        console.log('[NotificationsSettings] Settings saved to localStorage');
      }
    } catch (e) {
      // final fallback: attempt localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
        console.log('[NotificationsSettings] Settings saved to localStorage (fallback)');
      } catch (_) {
        console.error('[NotificationsSettings] Failed to save settings', e);
      }
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-medium">Notifications & Reminders</h3>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <FormControlLabel
          control={<Switch checked={settings.enableSlack} onChange={(e) => setSettings((s) => ({ ...s, enableSlack: e.target.checked }))} />}
          label="Enable Slack reminders"
        />
        <div className='flex flex-row gap-2 items-end mb-4'>
            <TextField label="Slack webhook URL" value={settings.slackWebhookUrl} onChange={(e) => setSettings((s) => ({ ...s, slackWebhookUrl: e.target.value }))} fullWidth disabled={busy || !settings.enableSlack} />
            <Button className='w-48 h-8  py-1 text-nowrap' variant="text" onClick={testSlack} size='small' disabled={busy || !settings.enableSlack}>Test Slack</Button>
        </div>
        <FormControlLabel
          control={<Switch checked={settings.enableEmail} onChange={(e) => setSettings((s) => ({ ...s, enableEmail: e.target.checked }))} />}
          label="Enable Email reminders"
        />
        <div className='flex flex-row gap-2 items-end mb-4'>
            <TextField label="Email recipient" value={settings.emailTo} onChange={(e) => setSettings((s) => ({ ...s, emailTo: e.target.value }))} fullWidth disabled={busy || !settings.enableEmail} />
            <Button className='w-48 h-8  text-nowrap' variant="text" onClick={testEmail} size='small' disabled={busy || !settings.enableEmail}>Test Email</Button>
        </div>
        <FormControlLabel
          control={
            <Switch 
              checked={settings.enableOsNotifications} 
              onChange={(e) => handleOsNotificationToggle(e.target.checked)}
              disabled={osNotificationPermission === 'denied'}
            />
          }
          label={`OS notifications ${osNotificationPermission === 'denied' ? '(blocked by browser)' : ''}`}
        />
        <div className='flex flex-col gap-2'>
          <p className="text-sm text-secondary-text">
            {osNotificationPermission === 'default' && 'Enable to receive notifications for task reminders'}
            {osNotificationPermission === 'granted' && 'OS notifications are enabled ✓'}
            {osNotificationPermission === 'denied' && 'Notifications were blocked. Please enable them in your browser settings.'}
          </p>
        </div>
        <FormControl fullWidth>
          <InputLabel id="freq-label">Frequency</InputLabel>
          <Select labelId="freq-label" value={settings.frequency} label="Frequency" onChange={(e) => setSettings((s) => ({ ...s, frequency: e.target.value as any }))}>
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="never">Never</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Time of day" type="time" value={settings.timeOfDay} onChange={(e) => setSettings((s) => ({ ...s, timeOfDay: e.target.value }))} InputLabelProps={{ shrink: true }} />
      </div>

      
      <div className="text-sm text-gray-40 dark:text-gray-70">
        <h4 className="font-semibold mb-2">Email Configuration:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>All emails</strong> (test emails and task reminders) use <strong>Mailgun</strong></li>
          <li>Set reminders on tasks to receive email notifications when they're due</li>
          <li>Check browser console (F12) for detailed debugging logs</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-gray-10 dark:bg-gray-90 rounded-lg border border-gray-20 dark:border-gray-80">
        <h4 className="font-semibold mb-2 text-sm">🔍 Debugging Tips:</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-60 dark:text-gray-40">
          <li>Open browser console (press F12) to see detailed logs</li>
          <li>Look for <code className="px-1 py-0.5 bg-gray-20 dark:bg-gray-80 rounded">[ReminderService]</code> logs every 60 seconds</li>
          <li>Create a task with a reminder set to 1-2 minutes from now</li>
          <li>Watch console for "Checking for due reminders" message</li>
          <li>If no logs appear, the reminder service may not be running</li>
        </ol>
      </div>

      <div className="text-sm text-gray-40 dark:text-gray-70">
        <p><strong>Task Reminders:</strong> When a task has a reminder set, notifications will be sent via enabled channels (Email, OS notifications) when the reminder time is reached.</p>
        <p className="mt-2"><strong>Daily/Weekly Summaries:</strong> Scheduled summaries are sent via Slack or Email at the configured time.</p>
      </div>
    </div>
  );
}
