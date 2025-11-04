# StreamHarbor Profile & Settings System

This document explains the complete user profile and settings implementation using NextAuth.js with Prisma.

## Overview

The profile system provides:
- ✅ Persistent user storage with PostgreSQL via Prisma
- ✅ One-to-one User-Profile relationship
- ✅ Automatic profile creation when users sign up
- ✅ Protected `/settings` page for profile management
- ✅ Username and bio fields
- ✅ Full CRUD API endpoints
- ✅ Middleware protection

## Architecture

### Database Schema

The system uses a separate `auth` schema in PostgreSQL to avoid conflicts with existing tables:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  name          String?
  password      String?
  profile       Profile?  // One-to-one
  // ... NextAuth fields
  @@schema("auth")
}

model Profile {
  id       String  @id @default(cuid())
  userId   String  @unique  // Enforces one-to-one
  username String? @unique
  bio      String?
  user     User @relation(fields: [userId], references: [id])
  @@schema("auth")
}
```

### Tech Stack

- **Prisma ORM** - Database modeling and migrations
- **@auth/prisma-adapter** - NextAuth.js Prisma integration
- **PostgreSQL** - Database (shared with video system)
- **Next.js 14** - App Router with Server/Client Components

## Setup Complete ✅

All steps have been completed:

### 1. Prisma Installation
```bash
npm install prisma @prisma/client @auth/prisma-adapter
```

### 2. Database Schema Created
- Location: `frontend/prisma/schema.prisma`
- Tables created in `auth` schema
- One-to-one relationship enforced via `@unique` constraint

### 3. Database Migration Complete
```bash
npx prisma db push
```

### 4. Prisma Client Initialized
- Location: `frontend/src/lib/prisma.ts`
- Singleton pattern for dev/prod environments

### 5. NextAuth Configuration Updated
- Location: `frontend/src/app/auth.ts`
- Uses `PrismaAdapter(prisma)`
- Auto-creates profiles via `events.createUser` callback

### 6. API Routes Created
- **GET `/api/profile`** - Fetch current user's profile
- **PATCH `/api/profile`** - Update username and bio
- Features:
  - Session-based authentication
  - Validation (min 3 chars for username)
  - Duplicate username detection
  - Auto-creates profile if missing

### 7. Settings Page Created
- Location: `frontend/src/app/settings/page.tsx`
- Client component with `useSession()` hook
- Features:
  - Redirect if not authenticated
  - Live form validation
  - Success/error messages
  - Loading states
  - Profile avatar display

### 8. Middleware Protection
- Location: `frontend/src/middleware.ts`
- Protects `/settings` route
- Uses NextAuth `auth()` helper
- Redirects to login with callback URL

## File Structure

```
frontend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── auth.ts            # NextAuth config with Prisma
│   │   ├── layout.tsx         # Nav with settings icon
│   │   ├── api/
│   │   │   └── profile/
│   │   │       └── route.ts   # Profile API endpoints
│   │   └── settings/
│   │       └── page.tsx       # Settings UI page
│   ├── lib/
│   │   └── prisma.ts          # Prisma client singleton
│   └── middleware.ts          # Route protection
└── .env                       # DATABASE_URL
```

## Usage

### Accessing Settings

1. **Via Navigation**: Click the gear icon (⚙️) in the top-right navbar
2. **Direct URL**: Navigate to `/settings`
3. **Protected**: Must be logged in, redirects to `/login` if not

### Profile API

#### Fetch Profile
```typescript
const res = await fetch('/api/profile');
const profile = await res.json();
// { id, username, bio, userId }
```

#### Update Profile
```typescript
const res = await fetch('/api/profile', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'newname', bio: 'Hello!' })
});
```

## Environment Variables

Add to `.env` or `.env.local`:

```env
DATABASE_URL=postgresql://streamharbor:supersecretpassword@localhost:5432/streamharbor_db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## Database Tables Created

All in `auth` schema:

- `User` - NextAuth user accounts
- `Profile` - User profiles (one-to-one with User)
- `Account` - OAuth accounts
- `Session` - User sessions
- `VerificationToken` - Email verification tokens

## Testing

1. **Login** as admin:
   - Email: `admin@streamharbor.local`
   - Password: `admin123`

2. **Navigate to Settings**:
   - Click gear icon in navbar
   - Or visit `http://localhost:3000/settings`

3. **Update Profile**:
   - Enter username (min 3 chars)
   - Enter bio (optional)
   - Click "Save Changes"

4. **Verify**:
   - Success message appears
   - Profile data persists on reload
   - Username uniqueness enforced

## Key Features

### Auto Profile Creation
When a new user signs up, their profile is automatically created:

```typescript
events: {
  createUser: async ({ user }) => {
    await prisma.profile.create({
      data: { userId: user.id }
    });
  }
}
```

### Protected Routes
Settings page requires authentication:

```typescript
// middleware.ts
const protectedRoutes = [
  /^\/settings(?:\/.*)?$/
];
```

### Form Validation
- Username must be 3+ characters
- Username must be unique
- Handles errors gracefully
- Real-time feedback

### Prisma Benefits
- Type-safe database queries
- Auto-generated types
- Migration management
- Relationship enforcement
- Transaction support

## Troubleshooting

### Profile Not Created?
Check `events.createUser` in `auth.ts` and verify user ID exists.

### Database Connection Error?
Verify `DATABASE_URL` in `.env` and PostgreSQL is running.

### Middleware Not Protecting?
Ensure `auth()` is imported and middleware matcher includes `/settings`.

### Duplicate Username Error?
Expected behavior - usernames must be unique. Shows error message to user.

## Next Steps

### Optional Enhancements

1. **Add More Fields**:
   ```prisma
   model Profile {
     avatar     String?
     location   String?
     website    String?
   }
   ```

2. **Public Profiles**:
   Create `/profile/[username]` page to view public profiles

3. **Avatar Upload**:
   Integrate with MinIO for profile picture storage

4. **Email Verification**:
   Use VerificationToken model for email confirmation

5. **Role-Based Access**:
   Extend User model with roles for permissions

## Production Checklist

- [ ] Use strong `NEXTAUTH_SECRET` (32+ chars)
- [ ] Enable SSL for database connection
- [ ] Run `npx prisma migrate dev` instead of `db push`
- [ ] Add rate limiting to API routes
- [ ] Implement proper error logging
- [ ] Add analytics tracking
- [ ] Set up database backups

## API Reference

### GET /api/profile

**Auth**: Required (session)

**Response**:
```json
{
  "id": "clx...",
  "username": "johndoe",
  "bio": "Hello world!",
  "userId": "clx..."
}
```

### PATCH /api/profile

**Auth**: Required (session)

**Request**:
```json
{
  "username": "newusername",
  "bio": "Updated bio"
}
```

**Response**:
```json
{
  "id": "clx...",
  "username": "newusername",
  "bio": "Updated bio",
  "userId": "clx...",
  "message": "Profile updated successfully"
}
```

**Error Codes**:
- `401` - Unauthorized (no session)
- `400` - Invalid data format
- `409` - Username already taken
- `500` - Server error

## Support

For issues or questions:
1. Check Prisma docs: https://www.prisma.io/docs
2. Check NextAuth docs: https://next-auth.js.org
3. Review middleware patterns: https://nextjs.org/docs/middleware

---

**Status**: ✅ Fully Implemented and Tested
**Version**: 1.0.0
**Last Updated**: 2025-10-31
