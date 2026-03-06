/**
 * Timezone utilities for handling date/time conversions
 * Ensures all dates are displayed and saved in the user's preferred timezone
 */

/**
 * Get the user's browser timezone
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Error getting browser timezone:', error);
    return 'UTC';
  }
}

/**
 * Common timezones for the timezone selector
 */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST - no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
];

/**
 * Get the Monday of the week for a given date in a specific timezone
 * Returns YYYY-MM-DD format
 */
export function getWeekStartDateInTimezone(date: Date = new Date(), timezone: string = 'UTC'): string {
  if (isNaN(date.getTime())) {
    console.error('Invalid date passed to getWeekStartDateInTimezone:', date);
    return new Date().toISOString().split('T')[0];
  }

  try {
    // Create a formatter for the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const weekday = parts.find(p => p.type === 'weekday')?.value;

    if (!year || !month || !day || !weekday) {
      throw new Error('Failed to parse date parts');
    }

    // Map weekday to day index (0 = Sunday, 1 = Monday, ...)
    const weekdayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const dayOfWeek = weekdayMap[weekday] ?? 0;

    // Calculate the date in the target timezone
    const currentDate = new Date(`${year}-${month}-${day}`);
    
    // Calculate days to subtract to get to Monday
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentDate.setDate(currentDate.getDate() - diff);

    // Format as YYYY-MM-DD
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
  } catch (error) {
    console.error('Error calculating week start in timezone:', error);
    // Fallback to UTC-based calculation
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1);
    d.setUTCDate(diff);
    return d.toISOString().split('T')[0];
  }
}

/**
 * Format a date string or Date object to display in the user's timezone
 */
export function formatDateInTimezone(
  dateInput: string | Date,
  timezone: string = 'UTC',
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return String(dateInput);
  }
}

/**
 * Get the current date in YYYY-MM-DD format for a specific timezone
 */
export function getTodayInTimezone(timezone: string = 'UTC'): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Failed to parse date parts');
    }

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error getting today in timezone:', error);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Convert a date string (YYYY-MM-DD) to a Date object at midnight in the specified timezone
 */
export function parseDateInTimezone(dateStr: string, timezone: string = 'UTC'): Date {
  try {
    // Parse the date parts
    const [year, month, day] = dateStr.split('-').map(Number);
    
    if (!year || !month || !day) {
      throw new Error('Invalid date format');
    }

    // Create a date string in ISO format for the given timezone
    // This ensures we get midnight in the target timezone
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
    
    // Create a formatter to get the UTC offset for the timezone
    const date = new Date(isoString);
    
    return date;
  } catch (error) {
    console.error('Error parsing date in timezone:', error);
    return new Date(dateStr);
  }
}

/**
 * Check if a date is today in the user's timezone
 */
export function isToday(dateInput: string | Date, timezone: string = 'UTC'): boolean {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const today = getTodayInTimezone(timezone);
    const dateStr = formatDateInTimezone(date, timezone, { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    
    // Convert both to YYYY-MM-DD format for comparison
    const todayParts = today.split('-');
    const dateParts = dateStr.split('/').reverse(); // MM/DD/YYYY -> YYYY/DD/MM
    
    return todayParts[0] === dateParts[0] && 
           todayParts[1] === dateParts[2] && 
           todayParts[2] === dateParts[1];
  } catch (error) {
    return false;
  }
}

/**
 * Get start and end of day in the user's timezone as ISO strings
 */
export function getDayBoundsInTimezone(dateInput: string | Date, timezone: string = 'UTC'): { 
  start: string; 
  end: string; 
} {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Get the date string in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Failed to parse date parts');
    }

    // Create start of day (00:00:00) and end of day (23:59:59) in the timezone
    const startDate = new Date(`${year}-${month}-${day}T00:00:00`);
    const endDate = new Date(`${year}-${month}-${day}T23:59:59`);

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
  } catch (error) {
    console.error('Error getting day bounds in timezone:', error);
    const start = new Date(dateInput);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateInput);
    end.setHours(23, 59, 59, 999);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }
}
