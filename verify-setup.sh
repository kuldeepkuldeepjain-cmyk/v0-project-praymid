#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo "PYRAMID APPLICATION - SETUP VERIFICATION"
echo "================================"
echo ""

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    exit 1
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check if .env.local exists
echo -n "Checking .env.local... "
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${YELLOW}⚠${NC} Not found (copy from .env.example)"
fi

# Check if DATABASE_URL is set
echo -n "Checking DATABASE_URL... "
if grep -q "DATABASE_URL=" .env.local 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Set"
else
    echo -e "${RED}✗ Not set in .env.local${NC}"
fi

# Check if node_modules exists
echo -n "Checking dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Installed"
else
    echo -e "${YELLOW}⚠${NC} Not installed (run: npm install)"
fi

# Check if .next exists
echo -n "Checking build... "
if [ -d ".next" ]; then
    echo -e "${GREEN}✓${NC} Built"
else
    echo -e "${YELLOW}⚠${NC} Not built (run: npm run build)"
fi

# Check DATABASE_SETUP.sql exists
echo -n "Checking DATABASE_SETUP.sql... "
if [ -f "DATABASE_SETUP.sql" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${RED}✗ Not found${NC}"
fi

# Check setup guides
echo -n "Checking documentation... "
DOCS_FOUND=0
for doc in "SETUP_SUMMARY.txt" "DATABASE_SETUP_GUIDE.md" "VPS_DEPLOYMENT_GUIDE.md" "COMPLETE_SETUP_README.md"; do
    if [ -f "$doc" ]; then
        DOCS_FOUND=$((DOCS_FOUND + 1))
    fi
done
if [ $DOCS_FOUND -gt 0 ]; then
    echo -e "${GREEN}✓${NC} ($DOCS_FOUND docs found)"
else
    echo -e "${YELLOW}⚠${NC} No documentation found"
fi

echo ""
echo "================================"
echo "SETUP READINESS SUMMARY"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Execute DATABASE_SETUP.sql in Supabase SQL Editor"
echo "2. Copy .env.example to .env.local"
echo "3. Run: npm install"
echo "4. Run: npm run build"
echo "5. Run: npm run dev (local) or npm start (production)"
echo ""
echo "For detailed instructions, read: START_HERE.md"
echo ""

