# PRAYMID - VPS QUICK DEPLOYMENT CHECKLIST

## Prerequisites (do once on VPS)
- [ ] Ubuntu 22.04 LTS (or latest)
- [ ] Node.js 18+ installed
- [ ] pnpm installed
- [ ] PostgreSQL 14+ running (or your database provider)
- [ ] Port 3000 is open/available

## 1. Download Project
```bash
# Option A: Download ZIP and extract
unzip praymid.zip
cd praymid

# Option B: Clone from git (if available)
git clone YOUR_REPO_URL
cd praymid
```

## 2. Setup Environment
```bash
# Make startup script executable
chmod +x start-vps.sh

# Run the startup script (installs dependencies, builds)
./start-vps.sh

# Edit environment configuration
nano .env.local
```

## 3. Configure Database in .env.local
Edit these values:
```bash
# Change this line with your actual database details:
DATABASE_URL=postgresql://user:password@YOUR_DB_HOST:5432/praymid_db
```

**For different database types:**
- **Local PostgreSQL:** `postgresql://postgres:password@localhost:5432/praymid_db`
- **Neon:** `postgresql://user:password@ep-xxxxx.neon.tech/praymid_db`
- **RDS/Cloud DB:** `postgresql://user:password@your-db-host.com:5432/praymid_db`

## 4. Initialize Database
```bash
# The app will auto-create tables on first run
# But you can manually run SQL if needed:
psql $DATABASE_URL < DATABASE_SCHEMA.sql
```

## 5. Start Application
```bash
# Development mode:
pnpm dev

# Production mode:
pnpm start
```

## 6. Access Application
Open browser: `http://YOUR_VPS_IP:3000`

Default login:
- Email: `admin@praymid.com`
- Password: Check `.env.local` for `INITIAL_ADMIN_PASSWORD`

## Production Deployment (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start 'pnpm start' --name praymid

# Auto-restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs praymid

# Stop/restart
pm2 stop praymid
pm2 restart praymid
```

## Nginx Setup (Optional, for domain/SSL)
```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Create config at /etc/nginx/sites-available/praymid
# See: NGINX_CONFIG.example (included in project)

# Enable and start
sudo ln -s /etc/nginx/sites-available/praymid /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Troubleshooting

### Port 3000 already in use
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>
```

### Database connection error
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Verify environment variable
echo $DATABASE_URL
```

### Dependencies missing
```bash
# Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Rebuild needed
```bash
pnpm run build
```

## File Structure
```
praymid/
├── .env.local                    (Configure this!)
├── .env.example                  (Template)
├── start-vps.sh                  (Run this first)
├── DATABASE_SCHEMA.sql           (DB tables)
├── app/                          (Next.js app)
├── components/                   (React components)
├── lib/                          (Utilities)
└── public/                       (Static files)
```

## Common Errors & Fixes

| Error | Solution |
|-------|----------|
| `DATABASE_URL is not set` | Edit `.env.local` and set DATABASE_URL |
| `Port 3000 already in use` | Change PORT in `.env.local` or kill existing process |
| `Module not found` | Run `pnpm install` |
| `Build failed` | Run `pnpm run build` manually to see errors |
| `Database connection refused` | Verify PostgreSQL is running and URL is correct |
| `Cannot find module 'next'` | Run `pnpm install` |

## Health Check
After starting, verify it's working:
```bash
# Should return app HTML
curl http://localhost:3000

# Check logs
tail -f ~/.pm2/logs/praymid-out.log
```

## Done!
Your app should now be running. Access it at: **http://YOUR_VPS_IP:3000**

Need help? Check the included documentation files:
- `README_VPS_DEPLOYMENT.md`
- `VPS_DEPLOYMENT_COMPLETE.md`
- `GETTING_STARTED_VPS.md`
