from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    username: str
    display_name: str


class UserCreate(UserBase):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_guest: bool = False


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: int
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    is_guest: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserInRoom(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    is_ready: bool = False
    is_host: bool = False
