# Invite-Only Registration System

## Overview

Wkly has been converted from open registration to an invite-only system with a proof-of-concept disclaimer. This ensures controlled access while maintaining legal protection regarding data safety.

## Components

### Database Tables

1. **access_requests** - Stores user access requests
   - Fields: id, email, name, message, status (pending/approved/rejected), timestamps, reviewer info
   
2. **approved_users** - Tracks emails approved for registration
   - Fields: id, email, approved_at, approved_by, invitation_method

3. **profiles** (extended) - Added disclaimer acceptance tracking
   - New fields: disclaimer_accepted, disclaimer_accepted_at, is_admin

### Frontend Components

- **RequestAccess.tsx** - Public form for requesting access
- **AdminAccessRequests.tsx** - Admin interface for managing requests
- **Auth.tsx** (modified) - Updated registration flow with approval check and disclaimer

### Netlify Functions

- **requestAccess.mts** - Public endpoint for submitting access requests (no auth required)
- **checkApproval.mts** - Check if an email is approved for registration
- **getAccessRequests.mts** - Admin-only: fetch access requests (filtered by status)
- **approveAccessRequest.mts** - Admin-only: approve a request and add to approved_users
- **rejectAccessRequest.mts** - Admin-only: reject a request

## User Flows

### New User Requesting Access

1. User visits landing page
2. Clicks "Request Access" button
3. Fills out request form (email required, name/message optional)
4. Request is submitted to `access_requests` table with status='pending'
5. User receives confirmation message

### Approved User Registration

1. Admin approves user's access request (via admin panel or direct database entry)
2. User's email is added to `approved_users` table
3. User clicks "Already approved? Register here" on landing page
4. During registration:
   - System checks if email is in `approved_users` table
   - User must check disclaimer acknowledging POC status
   - If approved and disclaimer accepted, registration proceeds
   - Profile is created with `disclaimer_accepted=true` and timestamp

### Unapproved User Attempting Registration

1. User tries to register without approval
2. System checks `approved_users` table
3. Registration is blocked with message: "This email is not approved for registration"
4. User is prompted to request access

## Admin Setup

### Your Admin Email

Your email (`joshkimmell@gmail.com`) is set as admin in two places:
1. Database migration: Sets `is_admin=true` in profiles table
2. Netlify functions: Hardcoded fallback check in `isAdmin()` function

### Accessing Admin Panel

To access the admin panel for managing access requests:

1. Add a route/link to `AdminAccessRequests` component in your app navigation
   - Example: Add "Admin" menu item in Header.tsx that routes to "/admin/access-requests"
   - Only show this menu item if profile.is_admin === true

2. Or access directly at: `/admin/access-requests` (route needs to be created)

Suggested integration in App.tsx:
```typescript
import AdminAccessRequests from '@components/AdminAccessRequests';

// In your routes:
{isAuthenticated && profile?.is_admin && (
  <Route path="/admin/access-requests" element={<AdminAccessRequests />} />
)}
```

## Database Migrations

Two migration files need to be run:

1. **supabase/migrations/20260304_create_access_control.sql**
   - Creates access_requests and approved_users tables
   - Sets up RLS policies
   - Creates indexes for performance

2. **frontend/supabase/migrations/20260304_add_disclaimer_and_admin_to_profiles.sql**
   - Adds disclaimer_accepted, disclaimer_accepted_at, is_admin to profiles
   - Sets your email as admin

### Running Migrations

```bash
# For backend tables (access_requests, approved_users)
cd supabase
supabase db push

# For frontend profiles table
cd frontend/supabase
supabase db push
```

Or manually run the SQL files in your Supabase SQL editor.

## Pre-Approving Users

To manually approve users without them requesting access:

```sql
INSERT INTO public.approved_users (email, approved_by, invitation_method)
VALUES ('user@example.com', 'your-user-id-here', 'manual_approval');
```

Or use the admin panel to approve pending requests.

## Disclaimer Text

New users must acknowledge during registration:

> "I acknowledge that Wkly is currently a **free proof-of-concept**. Neither Josh Kimmell nor anyone associated with Wkly.me can be held responsible for the safety, privacy, or persistence of any data I add to this application."

This is stored in the database with acceptance timestamp for legal record-keeping.

## Testing Checklist

- [ ] Submit access request as new user
- [ ] Verify request appears in admin panel
- [ ] Approve request via admin panel
- [ ] Verify email is added to approved_users
- [ ] Register with approved email
- [ ] Verify disclaimer checkbox is required
- [ ] Verify profile has disclaimer_accepted=true
- [ ] Try to register with unapproved email
- [ ] Verify registration is blocked
- [ ] Test request access modal flow

## Security Notes

- Access request submission is rate-limited by Netlify (default)
- Admin functions verify is_admin flag in profile
- RLS policies protect direct database access
- Approved users list is publicly readable (needed for registration check)
- User passwords are handled by Supabase Auth (never stored in our tables)

## Environment Variables

No new environment variables are required. The system uses existing:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Future Enhancements

Potential improvements to consider:

- Email notifications when access is approved
- Bulk approve functionality
- Access request notes/reason field (already in schema)
- Request expiration (auto-reject after X days)
- Invite codes for sharing with specific users
- Analytics dashboard for request trends
