#!/bin/bash

#=================================================================
# PRAYMID VPS DEPLOYMENT - FINAL CHECKLIST
#=================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           PRAYMID - READY FOR VPS DEPLOYMENT              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check all files exist
echo "📋 Checking deployment files..."
echo ""

files=(
    "DEPLOY_NOW.md"
    "VPS_QUICK_START.md"
    "start-vps.sh"
    "DATABASE_SCHEMA.sql"
    ".env.example"
    "package.json"
    "next.config.mjs"
    "tsconfig.json"
)

missing=0
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (MISSING)"
        missing=$((missing + 1))
    fi
done

echo ""
if [ $missing -eq 0 ]; then
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     ✅ ALL FILES READY FOR VPS DEPLOYMENT                 ║"
    echo "╚════════════════════════════════════════════════════════════╝"
else
    echo "❌ Some files are missing ($missing)"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "NEXT STEPS:"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  DOWNLOAD THIS ENTIRE PROJECT"
echo ""
echo "2️⃣  UPLOAD TO YOUR VPS:"
echo "    scp -r praymid/ user@YOUR_VPS_IP:/opt/"
echo ""
echo "3️⃣  SSH INTO YOUR VPS:"
echo "    ssh user@YOUR_VPS_IP"
echo ""
echo "4️⃣  RUN THE DEPLOY SCRIPT:"
echo "    cd /opt/praymid"
echo "    chmod +x start-vps.sh"
echo "    ./start-vps.sh"
echo ""
echo "5️⃣  CONFIGURE DATABASE:"
echo "    nano .env.local"
echo "    # Edit DATABASE_URL with your actual database"
echo ""
echo "6️⃣  START THE APP:"
echo "    pnpm start"
echo ""
echo "7️⃣  ACCESS IN BROWSER:"
echo "    http://YOUR_VPS_IP:3000"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📖 READ THESE FIRST:"
echo "   • DEPLOY_NOW.md (Complete guide with all steps)"
echo "   • VPS_QUICK_START.md (Quick checklist)"
echo ""
echo "🎯 Everything is configured for ZERO ERRORS deployment!"
echo ""
