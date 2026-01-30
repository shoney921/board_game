from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.room import Room, RoomStatus
from app.schemas.room import RoomCreate, RoomResponse, RoomJoin
from app.core.security import generate_room_code

router = APIRouter()


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate,
    host_id: int,  # TODO: Get from auth token
    db: AsyncSession = Depends(get_db),
):
    code = generate_room_code()
    # Ensure unique code
    while True:
        result = await db.execute(select(Room).where(Room.code == code))
        if not result.scalar_one_or_none():
            break
        code = generate_room_code()

    room = Room(
        code=code,
        name=room_data.name,
        host_id=host_id,
        game_type=room_data.game_type,
        max_players=room_data.max_players,
        min_players=room_data.min_players,
    )
    db.add(room)
    await db.flush()
    await db.refresh(room)
    return room


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    return room


@router.get("/code/{code}", response_model=RoomResponse)
async def get_room_by_code(code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.code == code.upper()))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    return room


@router.post("/join", response_model=RoomResponse)
async def join_room(room_join: RoomJoin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.code == room_join.code.upper()))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    if room.status != RoomStatus.WAITING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room is not accepting new players",
        )
    return room


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(room_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    await db.delete(room)
