from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.game import Game, GameStatus
from app.models.room import Room, RoomStatus
from app.schemas.game import GameCreate, GameResponse

router = APIRouter()


@router.post("/", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
async def create_game(game_data: GameCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.id == game_data.room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )

    game = Game(
        room_id=game_data.room_id,
        game_type=game_data.game_type,
    )
    db.add(game)

    room.status = RoomStatus.IN_GAME
    await db.commit()
    await db.refresh(game)
    return game


@router.get("/{game_id}", response_model=GameResponse)
async def get_game(game_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found",
        )
    return game


@router.get("/room/{room_id}/current", response_model=GameResponse)
async def get_current_game(room_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Game)
        .where(Game.room_id == room_id)
        .where(Game.status != GameStatus.FINISHED)
        .order_by(Game.created_at.desc())
    )
    game = result.scalar_first()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active game found",
        )
    return game
