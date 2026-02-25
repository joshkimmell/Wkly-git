import React, { useState, useEffect } from 'react';
import { Button, Typography, TextField, Tooltip, IconButton, Divider, Alert, Box, CircularProgress } from '@mui/material';
import { Copy, RefreshCw, Download, Calendar, ExternalLink, CheckCircle } from 'lucide-react';
import supabase from '@lib/supabase';
import { notifySuccess, notifyError } from './ToastyNotification';

const STORAGE_KEY = 'wkly_notifications_settings_v1';

function generateToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

const CalendarIntegration: React.FC = () => {
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<'webcal' | 'https' | null>(null);

  // Derive URLs from token
  const appHost = typeof window !== 'undefined' ? window.location.host : '';
  const icsUrl = calendarToken ? `https://${appHost}/api/getTasksICS?token=${calendarToken}` : '';
  const webcalUrl = icsUrl.replace(/^https?:\/\//, 'webcal://');

  // Load existing token from Supabase or localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data } = await supabase
            .from('notification_preferences')
            .select('settings')
            .eq('user_id', session.user.id)
            .single();
          if (data?.settings?.calendarToken && mounted) {
            setCalendarToken(data.settings.calendarToken);
            setLoading(false);
            return;
          }
        }
        // Fallback to localStorage
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.calendarToken && mounted) {
            setCalendarToken(parsed.calendarToken);
          }
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const saveToken = async (token: string) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        // Merge the calendarToken into the existing settings JSON
        const { data: existing } = await supabase
          .from('notification_preferences')
          .select('settings')
          .eq('user_id', session.user.id)
          .single();
        const merged = { ...(existing?.settings || {}), calendarToken: token };
        await supabase
          .from('notification_preferences')
          .upsert({ user_id: session.user.id, settings: merged });
      }
      // Always mirror to localStorage as fallback
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const local = raw ? JSON.parse(raw) : {};
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...local, calendarToken: token }));
      } catch (e) { /* ignore */ }
      setCalendarToken(token);
      notifySuccess('Calendar link generated');
    } catch (e) {
      notifyError('Failed to save calendar token');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = () => saveToken(generateToken());
  const handleRevoke = () => {
    if (!window.confirm('Revoke the current calendar link? Existing subscriptions will stop updating.')) return;
    saveToken(generateToken());
  };

  const handleCopy = (type: 'webcal' | 'https') => {
    const url = type === 'webcal' ? webcalUrl : icsUrl;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleDownload = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not logged in');
      const res = await fetch('/api/getTasksICS', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to download');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wkly-tasks.ics';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notifyError('Failed to download calendar file');
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <CircularProgress size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <Typography variant="h6">Calendar Integration</Typography>
      <Typography variant="body2" className="text-gray-60 dark:text-gray-40">
        Sync your scheduled tasks with Google Calendar, Apple Calendar, Outlook, or any app that supports iCal/webcal subscriptions.
      </Typography>

      {!calendarToken ? (
        <Box className="text-center py-6">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-40" />
          <Typography variant="body1" className="mb-4">No calendar link generated yet.</Typography>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Calendar className="w-4 h-4" />}
          >
            {saving ? 'Generating...' : 'Generate Calendar Link'}
          </Button>
        </Box>
      ) : (
        <>
          {/* Subscription URL section */}
          <div className="space-y-3">
            <Typography variant="subtitle1" className="font-semibold">Subscription URL (auto-syncing)</Typography>
            <Typography variant="body2" className="text-gray-60 dark:text-gray-40">
              Use this URL to subscribe — your calendar app will automatically check for updates.
            </Typography>

            {/* webcal:// URL */}
            <div className="flex gap-2 items-center">
              <TextField
                value={webcalUrl}
                size="small"
                fullWidth
                label="webcal:// URL (for Calendar apps)"
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: 'monospace' }}
              />
              <Tooltip title={copied === 'webcal' ? 'Copied!' : 'Copy URL'} placement="top">
                <IconButton onClick={() => handleCopy('webcal')} size="small" className="btn-ghost flex-shrink-0">
                  {copied === 'webcal' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Open in calendar app" placement="top">
                <IconButton
                  size="small"
                  className="btn-ghost flex-shrink-0"
                  onClick={() => window.open(webcalUrl, '_blank')}
                >
                  <ExternalLink className="w-5 h-5" />
                </IconButton>
              </Tooltip>
            </div>

            {/* https:// URL for apps that don't support webcal */}
            <div className="flex gap-2 items-center">
              <TextField
                value={icsUrl}
                size="small"
                fullWidth
                label="https:// URL (for Google Calendar)"
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: 'monospace' }}
              />
              <Tooltip title={copied === 'https' ? 'Copied!' : 'Copy URL'} placement="top">
                <IconButton onClick={() => handleCopy('https')} size="small" className="btn-ghost flex-shrink-0">
                  {copied === 'https' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </IconButton>
              </Tooltip>
            </div>
          </div>

          <Divider />

          {/* How to subscribe instructions */}
          <div className="space-y-2">
            <Typography variant="subtitle2" className="font-semibold">How to subscribe</Typography>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded border border-gray-20 dark:border-gray-70 space-y-1">
                <Typography variant="body2" className="font-semibold">Google Calendar</Typography>
                <ol className="list-decimal list-inside space-y-1 text-gray-60 dark:text-gray-40 text-xs">
                  <li>Open Google Calendar</li>
                  <li>Click "Other calendars" → "From URL"</li>
                  <li>Paste the <strong>https://</strong> URL</li>
                  <li>Click "Add calendar"</li>
                </ol>
              </div>
              <div className="p-3 rounded border border-gray-20 dark:border-gray-70 space-y-1">
                <Typography variant="body2" className="font-semibold">Apple Calendar (iCal)</Typography>
                <ol className="list-decimal list-inside space-y-1 text-gray-60 dark:text-gray-40 text-xs">
                  <li>Open Calendar app</li>
                  <li>File → New Calendar Subscription</li>
                  <li>Paste the <strong>webcal://</strong> URL</li>
                  <li>Choose sync frequency</li>
                </ol>
              </div>
              <div className="p-3 rounded border border-gray-20 dark:border-gray-70 space-y-1">
                <Typography variant="body2" className="font-semibold">Outlook</Typography>
                <ol className="list-decimal list-inside space-y-1 text-gray-60 dark:text-gray-40 text-xs">
                  <li>Go to outlook.com → Calendar</li>
                  <li>Add calendar → Subscribe from web</li>
                  <li>Paste the <strong>https://</strong> URL</li>
                  <li>Name it and save</li>
                </ol>
              </div>
            </div>
          </div>

          <Divider />

          {/* Manual download */}
          <div className="space-y-2">
            <Typography variant="subtitle2" className="font-semibold">One-time Export</Typography>
            <Typography variant="body2" className="text-gray-60 dark:text-gray-40">
              Download a snapshot of all your scheduled tasks as an .ics file to import manually.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDownload}
              startIcon={<Download className="w-4 h-4" />}
            >
              Download .ics file
            </Button>
          </div>

          <Divider />

          {/* Revoke / regenerate */}
          <div className="space-y-2">
            <Typography variant="subtitle2" className="font-semibold text-red-500">Revoke & Regenerate</Typography>
            <Alert severity="warning" className="text-xs">
              Regenerating the link will break any existing calendar subscriptions. You'll need to re-add the new URL in your calendar app.
            </Alert>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleRevoke}
              disabled={saving}
              startIcon={<RefreshCw className="w-4 h-4" />}
            >
              {saving ? 'Regenerating...' : 'Revoke & Regenerate Link'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarIntegration;
