# VPS Environment Setup Guide

## Database Connection Details

Your Praymid application is now configured to connect to a shared Supabase PostgreSQL database.

**Connection Information:**
- Host: db.hcvmiblkklcrkwthraxw.supabase.co
- Port: 5432
- Database: postgres
- Username: postgres
- Password: Arpit@881150

## Setup on Your VPS

### Step 1: Create .env File on VPS

SSH into your VPS and create the `.env` file:

```bash
ssh user@YOUR_VPS_IP
cd /path/to/praymid

# Create or edit .env file
nano .env
```

### Step 2: Copy This Configuration

Paste the following into your `.env` file:

```
DATABASE_URL="postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres"
NODE_ENV="production"
NEXT_PUBLIC_API_URL="http://YOUR_VPS_IP_OR_DOMAIN"
PORT=3000
SESSION_SECRET="your-secure-session-secret-change-this-in-production"
ADMIN_EMAIL="admin@praymid.com"
CORS_ORIGIN="http://YOUR_VPS_IP_OR_DOMAIN"
```

Replace `YOUR_VPS_IP_OR_DOMAIN` with your actual VPS IP or domain name.

### Step 3: Save and Exit

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Step 4: Restart Application

```bash
pm2 restart all
# OR
npm run dev
```

## Testing Connection

### From Your VPS Terminal:

```bash
# Test if database is accessible
psql -h db.hcvmiblkklcrkwthraxw.supabase.co -U postgres -d postgres -c "SELECT 1;"

# When prompted, enter password: Arpit@881150
```

### From Browser:

1. Visit: http://YOUR_VPS_IP:3000
2. Try logging in to admin/participant dashboard
3. Check if data loads from the database

## Important Notes

- Both v0 development and VPS now share the same database
- Any data created in v0 will appear on VPS and vice versa
- Keep the connection string secure - don't commit to public repositories
- Change SESSION_SECRET to a random secure string in production

## Troubleshooting

### Connection Refused
- Ensure your VPS has outbound internet access to Supabase
- Check if firewall is blocking port 5432

### Authentication Failed
- Verify password is exactly: `Arpit@881150`
- Check for extra spaces in connection string

### Tables Not Found
- Run the DATABASE_COMPLETE_SCHEMA.sql to create all tables
- Tables will be created in the shared database
