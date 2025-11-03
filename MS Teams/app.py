"""
Flask application for Microsoft Teams CustomGPT Bot
"""

import asyncio
import logging
import sys
import signal
import atexit
from flask import Flask, request, Response
from botbuilder.core import (
    TurnContext,
    BotFrameworkAdapter,
    BotFrameworkAdapterSettings,
    MemoryStorage,
    ConversationState,
    UserState
)
from botbuilder.schema import Activity
from bot import CustomGPTTeamsBot
from config import Config

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format=Config.LOG_FORMAT
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# Validate configuration
try:
    Config.validate()
except ValueError as e:
    logger.error(f"Configuration error: {e}")
    sys.exit(1)

# Create adapter settings
settings = BotFrameworkAdapterSettings(
    app_id=Config.TEAMS_APP_ID,
    app_password=Config.TEAMS_APP_PASSWORD,
    channel_auth_tenant=Config.TEAMS_TENANT_ID
)

# Create adapter
adapter = BotFrameworkAdapter(settings)

# Create state storage
# Use MemoryStorage for single-instance deployments
# For production with multiple instances, use Azure BlobStorage or Cosmos DB
storage = MemoryStorage()
conversation_state = ConversationState(storage)
user_state = UserState(storage)

# Create bot instance
bot = CustomGPTTeamsBot(conversation_state, user_state)

# Bot initialization flag
bot_initialized = False


async def ensure_bot_initialized():
    """Ensure bot is initialized before processing requests"""
    global bot_initialized
    if not bot_initialized:
        try:
            await bot.initialize()
            bot_initialized = True
            logger.info("Bot initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize bot: {e}")
            raise


async def shutdown():
    """Graceful shutdown handler"""
    global bot_initialized
    if bot_initialized:
        logger.info("Shutting down bot...")
        try:
            await bot.cleanup()
            bot_initialized = False
            logger.info("Bot shutdown complete")
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")


def signal_handler(sig, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {sig}")
    asyncio.run(shutdown())
    sys.exit(0)


# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)
atexit.register(lambda: asyncio.run(shutdown()))


# Error handler
async def on_error(context: TurnContext, error: Exception):
    """Handle errors"""
    logger.error(f"Error in bot: {error}", exc_info=True)

    # Send error message to user
    error_message = (
        "Sorry, an error occurred while processing your request. "
        "Please try again later."
    )

    try:
        await context.send_activity(error_message)
    except Exception as e:
        logger.error(f"Error sending error message: {e}")


adapter.on_turn_error = on_error


# Main messaging endpoint
@app.route("/api/messages", methods=["POST"])
def messages():
    """Handle incoming messages from Teams"""
    if "application/json" not in request.headers.get("Content-Type", ""):
        return Response(status=415)

    body = request.json
    activity = Activity().deserialize(body)
    auth_header = request.headers.get("Authorization", "")

    # Process the activity
    async def aux_func(turn_context):
        # Ensure bot is initialized
        await ensure_bot_initialized()

        # Process message
        await bot.on_message_activity(turn_context)

        # Save state changes
        await conversation_state.save_changes(turn_context)
        await user_state.save_changes(turn_context)

    try:
        task = asyncio.create_task(
            adapter.process_activity(activity, auth_header, aux_func)
        )
        asyncio.get_event_loop().run_until_complete(task)
        return Response(status=201)
    except Exception as e:
        logger.error(f"Error processing activity: {e}", exc_info=True)
        return Response(status=500)


# Health check endpoint
@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    status = {
        "status": "healthy" if bot_initialized else "initializing",
        "bot": "CustomGPT Teams Bot",
        "version": "1.0.0"
    }
    return status, 200 if bot_initialized else 503


# Home page
@app.route("/", methods=["GET"])
def home():
    """Home page"""
    return """
    <html>
        <head>
            <title>CustomGPT Teams Bot</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    max-width: 800px;
                    margin: 50px auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                h1 { color: #5B5FC7; }
                .status {
                    padding: 10px;
                    background: #e8f5e9;
                    border-left: 4px solid #4caf50;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <h1>CustomGPT Teams Bot</h1>
            <div class="status">
                <strong>Status:</strong> Bot is running!
            </div>
            <p>To interact with the bot, please add it to your Microsoft Teams.</p>
            <h2>Features</h2>
            <ul>
                <li>Intelligent Q&A powered by CustomGPT</li>
                <li>Natural conversation with context</li>
                <li>Threading support</li>
                <li>Rich Adaptive Cards UI</li>
                <li>Rate limiting and security controls</li>
            </ul>
            <h2>Commands</h2>
            <ul>
                <li><code>/help</code> - Show available commands</li>
                <li><code>/clear</code> - Clear conversation history</li>
                <li><code>/status</code> - Check bot status and limits</li>
            </ul>
        </body>
    </html>
    """


if __name__ == "__main__":
    logger.info(f"Starting CustomGPT Teams Bot on {Config.HOST}:{Config.PORT}")
    logger.info(f"Log level: {Config.LOG_LEVEL}")
    logger.info(f"Environment: {'Production' if Config.PORT == 443 else 'Development'}")

    # Initialize bot before starting server
    asyncio.run(ensure_bot_initialized())

    # Start Flask app
    app.run(host=Config.HOST, port=Config.PORT, debug=False)
