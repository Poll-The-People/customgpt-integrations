#!/bin/bash

# CustomGPT Widget - One-Command Deployment Script
# This script pulls and runs the pre-built Docker image from Docker Hub

set -e

echo "=================================================="
echo "   CustomGPT Widget - Docker Deployment"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_IMAGE="zriyansh/customgpt-widget:latest"
CONTAINER_NAME="customgpt-widget"
HOST_PORT=8000
CONTAINER_PORT=80

# Function to print colored output
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Check if Docker is installed
echo "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo ""
    echo "Please install Docker first:"
    echo "  macOS/Windows: https://www.docker.com/products/docker-desktop"
    echo "  Linux: https://docs.docker.com/engine/install/"
    exit 1
fi
print_success "Docker is installed"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running!"
    echo "Please start Docker and try again."
    exit 1
fi
print_success "Docker daemon is running"
echo ""

# Check for existing .env file
if [ -f ".env" ]; then
    print_info "Found existing .env file"
    echo ""
    read -p "Use existing .env configuration? (y/n): " use_existing
    if [[ $use_existing =~ ^[Yy]$ ]]; then
        source .env
        print_success "Using existing configuration"
    else
        rm .env
        print_info "Creating new configuration"
    fi
    echo ""
fi

# Interactive configuration if .env doesn't exist or user chose not to use it
if [ ! -f ".env" ]; then
    echo "=================================================="
    echo "   Configuration Setup"
    echo "=================================================="
    echo ""
    echo "This widget requires API keys to function."
    echo "You can get these from:"
    echo "  - CustomGPT: https://app.customgpt.ai/projects"
    echo "  - OpenAI: https://platform.openai.com/api-keys"
    echo ""

    # CustomGPT Configuration
    echo -e "${BLUE}CustomGPT Configuration:${NC}"
    read -p "Enable CustomGPT for AI responses? (y/n) [default: y]: " enable_customgpt
    enable_customgpt=${enable_customgpt:-y}

    if [[ $enable_customgpt =~ ^[Yy]$ ]]; then
        USE_CUSTOMGPT="true"
        read -p "CustomGPT Project ID: " CUSTOMGPT_PROJECT_ID
        read -p "CustomGPT API Key: " CUSTOMGPT_API_KEY
        read -p "Enable streaming for faster responses? (y/n) [default: y]: " enable_stream
        enable_stream=${enable_stream:-y}
        if [[ $enable_stream =~ ^[Yy]$ ]]; then
            CUSTOMGPT_STREAM="true"
        else
            CUSTOMGPT_STREAM="false"
        fi
    else
        USE_CUSTOMGPT="false"
        CUSTOMGPT_PROJECT_ID=""
        CUSTOMGPT_API_KEY=""
        CUSTOMGPT_STREAM="false"
    fi
    echo ""

    # OpenAI Configuration
    echo -e "${BLUE}OpenAI Configuration:${NC}"
    read -p "OpenAI API Key (required for voice features): " OPENAI_API_KEY
    echo ""

    # If CustomGPT is disabled, configure OpenAI model
    if [[ $USE_CUSTOMGPT == "false" ]]; then
        echo -e "${BLUE}AI Model (used when CustomGPT is disabled):${NC}"
        echo "Recommended models:"
        echo "  1. gpt-4o-mini (fast, cost-effective)"
        echo "  2. gpt-4o (most capable)"
        echo "  3. gpt-3.5-turbo (legacy, cheapest)"
        read -p "Enter model name [default: gpt-4o-mini]: " AI_COMPLETION_MODEL
        AI_COMPLETION_MODEL=${AI_COMPLETION_MODEL:-gpt-4o-mini}
        echo ""
    else
        AI_COMPLETION_MODEL="gpt-4o-mini"
    fi

    # STT Model Configuration
    echo -e "${BLUE}Speech-to-Text Configuration:${NC}"
    echo "Recommended models:"
    echo "  1. gpt-4o-mini-transcribe (best for voice, default)"
    echo "  2. gpt-4o-transcribe (maximum accuracy)"
    echo "  3. whisper-1 (legacy)"
    read -p "Enter STT model [default: gpt-4o-mini-transcribe]: " STT_MODEL
    STT_MODEL=${STT_MODEL:-gpt-4o-mini-transcribe}
    echo ""

    # TTS Provider Configuration
    echo -e "${BLUE}Text-to-Speech Configuration:${NC}"
    echo "Available TTS providers:"
    echo "  1. OPENAI (recommended, requires OpenAI API key)"
    echo "  2. gTTS (free, no API key required)"
    echo "  3. ELEVENLABS (premium quality, requires ElevenLabs API key)"
    echo "  4. STREAMELEMENTS (free alternative)"
    echo "  5. EDGETTS (Microsoft Edge TTS)"
    read -p "Select TTS provider [1-5, default: 1]: " tts_choice
    tts_choice=${tts_choice:-1}

    case $tts_choice in
        1)
            TTS_PROVIDER="OPENAI"
            echo "OpenAI TTS models:"
            echo "  1. tts-1 (fast)"
            echo "  2. tts-1-hd (high quality)"
            read -p "Select model [1-2, default: 1]: " tts_model_choice
            tts_model_choice=${tts_model_choice:-1}
            if [ "$tts_model_choice" == "2" ]; then
                OPENAI_TTS_MODEL="tts-1-hd"
            else
                OPENAI_TTS_MODEL="tts-1"
            fi
            echo "OpenAI TTS voices: alloy, echo, fable, onyx, nova, shimmer"
            read -p "Select voice [default: nova]: " OPENAI_TTS_VOICE
            OPENAI_TTS_VOICE=${OPENAI_TTS_VOICE:-nova}
            ;;
        2)
            TTS_PROVIDER="gTTS"
            OPENAI_TTS_MODEL="tts-1"
            OPENAI_TTS_VOICE="nova"
            ;;
        3)
            TTS_PROVIDER="ELEVENLABS"
            read -p "ElevenLabs API Key: " ELEVENLABS_API_KEY
            read -p "ElevenLabs Voice ID [default: EXAVITQu4vr4xnSDxMaL]: " ELEVENLABS_VOICE
            ELEVENLABS_VOICE=${ELEVENLABS_VOICE:-EXAVITQu4vr4xnSDxMaL}
            OPENAI_TTS_MODEL="tts-1"
            OPENAI_TTS_VOICE="nova"
            ;;
        4)
            TTS_PROVIDER="STREAMELEMENTS"
            OPENAI_TTS_MODEL="tts-1"
            OPENAI_TTS_VOICE="nova"
            ;;
        5)
            TTS_PROVIDER="EDGETTS"
            read -p "Edge TTS Voice [default: en-US-EricNeural]: " EDGETTS_VOICE
            EDGETTS_VOICE=${EDGETTS_VOICE:-en-US-EricNeural}
            OPENAI_TTS_MODEL="tts-1"
            OPENAI_TTS_VOICE="nova"
            ;;
        *)
            print_warning "Invalid choice, using OPENAI"
            TTS_PROVIDER="OPENAI"
            OPENAI_TTS_MODEL="tts-1"
            OPENAI_TTS_VOICE="nova"
            ;;
    esac
    echo ""

    # Language Configuration
    echo -e "${BLUE}Language Configuration:${NC}"
    read -p "Language code (ISO-639-1) [default: en]: " LANGUAGE
    LANGUAGE=${LANGUAGE:-en}
    echo ""

    # Port Configuration
    echo -e "${BLUE}Network Configuration:${NC}"
    read -p "Host port to expose [default: 8000]: " HOST_PORT
    HOST_PORT=${HOST_PORT:-8000}
    echo ""

    # Save configuration to .env
    cat > .env << EOF
# CustomGPT Widget Configuration
# Generated by deploy.sh on $(date)

# CustomGPT Configuration
USE_CUSTOMGPT=${USE_CUSTOMGPT}
CUSTOMGPT_PROJECT_ID=${CUSTOMGPT_PROJECT_ID}
CUSTOMGPT_API_KEY=${CUSTOMGPT_API_KEY}
CUSTOMGPT_STREAM=${CUSTOMGPT_STREAM}

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}
AI_COMPLETION_MODEL=${AI_COMPLETION_MODEL}

# Speech-to-Text Configuration
STT_MODEL=${STT_MODEL}

# Text-to-Speech Configuration
TTS_PROVIDER=${TTS_PROVIDER}
OPENAI_TTS_MODEL=${OPENAI_TTS_MODEL}
OPENAI_TTS_VOICE=${OPENAI_TTS_VOICE}
EOF

    # Add ElevenLabs config if selected
    if [ "$TTS_PROVIDER" == "ELEVENLABS" ]; then
        cat >> .env << EOF
ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
ELEVENLABS_VOICE=${ELEVENLABS_VOICE}
EOF
    fi

    # Add EdgeTTS config if selected
    if [ "$TTS_PROVIDER" == "EDGETTS" ]; then
        cat >> .env << EOF
EDGETTS_VOICE=${EDGETTS_VOICE}
EOF
    fi

    # Add language config
    cat >> .env << EOF

# Language Configuration
LANGUAGE=${LANGUAGE}
EOF

    print_success "Configuration saved to .env"
    echo ""
else
    # Load from existing .env
    source .env
fi

# Validate required environment variables
echo "Validating configuration..."
if [ -z "$OPENAI_API_KEY" ]; then
    print_error "OPENAI_API_KEY is required for voice features"
    exit 1
fi

if [ "$USE_CUSTOMGPT" == "true" ]; then
    if [ -z "$CUSTOMGPT_PROJECT_ID" ] || [ -z "$CUSTOMGPT_API_KEY" ]; then
        print_error "CUSTOMGPT_PROJECT_ID and CUSTOMGPT_API_KEY are required when USE_CUSTOMGPT=true"
        exit 1
    fi
fi
print_success "Configuration is valid"
echo ""

# Stop and remove existing container if running
echo "Checking for existing containers..."
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_warning "Found existing container: ${CONTAINER_NAME}"
    docker stop ${CONTAINER_NAME} > /dev/null 2>&1 || true
    docker rm ${CONTAINER_NAME} > /dev/null 2>&1 || true
    print_success "Removed existing container"
fi
echo ""

# Pull the latest image
echo "Pulling Docker image: ${DOCKER_IMAGE}"
echo "This may take a few minutes on first run..."
if docker pull ${DOCKER_IMAGE}; then
    print_success "Image pulled successfully"
else
    print_error "Failed to pull image from Docker Hub"
    echo ""
    print_info "Building image locally instead..."
    if [ -f "Dockerfile" ]; then
        docker build -t ${DOCKER_IMAGE} .
        print_success "Image built locally"
    else
        print_error "Dockerfile not found. Cannot build image."
        exit 1
    fi
fi
echo ""

# Build docker run command
DOCKER_RUN_CMD="docker run -d \
  --name ${CONTAINER_NAME} \
  --restart unless-stopped \
  -e OPENAI_API_KEY=${OPENAI_API_KEY} \
  -e USE_CUSTOMGPT=${USE_CUSTOMGPT} \
  -e CUSTOMGPT_PROJECT_ID=${CUSTOMGPT_PROJECT_ID} \
  -e CUSTOMGPT_API_KEY=${CUSTOMGPT_API_KEY} \
  -e CUSTOMGPT_STREAM=${CUSTOMGPT_STREAM} \
  -e AI_COMPLETION_MODEL=${AI_COMPLETION_MODEL} \
  -e STT_MODEL=${STT_MODEL} \
  -e TTS_PROVIDER=${TTS_PROVIDER} \
  -e OPENAI_TTS_MODEL=${OPENAI_TTS_MODEL} \
  -e OPENAI_TTS_VOICE=${OPENAI_TTS_VOICE} \
  -e LANGUAGE=${LANGUAGE} \
  -p ${HOST_PORT}:${CONTAINER_PORT} \
  --label created_by=customgpt_widget_script"

# Add optional env vars
if [ "$TTS_PROVIDER" == "ELEVENLABS" ]; then
    DOCKER_RUN_CMD="$DOCKER_RUN_CMD -e ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY} -e ELEVENLABS_VOICE=${ELEVENLABS_VOICE}"
fi

if [ "$TTS_PROVIDER" == "EDGETTS" ]; then
    DOCKER_RUN_CMD="$DOCKER_RUN_CMD -e EDGETTS_VOICE=${EDGETTS_VOICE}"
fi

DOCKER_RUN_CMD="$DOCKER_RUN_CMD ${DOCKER_IMAGE}"

# Run the container
echo "Starting CustomGPT Widget container..."
CONTAINER_ID=$(eval $DOCKER_RUN_CMD)

if [ $? -eq 0 ]; then
    print_success "Container started successfully"
    echo ""
    print_info "Container ID: ${CONTAINER_ID:0:12}"
    print_info "Container Name: ${CONTAINER_NAME}"
    echo ""

    # Wait for container to be healthy
    echo "Waiting for service to be ready..."
    sleep 3

    if docker ps | grep -q ${CONTAINER_NAME}; then
        print_success "Service is running"
        echo ""
        echo "=================================================="
        echo "   Deployment Successful!"
        echo "=================================================="
        echo ""
        echo -e "${GREEN}Widget URL:${NC} http://localhost:${HOST_PORT}"
        echo ""
        echo -e "${BLUE}Embed Code (Floating Chatbot):${NC}"
        echo "Copy this code into your website's HTML:"
        echo ""
        echo "<script>"
        echo "  (function() {"
        echo "    var script = document.createElement('script');"
        echo "    script.src = 'http://localhost:${HOST_PORT}/embed.js';"
        echo "    script.async = true;"
        echo "    document.head.appendChild(script);"
        echo "  })();"
        echo "</script>"
        echo ""
        echo -e "${BLUE}Test Pages:${NC}"
        echo "  - Main interface: http://localhost:${HOST_PORT}"
        echo "  - API docs: http://localhost:${HOST_PORT}/docs"
        echo ""
        echo -e "${BLUE}Useful Commands:${NC}"
        echo "  - View logs: docker logs -f ${CONTAINER_NAME}"
        echo "  - Stop widget: docker stop ${CONTAINER_NAME}"
        echo "  - Restart widget: docker restart ${CONTAINER_NAME}"
        echo "  - Remove widget: docker rm -f ${CONTAINER_NAME}"
        echo ""
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "  1. Open http://localhost:${HOST_PORT} to test the widget"
        echo "  2. Copy the embed code above to your website"
        echo "  3. For production: set up a domain and SSL certificate"
        echo ""
        echo "Configuration saved to: .env"
        echo "=================================================="
    else
        print_error "Container failed to start"
        echo ""
        echo "Logs:"
        docker logs ${CONTAINER_NAME}
        exit 1
    fi
else
    print_error "Failed to start container"
    exit 1
fi
