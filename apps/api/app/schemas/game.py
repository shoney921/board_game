from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any, List


class GameCreate(BaseModel):
    room_id: int
    game_type: str


class PlayerState(BaseModel):
    user_id: int
    username: str
    display_name: str
    role: Optional[str] = None
    is_alive: bool = True
    metadata: Optional[dict[str, Any]] = None


class GameState(BaseModel):
    current_round: int
    phase: str
    players: List[PlayerState]
    public_state: dict[str, Any]


class GameResponse(BaseModel):
    id: int
    room_id: int
    game_type: str
    status: str
    current_round: int
    winner_team: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
