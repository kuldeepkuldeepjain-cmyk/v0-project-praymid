#!/bin/bash

#=================================================================
# PRAYMID - VPS STARTUP SCRIPT
# Run this after downloading the project to your VPS
#=================================================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PRAYMID - VPS STARTUP & VERIFICATION                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Node.js
echo "[1/5] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Install Node.js 18+ first.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"

# Step 2: Check pnpm
echo "[2/5] Checking package manager..."
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}! pnpm not found, installing...${NC}"
    npm install -g pnpm
fi
PNPM_VERSION=$(pnpm -v)
echo -e "${GREEN}✓ pnpm $PNPM_VERSION${NC}"

# Step 3: Install dependencies
echo "[3/5] Installing dependencies..."
pnpm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 4: Check .env.local
echo "[4/5] Checking environment configuration..."
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}! .env.local not found${NC}"
    echo "Creating .env.local from template..."
    
    # Check if .env.example exists
    if [ -f .env.example ]; then
        cp .env.example .env.local
        echo -e "${YELLOW}⚠ Created .env.local from .env.example${NC}"
        echo -e "${YELLOW}⚠ IMPORTANT: Edit .env.local with your actual database URL and settings!${NC}"
        echo ""
        echo "To edit .env.local:"
        echo "  nano .env.local"
        echo ""
    else
        echo -e "${RED}✗ No .env.example found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env.local exists${NC}"
    
    # Check if DATABASE_URL is set
    if grep -q "DATABASE_URL=postgresql://" .env.local; then
        echo -e "${GREEN}✓ DATABASE_URL is configured${NC}"
    else
        echo -e "${YELLOW}⚠ DATABASE_URL might not be configured properly${NC}"
    fi
fi

# Step 5: Build the application
echo "[5/5] Building application..."
pnpm run build
echo -e "${GREEN}✓ Build successful${NC}"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ SETUP COMPLETE!                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. EDIT CONFIGURATION:"
echo "   nano .env.local"
echo ""
echo "2. ADD YOUR DATABASE:"
echo "   Update DATABASE_URL with your actual PostgreSQL connection"
echo ""
echo "3. RUN THE APPLICATION:"
echo "   pnpm start"
echo ""
echo "4. ACCESS THE APP:"
echo "   http://YOUR_VPS_IP:3000"
echo ""
echo "For production deployment, use PM2:"
echo "   npm install -g pm2"
echo "   pm2 start 'pnpm start' --name praymid"
echo "   pm2 startup"
echo "   pm2 save"
echo ""
