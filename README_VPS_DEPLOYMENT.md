# 🚀 Praymid - VPS Ready to Deploy

This project is **fully configured for VPS deployment** with zero errors.

## What's Included

✅ **Next.js 16** — React frontend + API routes  
✅ **PostgreSQL** — Full database schema with 17 tables  
✅ **Authentication** — Participant & Admin login  
✅ **Payment System** — Crypto contributions & payouts  
✅ **Admin Dashboard** — Full management interface  
✅ **Email/OTP** — Two-factor authentication  
✅ **Automated Setup** — One-click VPS deployment  

---

## 🎯 QUICK START (5 Minutes)

### Option 1: Automated Setup (Recommended)

```bash
# Download this project
git clone <YOUR_REPO_URL>
cd praymid

# Make setup script executable
chmod +x setup-vps.sh

# Run automated setup (requires sudo)
./setup-vps.sh
```

This will automatically:
- Update system packages
- Install Node.js, PostgreSQL, Nginx, PM2
- Create database and tables
- Set up environment variables
- Configure firewall
- Start the application

### Option 2: Manual Setup

Follow the detailed guide: **VPS_DEPLOYMENT_COMPLETE.md**

---

## 📋 Requirements

- **VPS:** Ubuntu 22.04 LTS or later
- **RAM:** Minimum 2GB (4GB recommended)
- **Disk:** Minimum 20GB
- **Node.js:** v18+ (automatically installed)
- **PostgreSQL:** 14+ (automatically installed)

---

## 🔧 Environment Variables

After setup, edit `.env.local`:

```env
POSTGRES_URL=postgresql://praymid_user:YOUR_PASSWORD@localhost:5432/praymid_db
POSTGRES_URL_NON_POOLING=postgresql://praymid_user:YOUR_PASSWORD@localhost:5432/praymid_db
NEXT_PUBLIC_APP_URL=http://YOUR_VPS_IP:3000
NODE_ENV=production
NEXTAUTH_SECRET=your-secret-key-32-chars-or-more
NEXTAUTH_URL=http://YOUR_VPS_IP:3000
```

---

## 🚀 Deployment Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs praymid-app

# Monitor
pm2 monit

# Restart
pm2 restart praymid-app

# Stop
pm2 stop praymid-app
```

---

## 🌐 Access Your App

After deployment:
```
http://YOUR_VPS_IP:3000
```

Or with Nginx:
```
http://YOUR_VPS_IP
```

---

## 📚 Documentation

- **VPS_DEPLOYMENT_COMPLETE.md** — Full step-by-step guide
- **VPS_DATABASE_SETUP_GUIDE.md** — Database setup only
- **PRODUCTION_SETUP.md** — Production checklist

---

## 🔐 Default Admin Account

**Email:** admin@praymid.com  
**Password:** AdminPass123!

⚠️ **Change this immediately after first login!**

---

## 🛠️ Troubleshooting

### App won't start
```bash
npm run build
pm2 logs praymid-app  # Check error
```

### Database connection error
```bash
psql -U praymid_user -d praymid_db -h localhost
# Try connecting manually to verify
```

### Port already in use
```bash
lsof -i :3000  # Find what's using port 3000
```

### Out of memory
```bash
pm2 list  # Check memory usage
free -h   # Check system memory
```

### PostgreSQL won't start
```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

---

## 📊 File Structure

```
praymid/
├── app/                      # Next.js app directory
│   ├── api/                  # Backend API routes
│   ├── participant/          # Participant dashboard
│   ├── admin/                # Admin dashboard
│   └── layout.tsx            # Root layout
├── components/               # React components
├── lib/                      # Utilities & helpers
├── public/                   # Static files
├── .env.local               # Environment variables (create after setup)
├── ecosystem.config.js      # PM2 configuration
├── package.json             # Dependencies
├── setup-vps.sh            # Automated setup script
└── VPS_DEPLOYMENT_COMPLETE.md  # Full deployment guide
```

---

## 🗄️ Database Tables

The project uses 17 PostgreSQL tables:

1. **participants** — User accounts
2. **topup_requests** — Wallet top-ups
3. **payment_submissions** — Contribution proofs
4. **payout_requests** — Withdrawal requests
5. **transactions** — Account ledger
6. **wallet_pool** — Crypto wallets
7. **predictions** — Crypto trading
8. **notifications** — In-app alerts
9. **activity_logs** — User activity
10. **audit_logs** — Admin actions
11. **invite_logs** — Referral tracking
12. **mobile_verification_otps** — OTP storage
13. **p2p_transactions** — Peer-to-peer transfers
14. **support_tickets** — Customer support
15. **gas_approvals** — Gas fee tracking
16. **system_settings** — Global settings
17. **referrals** — Referral tracking

All tables are created automatically during setup.

---

## 🔄 Updating Your App

After deploying, to update your code:

```bash
cd /home/praymid-app

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Build
npm run build

# Restart
pm2 restart praymid-app
```

---

## 📱 Features

### For Participants
- ✅ Registration with OTP verification
- ✅ Profile management
- ✅ Wallet balance top-up
- ✅ Contribution submission with proof
- ✅ Payout requests
- ✅ P2P fund transfers
- ✅ Activity history
- ✅ Referral tracking

### For Admins
- ✅ Dashboard overview
- ✅ Manage participants
- ✅ Approve/reject contributions
- ✅ Approve/reject payouts
- ✅ Top-up request review
- ✅ System settings
- ✅ Activity audit logs
- ✅ User management

---

## 🆘 Need Help?

### Check logs first
```bash
pm2 logs praymid-app
```

### Database issues
```bash
psql -U praymid_user -d praymid_db
```

### System status
```bash
pm2 status
sudo systemctl status postgresql
sudo systemctl status nginx
```

---

## ✅ Deployment Checklist

- [ ] VPS created and running Ubuntu 22.04
- [ ] Downloaded project code
- [ ] Ran `./setup-vps.sh`
- [ ] Updated `.env.local` with correct credentials
- [ ] Built with `npm run build`
- [ ] Started with `pm2 start ecosystem.config.js`
- [ ] Accessed app at `http://YOUR_VPS_IP:3000`
- [ ] Changed default admin password
- [ ] Set up SSL certificate (optional but recommended)
- [ ] Configured backup strategy
- [ ] Tested full user flow

---

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review logs with `pm2 logs praymid-app`
3. Verify database connection
4. Check firewall rules with `sudo ufw status`

---

**Your app is ready to deploy! 🎉**

Deploy with confidence using the provided setup script and guides.
