from sqlalchemy import String, Integer, ForeignKey, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, Any, TYPE_CHECKING
import enum

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.room import Room


class GameStatus(enum.Enum):
    SETUP = "setup"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"))
    game_type: Mapped[str] = mapped_column(String(50))
    status: Mapped[GameStatus] = mapped_column(
        SQLEnum(GameStatus), default=GameStatus.SETUP
    )
    current_round: Mapped[int] = mapped_column(Integer, default=0)
    state: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    players: Mapped[Optional[list[dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    winner_team: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    room: Mapped["Room"] = relationship("Room", back_populates="games")
