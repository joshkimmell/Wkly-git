import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const MAILGUN_API_BASE = 'https://api.mailgun.net/v3';

const buildReminderHtml = ({
  taskTitle,
  taskDescription,
  scheduledDate,
  scheduledTime,
  goalTitle,
}: {
  taskTitle: string;
  taskDescription?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  goalTitle?: string;
}) => {
  const scheduleInfo = scheduledDate
    ? `<p style="margin:8px 0;color:#6b7280;"><strong>Scheduled:</strong> ${new Date(scheduledDate).toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      })}${scheduledTime ? ` at ${scheduledTime}` : ''}</p>`
    : '';

  const goalInfo = goalTitle
    ? `<p style="margin:8px 0;color:#6b7280;"><strong>Goal:</strong> ${goalTitle}</p>`
    : '';

  return `
    <html>
      <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; padding:24px; max-width:600px; margin:0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0; font-size:24px;">Reminder</h2>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <h3 style="margin-top:0; color:#111; font-size:20px;">${taskTitle}</h3>
          ${taskDescription ? `<p style="margin:16px 0; color:#374151; line-height:1.6;">${taskDescription}</p>` : ''}
          ${scheduleInfo}
          ${goalInfo}
          <div style="margin-top:24px; padding-top:24px; border-top:1px solid #e5e7eb;">
            <a href="${process.env.URL || 'https://wkly.app'}/goals" style="background:#667eea; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:600;">View in Wkly</a>
          </div>
          <p style="font-size:13px; color:#9ca3af; margin-top:24px; margin-bottom:0;">
            This is a reminder for a task you scheduled in Wkly. If you didn't set this reminder, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;
};

const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Verify authentication
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return { statusCode: 401, body: 'Unauthorized: Missing token' };
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return { statusCode: 500, body: 'Server misconfigured: missing Supabase credentials' };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return { statusCode: 401, body: 'Unauthorized: Invalid token' };
    }

    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.FROM_EMAIL) {
      return {
        statusCode: 500,
        body: 'Server misconfigured: missing MAILGUN_API_KEY, MAILGUN_DOMAIN or FROM_EMAIL',
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const { taskId, emailTo } = payload;

    if (!taskId || !emailTo) {
      return { statusCode: 400, body: 'Missing required fields: taskId and emailTo' };
    }

    // Fetch the task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('title, description, scheduled_date, scheduled_time, goal_id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      console.error('Task fetch error:', taskError);
      return { statusCode: 404, body: `Task not found: ${taskError?.message || 'Unknown error'}` };
    }

    // Optionally fetch goal title if goal_id exists
    let goalTitle: string | undefined;
    if (task.goal_id) {
      const { data: goal } = await supabase
        .from('goals')
        .select('title')
        .eq('id', task.goal_id)
        .single();
      goalTitle = goal?.title;
    }

    const subject = `⏰ Reminder: ${task.title}`;
    const bodyHtml = buildReminderHtml({
      taskTitle: task.title,
      taskDescription: task.description,
      scheduledDate: task.scheduled_date,
      scheduledTime: task.scheduled_time,
      goalTitle,
    });

    const mgUrl = `${MAILGUN_API_BASE}/${process.env.MAILGUN_DOMAIN}/messages`;

    // Strip surrounding quotes that some env var editors add (e.g. "x@y" → x@y)
    const fromEmail = process.env.FROM_EMAIL.replace(/^["']|["']$/g, '');

    const params = new URLSearchParams();
    params.append('from', fromEmail);
    params.append('to', emailTo);
    params.append('subject', subject);
    params.append('html', bodyHtml);

    const auth = 'Basic ' + Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64');

    const res = await fetch(mgUrl, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Mailgun error:', text);
      return { statusCode: 502, body: `Mailgun error: ${text}` };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'Reminder email sent' }) };
  } catch (err: any) {
    console.error('sendTaskReminder error:', err);
    return { statusCode: 500, body: `Server error: ${err.message}` };
  }
};

export { handler };
