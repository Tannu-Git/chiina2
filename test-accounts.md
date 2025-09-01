# Test Account Verification

## Available Test Accounts

The system includes the following pre-seeded test accounts that you can use to verify authentication:

### 1. Admin Account
- **Email:** `admin@demo.com`
- **Password:** `password`
- **Role:** Admin
- **Permissions:** Full access to all features

### 2. Staff Account
- **Email:** `staff@demo.com`
- **Password:** `password`
- **Role:** Staff
- **Permissions:** Limited administrative access

### 3. Client Account
- **Email:** `client@demo.com`
- **Password:** `password`
- **Role:** Client
- **Permissions:** Client-specific access

## Additional Client Accounts

### 4. Rajesh Patel (ABC Trading)
- **Email:** `rajesh@abctrading.com`
- **Password:** `password`
- **Role:** Client
- **Company:** ABC Trading Co.

### 5. Priya Sharma (XYZ Imports)
- **Email:** `priya@xyzimports.com`
- **Password:** `password`
- **Role:** Client
- **Company:** XYZ Imports Ltd.

## How to Test Authentication

1. **Run the seed script** (if not already done):
   ```bash
   cd server
   node scripts/seed.js
   ```

2. **Start the application**:
   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm run dev
   ```

3. **Test Login Process**:
   - Navigate to `http://localhost:3000`
   - Use any of the test accounts above
   - Verify role-based access control

## Password Management Features

### Admin Functions (Available in Users Page)
- ✅ **View User Details** - Complete user information
- ✅ **Edit User Info** - Name, email, company, phone, address
- ✅ **Change User Password** - Set new password for any user
- ✅ **Toggle User Status** - Activate/deactivate accounts
- ✅ **Delete Users** - Remove users (with confirmation)
- ✅ **Export User Data** - CSV export with comprehensive information

### Password Security
- ✅ **Bcrypt Hashing** - All passwords are securely hashed
- ✅ **Minimum Length** - 6 character minimum requirement
- ✅ **Role-based Access** - Only admins can change passwords
- ✅ **Validation** - Server-side password validation
- ✅ **JWT Authentication** - Secure token-based authentication

## Testing Password Changes

1. **Login as Admin** (`admin@demo.com` / `password`)
2. **Navigate to Users Page** (`/admin/users`)
3. **Find any user** and click the **Key icon** (Change Password)
4. **Set new password** (minimum 6 characters)
5. **Test login** with the user's new password

## Account Security Features

- **Auto Client ID Generation** - Client users get unique IDs
- **Session Management** - 30-day JWT token expiration
- **Role-based Permissions** - Granular access control
- **Account Status Tracking** - Active/Inactive status
- **Last Login Tracking** - Monitor user activity
- **Password Change Logging** - Admin actions are tracked

## Troubleshooting

If accounts don't work:

1. **Check MongoDB Connection**:
   ```bash
   mongosh
   use logistics-oms
   db.users.find({}, {name: 1, email: 1, role: 1})
   ```

2. **Re-run Seed Script**:
   ```bash
   cd server
   node scripts/seed.js
   ```

3. **Check Environment Variables**:
   - Ensure `JWT_SECRET` is set in `.env`
   - Verify `MONGODB_URI` connection string

4. **Clear Browser Storage**:
   - Clear localStorage and cookies
   - Try incognito/private browsing

All accounts are fully functional with real backend integration and proper security implementation.