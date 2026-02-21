# MongoDB Setup Guide

## Configuration

Your `.env` file has been created with the MongoDB Atlas connection string:

```
DATABASE_URL=mongodb+srv://gk002005_db_user:DmwqePK2bFJjhVn2@cluster0.vrurhpf.mongodb.net/?appName=Cluster0
PORT=5000
NODE_ENV=development
SESSION_SECRET=your-secret-key-change-in-production
```

## MongoDB Atlas Configuration

Before running the application, ensure your MongoDB Atlas cluster is properly configured:

### 1. IP Whitelist
Go to **MongoDB Atlas Dashboard** → **Network Access** → **IP Whitelist**

Add your current IP address. For development, you can temporarily add:
- `0.0.0.0/0` (allows all IPs - NOT for production)

### 2. Database User Credentials
The connection string uses:
- **Username**: `gk002005_db_user`
- **Password**: `DmwqePK2bFJjhVn2`
- **Cluster**: `cluster0.vrurhpf.mongodb.net`

Verify these credentials exist in **Database Access** section.

### 3. Test Connection

You can test the MongoDB connection using MongoDB Compass or mongosh:

```bash
# Using mongosh
mongosh "mongodb+srv://gk002005_db_user:DmwqePK2bFJjhVn2@cluster0.vrurhpf.mongodb.net/?appName=Cluster0"
```

## Running the Application

### Development
```bash
npm run dev
```

Expected output:
```
00:00:00 [express] serving on port 5000
Seeding database...
Database seeded!
```

### Production
```bash
npm run build
npm run start
```

## Database Collections

The application will automatically create two collections:

### `users` Collection
```json
{
  "_id": ObjectId,
  "id": 1,
  "username": "john_doe",
  "password": "hashed_password",
  "fullName": "John Doe",
  "accountNumber": "ACC1001",
  "balance": "5000.00",
  "createdAt": "2024-01-15T10:00:00Z",
  "isAdmin": false
}
```

**Indexes**:
- `username` (unique)
- `accountNumber` (unique)

### `transactions` Collection
```json
{
  "_id": ObjectId,
  "id": 1,
  "userId": 1,
  "type": "deposit",
  "amount": "5000.00",
  "description": "Initial Deposit",
  "date": "2024-01-15T10:00:00Z",
  "relatedUserId": null
}
```

**Indexes**:
- `userId`
- `relatedUserId`

## Default Test Users

On first run, the application seeds the database with:

| Username | Password | Balance | Role |
|----------|----------|---------|------|
| admin | password123 | N/A | Admin |
| john_doe | password123 | $5,000.00 | User |
| jane_smith | password123 | $1,000.00 | User |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/user` - Get current user info

### Banking Operations
- `POST /api/deposit` - Deposit money
- `POST /api/withdraw` - Withdraw money
- `POST /api/transfer` - Transfer to another account
- `GET /api/transactions` - Get user's transactions

### Admin Routes (requires admin login)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/transactions` - Get all transactions

## Troubleshooting

### Connection Refused
If you see `ECONNREFUSED` error:
1. Check internet connectivity
2. Verify IP address is whitelisted in MongoDB Atlas
3. Ensure database user has correct password

### Authentication Failed
If you see authentication errors:
1. Double-check username and password in MongoDB Atlas
2. Verify the database user exists in Database Access section

### Database Not Initialized
If you see "Database not initialized" error:
1. Ensure `npm install` was run
2. Verify `.env` file exists with `DATABASE_URL` set
3. Check that `initializeDb()` is called before routes are registered

## Environment Variables

Create a `.env` file in the project root:

```env
# Production credentials should be stored securely (environment variables, secrets manager, etc.)
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
PORT=5000
NODE_ENV=production
SESSION_SECRET=your-random-secret-key-min-32-chars
```

For **production**, never commit `.env` file to version control. Use your hosting platform's environment variable settings (Heroku, Vercel, AWS, etc.).
