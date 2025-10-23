#!/usr/bin/env python3
"""
Start the server with proper error handling.
"""

import sys
import os
import asyncio
import uvicorn
from contextlib import asynccontextmanager

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

@asynccontextmanager
async def lifespan(app):
    """Application lifespan manager."""
    print("🚀 Starting server...")
    yield
    print("🛑 Shutting down server...")

def create_app():
    """Create the FastAPI application."""
    try:
        from main_complete import app
        print("✅ FastAPI app created successfully")
        return app
    except Exception as e:
        print(f"❌ Failed to create app: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """Start the server."""
    print("🧪 Starting LMMS-Eval Dashboard Server")
    print("=" * 50)
    
    # Create the app
    app = create_app()
    if not app:
        print("❌ Failed to create app")
        return False
    
    # Configure the server
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
        lifespan="on"
    )
    
    # Start the server
    try:
        print("🚀 Starting server on http://localhost:8000")
        print("📊 API Documentation: http://localhost:8000/docs")
        print("🔌 WebSocket: ws://localhost:8000/ws")
        print("=" * 50)
        
        server = uvicorn.Server(config)
        server.run()
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        return True
    except Exception as e:
        print(f"❌ Server failed to start: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

