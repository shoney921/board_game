from fastapi import APIRouter
from app.api.v1 import users, rooms, games

router = APIRouter()

router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
router.include_router(games.router, prefix="/games", tags=["games"])
