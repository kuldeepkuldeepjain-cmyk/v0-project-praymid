# PYRAMID APPLICATION - MASTER DEPLOYMENT CHECKLIST

## 📌 YOUR SUPABASE DATABASE

```
Host:             db.hcvmiblkklcrkwthraxw.supabase.co
Port:             5432
Database:         postgres
Username:         postgres
Password:         Arpit@881150
Connection URL:   postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
```

**SAVE THIS SOMEWHERE SECURE**

---

## ✅ PHASE 1: IMMEDIATE ACTION ITEMS

### 1.1 Download Project Files
- [ ] Download project as ZIP
- [ ] Extract to your computer
- [ ] Navigate to project directory

### 1.2 Read Documentation (First-Time Only)
- [ ] Read: `START_HERE.md` (Most Important!)
- [ ] Read: `SETUP_SUMMARY.txt` (Quick Reference)
- [ ] Skim: `DATABASE_SETUP_GUIDE.md`

### 1.3 Execute Database Setup SQL
1. [ ] Go to https://app.supabase.com
2. [ ] Sign in to your account
3. [ ] Select your project
4. [ ] Click on "SQL Editor" in left sidebar
5. [ ] Click "New Query"
6. [ ] Open file: `DATABASE_SETUP.sql` (from this project)
7. [ ] Copy entire file contents
8. [ ] Paste into Supabase SQL editor
9. [ ] Click "RUN" button
10. [ ] Verify all statements execute successfully
11. [ ] You should see 13 tables created (no errors)

### 1.4 Verify Database Tables Created
- [ ] In Supabase, go to "Table Editor"
- [ ] Verify these tables exist:
  - [ ] participants
  - [ ] predictions
  - [ ] payment_submissions
  - [ ] payout_requests
  - [ ] contribution_ledger
  - [ ] topup_requests
  - [ ] transactions
  - [ ] activity_logs
  - [ ] invite_logs
  - [ ] mobile_verification_otps
  - [ ] notifications
  - [ ] wallet_pool
  - [ ] admin_users

---

## ✅ PHASE 2: LOCAL DEVELOPMENT SETUP

### 2.1 Create Environment File
```bash
# In project root:
cp .env.example .env.local
```

### 2.2 Edit .env.local
- [ ] Open `.env.local` in text editor
- [ ] Find the line: `DATABASE_URL=postgresql://...`
- [ ] Replace with:
  ```
  DATABASE_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
  ```
- [ ] Also update these variables (same value):
  - [ ] POSTGRES_URL
  - [ ] POSTGRES_URL_NON_POOLING
- [ ] Save file
- [ ] **IMPORTANT: Don't commit .env.local to git!**

### 2.3 Install Dependencies
```bash
npm install
```
- [ ] Wait for all packages to install
- [ ] Look for errors (should be none)
- [ ] Verify `node_modules` folder created

### 2.4 Build Project
```bash
npm run build
```
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] `.next` folder created
- [ ] All routes compiled

### 2.5 Test Local Development
```bash
npm run dev
```
- [ ] Application starts on http://localhost:3000
- [ ] No "database connection" errors
- [ ] Admin panel accessible at http://localhost:3000/admin
- [ ] Can view data in admin panel

### 2.6 Verify Database Connection
In browser console at http://localhost:3000:
- [ ] No database connection errors
- [ ] All API calls successful
- [ ] Data loads from database

---

## ✅ PHASE 3: PRODUCTION VPS SETUP

### 3.1 Prepare for Upload
- [ ] Read: `VPS_DEPLOYMENT_GUIDE.md`
- [ ] Ensure `.env.local` is in `.gitignore`
- [ ] Verify no sensitive data in git commits

### 3.2 Upload to VPS
Options:
- [ ] Option A: Git clone (if using GitHub)
  ```bash
  git clone https://github.com/your-repo/pyramid-app.git
  ```
- [ ] Option B: SCP/SFTP (if uploading ZIP)
  ```bash
  scp -r pyramid-app user@vps-ip:/home/user/
  ```
- [ ] Option C: Manual upload via hosting panel

### 3.3 SSH into VPS
```bash
ssh user@vps-ip
cd /path/to/pyramid-app
```
- [ ] Connected to VPS
- [ ] In correct directory
- [ ] Ready to configure

### 3.4 Create Environment File on VPS
```bash
cp .env.example .env.local
nano .env.local
```
- [ ] Add DATABASE_URL (same as local)
- [ ] Set other production values
- [ ] Save file

### 3.5 Install Dependencies on VPS
```bash
npm install
```
- [ ] All dependencies installed
- [ ] No errors
- [ ] `node_modules` created

### 3.6 Build on VPS
```bash
npm run build
```
- [ ] Build succeeds
- [ ] No errors
- [ ] `.next` folder created

### 3.7 Test Application on VPS
```bash
npm start
```
- [ ] Application starts
- [ ] Listening on port 3000
- [ ] Database connection successful
- [ ] No errors in output

### 3.8 Set Up PM2 (Recommended)
```bash
npm install -g pm2
pm2 start npm --name "pyramid" -- start
pm2 save
pm2 startup
```
- [ ] PM2 installed globally
- [ ] Application started with PM2
- [ ] PM2 configured for auto-restart
- [ ] Logs working

### 3.9 Configure Reverse Proxy (Nginx)
- [ ] Create Nginx configuration
- [ ] Point domain to VPS IP
- [ ] Configure SSL certificate
- [ ] Test domain access

### 3.10 Verify Production Access
```
https://your-domain.com
```
- [ ] Application loads via domain
- [ ] Admin panel accessible
- [ ] Database queries working
- [ ] No errors in logs

---

## ✅ PHASE 4: PRODUCTION HARDENING

### 4.1 Security
- [ ] Change default admin password
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Disable root SSH login
- [ ] Set up SSH key authentication

### 4.2 Backups
- [ ] Enable automatic backups in Supabase
- [ ] Schedule weekly manual backups
- [ ] Test restore procedure
- [ ] Document backup process

### 4.3 Monitoring
- [ ] Set up PM2 monitoring
- [ ] Configure error logging
- [ ] Enable error notifications
- [ ] Set up performance monitoring

### 4.4 Performance
- [ ] Enable caching headers
- [ ] Optimize database queries
- [ ] Configure CDN (optional)
- [ ] Monitor resource usage

### 4.5 Documentation
- [ ] Document all passwords securely
- [ ] Create deployment runbook
- [ ] Document backup procedures
- [ ] Create incident response plan

---

## ✅ PHASE 5: FINAL VERIFICATION

### 5.1 Functional Testing
- [ ] User registration works
- [ ] Login/authentication works
- [ ] Admin panel functions
- [ ] Participant dashboard loads
- [ ] Predictions system works
- [ ] Payments processing
- [ ] Payouts processing
- [ ] Referral system working

### 5.2 Data Integrity
- [ ] All 13 tables contain data
- [ ] Foreign key relationships work
- [ ] Soft deletes working
- [ ] Audit trail being recorded
- [ ] Data accuracy verified

### 5.3 Performance
- [ ] Page load times acceptable
- [ ] Database queries fast
- [ ] No timeout errors
- [ ] Memory usage stable
- [ ] CPU usage normal

### 5.4 Security
- [ ] No SQL injection vulnerabilities
- [ ] Password hashing working
- [ ] Session security active
- [ ] HTTPS/SSL working
- [ ] Rate limiting functional

### 5.5 Logging & Monitoring
- [ ] PM2 logs accessible
- [ ] Error logging working
- [ ] Performance metrics available
- [ ] Alert system functional

---

## 🔧 TROUBLESHOOTING

### Problem: "No database connection"
**Solution:**
1. Check DATABASE_URL in .env.local
2. Verify credentials are correct
3. Ensure DATABASE_SETUP.sql executed
4. Check firewall allows connection

### Problem: "Column does not exist"
**Solution:**
1. Run DATABASE_SETUP.sql in Supabase
2. Verify table structure in Supabase
3. Check table names match code

### Problem: "Connection refused"
**Solution:**
1. Verify database credentials
2. Check Supabase is online
3. Ensure VPS firewall allows outbound
4. Test connection: `psql postgresql://...`

### Problem: "Port already in use"
**Solution:**
```bash
lsof -i :3000
kill -9 <PID>
```

### Problem: "Out of memory"
**Solution:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

---

## 📚 IMPORTANT FILES REFERENCE

| File | Purpose | When to Use |
|------|---------|------------|
| DATABASE_SETUP.sql | Create all tables | First time only, in Supabase |
| .env.local | Environment config | Every environment, keep secure |
| .env.example | Config template | Reference only |
| START_HERE.md | Quick start guide | First time setup |
| SETUP_SUMMARY.txt | Quick reference | Anytime |
| VPS_DEPLOYMENT_GUIDE.md | Full VPS setup | VPS deployment |
| verify-setup.sh | Check setup status | Verify local setup |

---

## 📞 COMMON COMMANDS

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Run development server
npm run dev

# Run production server
npm start

# Verify database connection
npm run build && npm start

# Check PM2 status
pm2 status

# View PM2 logs
pm2 logs pyramid

# Restart application
pm2 restart pyramid

# Stop application
pm2 stop pyramid

# Delete from PM2
pm2 delete pyramid

# View disk space
df -h

# View memory usage
free -h

# Test database connection
psql postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
```

---

## ✨ SUCCESS INDICATORS

Your setup is **COMPLETE** when:
- ✅ All 13 database tables exist
- ✅ Application runs without errors
- ✅ Admin panel accessible
- ✅ Database queries working
- ✅ PM2 monitoring active (if using PM2)
- ✅ Domain accessible via HTTPS
- ✅ Backups configured
- ✅ Monitoring active

---

## 🎯 NEXT STEPS AFTER DEPLOYMENT

1. **Day 1-2:** Monitor application, check logs
2. **Day 3-7:** Load testing, performance optimization
3. **Week 2:** Security audit, penetration testing
4. **Month 1:** Analytics review, user feedback
5. **Ongoing:** Regular backups, monitoring, updates

---

## 📋 SIGN-OFF

- [ ] All checklist items completed
- [ ] Application in production
- [ ] Monitoring active
- [ ] Team notified
- [ ] Documentation updated

---

**Status:** READY FOR PRODUCTION ✅  
**Last Updated:** 2026-05-10  
**Database:** Supabase PostgreSQL  
**Application:** Pyramid v1.0
