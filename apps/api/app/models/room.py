from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING
import enum

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.game import Game


class RoomStatus(enum.Enum):
    WAITING = "waiting"
    IN_GAME = "in_game"
    FINISHED = "finished"


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(6), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    game_type: Mapped[str] = mapped_column(String(50))
    max_players: Mapped[int] = mapped_column(Integer, default=10)
    min_players: Mapped[int] = mapped_column(Integer, default=5)
    status: Mapped[RoomStatus] = mapped_column(
        SQLEnum(RoomStatus), default=RoomStatus.WAITING
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    host: Mapped["User"] = relationship("User", back_populates="hosted_rooms")
    games: Mapped[list["Game"]] = relationship("Game", back_populates="room")
