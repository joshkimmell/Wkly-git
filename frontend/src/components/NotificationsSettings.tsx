import { useEffect, useState } from 'react';
import { TextField, Button, Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import supabase from '@lib/supabase';

type Settings = {
  enableSlack: boolean;
  slackWebhookUrl: string;
  enableEmail: boolean;
  emailTo: string;
  frequency: 'daily' | 'weekly' | 'never';
  timeOfDay: string; // HH:MM
};



const STORAGE_KEY = 'wkly_notifications_settings_v1';

interface Props {
  registerSave?: (saveFn: () => Promise<void>) => void;
}

export default function NotificationsSettings({ registerSave }: Props) {
  const [settings, setSettings] = useState<Settings>({
    enableSlack: false,
    slackWebhookUrl: '',
    enableEmail: false,
    emailTo: '',
    frequency: 'daily',
    timeOfDay: '09:00',
  });
  const [busy, setBusy] = useState(false);

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
            .single();
          if (!error && data?.settings && mounted) {
            setSettings(data.settings as Settings);
            return;
          }
        }
      } catch (e) {
        // continue to fallback
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && mounted) setSettings(JSON.parse(raw));
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const payload = { user_id: session.user.id, settings };
        // supabase-js types don't recognize the 'returning' option here; omit it.
        const { error } = await supabase.from('notification_preferences').upsert(payload);
        if (error) throw error;
        console.log('Notification settings saved to your account.');
        return;
      }

      // Not logged in: fallback to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.log('Notification settings saved locally.');
    } catch (e) {
      // final fallback: attempt localStorage and report failure
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); console.log('Notification settings saved locally (fallback).'); }
      catch (_) { console.log('Failed to save settings.'); throw e; }
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
      const res = await fetch('/.netlify/functions/sendSlackNotification', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.slackWebhookUrl, message: 'Test notification from Wkly: this is a test.' }),
      });
      const body = await res.json();
      if (res.ok) console.log('Slack test sent.');
      else alert('Slack test failed: ' + (body?.error || res.statusText));
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
      const res = await fetch('/.netlify/functions/sendTestEmail', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: settings.emailTo, subject: 'Wkly test', content: 'This is a test reminder from Wkly.' }),
      });
      const body = await res.json();
      if (res.ok) console.log('Test email request submitted. Check function logs for delivery status.');
      else alert('Email test failed: ' + (body?.error || res.statusText));
    } catch (err: any) {
      alert('Email test failed: ' + String(err?.message || err));
    } finally {
      setBusy(false);
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

      
      <div className="text-sm text-gray-40 dark:text-gray-70">Notes: Settings are stored locally (localStorage). For production delivery, configure your Slack webhook and a SendGrid API key in Netlify environment variables and use the SendGrid-backed server function.</div>
    </div>
  );
}
