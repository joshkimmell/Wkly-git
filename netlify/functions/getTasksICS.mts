import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Format a date string like "2026-02-25" + optional time "08:00" to ICS DTSTART value
function toICSDate(dateStr: string, timeStr?: string | null): string {
  const [year, month, day] = dateStr.split('-');
  if (timeStr) {
    const [hour, minute] = timeStr.split(':');
    return `${year}${month}${day}T${hour}${minute}00`;
  }
  // All-day event: DATE format (no time component)
  return `${year}${month}${day}`;
}

function toICSDateNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function escapeICS(str: string): string {
  return (str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

// Map task status to ICS STATUS property
function taskStatusToICS(status: string): string {
  switch (status) {
    case 'Done': return 'COMPLETED';
    case 'In progress': return 'IN-PROCESS';
    case 'Blocked':
    case 'On hold': return 'CANCELLED';
    default: return 'NEEDS-ACTION';
  }
}

// Fold long lines per RFC 5545 (max 75 octets per line)
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let idx = 75;
  while (idx < line.length) {
    chunks.push(' ' + line.slice(idx, idx + 74));
    idx += 74;
  }
  return chunks.join('\r\n');
}

export const handler: Handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  let userId: string | null = null;

  // Auth method 1: Bearer token (for manual downloads via the UI)
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const bearerToken = authHeader.replace(/^Bearer\s*/i, '').trim();
  if (bearerToken) {
    const { data: { user }, error } = await adminClient.auth.getUser(bearerToken);
    if (!error && user) userId = user.id;
  }

  // Auth method 2: calendar token query param (for webcal subscriptions by calendar apps)
  if (!userId) {
    const calToken = event.queryStringParameters?.token;
    if (calToken) {
      const { data } = await adminClient
        .from('notification_preferences')
        .select('user_id, settings')
        .filter('settings->>calendarToken', 'eq', calToken)
        .single();
      if (data?.user_id) userId = data.user_id;
    }
  }

  if (!userId) {
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    // Fetch all scheduled tasks (those with a scheduled_date set).
    // Must use adminClient (service role) to bypass RLS — there is no user
    // session attached to this serverless function context.
    const { data: tasks, error } = await adminClient
      .from('tasks')
      .select('id, title, description, status, scheduled_date, scheduled_time, goal_id')
      .eq('user_id', userId)
      .not('scheduled_date', 'is', null)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;

    const now = toICSDateNow();
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wkly//Tasks Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Wkly Tasks',
      'X-WR-TIMEZONE:UTC',
    ];

    for (const task of tasks || []) {
      const dtstart = toICSDate(task.scheduled_date, task.scheduled_time);
      const isAllDay = !task.scheduled_time;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:wkly-task-${task.id}`);
      lines.push(`DTSTAMP:${now}`);
      if (isAllDay) {
        // DTEND for DATE events is exclusive — must be the next day per RFC 5545
        const nextDay = new Date(task.scheduled_date + 'T00:00:00Z');
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        const nextDayStr = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
        lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
        lines.push(`DTEND;VALUE=DATE:${nextDayStr}`);
      } else {
        lines.push(`DTSTART:${dtstart}`);
        // Default 1-hour duration if no explicit end time
        const [h, m] = (task.scheduled_time || '00:00').split(':').map(Number);
        const endHour = String((h + 1) % 24).padStart(2, '0');
        const endMin = String(m).padStart(2, '0');
        const [year, month, day] = task.scheduled_date.split('-');
        lines.push(`DTEND:${year}${month}${day}T${endHour}${endMin}00`);
      }
      lines.push(`SUMMARY:${escapeICS(task.title)}`);
      if (task.description) {
        lines.push(`DESCRIPTION:${escapeICS(task.description.replace(/<[^>]+>/g, ''))}`);
      }
      lines.push(`STATUS:${taskStatusToICS(task.status)}`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const icsBody = lines.map(foldLine).join('\r\n') + '\r\n';

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="wkly-tasks.ics"',
        'Cache-Control': 'no-cache',
      },
      body: icsBody,
    };
  } catch (err) {
    console.error('Error generating ICS:', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate calendar feed' }),
    };
  }
};
