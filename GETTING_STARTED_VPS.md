# 🚀 PRAYMID VPS DEPLOYMENT — GETTING STARTED

## Everything You Need to Deploy to Your VPS

This project is **100% ready for VPS deployment**. Follow one of the paths below:

---

## ⚡ FASTEST PATH (5-10 Minutes)

### For beginners who want automated setup:

```bash
# 1. SSH into your VPS
ssh root@YOUR_VPS_IP

# 2. Download project
cd /home
git clone <YOUR_REPO_URL> praymid-app
cd praymid-app

# 3. Run automated setup (does everything for you)
chmod +x setup-vps.sh
./setup-vps.sh

# 4. Update environment file
nano .env.local
# Change the password to match your database password from setup

# 5. Build and start
npm install
npm run build
pm2 start ecosystem.config.js

# 6. Access your app
# Open browser: http://YOUR_VPS_IP:3000
```

---

## 📖 DETAILED PATH (Step-by-step)

Read: **VPS_DEPLOYMENT_COMPLETE.md**

This file has 10 detailed sections covering:
- System setup
- PostgreSQL installation
- Database creation
- Environment variables
- Build & test
- PM2 process manager
- Nginx reverse proxy
- Security hardening
- Monitoring
- Troubleshooting

---

## 📚 REFERENCE GUIDES

| File | Purpose |
|------|---------|
| **VPS_DEPLOYMENT_COMPLETE.md** | Full step-by-step deployment guide |
| **DATABASE_SCHEMA.sql** | All 17 database tables (copy-paste into SQL editor) |
| **setup-vps.sh** | Automated setup script |
| **README_VPS_DEPLOYMENT.md** | Quick reference for common commands |
| **PRODUCTION_SETUP.md** | Production checklist |

---

## 🎯 WHAT'S INCLUDED

### Backend
- ✅ Next.js 16 server (Node.js)
- ✅ API routes for all functionality
- ✅ Authentication system
- ✅ Session management

### Frontend
- ✅ Participant dashboard
- ✅ Admin dashboard  
- ✅ Responsive design
- ✅ Real-time updates

### Database
- ✅ PostgreSQL 14+
- ✅ 17 pre-designed tables
- ✅ Indexes for performance
- ✅ Foreign keys for data integrity

### Deployment
- ✅ PM2 process manager
- ✅ Nginx reverse proxy
- ✅ UFW firewall rules
- ✅ Environment configuration
- ✅ Automated backups

---

## 🔑 CRITICAL FILES FOR YOU

### 1. **setup-vps.sh** (Automated Setup)
```bash
chmod +x setup-vps.sh
./setup-vps.sh
```
This installs everything automatically.

### 2. **DATABASE_SCHEMA.sql** (Database Tables)
Paste this into your PostgreSQL editor to create all tables:
```bash
psql -U praymid_user -d praymid_db < DATABASE_SCHEMA.sql
```

### 3. **.env.local** (Configuration)
Create after setup with your credentials:
```env
POSTGRES_URL=postgresql://praymid_user:PASSWORD@localhost:5432/praymid_db
NODE_ENV=production
NEXTAUTH_SECRET=your-secret-key-here
```

### 4. **ecosystem.config.js** (Process Manager)
Already included. Start your app with:
```bash
pm2 start ecosystem.config.js
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] VPS running Ubuntu 22.04
- [ ] Have VPS IP address & password ready
- [ ] Have git repository URL ready
- [ ] Generated NEXTAUTH_SECRET (`openssl rand -base64 32`)

### During Setup
- [ ] SSH connected to VPS
- [ ] Ran `./setup-vps.sh` successfully
- [ ] All dependencies installed
- [ ] Database created
- [ ] Tables created
- [ ] Environment file (.env.local) created

### Post-Deployment
- [ ] App built with `npm run build`
- [ ] App started with `pm2 start ecosystem.config.js`
- [ ] Accessible at `http://YOUR_VPS_IP:3000`
- [ ] Can login with default admin account
- [ ] Changed default admin password

---

## ⚠️ DEFAULT CREDENTIALS

After setup, log in to admin panel with:

**Email:** admin@praymid.com  
**Password:** AdminPass123!

**⚠️ CHANGE IMMEDIATELY!**

---

## 🛠️ TROUBLESHOOTING QUICK FIX

### App won't start
```bash
pm2 logs praymid-app      # Check error
npm run build             # Rebuild
pm2 restart praymid-app   # Restart
```

### Can't connect to database
```bash
psql -U praymid_user -d praymid_db -h localhost
# If this works, database is fine
```

### Port already in use
```bash
lsof -i :3000
kill -9 <PID>
```

### Out of memory
```bash
pm2 list      # Check memory
free -h       # Check system RAM
# Increase swap if needed
```

---

## 📊 PROJECT STRUCTURE

```
praymid/
├── app/                          # Next.js app
│   ├── api/                      # Backend routes
│   │   ├── admin/               # Admin APIs
│   │   └── participant/         # Participant APIs
│   ├── admin/                    # Admin dashboard
│   ├── participant/              # Participant dashboard
│   └── layout.tsx               # Root layout
├── components/                   # React components
├── lib/                          # Utilities
├── public/                       # Static files
├── ecosystem.config.js          # PM2 config
├── setup-vps.sh                 # Setup script
├── DATABASE_SCHEMA.sql          # SQL schema
├── VPS_DEPLOYMENT_COMPLETE.md   # Full guide
└── package.json                 # Dependencies
```

---

## 🚀 COMMANDS YOU'LL USE

```bash
# Initial setup
npm install                 # Install dependencies
npm run build              # Build for production

# Starting/stopping
pm2 start ecosystem.config.js    # Start app
pm2 restart praymid-app          # Restart app
pm2 stop praymid-app             # Stop app
pm2 delete praymid-app           # Remove app

# Monitoring
pm2 logs praymid-app       # View logs
pm2 list                   # Show running apps
pm2 monit                  # Monitor resources

# Database
psql -U praymid_user -d praymid_db

# System
sudo systemctl status postgresql   # Check DB
sudo systemctl restart postgresql  # Restart DB
```

---

## 📞 IF SOMETHING GOES WRONG

### 1. Check logs
```bash
pm2 logs praymid-app
```

### 2. Check database connection
```bash
psql -U praymid_user -d praymid_db -h localhost
```

### 3. Check system resources
```bash
free -h          # RAM
df -h            # Disk space
top              # Running processes
```

### 4. Restart everything
```bash
sudo systemctl restart postgresql
pm2 restart praymid-app
```

### 5. Read the detailed guide
See: **VPS_DEPLOYMENT_COMPLETE.md** for complete troubleshooting

---

## 💡 PRO TIPS

### Backup your database daily
```bash
pg_dump -U praymid_user -d praymid_db > backup.sql
```

### Update your app
```bash
git pull origin main
npm install
npm run build
pm2 restart praymid-app
```

### Monitor disk space
```bash
df -h
du -sh /home/praymid-app
```

### View recent errors
```bash
pm2 logs praymid-app --err | tail -50
```

---

## ✅ YOU'RE READY!

Everything is configured. Just follow the FASTEST PATH above and your app will be running in minutes.

**Questions?** Check the detailed guide files included in this project.

**Let's deploy!** 🎉
