FROM node:18.16 AS frontend_builder

WORKDIR /frontend

# Build arguments for frontend environment variables (embedded at build time)
# IMPORTANT: These must be passed as --build-arg during docker build
ARG VITE_UI_THEME=dark
ARG VITE_ENABLE_VOICE_MODE=true
ARG VITE_ENABLE_STT=true
ARG VITE_ENABLE_TTS=true
ARG VITE_AVATAR_GLB_URL

# Set as environment variables so Vite can access them during build
ENV VITE_UI_THEME=${VITE_UI_THEME}
ENV VITE_ENABLE_VOICE_MODE=${VITE_ENABLE_VOICE_MODE}
ENV VITE_ENABLE_STT=${VITE_ENABLE_STT}
ENV VITE_ENABLE_TTS=${VITE_ENABLE_TTS}
ENV VITE_AVATAR_GLB_URL=${VITE_AVATAR_GLB_URL}

COPY ./frontend/package.json ./frontend/yarn.lock ./

RUN yarn install --frozen-lockfile

COPY ./frontend/ ./

# Echo vars to invalidate cache when they change
# This forces rebuild of subsequent layers when env vars change
RUN echo "Building with theme: ${VITE_UI_THEME} | Features: Voice=${VITE_ENABLE_VOICE_MODE} STT=${VITE_ENABLE_STT} TTS=${VITE_ENABLE_TTS}" && \
    yarn build

FROM tiangolo/uvicorn-gunicorn-fastapi:python3.10-slim

WORKDIR /

ENV MAX_WORKERS=1

RUN apt-get update && apt-get install -y ffmpeg

COPY ./backend/requirements.txt /tmp/

RUN pip install --no-cache-dir --upgrade -r /tmp/requirements.txt

COPY ./backend /app

COPY --from=frontend_builder /frontend/dist /app/frontend/dist
