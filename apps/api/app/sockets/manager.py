import socketio
from typing import Optional

from app.config import settings
from app.db.redis import redis_client

# Create Socket.IO server with Redis adapter for scaling
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.cors_origins_list,
    logger=settings.api_debug,
    engineio_logger=settings.api_debug,
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, dict] = {}

    async def connect(self, sid: str, user_data: dict):
        self.active_connections[sid] = user_data
        await redis_client.set_session(
            f"socket:{sid}",
            user_data,
            expire=86400,
        )

    async def disconnect(self, sid: str):
        if sid in self.active_connections:
            user_data = self.active_connections.pop(sid)
            await redis_client.delete_session(f"socket:{sid}")
            return user_data
        return None

    def get_user_data(self, sid: str) -> Optional[dict]:
        return self.active_connections.get(sid)


manager = ConnectionManager()


@sio.event
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")
    user_data = auth if auth else {"guest": True}
    await manager.connect(sid, user_data)
    await sio.emit("connected", {"sid": sid}, to=sid)


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    user_data = await manager.disconnect(sid)
    if user_data and "room_id" in user_data:
        room_id = user_data["room_id"]
        await redis_client.remove_user_from_room(room_id, str(user_data.get("user_id", sid)))
        await sio.emit(
            "user_left",
            {"user_id": user_data.get("user_id"), "username": user_data.get("username")},
            room=room_id,
        )


@sio.event
async def join_room(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    username = data.get("username")
    display_name = data.get("display_name", username)

    if not room_id or not user_id:
        await sio.emit("error", {"message": "Missing room_id or user_id"}, to=sid)
        return

    await sio.enter_room(sid, room_id)
    await redis_client.add_user_to_room(room_id, str(user_id), sid)

    # Update connection data with full user info
    user_data = manager.get_user_data(sid) or {}
    user_data.update({
        "room_id": room_id,
        "user_id": user_id,
        "username": username,
        "display_name": display_name,
    })
    await manager.connect(sid, user_data)

    # Notify room about new user
    await sio.emit(
        "user_joined",
        {
            "user_id": user_id,
            "username": username,
            "display_name": display_name,
        },
        room=room_id,
    )

    # Build full player list with user details (deduplicated by user_id)
    seen_users = set()
    all_players = []
    for socket_id, conn_data in manager.active_connections.items():
        if isinstance(conn_data, dict) and conn_data.get("room_id") == room_id:
            uid = conn_data.get("user_id")
            if uid and uid not in seen_users:
                seen_users.add(uid)
                all_players.append({
                    "user_id": uid,
                    "username": conn_data.get("username"),
                    "display_name": conn_data.get("display_name"),
                })

    print(f"Room {room_id} players: {all_players}")
    await sio.emit("room_users", {"players": all_players}, to=sid)


@sio.event
async def leave_room(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    username = data.get("username")

    if not room_id:
        return

    await sio.leave_room(sid, room_id)
    await redis_client.remove_user_from_room(room_id, str(user_id))

    await sio.emit(
        "user_left",
        {"user_id": user_id, "username": username},
        room=room_id,
    )


@sio.event
async def chat_message(sid, data):
    room_id = data.get("room_id")
    message = data.get("message")
    user_data = manager.get_user_data(sid)

    if not room_id or not message or not user_data:
        return

    await sio.emit(
        "chat_message",
        {
            "user_id": user_data.get("user_id"),
            "username": user_data.get("username"),
            "display_name": user_data.get("display_name"),
            "message": message,
        },
        room=room_id,
    )


@sio.event
async def game_action(sid, data):
    room_id = data.get("room_id")
    action = data.get("action")
    payload = data.get("payload", {})
    user_data = manager.get_user_data(sid)

    if not room_id or not action or not user_data:
        await sio.emit("error", {"message": "Invalid game action"}, to=sid)
        return

    # Broadcast game action to all players in the room
    await sio.emit(
        "game_action",
        {
            "user_id": user_data.get("user_id"),
            "action": action,
            "payload": payload,
        },
        room=room_id,
    )


@sio.event
async def ready_toggle(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    is_ready = data.get("is_ready", False)

    if not room_id or not user_id:
        return

    await sio.emit(
        "player_ready",
        {"user_id": user_id, "is_ready": is_ready},
        room=room_id,
    )


@sio.event
async def start_game(sid, data):
    room_id = data.get("room_id")
    game_type = data.get("game_type")

    if not room_id:
        return

    await sio.emit(
        "game_started",
        {"room_id": room_id, "game_type": game_type},
        room=room_id,
    )
