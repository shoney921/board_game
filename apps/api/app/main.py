from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from contextlib import asynccontextmanager

from app.config import settings
from app.db.database import engine, Base
from app.db.redis import redis_client
from app.api.v1 import router as api_router
from app.sockets.manager import sio


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await redis_client.connect()
    yield
    # Shutdown
    await redis_client.disconnect()
    await engine.dispose()


app = FastAPI(
    title="Board Game Platform API",
    description="Real-time multiplayer board game platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
    }


@app.get("/")
async def root():
    return {
        "message": "Board Game Platform API",
        "docs": "/docs",
    }


# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, app)
