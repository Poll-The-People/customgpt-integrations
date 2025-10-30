#!/bin/bash
set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    set -a  # automatically export all variables
    source .env
    set +a  # disable automatic export
else
    echo "Warning: .env file not found. Make sure environment variables are set."
fi

CONTAINER_LABEL="created_by=customgpt_widget_script"

check_env_var() {
    if [[ -z "${!1}" ]]; then
        echo "Error: $1 is not set."
        exit 1
    fi
}

remove_containers() {
    if [ "$(docker ps -a -q -f "label=$1")" ]; then
        docker rm -f $(docker ps -a -q -f "label=$1")
    fi
}

build_docker() {
    ARCH=$(uname -m)
    # Pass all VITE_* build arguments (embedded at build time)
    # Use --no-cache to ensure frontend rebuild when env vars change
    if [ "$ARCH" == "arm64" ] || [ "$ARCH" == "aarch64" ]; then
        docker buildx build --platform linux/arm64 \
            --build-arg VITE_UI_THEME="${VITE_UI_THEME:-dark}" \
            --build-arg VITE_ENABLE_VOICE_MODE="${VITE_ENABLE_VOICE_MODE:-true}" \
            --build-arg VITE_ENABLE_STT="${VITE_ENABLE_STT:-true}" \
            --build-arg VITE_ENABLE_TTS="${VITE_ENABLE_TTS:-true}" \
            --build-arg VITE_AVATAR_GLB_URL="${VITE_AVATAR_GLB_URL:-}" \
            -t customgpt-widget .
    else
        docker build  \
            --build-arg VITE_UI_THEME="${VITE_UI_THEME:-dark}" \
            --build-arg VITE_ENABLE_VOICE_MODE="${VITE_ENABLE_VOICE_MODE:-true}" \
            --build-arg VITE_ENABLE_STT="${VITE_ENABLE_STT:-true}" \
            --build-arg VITE_ENABLE_TTS="${VITE_ENABLE_TTS:-true}" \
            --build-arg VITE_AVATAR_GLB_URL="${VITE_AVATAR_GLB_URL:-}" \
            -t customgpt-widget .
    fi
}

run_docker() {
    # Common environment variables (OPENAI_API_KEY may be empty if using CustomGPT only)
    COMMON_ENV="-e AI_COMPLETION_MODEL=${AI_COMPLETION_MODEL:-gpt-3.5-turbo} \
                -e LANGUAGE=${LANGUAGE:-en} \
                -e STT_MODEL=${STT_MODEL:-gpt-4o-mini-transcribe} \
                -e USE_CUSTOMGPT=${USE_CUSTOMGPT:-false} \
                -e TTS_PROVIDER=${TTS_PROVIDER:-OPENAI}"

    # Add OPENAI_API_KEY if set
    if [ -n "${OPENAI_API_KEY}" ]; then
        COMMON_ENV="${COMMON_ENV} -e OPENAI_API_KEY=${OPENAI_API_KEY}"
    fi

    # Add CustomGPT configuration if enabled
    if [ "${USE_CUSTOMGPT}" == "true" ]; then
        check_env_var "CUSTOMGPT_PROJECT_ID"
        check_env_var "CUSTOMGPT_API_KEY"
        COMMON_ENV="${COMMON_ENV} -e CUSTOMGPT_PROJECT_ID=${CUSTOMGPT_PROJECT_ID} -e CUSTOMGPT_API_KEY=${CUSTOMGPT_API_KEY} -e CUSTOMGPT_STREAM=${CUSTOMGPT_STREAM:-true}"
    fi

    # Add TTS-specific configuration based on provider
    if [ "${TTS_PROVIDER}" == "OPENAI" ]; then
        COMMON_ENV="${COMMON_ENV} -e OPENAI_TTS_MODEL=${OPENAI_TTS_MODEL:-tts-1} -e OPENAI_TTS_VOICE=${OPENAI_TTS_VOICE:-nova}"
    elif [ "${TTS_PROVIDER}" == "ELEVENLABS" ]; then
        check_env_var "ELEVENLABS_API_KEY"
        COMMON_ENV="${COMMON_ENV} -e ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY} -e ELEVENLABS_VOICE=${ELEVENLABS_VOICE:-EXAVITQu4vr4xnSDxMaL}"
    elif [ "${TTS_PROVIDER}" == "EDGETTS" ]; then
        COMMON_ENV="${COMMON_ENV} -e EDGETTS_VOICE=${EDGETTS_VOICE:-en-US-EricNeural}"
    fi

    # Run container with all environment variables
    docker run -d ${COMMON_ENV} -p 8000:80 --label "$CONTAINER_LABEL" customgpt-widget
    echo "✓ Container started with TTS_PROVIDER=${TTS_PROVIDER}"
}

# Validate configuration based on mode
if [ "${USE_CUSTOMGPT}" == "true" ]; then
    echo "Running in CustomGPT mode (text-only if OPENAI_API_KEY not set)"
    # OPENAI_API_KEY is optional when using CustomGPT (voice features disabled without it)
else
    echo "Running in OpenAI mode"
    check_env_var "OPENAI_API_KEY"
fi

remove_containers "$CONTAINER_LABEL"
build_docker
run_docker
