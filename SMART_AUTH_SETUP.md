# StreamHarbor Smart Auth System - Setup Guide

## What's Been Implemented

### 1. **Smart Auth Flow** (`/auth`)
- Email-first login/register page at `/auth`
- Checks if user exists via `/api/auth/check-user`
- Shows login form for existing users
- Shows registration form for new users
- Blocks unapproved users with 403 → redirects to `/pending-approval`

### 2. **User Registration** (`/api/register`)
- Creates new users with `isApproved: false` by default
- Hashes passwords with bcryptjs (10 rounds)
- Returns 409 if user already exists

### 3. **Login with Approval Gating** (`/api/auth/login`)
- Admin backdoor: `admin@streamharbor.local` / `admin123` (bypasses DB)
- Database users: verifies password with bcryptjs
- Blocks unapproved users (403) → client redirects to `/pending-approval`
- Issues JWT with role `user` or `admin`

### 4. **Logout** (`/api/auth/logout`)
- Clears `auth-token` cookie
- Sign out button in navbar calls this endpoint

### 5. **Admin User Approval**
- GET `/api/admin/users` - Lists all users (admin only)
- PATCH `/api/admin/users/:id` - Approves user (admin only, body: `{ approve: true }`)
- `AdminUsers` component in dashboard shows pending users with Approve button

### 6. **Middleware & Auth**
- `/auth` and `/pending-approval` added to public routes
- Middleware checks JWT from `auth-token` cookie
- Redirects unauthenticated users to `/auth?callbackUrl=...`
- Admin routes protected at layout level (existing JWT check)

### 7. **Profile Settings** (`/settings`)
- Now uses JWT auth via `/api/profile` (aligned with JWT flow)
- GET/PATCH profile (username, bio)
- Protected by middleware

### 8. **UI Updates**
- `AuthNav` component now shows:
  - Sign out button (when authenticated)
  - Sign in link (when guest)
  - Admin link (if role=admin)
  - Upload link (if authenticated)
- Navbar includes `<AuthNav />` in right group
- `/browse` shows a gentle auth hint for guests

---

## Database Migration Required

The Prisma schema now includes `isApproved Boolean @default(false)` on `auth.User`.

### Step 1: Create Migration

```powershell
cd C:\streamharbor\frontend
npm.cmd run prisma migrate dev --name add_user_approval
```

This will:
- Generate SQL to add the `isApproved` column
- Apply it to your PostgreSQL database
- Regenerate the Prisma client with the new field

### Step 2: Verify Migration

After the migration runs, check that `auth."User"` has the new column:

```sql
\d auth."User"
-- Should show: isApproved | boolean | not null default false
```

### Step 3: (Optional) Approve Existing Users

If you have existing users in the database, they'll default to `isApproved = false`. To approve them:

```sql
-- Approve all existing users
UPDATE auth."User" SET "isApproved" = true WHERE "isApproved" = false;
```

Or approve specific users via the admin dashboard UI.

---

## Testing the Flow

### Test 1: Register a New User

1. Visit `http://localhost:3000/auth`
2. Enter a new email (e.g., `test@example.com`)
3. It will show the registration form
4. Enter name (optional) and password
5. Click "Create account"
6. You'll see the login form (but can't log in yet—not approved)
7. Try to log in → should redirect to `/pending-approval`

### Test 2: Admin Approves User

1. Log in as admin: `admin@streamharbor.local` / `admin123`
2. Visit `http://localhost:3000/admin/dashboard`
3. Scroll to "User Approvals" section
4. Click "Approve" on `test@example.com`
5. User is now approved

### Test 3: Approved User Logs In

1. Log out (click "Sign out" in navbar)
2. Visit `/auth`
3. Enter `test@example.com` and password
4. Should log in successfully and redirect to `/browse` (or `callbackUrl`)

### Test 4: Profile Settings

1. While logged in, visit `/settings`
2. Update username and bio
3. Save changes
4. Should see success message

### Test 5: Sign Out

1. Click "Sign out" in navbar
2. Should clear session and redirect to `/`
3. Navbar should show "Sign in" link

---

## Admin Dashboard Access

- URL: `http://localhost:3000/admin/dashboard`
- Login: `admin@streamharbor.local` / `admin123`
- Features:
  - Video management (existing)
  - User approval (new)

---

## API Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/check-user` | POST | Public | Check if email exists |
| `/api/register` | POST | Public | Create new user (unapproved) |
| `/api/auth/login` | POST | Public | Login (blocks unapproved) |
| `/api/auth/logout` | POST | Any | Clear JWT cookie |
| `/api/auth/me` | GET | JWT | Get current user from JWT |
| `/api/profile` | GET/PATCH | JWT | Profile CRUD |
| `/api/admin/users` | GET | Admin JWT | List all users |
| `/api/admin/users/:id` | PATCH | Admin JWT | Approve user |

---

## Environment Variables

Optional: Override admin credentials via `.env.local`:

```env
ADMIN_EMAIL=admin@streamharbor.local
ADMIN_PASSWORD=your-secure-password-here
```

The login route will respect these if set.

---

## Next Steps (Optional Enhancements)

1. **Email Notifications**: Send email when user is approved
2. **Password Reset**: Add forgot password flow
3. **OAuth Providers**: Add Google/GitHub login via NextAuth providers
4. **User Roles**: Extend to support `moderator`, `editor`, etc.
5. **Bulk Actions**: Approve/reject multiple users at once
6. **Audit Log**: Track approval actions

---

## Troubleshooting

### Error: "Module 'bcryptjs' not found"

```powershell
cd C:\streamharbor\frontend
npm.cmd install bcryptjs @types/bcryptjs
```

### Error: "Unauthorized" on `/api/profile`

- Ensure you're logged in (JWT cookie `auth-token` is set)
- Check browser DevTools → Application → Cookies → `auth-token`

### Error: "Prisma Client validation failed"

- Run migration to add `isApproved` column:

```powershell
cd C:\streamharbor\frontend
npm.cmd run prisma migrate dev --name add_user_approval
npm.cmd run prisma generate
```

### Middleware redirects to `/auth` instead of `/login`

- This is intentional! The new flow uses `/auth` as the unified login/register page.
- Update any hardcoded `/login` links to `/auth` if needed.

---

## File Checklist

### New Files
- ✅ `src/app/auth/page.tsx` - Smart auth page (email → login/register)
- ✅ `src/app/pending-approval/page.tsx` - Pending approval message
- ✅ `src/app/api/auth/check-user/route.ts` - Email exists check
- ✅ `src/app/api/register/route.ts` - User registration
- ✅ `src/app/api/auth/logout/route.ts` - Logout endpoint
- ✅ `src/app/api/admin/users/route.ts` - Admin user list
- ✅ `src/app/api/admin/users/[id]/route.ts` - Admin user approval
- ✅ `src/components/AdminUsers.tsx` - Admin user approval UI
- ✅ `src/app/browse/SmartAuthHint.tsx` - Auth hint for guests

### Modified Files
- ✅ `src/app/providers.tsx` - Removed SessionProvider
- ✅ `src/app/api/profile/route.ts` - Uses JWT auth
- ✅ `src/app/api/auth/login/route.ts` - DB user login + approval check
- ✅ `src/components/AuthNav.tsx` - Added sign out + sign in links
- ✅ `src/middleware.ts` - JWT verification, `/auth` public
- ✅ `src/app/layout.tsx` - Added `<AuthNav />` to navbar
- ✅ `src/app/admin/dashboard/page.tsx` - Added `<AdminUsers />`
- ✅ `src/app/browse/page.tsx` - Added `<SmartAuthHint />`
- ✅ `prisma/schema.prisma` - Added `isApproved` field
- ✅ `package.json` - Added `bcryptjs` and `@types/bcryptjs`

---

## Summary

Your StreamHarbor app now has:

✅ Smart auth flow (email → login/register)  
✅ User registration with approval workflow  
✅ Admin dashboard for approving users  
✅ JWT-based authentication (consistent across all endpoints)  
✅ Sign out button in navbar  
✅ Profile settings page working with JWT  
✅ Pending approval page for blocked users  

**Next:** Run the Prisma migration (Step 1 above) to apply the `isApproved` field to your database!
