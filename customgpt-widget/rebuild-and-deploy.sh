#!/bin/bash

# Avatar Mode Button Fix - Rebuild and Deploy Script
# This script ensures all fixes are deployed by rebuilding the Docker image

set -e  # Exit on error

echo "============================================================"
echo "CustomGPT Widget - Avatar Button Fix Deployment"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verify we're in the right directory
echo -e "${YELLOW}[1/6] Verifying project directory...${NC}"
if [ ! -f "package.json" ] && [ ! -f "frontend/package.json" ]; then
    echo -e "${RED}Error: Not in project root directory${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Project directory verified${NC}"
echo ""

# Step 2: Stop and remove old containers
echo -e "${YELLOW}[2/6] Stopping old containers...${NC}"
OLD_CONTAINERS=$(docker ps -a --filter "label=created_by=customgpt_widget_script" --format "{{.ID}}" 2>/dev/null || true)
if [ ! -z "$OLD_CONTAINERS" ]; then
    echo "Found old containers: $OLD_CONTAINERS"
    docker stop $OLD_CONTAINERS 2>/dev/null || true
    docker rm $OLD_CONTAINERS 2>/dev/null || true
    echo -e "${GREEN}✓ Old containers removed${NC}"
else
    echo "No old containers found"
fi
echo ""

# Step 3: Verify critical fixes are in source code
echo -e "${YELLOW}[3/6] Verifying fixes in source code...${NC}"

# Check Canvas.tsx for pointer-events
if grep -q "pointerEvents: 'none'" frontend/src/Canvas.tsx; then
    echo -e "${GREEN}✓ Canvas.tsx: pointer-events fix present${NC}"
else
    echo -e "${RED}✗ Canvas.tsx: pointer-events fix MISSING${NC}"
    exit 1
fi

# Check AvatarMode.css for position fixed
if grep -q "position: fixed" frontend/src/components/AvatarMode.css; then
    echo -e "${GREEN}✓ AvatarMode.css: position fix present${NC}"
else
    echo -e "${RED}✗ AvatarMode.css: position fix MISSING${NC}"
    exit 1
fi

# Check index.css for mode-toggle-button
if grep -q ".mode-toggle-button" frontend/src/index.css; then
    echo -e "${GREEN}✓ index.css: button styles present${NC}"
else
    echo -e "${RED}✗ index.css: button styles MISSING${NC}"
    exit 1
fi

echo ""

# Step 4: Rebuild Docker image with no cache
echo -e "${YELLOW}[4/6] Building fresh Docker image (this may take 2-3 minutes)...${NC}"
docker build --no-cache -t customgpt-widget . || {
    echo -e "${RED}Error: Docker build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Docker image built successfully${NC}"
echo ""

# Step 5: Load environment variables
echo -e "${YELLOW}[5/6] Loading environment variables...${NC}"
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo -e "${GREEN}✓ Environment variables loaded from .env${NC}"
else
    echo -e "${YELLOW}⚠ No .env file found, using existing environment variables${NC}"
fi

# Verify required env vars
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}Error: OPENAI_API_KEY not set${NC}"
    exit 1
fi
echo ""

# Step 6: Run new container
echo -e "${YELLOW}[6/6] Starting new container...${NC}"
docker run -d \
    --label created_by=customgpt_widget_script \
    -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
    -e CUSTOMGPT_PROJECT_ID="${CUSTOMGPT_PROJECT_ID:-}" \
    -e CUSTOMGPT_API_KEY="${CUSTOMGPT_API_KEY:-}" \
    -e CUSTOMGPT_STREAM="${CUSTOMGPT_STREAM:-true}" \
    -e USE_CUSTOMGPT="${USE_CUSTOMGPT:-true}" \
    -e TTS_PROVIDER="${TTS_PROVIDER:-OPENAI}" \
    -e OPENAI_TTS_MODEL="${OPENAI_TTS_MODEL:-tts-1}" \
    -e OPENAI_TTS_VOICE="${OPENAI_TTS_VOICE:-nova}" \
    -e STT_MODEL="${STT_MODEL:-gpt-4o-mini-transcribe}" \
    -e LANGUAGE="${LANGUAGE:-en}" \
    -e VITE_AVATAR_GLB_URL="${VITE_AVATAR_GLB_URL:-}" \
    -p 8000:80 \
    customgpt-widget

CONTAINER_ID=$(docker ps -q --filter "label=created_by=customgpt_widget_script" | head -1)

if [ ! -z "$CONTAINER_ID" ]; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
    echo "Container ID: $CONTAINER_ID"
else
    echo -e "${RED}Error: Container failed to start${NC}"
    exit 1
fi
echo ""

# Final instructions
echo "============================================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Open browser and navigate to: http://localhost:8000"
echo "2. Clear browser cache or hard refresh (Cmd+Shift+R / Ctrl+Shift+R)"
echo "3. Click 'Voice Mode' button"
echo "4. Look for white circular button with ⋮ (dots) in top-right corner"
echo "5. Click button to toggle between particle and avatar modes"
echo ""
echo "Diagnostic command (run in browser console):"
echo "  console.log(document.querySelector('.mode-toggle-button'))"
echo ""
echo "View logs:"
echo "  docker logs -f $CONTAINER_ID"
echo ""
echo "See AVATAR_BUTTON_FIX_COMPLETE.md for full troubleshooting guide"
echo "============================================================"
