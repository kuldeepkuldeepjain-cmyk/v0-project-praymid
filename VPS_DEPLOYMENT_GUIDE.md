# VPS DEPLOYMENT GUIDE - PYRAMID APPLICATION

## Prerequisites

- Node.js 18+ installed on VPS
- npm or yarn package manager
- PM2 for process management (optional but recommended)
- Nginx or Apache for reverse proxy (optional)

---

## STEP 1: Set Up Environment on VPS

### Create .env file

```bash
# Connect to your VPS via SSH
ssh user@your_vps_ip

# Navigate to your project directory
cd /path/to/pyramid-app

# Create .env file
cat > .env.local << 'EOF'
# DATABASE CONFIGURATION
DATABASE_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
POSTGRES_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
POSTGRES_URL_NON_POOLING=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres

# APPLICATION CONFIG
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: Add other configurations as needed
EOF
```

---

## STEP 2: Install Dependencies

```bash
# Install dependencies
npm install

# Or if using yarn
yarn install

# Or if using pnpm
pnpm install
```

---

## STEP 3: Build Application

```bash
# Build for production
npm run build

# Verify build succeeded
npm run start
```

---

## STEP 4: Install PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start npm --name "pyramid-app" -- start

# Save PM2 config (auto-restart on reboot)
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs pyramid-app
```

---

## STEP 5: Set Up Nginx Reverse Proxy (Optional)

### Create Nginx configuration

```bash
sudo nano /etc/nginx/sites-available/pyramid-app
```

Add this configuration:

```nginx
upstream pyramid_app {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://pyramid_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and test:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pyramid-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## STEP 6: Set Up SSL with Certbot (Recommended)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## STEP 7: Database Verification

Test database connection on VPS:

```bash
# Test connection
npm run build && npm start

# Check logs for any database connection errors
pm2 logs pyramid-app

# Expected: Application starts successfully without connection errors
```

---

## STEP 8: Application Startup

### Manual Start
```bash
npm start
```

### With PM2
```bash
pm2 start npm --name "pyramid-app" -- start
pm2 save
```

### With Docker (Optional)
```bash
# Build Docker image
docker build -t pyramid-app:latest .

# Run container
docker run -d \
  --name pyramid-app \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  pyramid-app:latest
```

---

## MONITORING & MAINTENANCE

### View Logs
```bash
# PM2 logs
pm2 logs pyramid-app

# Real-time monitoring
pm2 monit

# Check disk space
df -h

# Check memory usage
free -h
```

### Restart Application
```bash
# Quick restart
pm2 restart pyramid-app

# Stop
pm2 stop pyramid-app

# Delete from PM2
pm2 delete pyramid-app
```

### Database Backup (Recommended)
```bash
# Manual backup from Supabase Dashboard
# Or use pg_dump through SSH tunnel:

pg_dump -h db.hcvmiblkklcrkwthraxw.supabase.co \
  -U postgres \
  -d postgres \
  > backup_$(date +%Y%m%d).sql

# Enter password: Arpit@881150
```

---

## TROUBLESHOOTING

### Application Won't Start
```bash
# Check for port conflicts
lsof -i :3000

# Check Node.js version
node --version

# Check npm modules
npm list

# Rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Connection Errors
```bash
# Test connection string
psql postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres

# Check environment variables are set
env | grep DATABASE_URL

# Check firewall
sudo ufw allow 5432
```

### Memory Issues
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Add to PM2 ecosystem
pm2 start npm --name "pyramid-app" --max-memory-restart 1G -- start
```

### Port Already in Use
```bash
# Find what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

---

## SECURITY CHECKLIST

- [ ] Database password changed from default
- [ ] Firewall rules configured
- [ ] SSH key authentication enabled
- [ ] SSL certificate installed
- [ ] Environment variables secured
- [ ] No sensitive data in git repository
- [ ] Regular backups enabled
- [ ] Admin credentials secured
- [ ] Rate limiting configured
- [ ] CORS properly configured

---

## PERFORMANCE OPTIMIZATION

### Nginx Caching
```nginx
# Add to Nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 10m;
    proxy_pass http://pyramid_app;
}
```

### Database Connection Pooling
Database already configured with:
- `max: 10` connections
- `idleTimeoutMillis: 30000`
- Automatic reconnection on failure

---

## DEPLOYMENT CHECKLIST

- [ ] Dependencies installed
- [ ] Build succeeds
- [ ] Environment variables set
- [ ] Database connection verified
- [ ] PM2 configured for auto-restart
- [ ] Nginx reverse proxy working
- [ ] SSL certificate installed
- [ ] Application accessible via domain
- [ ] Logs monitored and rotated
- [ ] Backups scheduled

---

**VPS Deployment Complete!** Your application is now running in production.
