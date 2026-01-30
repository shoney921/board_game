import redis.asyncio as redis
from typing import Optional
import json

from app.config import settings


class RedisClient:
    def __init__(self):
        self._client: Optional[redis.Redis] = None

    async def connect(self):
        self._client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        await self._client.ping()

    async def disconnect(self):
        if self._client:
            await self._client.close()

    @property
    def client(self) -> redis.Redis:
        if not self._client:
            raise RuntimeError("Redis client not connected")
        return self._client

    # Session management
    async def set_session(self, session_id: str, user_data: dict, expire: int = 86400):
        await self.client.setex(
            f"session:{session_id}",
            expire,
            json.dumps(user_data),
        )

    async def get_session(self, session_id: str) -> Optional[dict]:
        data = await self.client.get(f"session:{session_id}")
        if data:
            return json.loads(data)
        return None

    async def delete_session(self, session_id: str):
        await self.client.delete(f"session:{session_id}")

    # Room management
    async def add_user_to_room(self, room_id: str, user_id: str, socket_id: str):
        await self.client.hset(f"room:{room_id}:users", user_id, socket_id)

    async def remove_user_from_room(self, room_id: str, user_id: str):
        await self.client.hdel(f"room:{room_id}:users", user_id)

    async def get_room_users(self, room_id: str) -> dict:
        return await self.client.hgetall(f"room:{room_id}:users")

    async def set_room_state(self, room_id: str, state: dict, expire: int = 3600):
        await self.client.setex(
            f"room:{room_id}:state",
            expire,
            json.dumps(state),
        )

    async def get_room_state(self, room_id: str) -> Optional[dict]:
        data = await self.client.get(f"room:{room_id}:state")
        if data:
            return json.loads(data)
        return None

    async def delete_room(self, room_id: str):
        keys = await self.client.keys(f"room:{room_id}:*")
        if keys:
            await self.client.delete(*keys)


redis_client = RedisClient()
