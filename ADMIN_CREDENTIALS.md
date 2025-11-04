# 🔑 Admin Credentials

## Default Admin Login

Your StreamHarbor admin account uses these credentials:

**Email:** `admin@streamharbor.local`  
**Password:** `admin123`

---

## Where to Log In

1. **Visit:** 
2. **Enter email:** `admin@streamharbor.local`
3. **Enter password:** `admin123`
4. **Click:** Sign In

---

## Admin Features

Once logged in as admin, you can access:

- **Admin Dashboard:** http://localhost:3000/admin/dashboard
- **User Management:** http://localhost:3000/admin/users (NEW!)
- **Video Upload:** http://localhost:3000/upload

---

## Changing Admin Credentials

### Option 1: Environment Variables (Recommended)

Create or edit `c:\streamharbor\frontend\.env.local`:

```env
ADMIN_EMAIL=your-admin@yourdomain.com
ADMIN_PASSWORD=your-secure-password-here
```

Then restart the frontend container:

```powershell
cd c:\streamharbor
docker-compose restart frontend
```

### Option 2: Edit Login Route Directly

Open `c:\streamharbor\frontend\src\app\api\auth\login\route.ts` and find this line:

```typescript
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@streamharbor.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
```

Change the default values, then rebuild:

```powershell
cd c:\streamharbor
docker-compose restart frontend
```

---

## Security Notes

⚠️ **Important:**

1. The default credentials (`admin123`) are **only for development**
2. **Change them immediately** for production use
3. The admin account bypasses the database and doesn't require approval
4. Regular users must be approved by an admin before they can log in

---

## Testing Regular User Flow

1. **Create a test user:**
   - Visit http://localhost:3000/auth
   - Enter a test email (e.g., `test@example.com`)
   - Create account with a password
   - You'll see "Pending approval" message

2. **Approve the user:**
   - Log in as admin
   - Visit http://localhost:3000/admin/users
   - Find the pending user
   - Click "Approve"

3. **Test user login:**
   - Log out (click "Sign out")
   - Go to http://localhost:3000/auth
   - Log in with the test user credentials
   - Success! 🎉

---

## Quick Reference

| What | URL | Credentials |
|------|-----|-------------|
| Login Page | http://localhost:3000/auth | See above |
| Admin Dashboard | http://localhost:3000/admin/dashboard | Admin only |
| User Management | http://localhost:3000/admin/users | Admin only |
| Upload Videos | http://localhost:3000/upload | Admin + approved users |
| Profile Settings | http://localhost:3000/settings | All authenticated users |

---

## Troubleshooting

### "Invalid credentials" error

- Double-check you're using the correct email and password
- Try using the default: `admin@streamharbor.local` / `admin123`
- Check the browser console for errors
- Check frontend container logs: `docker-compose logs frontend`

### Can't access admin pages

- Make sure you're logged in with the admin account
- Regular users don't have admin access
- Admin role is checked both in middleware and in the layout

### Regular users can't log in

- They need to be approved first
- Log in as admin and visit `/admin/users`
- Click "Approve" on the pending user
- Then they can log in

---

## Need Help?

Check the logs:

```powershell
# Frontend logs
docker-compose logs -f frontend

# All services
docker-compose logs -f
```

Look for error messages related to:
- JWT token validation
- Prisma database queries
- bcrypt password hashing
