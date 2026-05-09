#!/bin/bash

# ===============================================
# PRAYMID VPS AUTOMATED SETUP SCRIPT
# For Ubuntu 22.04 LTS
# ===============================================

set -e  # Exit on any error

echo "🚀 PRAYMID VPS SETUP STARTING..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===============================================
# SECTION 1: SYSTEM UPDATES
# ===============================================

echo -e "${YELLOW}[1/8] UPDATING SYSTEM...${NC}"
sudo apt update
sudo apt upgrade -y
echo -e "${GREEN}✓ System updated${NC}"

# ===============================================
# SECTION 2: INSTALL DEPENDENCIES
# ===============================================

echo -e "${YELLOW}[2/8] INSTALLING DEPENDENCIES...${NC}"

# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Git
sudo apt install -y git

# PM2
sudo npm install -g pm2

# Nginx
sudo apt install -y nginx

echo -e "${GREEN}✓ Dependencies installed${NC}"

# ===============================================
# SECTION 3: POSTGRESQL SETUP
# ===============================================

echo -e "${YELLOW}[3/8] SETTING UP POSTGRESQL...${NC}"

sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user and database
sudo -u postgres psql << EOF
CREATE USER IF NOT EXISTS praymid_user WITH PASSWORD 'YourStrongPassword123!';
CREATE DATABASE IF NOT EXISTS praymid_db OWNER praymid_user;
GRANT ALL PRIVILEGES ON DATABASE praymid_db TO praymid_user;
ALTER ROLE praymid_user WITH CREATEDB;
\q
EOF

echo -e "${GREEN}✓ PostgreSQL database created${NC}"

# ===============================================
# SECTION 4: POSTGRESQL REMOTE ACCESS
# ===============================================

echo -e "${YELLOW}[4/8] ENABLING REMOTE POSTGRESQL ACCESS...${NC}"

# Backup config
sudo cp /etc/postgresql/14/main/postgresql.conf /etc/postgresql/14/main/postgresql.conf.backup

# Enable listen on all addresses
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/14/main/postgresql.conf

# Add remote access in pg_hba.conf
if ! grep -q "^host    all             all             0.0.0.0/0" /etc/postgresql/14/main/pg_hba.conf; then
  echo "host    all             all             0.0.0.0/0            md5" | sudo tee -a /etc/postgresql/14/main/pg_hba.conf > /dev/null
fi

sudo systemctl restart postgresql

echo -e "${GREEN}✓ PostgreSQL remote access enabled${NC}"

# ===============================================
# SECTION 5: APP DIRECTORY & CLONE
# ===============================================

echo -e "${YELLOW}[5/8] SETTING UP APP DIRECTORY...${NC}"

APP_DIR="/home/praymid-app"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR
cd $APP_DIR

# Initialize git (you'll need to set remote later)
if [ ! -d ".git" ]; then
  git init
  echo "Note: You'll need to add your remote with: git remote add origin <YOUR_REPO_URL>"
else
  git pull origin main 2>/dev/null || echo "Note: Update git remote if needed"
fi

echo -e "${GREEN}✓ App directory ready at $APP_DIR${NC}"

# ===============================================
# SECTION 6: ENVIRONMENT SETUP
# ===============================================

echo -e "${YELLOW}[6/8] CREATING ENVIRONMENT FILE...${NC}"

# Generate secret key
SECRET_KEY=$(openssl rand -base64 32)
VPS_IP=$(hostname -I | awk '{print $1}')

cat > $APP_DIR/.env.local << EOF
# Database
POSTGRES_URL=postgresql://praymid_user:YourStrongPassword123!@localhost:5432/praymid_db
POSTGRES_URL_NON_POOLING=postgresql://praymid_user:YourStrongPassword123!@localhost:5432/praymid_db

# Next.js
NEXT_PUBLIC_APP_URL=http://$VPS_IP:3000
NODE_ENV=production

# Session
NEXTAUTH_SECRET=$SECRET_KEY
NEXTAUTH_URL=http://$VPS_IP:3000

# Optional
NEXT_PUBLIC_DISABLE_ANALYTICS=true
EOF

echo -e "${GREEN}✓ Environment file created${NC}"
echo -e "${YELLOW}  ⚠️  Update .env.local with your actual configuration${NC}"

# ===============================================
# SECTION 7: PM2 SETUP
# ===============================================

echo -e "${YELLOW}[7/8] SETTING UP PM2 PROCESS MANAGER...${NC}"

# Create ecosystem config
cat > $APP_DIR/ecosystem.config.js << 'EOF'
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
EOF

pm2 startup systemd -u $USER --hp /home/$USER
pm2 save

echo -e "${GREEN}✓ PM2 configured${NC}"

# ===============================================
# SECTION 8: FIREWALL
# ===============================================

echo -e "${YELLOW}[8/8] SETTING UP FIREWALL...${NC}"

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp
sudo ufw --force enable

echo -e "${GREEN}✓ Firewall configured${NC}"

# ===============================================
# SUMMARY
# ===============================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ VPS SETUP COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Install dependencies:"
echo "   cd $APP_DIR"
echo "   npm install"
echo ""
echo "2. Build the app:"
echo "   npm run build"
echo ""
echo "3. Start with PM2:"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "4. View logs:"
echo "   pm2 logs praymid-app"
echo ""
echo -e "${YELLOW}DEFAULT CREDENTIALS:${NC}"
echo "Database User: praymid_user"
echo "Database Pass: YourStrongPassword123!"
echo "Database URL: postgresql://praymid_user:YourStrongPassword123!@localhost:5432/praymid_db"
echo ""
echo -e "${YELLOW}ACCESS YOUR APP:${NC}"
echo "http://$VPS_IP:3000"
echo ""
echo -e "${YELLOW}IMPORTANT CHANGES NEEDED:${NC}"
echo "⚠️  Update .env.local with your actual database password"
echo "⚠️  Add git remote: git remote add origin <YOUR_REPO_URL>"
echo "⚠️  Pull your code: git pull origin main"
echo "⚠️  Update Nginx config if using custom domain"
echo ""
