# PRAYMID - DEPLOY NOW ON YOUR VPS

This file has everything you need to deploy the Praymid project on your VPS **without any errors**.

---

## ⚡ FASTEST WAY (5 minutes)

### Step 1: Download Project to Your VPS
```bash
# SSH into your VPS
ssh user@YOUR_VPS_IP

# Download the project (adjust path as needed)
cd /opt
wget https://your-download-link/praymid.zip
unzip praymid.zip
cd praymid
```

### Step 2: Run the Startup Script
```bash
chmod +x start-vps.sh
./start-vps.sh
```

This will:
- ✅ Check Node.js
- ✅ Install pnpm
- ✅ Install all dependencies
- ✅ Create .env.local from template
- ✅ Build the app

### Step 3: Configure Database
```bash
nano .env.local
```

Find this line and update with your actual database:
```bash
DATABASE_URL=postgresql://user:password@YOUR_DB_HOST:5432/praymid_db
```

Save (Ctrl+X, Y, Enter)

### Step 4: Start the App
```bash
pnpm start
```

### Step 5: Access It
Open browser: **http://YOUR_VPS_IP:3000**

**That's it! App is running now.** 🎉

---

## 📋 DETAILED STEPS (if above doesn't work)

### Prerequisites
Before deploying, ensure your VPS has:

```bash
# Check Node.js (version 18+)
node -v

# Check pnpm
pnpm -v

# Check PostgreSQL is running
pg_isready -h localhost -U postgres
```

If any are missing, install them:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL (if needed)
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 1: Download & Extract
```bash
cd /opt  # or your preferred directory
wget your-project-url/praymid.zip
unzip praymid.zip
cd praymid
ls -la  # Verify files are there
```

### Step 2: Install Dependencies
```bash
pnpm install
```

Wait for completion (first time takes 2-5 minutes)

### Step 3: Setup Environment
```bash
# Copy template
cp .env.example .env.local

# Edit configuration
nano .env.local
```

**IMPORTANT VALUES TO SET:**

```bash
# Your PostgreSQL connection string (MUST UPDATE)
DATABASE_URL=postgresql://user:password@localhost:5432/praymid_db

# Your VPS IP or domain
NEXT_PUBLIC_APP_URL=http://YOUR_VPS_IP:3000

# Change default admin password
INITIAL_ADMIN_PASSWORD=YourStrongPassword123!
```

Save and exit (Ctrl+X, Y, Enter)

### Step 4: Create Database
```bash
# If database doesn't exist yet
createdb praymid_db

# Initialize tables (if not auto-created)
psql $DATABASE_URL < DATABASE_SCHEMA.sql
```

### Step 5: Build Application
```bash
pnpm run build
```

Wait for build to complete.

### Step 6: Start App
```bash
# Development mode (for testing)
pnpm dev

# OR Production mode (recommended)
pnpm start
```

### Step 7: Test Access
Open browser and go to: `http://YOUR_VPS_IP:3000`

Login with:
- Email: `admin@praymid.com`
- Password: (what you set in INITIAL_ADMIN_PASSWORD)

---

## 🔧 PRODUCTION SETUP (PM2 + Nginx)

### Auto-restart with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start app with PM2
pm2 start "pnpm start" --name praymid

# Make it restart on reboot
pm2 startup
pm2 save

# View status
pm2 status

# View logs
pm2 logs praymid
```

### Domain + SSL with Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create config file
sudo nano /etc/nginx/sites-available/praymid
```

Paste this config:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and start:
```bash
sudo ln -s /etc/nginx/sites-available/praymid /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## ❌ ERROR SOLUTIONS

### "DATABASE_URL is not set"
```bash
# Check if .env.local exists
ls -la .env.local

# If not, create it
cp .env.example .env.local
nano .env.local
# Edit DATABASE_URL line
```

### "Port 3000 already in use"
```bash
# Find what's using it
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change port in .env.local
nano .env.local
# Change: PORT=3000 to PORT=3001
```

### "Cannot connect to database"
```bash
# Verify database is running
psql -U postgres -c "SELECT 1"

# Check connection string in .env.local
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### "Module not found" errors
```bash
# Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### "Build fails"
```bash
# Try building again to see full error
pnpm run build 2>&1 | head -50

# Or clean build
rm -rf .next
pnpm run build
```

---

## 📂 PROJECT FILES EXPLAINED

| File | Purpose |
|------|---------|
| `.env.local` | Your configuration (create from `.env.example`) |
| `.env.example` | Template for environment variables |
| `start-vps.sh` | Setup script (run once) |
| `setup-vps.sh` | Advanced setup (automatic) |
| `DATABASE_SCHEMA.sql` | All database tables (for manual setup) |
| `package.json` | Dependencies list |
| `app/` | Next.js application code |
| `components/` | React components |
| `lib/` | Utility functions |
| `public/` | Static files |

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify everything works:

- [ ] App starts without errors
- [ ] Can access http://YOUR_VPS_IP:3000
- [ ] Can login with admin credentials
- [ ] Database is connected
- [ ] Can view dashboard
- [ ] Can create new user
- [ ] Can submit contribution
- [ ] Admin can approve requests

---

## 🆘 STILL HAVING ISSUES?

### Get detailed logs
```bash
# View app logs
pm2 logs praymid

# View database logs (if PostgreSQL)
sudo tail -f /var/log/postgresql/postgresql.log

# Check system resources
free -h
df -h
```

### Restart everything
```bash
# Stop app
pm2 stop praymid

# Check database
psql $DATABASE_URL -c "SELECT 1"

# Restart app
pm2 restart praymid

# Check it's running
pm2 status
```

### Full reset (if needed)
```bash
# Stop PM2
pm2 stop praymid
pm2 delete praymid

# Kill any node processes
pkill -f node

# Reinstall and rebuild
rm -rf node_modules .next
pnpm install
pnpm run build

# Start fresh
pm2 start "pnpm start" --name praymid
```

---

## 📞 SUPPORT

For detailed info, see:
- `VPS_QUICK_START.md` - Quick checklist
- `VPS_DEPLOYMENT_COMPLETE.md` - Full guide
- `README_VPS_DEPLOYMENT.md` - All commands
- `DATABASE_SCHEMA.sql` - Database setup

---

## 🚀 THAT'S ALL!

Your Praymid app should now be running on your VPS.

**Access:** http://YOUR_VPS_IP:3000

**Admin Login:**
- Email: admin@praymid.com
- Password: (from INITIAL_ADMIN_PASSWORD in .env.local)

Happy deploying! 🎉
