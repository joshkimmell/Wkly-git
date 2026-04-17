import { useEffect, useRef, useState } from 'react';
import supabase from '@lib/supabase';
import { notifyReminder, notifyError } from '@components/ToastyNotification';
import { Task } from '@utils/goalUtils';
import { APP_NOTIFICATION_ICON } from '@utils/notificationIcons';

const STORAGE_KEY = 'wkly_notifications_settings_v1';
const CHECK_INTERVAL = 60000; // Check every minute
const NOTIFIED_REMINDERS_KEY = 'wkly_notified_reminders';

type NotificationSettings = {
  enableEmail?: boolean;
  emailTo?: string;
  enableOsNotifications?: boolean;
};

/**
 * Clear a task from the notified reminders list so it can fire again
 * Call this when a task's reminder datetime is updated
 */
export function clearNotifiedReminder(taskId: string) {
  try {
    const stored = localStorage.getItem(NOTIFIED_REMINDERS_KEY);
    if (stored) {
      const notifiedSet = new Set<string>(JSON.parse(stored));
      if (notifiedSet.has(taskId)) {
        notifiedSet.delete(taskId);
        localStorage.setItem(NOTIFIED_REMINDERS_KEY, JSON.stringify(Array.from(notifiedSet)));
        // console.log(`[ReminderService] Cleared notified reminder for task ${taskId}`);
      }
    }
  } catch (e) {
    console.warn('Failed to clear notified reminder', e);
  }
}

/**
 * Hook that runs a background service to check for task reminders and send notifications.
 * Checks every minute for tasks with reminders that are due.
 * Sends notifications via: ToastyNotification (always), Email (if enabled), OS notifications (if enabled).
 */
export function useReminderService() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingReminderTask, setPendingReminderTask] = useState<Task | null>(null);
  const notifiedRemindersRef = useRef<Set<string>>(new Set());

  // Load already-notified reminders from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFIED_REMINDERS_KEY);
      if (stored) {
        notifiedRemindersRef.current = new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load notified reminders from storage', e);
    }
  }, []);

  // Persist notified reminders to localStorage
  const saveNotifiedReminders = () => {
    try {
      localStorage.setItem(
        NOTIFIED_REMINDERS_KEY,
        JSON.stringify(Array.from(notifiedRemindersRef.current))
      );
    } catch (e) {
      console.warn('Failed to save notified reminders to storage', e);
    }
  };

  // Get notification settings
  const getNotificationSettings = async (): Promise<NotificationSettings> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data } = await supabase
          .from('notification_preferences')
          .select('settings')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (data?.settings) {
          return data.settings as NotificationSettings;
        }
      }
    } catch (e) {
      // Fallback to localStorage
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as NotificationSettings;
      }
    } catch (e) {
      console.warn('Failed to load notification settings', e);
    }

    return {};
  };

  // Check for due reminders
  const checkReminders = async () => {
    try {
      // console.log('[ReminderService] Checking for due reminders...', new Date().toISOString());
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        // console.log('[ReminderService] No session, skipping check');
        return;
      }

      const token = session.access_token;
      if (!token) {
        // console.log('[ReminderService] No token, skipping check');
        return;
      }

      // Fetch all tasks with reminders enabled
      const res = await fetch('/.netlify/functions/getAllTasks', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error('[ReminderService] Failed to fetch tasks for reminder check');
        return;
      }

      const tasks: Task[] = await res.json();
      const now = new Date();
      // console.log(`[ReminderService] Found ${tasks.length} total tasks`);
      const settings = await getNotificationSettings();
      // console.log('[ReminderService] Notification settings:', settings);

      // Filter tasks with due reminders that haven't been notified yet
      const dueReminders = tasks.filter((task) => {
        if (!task.reminder_enabled || !task.reminder_datetime) return false;
        if (task.status === 'Done') return false; // Skip completed tasks

        const reminderTime = new Date(task.reminder_datetime);
        const isTimeDue = reminderTime <= now;
        const notAlreadyNotified = !notifiedRemindersRef.current.has(task.id);
        const willNotify = isTimeDue && notAlreadyNotified;

        // console.log(`[ReminderService] Task "${task.title}":`, {
        //   id: task.id,
        //   reminder_enabled: task.reminder_enabled,
        //   reminder_datetime: task.reminder_datetime,
        //   reminderTime: reminderTime.toISOString(),
        //   now: now.toISOString(),
        //   isTimeDue,
        //   notAlreadyNotified,
        //   alreadyNotifiedIds: Array.from(notifiedRemindersRef.current),
        //   willNotify,
        //   status: task.status
        // });

        return willNotify;
      });

      // console.log(`[ReminderService] Found ${dueReminders.length} due reminders`);

      // Process each due reminder
      for (const task of dueReminders) {
        // console.log(`[ReminderService] Sending notifications for task "${task.title}"`);
        await sendReminderNotifications(task, settings);
        notifiedRemindersRef.current.add(task.id);
        // console.log(`[ReminderService] Marked task "${task.title}" as notified`);
      }

      if (dueReminders.length > 0) {
        saveNotifiedReminders();
        // console.log('[ReminderService] Saved notified reminders to localStorage');
      }
    } catch (error) {
      console.error('[ReminderService] Error checking reminders:', error);
    }
  };

  // Send reminder notifications via all enabled channels
  const sendReminderNotifications = async (task: Task, settings: NotificationSettings) => {
    // console.log('[ReminderService] sendReminderNotifications called for:', task.title);
    
    // 1. Always show ToastyNotification (no timeout, must manually close)
    // console.log('[ReminderService] Showing toast notification');
    notifyReminder(task.title, task.description, () => {
      setPendingReminderTask(task);
    });

    // 2. Send Email if enabled
    if (settings.enableEmail && settings.emailTo) {
      // console.log(`[ReminderService] Sending email to ${settings.emailTo}`);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (token) {
          const response = await fetch('/.netlify/functions/sendTaskReminder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              taskId: task.id,
              emailTo: settings.emailTo,
            }),
          });
          
          if (response.ok) {
            // console.log('[ReminderService] Email sent successfully');
          } else {
            const errorText = await response.text();
            console.error('[ReminderService] Email send failed:', response.status, errorText);
          }
        } else {
          // console.warn('[ReminderService] No token available for email send');
        }
      } catch (error) {
        console.error('[ReminderService] Failed to send email reminder:', error);
        notifyError('Failed to send email reminder');
      }
    } else {
      // console.log('[ReminderService] Email disabled or no email address:', { enableEmail: settings.enableEmail, emailTo: settings.emailTo });
    }

    // 3. Send OS notification if enabled and permitted
    // console.log('[ReminderService] Checking OS notification eligibility:', {
    //   enableOsNotifications: settings.enableOsNotifications,
    //   hasNotificationAPI: 'Notification' in window,
    //   permission: 'Notification' in window ? Notification.permission : 'N/A'
    // });
    
    if (settings.enableOsNotifications && 'Notification' in window) {
      // console.log('[ReminderService] OS notifications enabled, permission:', Notification.permission);
      if (Notification.permission === 'granted') {
        try {
          // console.log('[ReminderService] Showing OS notification');
          const notification = new Notification('Task Reminder: ' + task.title, {
            body: task.description || 'You have a task due',
            icon: APP_NOTIFICATION_ICON,
            tag: `task-reminder-${task.id}`,
            requireInteraction: true, // Notification stays until dismissed
          });
          // console.log('[ReminderService] OS notification created');

          notification.onclick = () => {
            window.focus();
            setPendingReminderTask(task);
            notification.close();
          };
        } catch (error) {
          console.error('[ReminderService] Failed to show OS notification:', error);
        }
      } else {
        // console.log('[ReminderService] OS notification permission not granted. Current permission:', Notification.permission);
        // console.log('[ReminderService] To enable OS notifications, go to Settings → Notifications and grant permission.');
      }
    } else {
      // console.log('[ReminderService] OS notifications disabled or not supported:', { enableOsNotifications: settings.enableOsNotifications, hasNotificationAPI: 'Notification' in window });
    }
  };

  // Start the reminder service
  useEffect(() => {
    // Only run if we have a valid session
    const checkAndRun = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        // console.log('[ReminderService] No user session, reminder service not started');
        return;
      }

      // console.log('[ReminderService] Starting reminder service for user:', session.user.id);
      // Check immediately on mount
      checkReminders();

      // Then check every minute
      intervalRef.current = setInterval(checkReminders, CHECK_INTERVAL);
      setIsRunning(true);
      // console.log('[ReminderService] Reminder service started, will check every 60 seconds');
    };

    checkAndRun();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
    };
  }, []);

  // Clean up old notified reminders (older than 24 hours) periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // In a real implementation, you'd want to track timestamps and clean up old entries
      // For now, we just clear the entire set daily to prevent unbounded growth
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        notifiedRemindersRef.current.clear();
        saveNotifiedReminders();
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    isRunning,
    pendingReminderTask,
    dismissReminderTask: () => setPendingReminderTask(null),
  };
}
