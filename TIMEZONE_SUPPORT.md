# Timezone Support Implementation

## Overview
The app now supports user-specific timezones for all date and time operations. Users can set their preferred timezone in their profile settings, and all dates will be displayed and calculated according to that timezone.

## Key Components

### 1. Database Migration
**File:** `frontend/supabase/migrations/20260305_add_timezone_to_profiles.sql`
- Adds `timezone` column to the `profiles` table
- Default value: 'UTC'
- Stores timezone in IANA format (e.g., 'America/New_York', 'Europe/London')

### 2. Timezone Utilities
**File:** `frontend/src/utils/timezone.ts`

Key functions:
- `getBrowserTimezone()` - Detects user's browser timezone
- `COMMON_TIMEZONES` - List of common timezones for selector
- `getWeekStartDateInTimezone(date, timezone)` - Get Monday of the week in timezone
- `formatDateInTimezone(date, timezone, options)` - Format dates for display
- `getTodayInTimezone(timezone)` - Get current date in YYYY-MM-DD format
- `parseDateInTimezone(dateStr, timezone)` - Parse date strings with timezone awareness
- `isToday(date, timezone)` - Check if a date is today in the timezone
- `getDayBoundsInTimezone(date, timezone)` - Get start/end of day boundaries

### 3. Timezone Context
**File:** `frontend/src/context/TimezoneContext.tsx`

Provides timezone throughout the app via React Context:
- `useTimezone()` hook to access timezone anywhere
- Automatically uses user's profile timezone, falls back to browser timezone, then UTC
- Wrapped around the entire app in App.tsx

### 4. Profile Management
**File:** `frontend/src/components/ProfileManagement.tsx`

- Added timezone selector dropdown with common timezones
- Timezone is saved with other profile settings
- Initializes to browser timezone for new users

### 5. Updated Components

**HomePage.tsx:**
- Uses `getTodayInTimezone()` for current date
- Passes timezone to `formatDisplayDate()` for proper display

**TasksCalendar.tsx:**
- Imports timezone context for future timezone-aware calendar operations

**functions.ts:**
- Updated `getWeekStartDate()` to optionally accept timezone parameter
- Falls back to timezone-aware calculation when timezone is provided

## Usage

### For Users
1. Go to Profile → Preferences
2. Select your timezone from the dropdown
3. Save changes
4. All dates will now display in your timezone

### For Developers

#### Getting current timezone:
```tsx
import { useTimezone } from '@context/TimezoneContext';

function MyComponent() {
  const { timezone } = useTimezone();
  // timezone will be user's saved timezone, or browser timezone, or 'UTC'
}
```

#### Formatting dates:
```tsx
import { formatDateInTimezone } from '@utils/timezone';

const displayDate = formatDateInTimezone(
  '2026-03-05', 
  timezone, 
  { weekday: 'long', month: 'long', day: 'numeric' }
);
```

#### Getting today's date:
```tsx
import { getTodayInTimezone } from '@utils/timezone';

const today = getTodayInTimezone(timezone); // Returns 'YYYY-MM-DD'
```

#### Getting week start:
```tsx
import { getWeekStartDateInTimezone } from '@utils/timezone';

const monday = getWeekStartDateInTimezone(new Date(), timezone);
```

## Migration Instructions

1. Run the migration in Supabase SQL Editor:
   ```sql
   -- /frontend/supabase/migrations/20260305_add_timezone_to_profiles.sql
   ```

2. Existing users will default to 'UTC' until they set their timezone in preferences

3. New users will automatically get their browser timezone on first profile creation

## Future Enhancements

1. Auto-detect timezone changes when user travels
2. Show timezone in date displays for clarity
3. Add timezone to task scheduled times (not just dates)
4. Support multiple timezones in reporting/summaries
5. Add timezone conversion helpers for team collaboration

## Testing

Test scenarios:
- User in different timezone creates goal for "this week" - should use their Monday
- User schedules task for "today" - should match their local date
- User changes timezone - dates should update immediately
- Calendar view should show correct days in user's timezone
