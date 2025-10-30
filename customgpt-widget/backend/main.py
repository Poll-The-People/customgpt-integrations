import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from ai import optimize_customgpt_on_startup
from routes.chat import router as chat_router
from routes.tts import router as tts_router
from routes.agent import router as agent_router
from routes.inference import router as inference_router
from validation import validate_startup_config

app = FastAPI()
logging.basicConfig(level=logging.INFO)

# Validate configuration before startup
validate_startup_config()

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(inference_router)  # Unified pipeline endpoint (priority)
app.include_router(chat_router)
app.include_router(tts_router)
app.include_router(agent_router)


@app.on_event("startup")
async def startup_event():
    """Run optimization and validation on application startup."""
    from validation import validate_openai_api_key, validate_customgpt_config
    from features import detect_system_capabilities

    logging.info("Application starting up...")

    # Detect system capabilities
    logging.info("\n🔍 Detecting System Capabilities...")
    capabilities = detect_system_capabilities()

    # Validate API keys with actual requests (only if configured)
    logging.info("\n🔑 Validating API Keys...")

    # Validate OpenAI API key if present
    if capabilities.stt_enabled or capabilities.tts_enabled:
        openai_result = await validate_openai_api_key()
        if not openai_result["valid"]:
            logging.error(f"⚠️  OpenAI API key validation failed: {openai_result.get('error', 'Unknown error')}")
            logging.warning("Voice features may not work properly")

    # Validate CustomGPT if enabled
    customgpt_result = await validate_customgpt_config()
    if not customgpt_result.get("skipped") and not customgpt_result["valid"]:
        logging.error(f"⚠️  CustomGPT validation failed: {customgpt_result.get('error', 'Unknown error')}")
        logging.warning("AI completion functionality may not work properly")

    # Run CustomGPT optimization if applicable
    optimize_customgpt_on_startup()

    logging.info("\n✅ Application startup complete\n")


@app.get("/")
async def root():
    logging.info("[ROUTE] GET / - Serving index.html")
    return FileResponse("/app/frontend/dist/index.html")


# Catch-all route for React Router - must be AFTER all API routes
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Check if it's a static file request
    static_file_path = f"/app/frontend/dist/{full_path}"

    # Try to serve static file if it exists
    import os
    import mimetypes

    if os.path.isfile(static_file_path):
        # Detect MIME type
        mime_type, _ = mimetypes.guess_type(static_file_path)

        # Special handling for specific file types
        if full_path.endswith('.onnx'):
            mime_type = 'application/octet-stream'
        elif full_path.endswith('.wasm'):
            mime_type = 'application/wasm'
        elif full_path.endswith('.mjs'):
            mime_type = 'application/javascript'
        elif full_path.endswith('.js'):
            mime_type = 'application/javascript'

        logging.info(f"[ROUTE] GET /{full_path} - Serving static file (MIME: {mime_type})")
        return FileResponse(static_file_path, media_type=mime_type)

    # Otherwise serve index.html for React Router
    logging.info(f"[ROUTE] GET /{full_path} - Serving index.html (React Router)")
    return FileResponse("/app/frontend/dist/index.html")


