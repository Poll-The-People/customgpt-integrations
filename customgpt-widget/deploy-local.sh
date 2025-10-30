#!/bin/bash

# CustomGPT Widget - Local Deployment Script
# Builds and runs WITHOUT pushing to Docker Hub

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo "=================================================="
echo "   CustomGPT Widget - Local Deployment"
echo "=================================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    print_info "Loading environment variables from .env"
    export $(grep -v '^#' .env | xargs)
    print_success "Environment variables loaded"
else
    print_warning ".env file not found - using system environment variables"
fi

# Validate required environment variables
echo ""
echo "Validating configuration..."

if [ -z "$OPENAI_API_KEY" ]; then
    print_error "OPENAI_API_KEY is required"
    exit 1
fi
print_success "OPENAI_API_KEY is set"

# Stop and remove old containers
echo ""
echo "Cleaning up old containers..."
OLD_CONTAINERS=$(docker ps -a --filter "label=created_by=customgpt_widget_script" --format "{{.ID}}")
if [ -n "$OLD_CONTAINERS" ]; then
    print_info "Found old containers: $OLD_CONTAINERS"
    docker stop $OLD_CONTAINERS 2>/dev/null || true
    docker rm $OLD_CONTAINERS 2>/dev/null || true
    print_success "Old containers removed"
else
    print_info "No old containers found"
fi

# Build Docker image
echo ""
echo "=================================================="
echo "   Building Docker Image"
echo "=================================================="
echo ""
print_warning "This will take 2-5 minutes..."
echo ""

docker build --no-cache -t customgpt-widget:local .

if [ $? -ne 0 ]; then
    print_error "Docker build failed!"
    exit 1
fi

print_success "Docker image built successfully!"

# Run container
echo ""
echo "=================================================="
echo "   Starting Container"
echo "=================================================="
echo ""

docker run -d \
    --name customgpt-widget-local \
    --label created_by=customgpt_widget_script \
    -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
    -e CUSTOMGPT_PROJECT_ID="${CUSTOMGPT_PROJECT_ID:-}" \
    -e CUSTOMGPT_API_KEY="${CUSTOMGPT_API_KEY:-}" \
    -e USE_CUSTOMGPT="${USE_CUSTOMGPT:-true}" \
    -e CUSTOMGPT_STREAM="${CUSTOMGPT_STREAM:-true}" \
    -e AI_COMPLETION_MODEL="${AI_COMPLETION_MODEL:-gpt-3.5-turbo}" \
    -e LANGUAGE="${LANGUAGE:-en}" \
    -e STT_MODEL="${STT_MODEL:-gpt-4o-mini-transcribe}" \
    -e TTS_PROVIDER="${TTS_PROVIDER:-OPENAI}" \
    -e OPENAI_TTS_MODEL="${OPENAI_TTS_MODEL:-tts-1}" \
    -e OPENAI_TTS_VOICE="${OPENAI_TTS_VOICE:-nova}" \
    -e EDGETTS_VOICE="${EDGETTS_VOICE:-en-US-EricNeural}" \
    -e ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-}" \
    -e ELEVENLABS_VOICE="${ELEVENLABS_VOICE:-EXAVITQu4vr4xnSDxMaL}" \
    -p 8000:80 \
    customgpt-widget:local

if [ $? -eq 0 ]; then
    print_success "Container started successfully!"

    echo ""
    echo "=================================================="
    echo "   Deployment Complete"
    echo "=================================================="
    echo ""
    echo -e "${GREEN}Application URL:${NC}"
    echo "  http://localhost:8000"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  View logs:     docker logs -f customgpt-widget-local"
    echo "  Stop:          docker stop customgpt-widget-local"
    echo "  Restart:       docker restart customgpt-widget-local"
    echo "  Remove:        docker rm -f customgpt-widget-local"
    echo ""

    # Wait for container to be ready
    print_info "Waiting for application to start..."
    sleep 5

    # Show recent logs
    echo ""
    echo -e "${YELLOW}Recent logs:${NC}"
    docker logs customgpt-widget-local --tail 20

    echo ""
    echo "=================================================="
    print_success "Ready! Open http://localhost:8000 in your browser"
    echo "=================================================="
else
    print_error "Failed to start container"
    exit 1
fi
