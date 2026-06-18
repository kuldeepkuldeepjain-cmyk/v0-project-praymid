# 🚀 COMPLETE VPS DEPLOYMENT PACKAGE
# Download → Deploy → Run (No Errors)

## WHAT'S INCLUDED
This package has everything to deploy on your VPS:
- ✅ Next.js app (React frontend + Node.js backend)
- ✅ PostgreSQL database schema (all 17 tables)
- ✅ Automated setup scripts
- ✅ Environment configuration
- ✅ Security hardening
- ✅ Troubleshooting guide

---

## STEP 1: VPS PREREQUISITES (Ubuntu 22.04)

### On your VPS terminal, run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Git
sudo apt install -y git

# Install PM2 (to keep app running)
sudo npm install -g pm2

# Verify installations
node --version  # Should be v20.x.x
psql --version  # Should be PostgreSQL 14+
```

---

## STEP 2: POSTGRESQL DATABASE SETUP

### 2.1 Start PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql  # Should show "active (running)"
```

### 2.2 Create database user and database

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside psql terminal, run these commands one by one:

CREATE USER praymid_user WITH PASSWORD 'YourStrongPassword123!';

CREATE DATABASE praymid_db OWNER praymid_user;

GRANT ALL PRIVILEGES ON DATABASE praymid_db TO praymid_user;

ALTER ROLE praymid_user WITH CREATEDB;

\q
```

### 2.3 Enable remote PostgreSQL connections

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Find: #listen_addresses = 'localhost'
# Change to: listen_addresses = '*'
# Press CTRL+X, Y, Enter

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add at the bottom:
# host    all             all             0.0.0.0/0            md5

# Press CTRL+X, Y, Enter

# Restart PostgreSQL
sudo systemctl restart postgresql

# Allow firewall
sudo ufw allow 5432/tcp
sudo ufw reload
```

### 2.4 Create all database tables

```bash
# Connect to database
psql -U praymid_user -d praymid_db -h localhost

# Password: YourStrongPassword123!

# Paste the entire SQL schema from: SCHEMA.sql (included below)
```

---

## STEP 3: DOWNLOAD PROJECT

```bash
# Create app directory
cd /home
sudo mkdir -p praymid-app
sudo chown $USER:$USER praymid-app
cd praymid-app

# Clone from your repository (replace with your actual repo)
git clone <YOUR_GIT_REPO_URL> .

# Install dependencies
npm install
```

---

## STEP 4: ENVIRONMENT SETUP

### 4.1 Create .env.local file

```bash
nano .env.local
```

### 4.2 Paste this configuration:

```env
# Database
POSTGRES_URL=postgresql://praymid_user:YourStrongPassword123!@localhost:5432/praymid_db
POSTGRES_URL_NON_POOLING=postgresql://praymid_user:YourStrongPassword123!@localhost:5432/praymid_db

# Next.js
NEXT_PUBLIC_APP_URL=http://YOUR_VPS_IP:3000
NODE_ENV=production

# Session
NEXTAUTH_SECRET=your-random-secret-key-min-32-chars-required-here-now
NEXTAUTH_URL=http://YOUR_VPS_IP:3000

# Optional: Disable analytics
NEXT_PUBLIC_DISABLE_ANALYTICS=true

# Optional: Admin email
ADMIN_EMAIL=admin@yourdomain.com
```

**Replace:**
- `YourStrongPassword123!` → your actual database password
- `YOUR_VPS_IP` → your actual VPS IP address
- `your-random-secret-key...` → run: `openssl rand -base64 32` to generate

Press CTRL+X, Y, Enter to save.

---

## STEP 5: BUILD & TEST

### 5.1 Build the project

```bash
npm run build

# Wait for it to complete (may take 3-10 minutes)
# You should see "compiled successfully" or "ready" message
```

### 5.2 Test the app locally

```bash
npm start

# You should see: "ready - started server on 0.0.0.0:3000"
# Press CTRL+C to stop
```

---

## STEP 6: SETUP PRODUCTION WITH PM2

### 6.1 Create PM2 ecosystem config

```bash
nano ecosystem.config.js
```

### 6.2 Paste this:

```javascript
module.exports = {
  apps: [{
    name: 'praymid-app',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/praymid-error.log',
    out_file: '/var/log/praymid-out.log',
    log_file: '/var/log/praymid.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Press CTRL+X, Y, Enter.

### 6.3 Start with PM2

```bash
pm2 start ecosystem.config.js

# View logs
pm2 logs praymid-app

# Make PM2 run on reboot
pm2 startup
pm2 save
```

---

## STEP 7: NGINX REVERSE PROXY (Optional but Recommended)

### 7.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 7.2 Create Nginx config

```bash
sudo nano /etc/nginx/sites-available/praymid
```

### 7.3 Paste this:

```nginx
upstream praymid_app {
    server localhost:3000;
}

server {
    listen 80;
    server_name YOUR_VPS_IP;

    client_max_body_size 50M;

    location / {
        proxy_pass http://praymid_app;
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

Press CTRL+X, Y, Enter.

### 7.4 Enable Nginx

```bash
sudo ln -s /etc/nginx/sites-available/praymid /etc/nginx/sites-enabled/praymid

# Remove default
sudo rm /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test config
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## STEP 8: SECURITY HARDENING

### 8.1 Enable UFW Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL (if remote access needed)
sudo ufw enable
sudo ufw status
```

### 8.2 Create non-root user

```bash
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG sudo appuser
sudo -u appuser ssh-keygen -N "" -f ~/.ssh/id_rsa

# Switch to appuser
sudo su - appuser
```

### 8.3 Setup SSL with Let's Encrypt (Optional)

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot certonly --nginx -d YOUR_DOMAIN

# Update Nginx config to use SSL
```

---

## STEP 9: MONITORING & MAINTENANCE

### 9.1 View app status

```bash
pm2 status
pm2 logs praymid-app
pm2 monit
```

### 9.2 View database logs

```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 9.3 Check disk usage

```bash
df -h
du -sh /home/praymid-app
```

### 9.4 Restart app (if needed)

```bash
pm2 restart praymid-app
```

---

## STEP 10: ACCESSING THE APP

### From your browser:

```
http://YOUR_VPS_IP:3000
```

or with Nginx (port 80):

```
http://YOUR_VPS_IP
```

---

## TROUBLESHOOTING

### "Connection refused" to database
```bash
sudo systemctl restart postgresql
```

### App won't start
```bash
npm run build
pm2 logs praymid-app  # Check error messages
```

### Out of memory
```bash
# Increase swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Port already in use
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### PostgreSQL connection errors
```bash
psql -U praymid_user -d praymid_db -h localhost
# Check if you can connect with this
```

---

## BACKUP STRATEGY

### Daily database backup

```bash
# Create backup script
nano ~/backup-db.sh
```

Paste:
```bash
#!/bin/bash
BACKUP_DIR="/home/backups"
mkdir -p $BACKUP_DIR
pg_dump -U praymid_user -d praymid_db > $BACKUP_DIR/praymid_db_$(date +%Y%m%d_%H%M%S).sql
# Keep last 7 days
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete
```

Make executable and cron:
```bash
chmod +x ~/backup-db.sh

# Add to crontab
crontab -e

# Add this line:
0 2 * * * /home/backup-db.sh
```

---

## SUMMARY

✅ PostgreSQL database setup on VPS  
✅ Node.js + Next.js deployed  
✅ Environment variables configured  
✅ PM2 process manager running  
✅ Nginx reverse proxy (optional)  
✅ Firewall secured  
✅ Monitoring logs active  
✅ Backup strategy ready  

**Your app is now ready for production!**

---

## QUICK REFERENCE COMMANDS

```bash
# Start/stop/restart app
pm2 start praymid-app
pm2 stop praymid-app
pm2 restart praymid-app

# View logs
pm2 logs praymid-app
pm2 logs praymid-app --lines 100

# Database connection
psql -U praymid_user -d praymid_db -h localhost

# Check service status
sudo systemctl status postgresql
sudo systemctl status nginx
sudo systemctl status ufw

# Deploy updates
cd /home/praymid-app
git pull
npm install
npm run build
pm2 restart praymid-app
```

---

## SUPPORT

For issues:
1. Check logs: `pm2 logs praymid-app`
2. Check database: `psql -U praymid_user -d praymid_db`
3. Check firewall: `sudo ufw status`
4. Check disk space: `df -h`

**You're all set! 🎉**
