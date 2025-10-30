#!/bin/bash

# CustomGPT Widget - Docker Hub Push Script
# Builds and pushes multi-architecture image to Docker Hub

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
echo "   CustomGPT Widget - Docker Hub Push"
echo "=================================================="
echo ""

# Configuration
DOCKER_USERNAME="zriyansh"
IMAGE_NAME="customgpt-widget"
FULL_IMAGE="${DOCKER_USERNAME}/${IMAGE_NAME}"

# Version from argument or default to 'latest'
VERSION=${1:-latest}

echo "Configuration:"
echo "  Docker Hub: ${DOCKER_USERNAME}"
echo "  Image: ${IMAGE_NAME}"
echo "  Version: ${VERSION}"
echo ""

# Check if Docker is installed
echo "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    exit 1
fi
print_success "Docker is installed"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running!"
    exit 1
fi
print_success "Docker daemon is running"

# Check if logged in to Docker Hub
echo ""
echo "Checking Docker Hub authentication..."
if ! docker info | grep -q "Username: ${DOCKER_USERNAME}"; then
    print_warning "Not logged in to Docker Hub"
    echo ""
    echo "Logging in to Docker Hub..."
    echo "Username: ${DOCKER_USERNAME}"
    docker login
    if [ $? -ne 0 ]; then
        print_error "Failed to login to Docker Hub"
        exit 1
    fi
else
    print_success "Already logged in to Docker Hub as ${DOCKER_USERNAME}"
fi

# Create buildx builder if not exists
echo ""
echo "Setting up Docker buildx..."
if ! docker buildx ls | grep -q "multiarch-builder"; then
    print_info "Creating buildx builder for multi-architecture builds..."
    docker buildx create --name multiarch-builder --use
    print_success "Buildx builder created"
else
    print_info "Using existing buildx builder"
    docker buildx use multiarch-builder
fi

# Bootstrap builder
docker buildx inspect --bootstrap

echo ""
echo "=================================================="
echo "   Building Multi-Architecture Image"
echo "=================================================="
echo ""
echo "This will build for:"
echo "  - linux/amd64 (Intel/AMD 64-bit)"
echo "  - linux/arm64 (ARM 64-bit, Apple Silicon)"
echo ""
print_warning "This may take 5-10 minutes..."
echo ""

# Build and push
echo "Building and pushing: ${FULL_IMAGE}:${VERSION}"
echo ""

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag ${FULL_IMAGE}:${VERSION} \
    --push \
    .

if [ $? -eq 0 ]; then
    print_success "Image built and pushed successfully!"
    echo ""
    echo "=================================================="
    echo "   Deployment Information"
    echo "=================================================="
    echo ""
    echo -e "${GREEN}Docker Hub URL:${NC}"
    echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
    echo ""
    echo -e "${BLUE}Users can now deploy with:${NC}"
    echo ""
    echo "  # Option 1: One-command script"
    echo "  curl -o deploy.sh https://raw.githubusercontent.com/yourorg/customgpt-widget/main/deploy.sh"
    echo "  chmod +x deploy.sh"
    echo "  ./deploy.sh"
    echo ""
    echo "  # Option 2: Docker Compose"
    echo "  docker-compose up -d"
    echo ""
    echo "  # Option 3: Direct Docker run"
    echo "  docker run -d \\"
    echo "    --name customgpt-widget \\"
    echo "    -e OPENAI_API_KEY=your_key \\"
    echo "    -p 8000:80 \\"
    echo "    ${FULL_IMAGE}:${VERSION}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Update deploy.sh with image name: ${FULL_IMAGE}:${VERSION}"
    echo "  2. Update docker-compose.yml with image name"
    echo "  3. Update documentation with correct image references"
    echo "  4. Test deployment: ./deploy.sh"
    echo ""
    echo "=================================================="

    # Tag as latest if building a version tag
    if [ "$VERSION" != "latest" ]; then
        echo ""
        read -p "Also tag as 'latest'? (y/n): " tag_latest
        if [[ $tag_latest =~ ^[Yy]$ ]]; then
            echo ""
            print_info "Tagging as latest..."
            docker buildx build \
                --platform linux/amd64,linux/arm64 \
                --tag ${FULL_IMAGE}:latest \
                --push \
                .
            if [ $? -eq 0 ]; then
                print_success "Also tagged as ${FULL_IMAGE}:latest"
            fi
        fi
    fi
else
    print_error "Failed to build and push image"
    exit 1
fi

echo ""
print_success "Done!"
