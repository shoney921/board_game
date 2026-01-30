from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.user import UserInRoom


class RoomBase(BaseModel):
    name: str
    game_type: str
    max_players: int = 10
    min_players: int = 5


class RoomCreate(RoomBase):
    pass


class RoomJoin(BaseModel):
    code: str


class RoomResponse(RoomBase):
    id: int
    code: str
    host_id: int
    status: str
    created_at: datetime
    players: Optional[List[UserInRoom]] = []

    class Config:
        from_attributes = True
